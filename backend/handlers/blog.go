package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"portfolio-backend/models"
	"sort"
	"strconv"
	"strings"
	"regexp"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gopkg.in/yaml.v3"
)

// BlogHandler - Blog endpoint'leri için handler
type BlogHandler struct {
	blogRepo *models.BlogRepository
}

// NewBlogHandler - Yeni handler oluştur
func NewBlogHandler(redisClient *redis.Client) *BlogHandler {
	return &BlogHandler{
		blogRepo: models.NewBlogRepository(redisClient),
	}
}

// GetPosts - V1 API uyumlu blog posts endpoint
// GET /api/blog/posts
// Response: {"posts": [...], "total": 5, "page": 1, "limit": 10}
func (h *BlogHandler) GetPosts(c *gin.Context) {
	// Query parameters
	page := 1
	limit := 10

	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	// Repository'den blog response al
	blogResponse, err := h.blogRepo.GetBlogResponse(page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get blog posts",
			"details": err.Error(),
		})
		return
	}

	// HTTP 200 OK ile posts döndür
	c.JSON(http.StatusOK, blogResponse)
}

// GetAllPostsAdmin - Admin için tüm blog posts (published + draft)
// GET /api/v1/blog/admin/posts
func (h *BlogHandler) GetAllPostsAdmin(c *gin.Context) {
	// Query parameters
	page := 1
	limit := 10

	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	// Tüm postları getir (published + draft)
	allPosts, err := h.blogRepo.GetAllPosts()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get all blog posts",
			"details": err.Error(),
		})
		return
	}

	// Date'e göre sırala (en yeni first)
	sort.Slice(allPosts, func(i, j int) bool {
		return allPosts[i].PublishedAt.After(allPosts[j].PublishedAt)
	})

	// Pagination
	total := len(allPosts)
	start := (page - 1) * limit
	end := start + limit

	if start >= total {
		allPosts = []models.BlogPost{}
	} else if end > total {
		allPosts = allPosts[start:]
	} else {
		allPosts = allPosts[start:end]
	}

	// Summary'lere çevir
	summaries := make([]models.BlogPostSummary, 0, len(allPosts))
	for _, post := range allPosts {
		summaries = append(summaries, post.ToSummary())
	}

	response := models.BlogResponse{
		Posts: summaries,
		Total: total,
		Page:  page,
		Limit: limit,
	}

	c.JSON(http.StatusOK, response)
}

// GetPostBySlug - Slug'a göre tek post
// GET /api/blog/posts/:slug
func (h *BlogHandler) GetPostBySlug(c *gin.Context) {
	slug := c.Param("slug")

	post, err := h.blogRepo.GetPostBySlug(slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Blog post not found",
		})
		return
	}

	// View count'u artır
	h.blogRepo.IncrementPostViews(post.ID)

	c.JSON(http.StatusOK, gin.H{
		"post": post,
	})
}

// GetLatestPosts - En yeni blog posts
// GET /api/blog/posts/latest?count=5
func (h *BlogHandler) GetLatestPosts(c *gin.Context) {
	countStr := c.DefaultQuery("count", "10")
	count, err := strconv.Atoi(countStr)
	if err != nil || count <= 0 {
		count = 10
	}

	posts, err := h.blogRepo.GetLatestPosts(count)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get latest posts",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Latest posts retrieved successfully",
		"count":   len(posts),
		"posts":   posts,
	})
}

// GetPopularPosts - En popüler blog posts (view count'a göre)
// Şimdilik GetLatestPosts kullanıyoruz çünkü blog_crud'da GetPopularPosts yok
func (h *BlogHandler) GetPopularPosts(c *gin.Context) {
	countStr := c.DefaultQuery("count", "10")
	count, err := strconv.Atoi(countStr)
	if err != nil || count <= 0 {
		count = 10
	}

	posts, err := h.blogRepo.GetLatestPosts(count)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get popular posts",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Popular posts retrieved successfully",
		"count":   len(posts),
		"posts":   posts,
	})
}

// GetPostsByTag - Tag'a göre posts
// GET /api/blog/posts?tag=JavaScript
func (h *BlogHandler) GetPostsByTag(c *gin.Context) {
	tag := c.Query("tag")
	if tag == "" {
		// Tag belirtilmemişse tüm posts'i döndür
		h.GetPosts(c)
		return
	}

	posts, err := h.blogRepo.GetPostsByTag(tag)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get posts by tag",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tag":   tag,
		"count": len(posts),
		"posts": posts,
	})
}

// GetTags - Tüm blog tag'larını döndür
// GET /api/blog/tags
func (h *BlogHandler) GetTags(c *gin.Context) {
	tags, err := h.blogRepo.GetAllTags()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get tags",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tags":  tags,
		"count": len(tags),
	})
}

// CreatePost - Yeni blog post ekle (V2 feature)
// POST /api/blog/posts
func (h *BlogHandler) CreatePost(c *gin.Context) {
	var request struct {
		Title         string   `json:"title" binding:"required"`
		Content       string   `json:"content" binding:"required"`
		Author        string   `json:"author" binding:"required"`
		Tags          []string `json:"tags"`
		Featured      bool     `json:"featured"`
		FeaturedImage string   `json:"featured_image"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// Yeni post oluştur
	post := models.NewBlogPost(
		request.Title,
		request.Content,
		request.Author,
		request.Tags,
	)
	
	// Featured durumunu set et
	post.Featured = request.Featured
	// FeaturedImage set et
	post.FeaturedImage = request.FeaturedImage

	// Repository'ye kaydet
	err := h.blogRepo.CreatePost(post)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create post",
			"details": err.Error(),
		})
		return
	}

	// HTTP 201 Created
	c.JSON(http.StatusCreated, gin.H{
		"message": "Blog post created successfully",
		"post":    post,
	})
}

// UpdatePost - Blog post güncelle
// PUT /api/blog/posts/:id
func (h *BlogHandler) UpdatePost(c *gin.Context) {
	postID := c.Param("id")

	var request struct {
		Title         string   `json:"title"`
		Content       string   `json:"content"`
		Excerpt       string   `json:"excerpt"`
		Tags          []string `json:"tags"`
		Featured      bool     `json:"featured"`
		Published     bool     `json:"published"`
		FeaturedImage string   `json:"featured_image"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
		})
		return
	}

	// Mevcut post'u al
	existingPost, err := h.blogRepo.GetPostByID(postID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Blog post not found",
		})
		return
	}

	// Sadece gönderilen field'ları güncelle
	if request.Title != "" {
		existingPost.Title = request.Title
	}
	if request.Content != "" {
		existingPost.Content = request.Content
	}
	if request.Excerpt != "" {
		existingPost.Excerpt = request.Excerpt
	}
	if len(request.Tags) > 0 {
		existingPost.Tags = request.Tags
	}
	// Featured boolean olduğu için her zaman güncelle
	existingPost.Featured = request.Featured
	// Published boolean olduğu için her zaman güncelle
	existingPost.Published = request.Published
	
	// FeaturedImage güncelle ve gerekirse eski dosyayı sil
	if request.FeaturedImage == "" && existingPost.FeaturedImage != "" {
		// Resim kaldırılıyor, eski dosyayı sil
		h.deleteBlogImageFile(existingPost.Slug)
	}
	existingPost.FeaturedImage = request.FeaturedImage

	// Güncelle
	err = h.blogRepo.UpdatePost(existingPost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update post",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Blog post updated successfully",
		"post":    existingPost,
	})
}

// DeletePost - Blog post sil
// DELETE /api/blog/posts/:id
func (h *BlogHandler) DeletePost(c *gin.Context) {
	postID := c.Param("id")

	// Önce var mı kontrol et
	_, err := h.blogRepo.GetPostByID(postID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Blog post not found",
		})
		return
	}

	// Sil
	err = h.blogRepo.DeletePost(postID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete post",
		})
		return
	}

	// HTTP 204 No Content
	c.Status(http.StatusNoContent)
}

// IncrementPostViews - Post görüntüleme sayısını artır
// POST /api/blog/posts/:id/views
func (h *BlogHandler) IncrementPostViews(c *gin.Context) {
	postID := c.Param("id")

	err := h.blogRepo.IncrementPostViews(postID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Blog post not found or failed to increment views",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Post views incremented successfully",
	})
}

// MigratePosts - V1'den bulk post migration
// POST /api/blog/posts/migrate
// Şimdilik tek tek create edelim, bulk method yok
func (h *BlogHandler) MigratePosts(c *gin.Context) {
	var request struct {
		Posts []models.BlogPost `json:"posts" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
		})
		return
	}

	// Tek tek create et (bulk method olmadığı için)
	var errors []string
	successCount := 0
	
	for _, post := range request.Posts {
		err := h.blogRepo.CreatePost(&post)
		if err != nil {
			errors = append(errors, fmt.Sprintf("Failed to create post %s: %s", post.ID, err.Error()))
		} else {
			successCount++
		}
	}

	response := gin.H{
		"message": "Blog posts migration completed",
		"success_count": successCount,
		"total_count": len(request.Posts),
	}
	
	if len(errors) > 0 {
		response["errors"] = errors
	}

	c.JSON(http.StatusCreated, response)
}

// MD Import Structures
type MDFrontmatter struct {
	Title         string    `yaml:"title"`
	Excerpt       string    `yaml:"excerpt"`
	Author        string    `yaml:"author"`
	PublishedAt   string    `yaml:"publishedAt"`
	Tags          []string  `yaml:"tags"`
	ReadingTime   string    `yaml:"readingTime"`
	ViewCount     int       `yaml:"viewCount"`
	Featured      bool      `yaml:"featured"`
	Slug          string    `yaml:"slug"`
	FeaturedImage string    `yaml:"featuredImage"`
}

type MDImportRequest struct {
	Content  string `json:"content" binding:"required"`
	Filename string `json:"filename"`
}

type MDImportResult struct {
	Success  bool     `json:"success"`
	Filename string   `json:"filename"`
	Slug     string   `json:"slug,omitempty"`
	Error    string   `json:"error,omitempty"`
	PostID   string   `json:"post_id,omitempty"`
}

// ImportMD - Tek MD dosyası import et
// POST /api/v1/blog/import-md
func (h *BlogHandler) ImportMD(c *gin.Context) {
	var request MDImportRequest
	
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// MD dosyasını parse et
	post, err := h.parseMDContent(request.Content, request.Filename)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Failed to parse MD content",
			"details": err.Error(),
		})
		return
	}

	// Duplicate kontrolü
	existing, _ := h.blogRepo.GetPostBySlug(post.Slug)
	if existing != nil {
		c.JSON(http.StatusConflict, gin.H{
			"error": fmt.Sprintf("Post with slug '%s' already exists", post.Slug),
			"existing_id": existing.ID,
		})
		return
	}

	// Blog post'u oluştur
	err = h.blogRepo.CreatePost(post)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create blog post",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "MD file imported successfully",
		"post": gin.H{
			"id":    post.ID,
			"slug":  post.Slug,
			"title": post.Title,
		},
	})
}

// ImportBulkMD - Çoklu MD dosya import et
// POST /api/v1/blog/import-bulk
func (h *BlogHandler) ImportBulkMD(c *gin.Context) {
	var request struct {
		Files []MDImportRequest `json:"files" binding:"required"`
	}
	
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	var results []MDImportResult
	successCount := 0

	for _, file := range request.Files {
		result := MDImportResult{
			Filename: file.Filename,
		}

		// MD dosyasını parse et
		post, err := h.parseMDContent(file.Content, file.Filename)
		if err != nil {
			result.Success = false
			result.Error = fmt.Sprintf("Parse error: %s", err.Error())
			results = append(results, result)
			continue
		}

		// Duplicate kontrolü
		existing, _ := h.blogRepo.GetPostBySlug(post.Slug)
		if existing != nil {
			result.Success = false
			result.Error = fmt.Sprintf("Slug '%s' already exists", post.Slug)
			results = append(results, result)
			continue
		}

		// Blog post'u oluştur
		err = h.blogRepo.CreatePost(post)
		if err != nil {
			result.Success = false
			result.Error = fmt.Sprintf("Creation error: %s", err.Error())
			results = append(results, result)
			continue
		}

		result.Success = true
		result.Slug = post.Slug
		result.PostID = post.ID
		results = append(results, result)
		successCount++
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Bulk import completed",
		"total_files": len(request.Files),
		"success_count": successCount,
		"failed_count": len(request.Files) - successCount,
		"results": results,
	})
}

// ExportMD - Blog post'u MD formatında export et
// GET /api/v1/blog/export-md/:slug
func (h *BlogHandler) ExportMD(c *gin.Context) {
	slug := c.Param("slug")

	post, err := h.blogRepo.GetPostBySlug(slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Blog post not found",
		})
		return
	}

	// MD format'ına çevir
	mdContent := h.convertToMD(post)

	// File download header'ları
	filename := fmt.Sprintf("%s.md", post.Slug)
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.Header("Content-Type", "text/markdown")
	
	c.String(http.StatusOK, mdContent)
}

// parseMDContent - MD içeriğini BlogPost'a parse et
func (h *BlogHandler) parseMDContent(content, filename string) (*models.BlogPost, error) {
	// Frontmatter ve content'i ayır
	frontmatter, markdownContent, err := h.extractFrontmatter(content)
	if err != nil {
		return nil, fmt.Errorf("frontmatter extraction failed: %w", err)
	}

	// Frontmatter'ı parse et
	var fm MDFrontmatter
	err = yaml.Unmarshal([]byte(frontmatter), &fm)
	if err != nil {
		return nil, fmt.Errorf("frontmatter parsing failed: %w", err)
	}

	// Required field validations
	if fm.Title == "" {
		return nil, fmt.Errorf("title is required")
	}

	// Default values
	if fm.Author == "" {
		fm.Author = "Serkan Ursavaş"
	}
	if fm.Slug == "" {
		fm.Slug = h.generateSlug(fm.Title)
	}
	if fm.Excerpt == "" {
		fm.Excerpt = h.generateExcerpt(markdownContent)
	}
	if fm.ReadingTime == "" {
		fm.ReadingTime = h.calculateReadingTime(markdownContent)
	}

	// Date parsing
	publishedAt := time.Now()
	if fm.PublishedAt != "" {
		if parsed, err := time.Parse("2006-01-02", fm.PublishedAt); err == nil {
			publishedAt = parsed
		}
	}

	// Image path processing - relative paths'i absolute'a çevir
	processedContent := h.processImagePaths(markdownContent)

	// BlogPost oluştur
	post := &models.BlogPost{
		ID:              "blog:" + fm.Slug,
		Title:           fm.Title,
		Slug:            fm.Slug,
		Content:         processedContent,
		Excerpt:         fm.Excerpt,
		Author:          fm.Author,
		PublishedAt:     publishedAt,
		UpdatedAt:       time.Now(),
		Tags:            fm.Tags,
		ReadingTime:     fm.ReadingTime,
		ViewCount:       fm.ViewCount,
		Featured:        fm.Featured,
		FeaturedImage:   fm.FeaturedImage,
		Published:       true, // MD'den import ediliyorsa published kabul et
		MetaDescription: fm.Excerpt,
	}

	return post, nil
}

// extractFrontmatter - MD içeriğinden frontmatter'ı ayır
func (h *BlogHandler) extractFrontmatter(content string) (string, string, error) {
	content = strings.TrimSpace(content)
	
	// Frontmatter başlangıcını kontrol et
	if !strings.HasPrefix(content, "---") {
		return "", "", fmt.Errorf("frontmatter must start with ---")
	}
	
	// İkinci --- işaretini bul
	lines := strings.Split(content, "\n")
	var frontmatterEnd int = -1
	
	for i := 1; i < len(lines); i++ {
		if strings.TrimSpace(lines[i]) == "---" {
			frontmatterEnd = i
			break
		}
	}
	
	if frontmatterEnd == -1 {
		return "", "", fmt.Errorf("frontmatter must end with ---")
	}
	
	// Frontmatter ve content'i ayır
	frontmatterLines := lines[1:frontmatterEnd]
	frontmatter := strings.Join(frontmatterLines, "\n")
	
	var markdownContent string
	if frontmatterEnd+1 < len(lines) {
		contentLines := lines[frontmatterEnd+1:]
		markdownContent = strings.Join(contentLines, "\n")
	}
	
	return strings.TrimSpace(frontmatter), strings.TrimSpace(markdownContent), nil
}

// convertToMD - BlogPost'u MD formatına çevir
func (h *BlogHandler) convertToMD(post *models.BlogPost) string {
	// Frontmatter oluştur
	frontmatter := fmt.Sprintf(`---
title: "%s"
excerpt: "%s"
author: "%s"
publishedAt: "%s"
tags: [%s]
readingTime: "%s"
viewCount: %d
featured: %t
slug: "%s"
featuredImage: "%s"
---

%s`,
		post.Title,
		post.Excerpt,
		post.Author,
		post.PublishedAt.Format("2006-01-02"),
		h.formatTags(post.Tags),
		post.ReadingTime,
		post.ViewCount,
		post.Featured,
		post.Slug,
		post.FeaturedImage,
		post.Content,
	)

	return frontmatter
}

// Helper functions
func (h *BlogHandler) generateSlug(title string) string {
	slug := strings.ToLower(title)
	slug = strings.ReplaceAll(slug, " ", "-")
	slug = regexp.MustCompile(`[^a-z0-9\-]`).ReplaceAllString(slug, "")
	slug = regexp.MustCompile(`-+`).ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")
	return slug
}

func (h *BlogHandler) generateExcerpt(content string) string {
	// İlk paragrafı al
	lines := strings.Split(content, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if len(line) > 10 && !strings.HasPrefix(line, "#") {
			if len(line) > 150 {
				return line[:150] + "..."
			}
			return line
		}
	}
	return "No excerpt available"
}

func (h *BlogHandler) calculateReadingTime(content string) string {
	words := strings.Fields(content)
	wordCount := len(words)
	minutes := wordCount / 200 // 200 words per minute
	
	if minutes < 1 {
		return "1 min read"
	}
	return fmt.Sprintf("%d min read", minutes)
}

func (h *BlogHandler) formatTags(tags []string) string {
	if len(tags) == 0 {
		return ""
	}
	
	quoted := make([]string, len(tags))
	for i, tag := range tags {
		quoted[i] = fmt.Sprintf(`"%s"`, tag)
	}
	return strings.Join(quoted, ", ")
}

func (h *BlogHandler) processImagePaths(content string) string {
	// Markdown image pattern: ![alt](path)
	imagePattern := `!\[([^\]]*)\]\(([^)]+)\)`
	re := regexp.MustCompile(imagePattern)
	
	return re.ReplaceAllStringFunc(content, func(match string) string {
		submatch := re.FindStringSubmatch(match)
		if len(submatch) != 3 {
			return match
		}
		
		alt := submatch[1]
		path := submatch[2]
		
		// Skip if already absolute URL or data URI
		if strings.HasPrefix(path, "http://") || 
		   strings.HasPrefix(path, "https://") || 
		   strings.HasPrefix(path, "data:") {
			return match
		}
		
		// Convert relative paths to absolute
		// Assuming images are in /public directory
		if strings.HasPrefix(path, "/") {
			// Already absolute from root
			return match
		} else {
			// Relative path - convert to absolute
			absolutePath := "/" + strings.TrimPrefix(path, "./")
			return fmt.Sprintf("![%s](%s)", alt, absolutePath)
		}
	})
}

// deleteBlogImageFile - Blog slug'ına göre resim dosyasını sil
func (h *BlogHandler) deleteBlogImageFile(blogSlug string) {
	// Blog upload klasörü
	blogUploadDir := "./blog-upload"
	
	// Slug'ı sanitize et
	safeSlug := h.sanitizeBlogSlugForFile(blogSlug)
	pattern := fmt.Sprintf("blog-%s.*", safeSlug)
	
	// Matching dosyaları bul
	files, err := filepath.Glob(filepath.Join(blogUploadDir, pattern))
	if err != nil {
		fmt.Printf("Error finding blog image files: %v\n", err)
		return
	}
	
	// Dosyaları sil
	for _, file := range files {
		fmt.Printf("Deleting blog image file: %s\n", file)
		err := os.Remove(file)
		if err != nil {
			fmt.Printf("Error deleting blog image file %s: %v\n", file, err)
		}
	}
}

// sanitizeBlogSlugForFile - Blog slug'ını dosya adı için sanitize et
func (h *BlogHandler) sanitizeBlogSlugForFile(slug string) string {
	// Lowercase'e çevir
	name := strings.ToLower(slug)
	
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
		name = "unknown"
	}
	
	// Maksimum uzunluk (60 karakter)
	if len(name) > 60 {
		name = name[:60]
		name = strings.Trim(name, "-")
	}
	
	return name
}