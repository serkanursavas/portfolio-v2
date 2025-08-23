package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"portfolio-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

type UploadHandler struct {
	uploadDir       string
	skillsUploadDir string
	blogUploadDir   string
	redisClient     *redis.Client
	projectsRepo    *models.ProjectsRepository
	skillsRepo      *models.SkillsRepository
}

func NewUploadHandler(redisClient *redis.Client) *UploadHandler {
	uploadDir := "./uploads"
	skillsUploadDir := "./skills-upload"
	blogUploadDir := "./blog-upload"
	
	// Upload dizinlerini oluştur
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		os.MkdirAll(uploadDir, 0755)
	}
	if _, err := os.Stat(skillsUploadDir); os.IsNotExist(err) {
		os.MkdirAll(skillsUploadDir, 0755)
	}
	if _, err := os.Stat(blogUploadDir); os.IsNotExist(err) {
		os.MkdirAll(blogUploadDir, 0755)
	}
	
	return &UploadHandler{
		uploadDir:       uploadDir,
		skillsUploadDir: skillsUploadDir,
		blogUploadDir:   blogUploadDir,
		redisClient:     redisClient,
		projectsRepo:    models.NewProjectsRepository(redisClient),
		skillsRepo:      models.NewSkillsRepository(redisClient),
	}
}

// UploadProjectImage - Proje resimleri için akıllı isimlendirme
// POST /api/upload/project/:id
func (h *UploadHandler) UploadProjectImage(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Project ID is required",
		})
		return
	}

	// Multipart form'dan dosya al
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "No file provided",
		})
		return
	}
	defer file.Close()

	// Dosya boyutu kontrolü (10MB)
	if header.Size > 10*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "File size too large. Maximum size is 10MB",
		})
		return
	}

	// Dosya uzantısını kontrol et
	allowedExts := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".gif":  true,
		".svg":  true,
		".webp": true,
	}
	
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if !allowedExts[ext] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid file type. Only images are allowed",
		})
		return
	}

	// Akıllı dosya adı oluştur
	filename := h.generateProjectImageName(projectID, ext)
	filepath := filepath.Join(h.uploadDir, filename)

	// Eski proje resimlerini temizle
	h.cleanupOldProjectImages(projectID)

	// Dosyayı kaydet
	dst, err := os.Create(filepath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create file",
		})
		return
	}
	defer dst.Close()

	// Dosya içeriğini kopyala
	_, err = io.Copy(dst, file)
	if err != nil {
		// Dosya oluşturuldu ama kopyalanamadı, temizle
		dst.Close()
		os.Remove(filepath)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to save file",
		})
		return
	}

	// Public URL oluştur
	publicURL := fmt.Sprintf("/uploads/%s", filename)

	// Redis'te proje image field'ını güncelle
	err = h.updateProjectImageInRedis(projectID, publicURL)
	if err != nil {
		// Redis güncelleme başarısız olsa bile dosya yüklendi
		// Sadece log'da uyarı ver
		fmt.Printf("Warning: Failed to update project image in Redis: %v\n", err)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Project image uploaded successfully",
		"filename": filename,
		"url":      publicURL,
		"size":     header.Size,
		"projectId": projectID,
	})
}

// updateProjectImageInRedis - Redis'te proje image field'ını güncelle
func (h *UploadHandler) updateProjectImageInRedis(projectID, imageURL string) error {
	// Proje verisini Redis'ten al
	project, err := h.projectsRepo.GetProjectByID(projectID)
	if err != nil {
		return fmt.Errorf("failed to get project %s from Redis: %v", projectID, err)
	}

	// Proje image field'ını güncelle
	project.Image = imageURL

	// Projeyi Redis'e kaydet
	err = h.projectsRepo.UpdateProject(project)
	if err != nil {
		return fmt.Errorf("failed to update project %s in Redis: %v", projectID, err)
	}

	fmt.Printf("Project %s image updated to %s in Redis\n", projectID, imageURL)
	return nil
}

// generateProjectImageName - Proje resimleri için akıllı isim oluştur
func (h *UploadHandler) generateProjectImageName(projectID, ext string) string {
	// Güvenli dosya ismi oluştur - : karakterini - ile değiştir
	safeID := strings.ReplaceAll(projectID, ":", "-")
	safeID = strings.ReplaceAll(safeID, " ", "-")
	safeID = strings.ToLower(safeID)
	// Format: {safe-id}-main.{ext}
	return fmt.Sprintf("%s-main%s", safeID, ext)
}

// cleanupOldProjectImages - Eski proje resimlerini temizle
func (h *UploadHandler) cleanupOldProjectImages(projectID string) {
	// Güvenli dosya ismi oluştur - generateProjectImageName ile aynı logic
	safeID := strings.ReplaceAll(projectID, ":", "-")
	safeID = strings.ReplaceAll(safeID, " ", "-")
	safeID = strings.ToLower(safeID)
	
	pattern := fmt.Sprintf("%s-*", safeID)
	
	// Uploads klasöründeki dosyaları tara
	files, err := filepath.Glob(filepath.Join(h.uploadDir, pattern))
	if err != nil {
		return
	}

	// Eski dosyaları sil
	for _, file := range files {
		// Dosya adından versiyon bilgisini al
		filename := filepath.Base(file)
		if strings.Contains(filename, "-temp") || strings.Contains(filename, "-backup") {
			// Geçici ve backup dosyaları sil
			os.Remove(file)
		} else if strings.Contains(filename, "-main") {
			// Ana dosyayı backup olarak yeniden adlandır
			backupName := strings.Replace(filename, "-main", "-backup", 1)
			backupPath := filepath.Join(h.uploadDir, backupName)
			os.Rename(file, backupPath)
		}
	}
}

// UploadFile - Tek dosya yükleme endpoint'i
// POST /api/upload
func (h *UploadHandler) UploadFile(c *gin.Context) {
	// Multipart form'dan dosya al
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "No file provided",
		})
		return
	}
	defer file.Close()

	// Dosya boyutu kontrolü (10MB)
	if header.Size > 10*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "File size too large. Maximum size is 10MB",
		})
		return
	}

	// Dosya uzantısını kontrol et
	allowedExts := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".gif":  true,
		".svg":  true,
		".webp": true,
	}
	
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if !allowedExts[ext] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid file type. Only images are allowed",
		})
		return
	}

	// Unique ve güvenli dosya adı oluştur
	timestamp := time.Now().Unix()
	safeOriginalName := h.sanitizeFilename(header.Filename)
	filename := fmt.Sprintf("%d_%s", timestamp, safeOriginalName)
	filepath := filepath.Join(h.uploadDir, filename)

	// Dosyayı kaydet
	dst, err := os.Create(filepath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create file",
		})
		return
	}
	defer dst.Close()

	// Dosya içeriğini kopyala
	_, err = io.Copy(dst, file)
	if err != nil {
		// Dosya oluşturuldu ama kopyalanamadı, temizle
		dst.Close()
		os.Remove(filepath)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to save file",
		})
		return
	}

	// Public URL oluştur
	publicURL := fmt.Sprintf("/uploads/%s", filename)

	c.JSON(http.StatusOK, gin.H{
		"message":  "File uploaded successfully",
		"filename": filename,
		"url":      publicURL,
		"size":     header.Size,
	})
}

// UploadSkillIcon - Skill icon'ları için temporary upload (project benzeri)
// POST /api/upload/skill/:skillName  
func (h *UploadHandler) UploadSkillIcon(c *gin.Context) {
	skillName := c.Param("skillName")
	if skillName == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Skill name is required",
		})
		return
	}

	// Multipart form'dan dosya al
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "No file provided",
		})
		return
	}
	defer file.Close()

	// Dosya boyutu kontrolü (5MB)
	if header.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "File size too large. Maximum size is 5MB for skill icons",
		})
		return
	}

	// Dosya uzantısını kontrol et
	allowedExts := map[string]bool{
		".svg":  true,
		".png":  true,
		".jpg":  true,
		".jpeg": true,
		".webp": true,
	}
	
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if !allowedExts[ext] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid file type. Allowed: SVG, PNG, JPG, JPEG, WEBP",
		})
		return
	}

	// Skill name ile direkt dosya adı oluştur
	ext = strings.ToLower(filepath.Ext(header.Filename))
	filename := h.generateSkillIconName(skillName, ext)
	filepath := filepath.Join(h.skillsUploadDir, filename)

	// Eski skill icon'larını temizle
	h.cleanupOldSkillIcons(skillName)

	// Dosyayı kaydet
	dst, err := os.Create(filepath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create file",
		})
		return
	}
	defer dst.Close()

	// Dosya içeriğini kopyala
	_, err = io.Copy(dst, file)
	if err != nil {
		dst.Close()
		os.Remove(filepath)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to save file",
		})
		return
	}

	// Public URL oluştur
	publicURL := fmt.Sprintf("/skills-upload/%s", filename)

	c.JSON(http.StatusOK, gin.H{
		"message":   "Skill icon uploaded successfully",
		"filename":  filename,
		"url":       publicURL,
		"size":      header.Size,
		"skillName": skillName,
	})
}

// UploadMultiple - Çoklu dosya yükleme endpoint'i
// POST /api/upload/multiple
func (h *UploadHandler) UploadMultiple(c *gin.Context) {
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Failed to parse multipart form",
		})
		return
	}

	files := form.File["files"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "No files provided",
		})
		return
	}

	var uploadedFiles []gin.H
	var errors []string

	for _, fileHeader := range files {
		// Dosya boyutu kontrolü (10MB)
		if fileHeader.Size > 10*1024*1024 {
			errors = append(errors, fmt.Sprintf("File %s is too large. Maximum size is 10MB", fileHeader.Filename))
			continue
		}

		// Dosya uzantısını kontrol et
		ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
		allowedExts := map[string]bool{
			".jpg":  true,
			".jpeg": true,
			".png":  true,
			".gif":  true,
			".svg":  true,
			".webp": true,
		}
		
		if !allowedExts[ext] {
			errors = append(errors, fmt.Sprintf("Invalid file type for %s. Only images are allowed", fileHeader.Filename))
			continue
		}

		// Dosyayı aç
		file, err := fileHeader.Open()
		if err != nil {
			errors = append(errors, fmt.Sprintf("Failed to open %s", fileHeader.Filename))
			continue
		}

		// Unique dosya adı oluştur
		timestamp := time.Now().UnixNano()
		filename := fmt.Sprintf("%d_%s", timestamp, fileHeader.Filename)
		filepath := filepath.Join(h.uploadDir, filename)

		// Dosyayı kaydet
		dst, err := os.Create(filepath)
		if err != nil {
			file.Close()
			errors = append(errors, fmt.Sprintf("Failed to create %s", fileHeader.Filename))
			continue
		}

		// Dosya içeriğini kopyala
		_, err = io.Copy(dst, file)
		file.Close()
		dst.Close()
		
		if err != nil {
			// Dosya oluşturuldu ama kopyalanamadı, temizle
			os.Remove(filepath)
			errors = append(errors, fmt.Sprintf("Failed to save %s", fileHeader.Filename))
			continue
		}

		// Başarılı upload
		uploadedFiles = append(uploadedFiles, gin.H{
			"filename": filename,
			"url":      fmt.Sprintf("/uploads/%s", filename),
			"size":     fileHeader.Size,
		})
	}

	response := gin.H{
		"message":        fmt.Sprintf("Uploaded %d files", len(uploadedFiles)),
		"uploaded_files": uploadedFiles,
	}

	if len(errors) > 0 {
		response["errors"] = errors
	}

	c.JSON(http.StatusOK, response)
}

// GetUploadedFiles - Yüklenmiş dosyaları listele
// GET /api/uploads
func (h *UploadHandler) GetUploadedFiles(c *gin.Context) {
	files, err := os.ReadDir(h.uploadDir)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to read uploads directory",
		})
		return
	}

	var fileList []gin.H
	for _, file := range files {
		if !file.IsDir() {
			info, _ := file.Info()
			fileList = append(fileList, gin.H{
				"filename":  file.Name(),
				"url":       fmt.Sprintf("/uploads/%s", file.Name()),
				"size":      info.Size(),
				"modified":  info.ModTime(),
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Files retrieved successfully",
		"count":   len(fileList),
		"files":   fileList,
	})
}

// DeleteFile - Dosya silme endpoint'i
// DELETE /api/uploads/:filename
func (h *UploadHandler) DeleteFile(c *gin.Context) {
	filename := c.Param("filename")
	if filename == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Filename is required",
		})
		return
	}

	// Path traversal güvenlik kontrolü
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid filename",
		})
		return
	}

	filepath := filepath.Join(h.uploadDir, filename)
	
	// Dosyanın var olup olmadığını kontrol et
	if _, err := os.Stat(filepath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "File not found",
		})
		return
	}

	// Dosyayı sil
	err := os.Remove(filepath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete file",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "File deleted successfully",
		"filename": filename,
	})
}

// RenameProjectImage - Timestamp-based resim adını smart naming'e çevir
// POST /api/upload/rename/:projectId
func (h *UploadHandler) RenameProjectImage(c *gin.Context) {
	projectID := c.Param("projectId")
	if projectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Project ID is required",
		})
		return
	}

	var request struct {
		OldImageUrl string `json:"oldImageUrl" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
		})
		return
	}

	// Eski resim URL'inden dosya adını çıkar
	oldFilename := filepath.Base(request.OldImageUrl)
	if oldFilename == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid image URL",
		})
		return
	}

	// Eski dosya yolu
	oldFilePath := filepath.Join(h.uploadDir, oldFilename)
	
	// Dosya var mı kontrol et
	if _, err := os.Stat(oldFilePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Image file not found",
		})
		return
	}

	// Dosya uzantısını al
	ext := filepath.Ext(oldFilename)
	
	// Yeni dosya adı oluştur (smart naming)
	newFilename := h.generateProjectImageName(projectID, ext)
	newFilePath := filepath.Join(h.uploadDir, newFilename)

	// Eski proje resimlerini temizle
	h.cleanupOldProjectImages(projectID)

	// Dosyayı rename et
	err := os.Rename(oldFilePath, newFilePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to rename image file",
		})
		return
	}

	// Yeni public URL (full URL olarak)
	newPublicURL := fmt.Sprintf("/uploads/%s", newFilename)
	fullImageURL := fmt.Sprintf("http://localhost:8082%s", newPublicURL)

	// Redis'te proje image field'ını güncelle
	fmt.Printf("Updating project %s image in Redis from old URL to: %s\n", projectID, fullImageURL)
	err = h.updateProjectImageInRedis(projectID, fullImageURL)
	if err != nil {
		fmt.Printf("ERROR: Failed to update project image in Redis: %v\n", err)
	} else {
		fmt.Printf("SUCCESS: Project %s image updated in Redis\n", projectID)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Project image renamed successfully",
		"oldFilename": oldFilename,
		"newFilename": newFilename,
		"newImageUrl": fullImageURL,
		"projectId":   projectID,
	})
}

// RenameSkillIcon - Timestamp-based skill icon adını smart naming'e çevir
// POST /api/upload/rename-skill/:skillName
func (h *UploadHandler) RenameSkillIcon(c *gin.Context) {
	skillName := c.Param("skillName")
	if skillName == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Skill name is required",
		})
		return
	}

	var request struct {
		OldImageUrl string `json:"oldImageUrl" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
		})
		return
	}

	// Eski resim URL'inden dosya adını çıkar
	oldFilename := filepath.Base(request.OldImageUrl)
	if oldFilename == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid image URL",
		})
		return
	}

	// Eski dosya yolu
	oldFilePath := filepath.Join(h.skillsUploadDir, oldFilename)
	
	// Dosya var mı kontrol et
	if _, err := os.Stat(oldFilePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Image file not found",
		})
		return
	}

	// Dosya uzantısını al
	ext := filepath.Ext(oldFilename)
	
	// Yeni dosya adı oluştur (smart naming)
	newFilename := h.generateSkillIconName(skillName, ext)
	newFilePath := filepath.Join(h.skillsUploadDir, newFilename)

	// Eski skill icon'larını temizle
	h.cleanupOldSkillIcons(skillName)

	// Dosyayı rename et
	err := os.Rename(oldFilePath, newFilePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to rename image file",
		})
		return
	}

	// Yeni public URL (full URL olarak)
	newPublicURL := fmt.Sprintf("/skills-upload/%s", newFilename)
	fullImageURL := fmt.Sprintf("http://localhost:8082%s", newPublicURL)

	// Redis'teki skill'i güncelle
	err = h.updateSkillIconInRedis(skillName, fullImageURL)
	if err != nil {
		fmt.Printf("WARNING: Failed to update skill icon in Redis: %v\n", err)
	} else {
		fmt.Printf("SUCCESS: Skill %s icon updated in Redis\n", skillName)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Skill icon renamed successfully",
		"oldFilename": oldFilename,
		"newFilename": newFilename,
		"newImageUrl": fullImageURL,
		"skillName":   skillName,
	})
}

// updateSkillIconInRedis - Redis'teki skill icon field'ını güncelle
func (h *UploadHandler) updateSkillIconInRedis(skillName, imageURL string) error {
	// Skill'i Redis'ten al
	skills, err := h.skillsRepo.GetAllSkills()
	if err != nil {
		return fmt.Errorf("failed to get skills from Redis: %v", err)
	}

	// Matching skill'i bul
	var targetSkill *models.Skill
	for i := range skills {
		if skills[i].Skill == skillName {
			targetSkill = &skills[i]
			break
		}
	}

	if targetSkill == nil {
		return fmt.Errorf("skill '%s' not found in Redis", skillName)
	}

	// Skill icon field'ını güncelle
	targetSkill.Icon = imageURL

	// Skill'i Redis'e kaydet
	err = h.skillsRepo.UpdateSkill(targetSkill)
	if err != nil {
		return fmt.Errorf("failed to update skill %s in Redis: %v", skillName, err)
	}

	fmt.Printf("Skill %s icon updated to %s in Redis\n", skillName, imageURL)
	return nil
}

// MigrateSkillIconsFromFirebase - Firebase'deki skill icon'ları skills-upload'a migrate et
// POST /api/v1/upload/migrate-skills
func (h *UploadHandler) MigrateSkillIconsFromFirebase(c *gin.Context) {
	// Tüm skill'ları al
	skills, err := h.skillsRepo.GetAllSkills()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get skills from Redis",
			"details": err.Error(),
		})
		return
	}

	var migratedSkills []string
	var errors []string

	for _, skill := range skills {
		// Firebase URL'i kontrolü
		if !strings.Contains(skill.Icon, "firebasestorage.googleapis.com") {
			continue
		}

		fmt.Printf("Migrating skill: %s with Firebase icon: %s\n", skill.Skill, skill.Icon)

		// Firebase'den resmi indir
		imageData, fileExt, err := h.downloadImageFromURL(skill.Icon)
		if err != nil {
			errors = append(errors, fmt.Sprintf("Failed to download %s: %v", skill.Skill, err))
			continue
		}

		// Dosya adını oluştur (skill name pattern)
		filename := h.generateSkillIconName(skill.Skill, fileExt)
		filepath := filepath.Join(h.skillsUploadDir, filename)

		// Eski dosyaları temizle
		h.cleanupOldSkillIcons(skill.Skill)

		// Dosyayı kaydet
		err = os.WriteFile(filepath, imageData, 0644)
		if err != nil {
			errors = append(errors, fmt.Sprintf("Failed to save %s: %v", skill.Skill, err))
			continue
		}

		// Yeni URL oluştur
		newURL := fmt.Sprintf("http://localhost:8082/skills-upload/%s", filename)

		// Redis'teki skill'i güncelle
		skill.Icon = newURL
		err = h.skillsRepo.UpdateSkill(&skill)
		if err != nil {
			errors = append(errors, fmt.Sprintf("Failed to update Redis for %s: %v", skill.Skill, err))
			continue
		}

		migratedSkills = append(migratedSkills, skill.Skill)
		fmt.Printf("Successfully migrated: %s -> %s\n", skill.Skill, newURL)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Skill migration completed",
		"migrated_skills": migratedSkills,
		"migrated_count": len(migratedSkills),
		"errors": errors,
		"error_count": len(errors),
	})
}

// downloadImageFromURL - URL'den resim indir
func (h *UploadHandler) downloadImageFromURL(url string) ([]byte, string, error) {
	resp, err := http.Get(url)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, "", fmt.Errorf("HTTP %d: %s", resp.StatusCode, resp.Status)
	}

	// Content-Type'dan file extension'ı çıkar
	contentType := resp.Header.Get("Content-Type")
	var fileExt string
	switch contentType {
	case "image/svg+xml":
		fileExt = ".svg"
	case "image/png":
		fileExt = ".png"
	case "image/jpeg", "image/jpg":
		fileExt = ".jpg"
	case "image/webp":
		fileExt = ".webp"
	case "image/gif":
		fileExt = ".gif"
	default:
		// URL'den extension çıkarmaya çalış
		if strings.Contains(url, ".svg") {
			fileExt = ".svg"
		} else if strings.Contains(url, ".png") {
			fileExt = ".png"
		} else if strings.Contains(url, ".jpg") || strings.Contains(url, ".jpeg") {
			fileExt = ".jpg"
		} else {
			fileExt = ".png" // Default
		}
	}

	// Response body'yi oku
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", err
	}

	return data, fileExt, nil
}

// GetProjectImageURLs - Redis'teki tüm proje resim URL'lerini getir
// GET /api/upload/project-images
func (h *UploadHandler) GetProjectImageURLs(c *gin.Context) {
	// Tüm projeleri al
	projects, err := h.projectsRepo.GetAllProjects()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch projects from Redis",
			"details": err.Error(),
		})
		return
	}

	// Proje resim URL'lerini topla
	var imageURLs []map[string]interface{}
	for _, project := range projects {
		if project.Image != "" {
			imageURLs = append(imageURLs, map[string]interface{}{
				"project_id": project.ID,
				"project_title": project.Title,
				"image_url": project.Image,
				"status": project.Status,
				"created_at": project.CreatedAt,
			})
		}
	}

	// Redis'teki tüm key'leri de kontrol et
	keys, err := h.redisClient.Keys(c, "project:*").Result()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch Redis keys",
			"details": err.Error(),
		})
		return
	}

	// Redis key'lerini de ekle
	var redisKeys []string
	for _, key := range keys {
		redisKeys = append(redisKeys, key)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Project image URLs retrieved successfully",
		"total_projects": len(projects),
		"projects_with_images": len(imageURLs),
		"image_urls": imageURLs,
		"redis_keys": redisKeys,
		"timestamp": time.Now().Format("2006-01-02 15:04:05"),
	})
}

// sanitizeFilename - Dosya adını güvenli hale getirir
func (h *UploadHandler) sanitizeFilename(filename string) string {
	// Dosya uzantısını ayır
	ext := filepath.Ext(filename)
	name := strings.TrimSuffix(filename, ext)
	
	// Güvenli olmayan karakterleri temizle
	// Sadece harf, rakam, tire, alt çizgi ve nokta bırak
	reg := regexp.MustCompile(`[^a-zA-Z0-9\-_.]`)
	safeName := reg.ReplaceAllString(name, "_")
	
	// Çoklu alt çizgiyi tekile çevir
	multiUnderscore := regexp.MustCompile(`_+`)
	safeName = multiUnderscore.ReplaceAllString(safeName, "_")
	
	// Baş ve sondaki alt çizgiyi temizle
	safeName = strings.Trim(safeName, "_")
	
	// Boş isim kontrolü
	if safeName == "" {
		safeName = "upload"
	}
	
	return safeName + ext
}

// sanitizeBlogImageName - Blog resim adını güvenli hale getirir
func (h *UploadHandler) sanitizeBlogImageName(name string) string {
	// Lowercase'e çevir
	name = strings.ToLower(name)
	
	// Türkçe karakterleri düzelt
	replacements := map[string]string{
		"ç": "c", "ğ": "g", "ı": "i", "ö": "o", "ş": "s", "ü": "u",
		"Ç": "c", "Ğ": "g", "İ": "i", "Ö": "o", "Ş": "s", "Ü": "u",
	}
	
	for tr, en := range replacements {
		name = strings.ReplaceAll(name, tr, en)
	}
	
	// Boşlukları tire ile değiştir
	name = strings.ReplaceAll(name, " ", "-")
	
	// Sadece harf, rakam ve tire bırak
	reg := regexp.MustCompile(`[^a-z0-9\-]`)
	name = reg.ReplaceAllString(name, "")
	
	// Çoklu tireleri tek tireye çevir
	multiDash := regexp.MustCompile(`-+`)
	name = multiDash.ReplaceAllString(name, "-")
	
	// Baş ve sondaki tireleri temizle
	name = strings.Trim(name, "-")
	
	// Boş isim kontrolü
	if name == "" {
		name = "image"
	}
	
	// Maksimum uzunluk (60 karakter - blog başlıkları için yeterli)
	if len(name) > 60 {
		name = name[:60]
		name = strings.Trim(name, "-")
	}
	
	return name
}

// generateSkillIconName - Skill icon'ları için dosya adı oluştur
func (h *UploadHandler) generateSkillIconName(skillName, ext string) string {
	// Skill name'i direkt kullan: lowercase + boşluklar "-" olacak
	safeSkillName := strings.ReplaceAll(skillName, " ", "-")
	safeSkillName = strings.ToLower(safeSkillName)
	
	// Özel karakterleri temizle (sadece harf, rakam, tire)
	reg := regexp.MustCompile(`[^a-zA-Z0-9\-]`)
	safeSkillName = reg.ReplaceAllString(safeSkillName, "")
	
	return fmt.Sprintf("%s%s", safeSkillName, ext)
}

// cleanupOldSkillIcons - Eski skill icon'larını temizle
func (h *UploadHandler) cleanupOldSkillIcons(skillName string) {
	// Skill için dosya pattern'i oluştur (generateSkillIconName ile aynı mantık)
	safeSkillName := strings.ReplaceAll(skillName, " ", "-")
	safeSkillName = strings.ToLower(safeSkillName)
	reg := regexp.MustCompile(`[^a-zA-Z0-9\-]`)
	safeSkillName = reg.ReplaceAllString(safeSkillName, "")
	
	pattern := fmt.Sprintf("%s.*", safeSkillName)
	
	// Skills-upload klasöründeki dosyaları kontrol et
	files, err := filepath.Glob(filepath.Join(h.skillsUploadDir, pattern))
	if err != nil {
		return
	}
	
	// Eski dosyaları sil
	for _, file := range files {
		os.Remove(file)
	}
}

// cleanupOldBlogImages - Eski blog resimlerini temizle
func (h *UploadHandler) cleanupOldBlogImages(blogSlug string) {
	// Blog slug için dosya pattern'i oluştur
	safeSlug := h.sanitizeBlogImageName(blogSlug)
	pattern := fmt.Sprintf("blog-%s.*", safeSlug) // Tüm uzantıları yakala
	
	// Blog-upload klasöründeki dosyaları kontrol et
	files, err := filepath.Glob(filepath.Join(h.blogUploadDir, pattern))
	if err != nil {
		return
	}
	
	// Eski dosyaları sil
	for _, file := range files {
		fmt.Printf("Cleaning up old blog image: %s\n", file)
		os.Remove(file)
	}
}

// UploadBlogImage - Blog resim upload endpoint'i
// POST /api/upload/blog-image
// Optional query param: ?slug=blog-slug-name for better naming
func (h *UploadHandler) UploadBlogImage(c *gin.Context) {
	// Multipart form'dan dosya al
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "No file provided",
		})
		return
	}
	defer file.Close()

	// Dosya boyutu kontrolü (5MB)
	if header.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "File size too large. Maximum size is 5MB for blog images",
		})
		return
	}

	// Dosya uzantısını kontrol et
	allowedExts := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".gif":  true,
		".webp": true,
	}
	
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if !allowedExts[ext] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid file type. Allowed: JPG, JPEG, PNG, GIF, WEBP",
		})
		return
	}

	// Blog için basit naming - sadece blog başlığı
	blogSlug := c.Query("slug") // Optional blog slug for better naming
	var filename string
	
	if blogSlug != "" {
		// Blog slug varsa: blog-slug.ext (tek dosya, eski sil)
		safeSlug := h.sanitizeBlogImageName(blogSlug)
		filename = fmt.Sprintf("blog-%s%s", safeSlug, ext)
	} else {
		// Blog slug yoksa: blog-{timestamp}.ext
		timestamp := time.Now().Unix()
		filename = fmt.Sprintf("blog-%d%s", timestamp, ext)
	}
	
	filepath := filepath.Join(h.blogUploadDir, filename)

	// Eski blog resimlerini temizle (eğer slug varsa)
	if blogSlug != "" {
		h.cleanupOldBlogImages(blogSlug)
	}

	// Dosyayı kaydet
	dst, err := os.Create(filepath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create file",
		})
		return
	}
	defer dst.Close()

	// Dosya içeriğini kopyala
	_, err = io.Copy(dst, file)
	if err != nil {
		dst.Close()
		os.Remove(filepath)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to save file",
		})
		return
	}

	// Public URL oluştur
	publicURL := fmt.Sprintf("/blog-upload/%s", filename)

	c.JSON(http.StatusOK, gin.H{
		"message":  "Blog image uploaded successfully",
		"filename": filename,
		"url":      publicURL,
		"size":     header.Size,
	})
}