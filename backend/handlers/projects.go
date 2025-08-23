package handlers

import (
	"fmt"
	"net/http"
	"portfolio-backend/models"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// ProjectsHandler - Projects endpoint'leri için handler
type ProjectsHandler struct {
	projectsRepo  *models.ProjectsRepository
	analyticsRepo *models.AnalyticsRepository
}

// NewProjectsHandler - Yeni handler oluştur
func NewProjectsHandler(redisClient *redis.Client) *ProjectsHandler {
	return &ProjectsHandler{
		projectsRepo:  models.NewProjectsRepository(redisClient),
		analyticsRepo: models.NewAnalyticsRepository(redisClient),
	}
}

// GetProjects - V1 API uyumlu projects endpoint
// GET /api/projects
// Response: {"count": 5, "projects": [...]}
func (h *ProjectsHandler) GetProjects(c *gin.Context) {
	// Repository'den V1 format response al
	projectsResponse, err := h.projectsRepo.GetProjectsResponse()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get projects",
			"details": err.Error(),
		})
		return
	}

	// HTTP 200 OK ile projects döndür (V1 format)
	c.JSON(http.StatusOK, projectsResponse)
}

// GetProjectsByStatus - Status'a göre projects
// GET /api/projects?status=Live
func (h *ProjectsHandler) GetProjectsByStatus(c *gin.Context) {
	status := c.Query("status")
	if status == "" {
		// Status belirtilmemişse tüm projects'i döndür
		h.GetProjects(c)
		return
	}

	// Belirli status'taki projects'i al
	projects, err := h.projectsRepo.GetProjectsByStatus(status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get projects by status",
			"details": err.Error(),
		})
		return
	}

	// V1 format'ına uygun response
	c.JSON(http.StatusOK, gin.H{
		"status":   status,
		"count":    len(projects),
		"projects": projects,
	})
}

// GetLatestProjects - En yeni projeler
// GET /api/projects/latest?count=5
func (h *ProjectsHandler) GetLatestProjects(c *gin.Context) {
	// Query parameter'dan count al (default: 10)
	countStr := c.DefaultQuery("count", "10")
	count, err := strconv.Atoi(countStr)
	if err != nil || count <= 0 {
		count = 10
	}

	projects, err := h.projectsRepo.GetLatestProjects(count)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get latest projects",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Latest projects retrieved successfully",
		"count":    len(projects),
		"projects": projects,
	})
}

// GetPopularProjects - En popüler projeler (view count'a göre)
// GET /api/projects/popular?count=5
func (h *ProjectsHandler) GetPopularProjects(c *gin.Context) {
	countStr := c.DefaultQuery("count", "10")
	count, err := strconv.Atoi(countStr)
	if err != nil || count <= 0 {
		count = 10
	}

	projects, err := h.projectsRepo.GetPopularProjects(count)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get popular projects",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Popular projects retrieved successfully",
		"count":    len(projects),
		"projects": projects,
	})
}

// GetProjectStatuses - Tüm status'ları döndür
// GET /api/projects/statuses
func (h *ProjectsHandler) GetProjectStatuses(c *gin.Context) {
	statuses, err := h.projectsRepo.GetStatuses()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get statuses",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"statuses": statuses,
		"count":    len(statuses),
	})
}

// GetProjectByID - ID'ye göre tek proje
// GET /api/projects/:id
func (h *ProjectsHandler) GetProjectByID(c *gin.Context) {
	projectID := c.Param("id")

	project, err := h.projectsRepo.GetProjectByID(projectID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Project not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"project": project,
	})
}

// CreateProject - Yeni proje ekle (V2 feature)
// POST /api/projects
func (h *ProjectsHandler) CreateProject(c *gin.Context) {
	var request struct {
		Title       string                 `json:"title" binding:"required"`
		Description string                 `json:"description" binding:"required"`
		Image       string                 `json:"image" binding:"required"`
		Link        string                 `json:"link"`
		Tools       []models.ProjectTool   `json:"tools"`
		Status      string                 `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// Yeni project oluştur
	project := models.NewProject(
		request.Title,
		request.Description,
		request.Link,
		request.Image,
		request.Status,
		request.Tools,
	)

	// Repository'ye kaydet
	err := h.projectsRepo.CreateProject(project)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create project",
			"details": err.Error(),
		})
		return
	}

	// HTTP 201 Created
	c.JSON(http.StatusCreated, gin.H{
		"message": "Project created successfully",
		"project": project,
	})
}

// UpdateProject - Proje güncelle
// PUT /api/projects/:id
func (h *ProjectsHandler) UpdateProject(c *gin.Context) {
	projectID := c.Param("id")

	var request struct {
		Title       *string                `json:"title,omitempty"`
		Description *string                `json:"description,omitempty"`
		Image       *string                `json:"image"`  // Image için nil check yapacağız
		Link        *string                `json:"link,omitempty"`
		Tools       []models.ProjectTool   `json:"tools,omitempty"`
		Status      *string                `json:"status,omitempty"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
		})
		return
	}

	// Mevcut projeyi al
	existingProject, err := h.projectsRepo.GetProjectByID(projectID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Project not found",
		})
		return
	}

	// Sadece gönderilen field'ları güncelle
	if request.Title != nil && *request.Title != "" {
		existingProject.Title = *request.Title
	}
	if request.Description != nil && *request.Description != "" {
		existingProject.Description = *request.Description
	}
	// Image field'ı için özel handling - boş string da kabul et
	if request.Image != nil {
		existingProject.Image = *request.Image
	}
	if request.Link != nil && *request.Link != "" {
		existingProject.Link = *request.Link
	}
	if len(request.Tools) > 0 {
		existingProject.Tools = request.Tools
	}
	if request.Status != nil && *request.Status != "" {
		existingProject.Status = *request.Status
	}

	// Güncelle
	err = h.projectsRepo.UpdateProject(existingProject)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update project",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Project updated successfully",
		"project": existingProject,
	})
}

// DeleteProject - Proje sil
// DELETE /api/projects/:id
func (h *ProjectsHandler) DeleteProject(c *gin.Context) {
	projectID := c.Param("id")

	// Önce var mı kontrol et
	_, err := h.projectsRepo.GetProjectByID(projectID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Project not found",
		})
		return
	}

	// Sil
	err = h.projectsRepo.DeleteProject(projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete project",
		})
		return
	}

	// HTTP 204 No Content
	c.Status(http.StatusNoContent)
}

// IncrementProjectViews - Proje görüntüleme sayısını artır
// POST /api/projects/:id/views (V1'deki /projectviews için)
func (h *ProjectsHandler) IncrementProjectViews(c *gin.Context) {
	projectID := c.Param("id")

	// Specific project view'ini artır
	err := h.projectsRepo.IncrementProjectViews(projectID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Project not found or failed to increment views",
		})
		return
	}

	// Global analytics project views'i de artır (günlük tracking dahil)
	err = h.analyticsRepo.IncrementProjectViews()
	if err != nil {
		// Project view kaydı başarılı oldu ama analytics başarısız
		// Log olarak yazdır ama hata dönme
		fmt.Printf("Warning: Failed to increment analytics project views: %v\n", err)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Project views incremented successfully",
	})
}

// MigrateV1Projects - V1'den bulk project migration
// POST /api/projects/migrate
func (h *ProjectsHandler) MigrateV1Projects(c *gin.Context) {
	var request struct {
		Projects []models.Project `json:"projects" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
		})
		return
	}

	// Bulk create
	err := h.projectsRepo.CreateMultipleProjects(request.Projects)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to migrate projects",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Projects migrated successfully",
		"count":   len(request.Projects),
	})
}