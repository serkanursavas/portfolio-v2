package handlers

import (
	"net/http"
	"os"
	"path/filepath"
	"portfolio-backend/models"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// SkillsHandler - Skills endpoint'leri için handler
type SkillsHandler struct {
	skillsRepo      *models.SkillsRepository
	skillsUploadDir string
}

// NewSkillsHandler - Yeni handler oluştur
func NewSkillsHandler(redisClient *redis.Client) *SkillsHandler {
	return &SkillsHandler{
		skillsRepo:      models.NewSkillsRepository(redisClient),
		skillsUploadDir: "./skills-upload",
	}
}

// GetSkills - V1 API uyumlu skills endpoint
// GET /api/skills
// Response: {"categories": [...], "skills": [...]}
func (h *SkillsHandler) GetSkills(c *gin.Context) {
	// Repository'den V1 format response al
	skillsResponse, err := h.skillsRepo.GetSkillsResponse()
	if err != nil {
		// HTTP 500 Internal Server Error
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get skills",
			"details": err.Error(),
		})
		return
	}

	// HTTP 200 OK ile skills döndür (V1 format)
	c.JSON(http.StatusOK, skillsResponse)
}

// GetSkillsByCategory - Kategoriye göre skills
// GET /api/skills?category=Languages
func (h *SkillsHandler) GetSkillsByCategory(c *gin.Context) {
	// Query parameter'ı al
	category := c.Query("category")
	if category == "" {
		// Kategori belirtilmemişse tüm skills'i döndür
		h.GetSkills(c)
		return
	}

	// Belirli kategorideki skills'i al
	skills, err := h.skillsRepo.GetSkillsByCategory(category)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get skills by category",
			"details": err.Error(),
		})
		return
	}

	// V1 format'ına uygun response
	c.JSON(http.StatusOK, gin.H{
		"category": category,
		"count":    len(skills),
		"skills":   skills,
	})
}

// GetSkillCategories - Sadece kategorileri döndür
// GET /api/skills/categories
func (h *SkillsHandler) GetSkillCategories(c *gin.Context) {
	categories, err := h.skillsRepo.GetCategories()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get categories",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"categories": categories,
		"count":      len(categories),
	})
}

// CreateSkill - Yeni skill ekle (V2 feature)
// POST /api/skills
// Body: {"category": "Languages", "skill": "Rust", "icon": "/rust.svg"}
func (h *SkillsHandler) CreateSkill(c *gin.Context) {
	// Request body'yi parse et
	var request struct {
		Category string `json:"category" binding:"required"`
		Skill    string `json:"skill" binding:"required"`
		Icon     string `json:"icon"` // Icon opsiyonel
	}

	// JSON binding - Go'da validation
	if err := c.ShouldBindJSON(&request); err != nil {
		// HTTP 400 Bad Request
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// Yeni skill oluştur
	skill := models.NewSkill(request.Category, request.Skill, request.Icon)

	// Repository'ye kaydet
	err := h.skillsRepo.CreateSkill(skill)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create skill",
			"details": err.Error(),
		})
		return
	}

	// HTTP 201 Created
	c.JSON(http.StatusCreated, gin.H{
		"message": "Skill created successfully",
		"skill":   skill,
	})
}

// UpdateSkill - Skill güncelle
// PUT /api/skills/:id
func (h *SkillsHandler) UpdateSkill(c *gin.Context) {
	// URL parameter'ı al
	skillID := c.Param("id")

	// Request body'yi parse et
	var request struct {
		Category string `json:"category"`
		Skill    string `json:"skill"`
		Icon     string `json:"icon"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
		})
		return
	}

	// Mevcut skill'i al
	existingSkill, err := h.skillsRepo.GetSkillByID(skillID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Skill not found",
		})
		return
	}

	// Sadece gönderilen field'ları güncelle
	if request.Category != "" {
		existingSkill.Category = request.Category
	}
	if request.Skill != "" {
		existingSkill.Skill = request.Skill
	}
	if request.Icon != "" {
		existingSkill.Icon = request.Icon
	}

	// Güncelle
	err = h.skillsRepo.UpdateSkill(existingSkill)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update skill",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Skill updated successfully",
		"skill":   existingSkill,
	})
}

// DeleteSkill - Skill sil
// DELETE /api/skills/:id
func (h *SkillsHandler) DeleteSkill(c *gin.Context) {
	skillID := c.Param("id")

	// Önce skill bilgisini al (dosya silmek için skill name gerekli)
	skill, err := h.skillsRepo.GetSkillByID(skillID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Skill not found",
		})
		return
	}

	// Skill'e ait dosyaları sil (eğer localhost URL ise)
	if strings.Contains(skill.Icon, "/skills-upload/") {
		h.deleteSkillIconFile(skill.Skill)
	}

	// Redis'ten sil
	err = h.skillsRepo.DeleteSkill(skillID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete skill",
		})
		return
	}

	// HTTP 204 No Content (successful deletion)
	c.Status(http.StatusNoContent)
}

// deleteSkillIconFile - Skill'e ait icon dosyasını sil
func (h *SkillsHandler) deleteSkillIconFile(skillName string) {
	// Skill name pattern'ı ile dosya adını oluştur
	safeSkillName := strings.ReplaceAll(skillName, " ", "-")
	safeSkillName = strings.ToLower(safeSkillName)
	
	// Özel karakterleri temizle
	reg := regexp.MustCompile(`[^a-zA-Z0-9\-]`)
	safeSkillName = reg.ReplaceAllString(safeSkillName, "")
	
	// Skill ile başlayan tüm dosyaları bul ve sil
	pattern := filepath.Join(h.skillsUploadDir, safeSkillName+".*")
	files, err := filepath.Glob(pattern)
	if err != nil {
		return
	}
	
	// Bulunan dosyaları sil
	for _, file := range files {
		err := os.Remove(file)
		if err == nil {
			// Log başarılı silme işlemi
			filename := filepath.Base(file)
			println("Deleted skill icon file:", filename)
		}
	}
}

// MigrateV1Skills - V1'den bulk skill migration
// POST /api/skills/migrate
// Body: {"skills": [...]}
func (h *SkillsHandler) MigrateV1Skills(c *gin.Context) {
	var request struct {
		Skills []models.Skill `json:"skills" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
		})
		return
	}

	// Bulk create
	err := h.skillsRepo.CreateMultipleSkills(request.Skills)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to migrate skills",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Skills migrated successfully",
		"count":   len(request.Skills),
	})
}