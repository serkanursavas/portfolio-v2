package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"portfolio-backend/config"
	"portfolio-backend/handlers"
	"portfolio-backend/middleware"

	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg := config.LoadConfig()

	// Initialize Redis connection
	err := config.InitRedis(cfg)
	if err != nil {
		log.Fatal("Failed to initialize Redis:", err)
	}
	
	// Graceful shutdown için Redis bağlantısını kapat
	defer config.CloseRedis()

	// Set Gin mode
	gin.SetMode(cfg.Server.GinMode)

	// Initialize Gin router
	router := gin.Default()

	// Basic middleware
	setupMiddleware(router, cfg)

	// Static file serving for uploads with no-cache headers
	router.GET("/uploads/*filepath", func(c *gin.Context) {
		// No-cache headers to prevent image caching issues
		c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
		c.Header("Pragma", "no-cache") 
		c.Header("Expires", "0")
		
		// Get and decode file path
		filepath := c.Param("filepath")
		
		// URL decode the filepath to handle encoded characters
		decodedFilepath, err := url.QueryUnescape(filepath)
		if err != nil {
			log.Printf("Failed to decode filepath: %s, error: %v", filepath, err)
			decodedFilepath = filepath // Fall back to original if decode fails
		}
		
		fullPath := "./uploads" + decodedFilepath
		
		// Debug log
		log.Printf("Serving file: %s (decoded: %s, full path: %s)", filepath, decodedFilepath, fullPath)
		
		// Security check: prevent path traversal
		if strings.Contains(decodedFilepath, "..") {
			log.Printf("Path traversal attempt blocked: %s", decodedFilepath)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file path"})
			return
		}
		
		// Check if file exists
		if _, err := os.Stat(fullPath); os.IsNotExist(err) {
			log.Printf("File not found: %s", fullPath)
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
			return
		}
		
		c.File(fullPath)
	})

	// Static file serving for skills-upload with no-cache headers
	router.GET("/skills-upload/*filepath", func(c *gin.Context) {
		// No-cache headers to prevent image caching issues
		c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
		c.Header("Pragma", "no-cache") 
		c.Header("Expires", "0")
		
		// Get and decode file path
		filepath := c.Param("filepath")
		
		// URL decode the filepath to handle encoded characters
		decodedFilepath, err := url.QueryUnescape(filepath)
		if err != nil {
			log.Printf("Failed to decode skills filepath: %s, error: %v", filepath, err)
			decodedFilepath = filepath // Fall back to original if decode fails
		}
		
		fullPath := "./skills-upload" + decodedFilepath
		
		// Debug log
		log.Printf("Serving skills file: %s (decoded: %s, full path: %s)", filepath, decodedFilepath, fullPath)
		
		// Security check: prevent path traversal
		if strings.Contains(decodedFilepath, "..") {
			log.Printf("Path traversal attempt blocked: %s", decodedFilepath)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file path"})
			return
		}
		
		// Check if file exists
		if _, err := os.Stat(fullPath); os.IsNotExist(err) {
			log.Printf("Skills file not found: %s", fullPath)
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
			return
		}
		
		c.File(fullPath)
	})

	// Static file serving for blog-upload with no-cache headers
	router.GET("/blog-upload/*filepath", func(c *gin.Context) {
		// No-cache headers to prevent image caching issues
		c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
		c.Header("Pragma", "no-cache") 
		c.Header("Expires", "0")
		
		// Get and decode file path
		filepath := c.Param("filepath")
		
		// URL decode the filepath to handle encoded characters
		decodedFilepath, err := url.QueryUnescape(filepath)
		if err != nil {
			log.Printf("Failed to decode blog filepath: %s, error: %v", filepath, err)
			decodedFilepath = filepath // Fall back to original if decode fails
		}
		
		fullPath := "./blog-upload" + decodedFilepath
		
		// Debug log
		log.Printf("Serving blog file: %s (decoded: %s, full path: %s)", filepath, decodedFilepath, fullPath)
		
		// Security check: prevent path traversal
		if strings.Contains(decodedFilepath, "..") {
			log.Printf("Path traversal attempt blocked: %s", decodedFilepath)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file path"})
			return
		}
		
		// Check if file exists
		if _, err := os.Stat(fullPath); os.IsNotExist(err) {
			log.Printf("Blog file not found: %s", fullPath)
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
			return
		}
		
		c.File(fullPath)
	})

	// Setup routes
	setupRoutes(router, cfg)

	// Start server
	port := ":" + cfg.Server.Port
	fmt.Printf("🚀 Server starting on port %s\n", cfg.Server.Port)
	fmt.Printf("📍 Environment: %s\n", cfg.Server.GinMode)
	fmt.Printf("🌐 Access: http://localhost%s\n", port)

	if err := router.Run(port); err != nil {
		log.Fatal("❌ Failed to start server:", err)
	}
}

func setupMiddleware(router *gin.Engine, cfg *config.Config) {
	// CORS middleware
	router.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", cfg.API.CORSOrigins)
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, Cache-Control, Pragma, Expires")
		c.Header("Access-Control-Allow-Credentials", "false")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	})

	// Logger middleware
	router.Use(gin.Logger())

	// Recovery middleware
	router.Use(gin.Recovery())
}

func setupRoutes(router *gin.Engine, cfg *config.Config) {
	// Redis client'ı al
	redisClient := config.GetRedisClient()
	
	// Handler'ları oluştur
	skillsHandler := handlers.NewSkillsHandler(redisClient)
	projectsHandler := handlers.NewProjectsHandler(redisClient)
	blogHandler := handlers.NewBlogHandler(redisClient)
	analyticsHandler := handlers.NewAnalyticsHandler(redisClient)
	uploadHandler := handlers.NewUploadHandler(redisClient)
	authHandler := handlers.NewAuthHandler(cfg, redisClient)
	
	// Middleware'ları oluştur
	authMiddleware := middleware.NewAuthMiddleware(cfg, redisClient)
	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"message": "Portfolio Backend API is running",
			"version": "1.0.0",
		})
	})

	// API v1 group
	v1 := router.Group("/api/v1")
	{
		// Test endpoint
		v1.GET("/test", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"message": "API v1 is working!",
				"data":    "Hello from Portfolio Backend",
			})
		})

		// Redis test endpoint
		v1.GET("/redis-test", redisTestHandler)

		// Skills endpoints (public)
		v1.GET("/skills", skillsHandler.GetSkills)
		v1.GET("/skills/categories", skillsHandler.GetSkillCategories)

		// Skills admin endpoints (protected)
		skillsAdmin := v1.Group("/skills").Use(authMiddleware.RequireAuth())
		{
			skillsAdmin.POST("", skillsHandler.CreateSkill)
			skillsAdmin.PUT("/:id", skillsHandler.UpdateSkill)
			skillsAdmin.DELETE("/:id", skillsHandler.DeleteSkill)
			skillsAdmin.POST("/migrate", skillsHandler.MigrateV1Skills)
		}

		// Projects endpoints (public)
		v1.GET("/projects", projectsHandler.GetProjects)
		v1.GET("/projects/latest", projectsHandler.GetLatestProjects)
		v1.GET("/projects/popular", projectsHandler.GetPopularProjects)
		v1.GET("/projects/statuses", projectsHandler.GetProjectStatuses)
		v1.GET("/projects/:id", projectsHandler.GetProjectByID)
		v1.POST("/projects/:id/views", projectsHandler.IncrementProjectViews)

		// Projects admin endpoints (protected)
		projectsAdmin := v1.Group("/projects").Use(authMiddleware.RequireAuth())
		{
			projectsAdmin.POST("", projectsHandler.CreateProject)
			projectsAdmin.PUT("/:id", projectsHandler.UpdateProject)
			projectsAdmin.DELETE("/:id", projectsHandler.DeleteProject)
			projectsAdmin.POST("/migrate", projectsHandler.MigrateV1Projects)
		}

		// Blog endpoints (public)
		v1.GET("/blog/posts", blogHandler.GetPosts)
		v1.GET("/blog/posts/latest", blogHandler.GetLatestPosts)
		v1.GET("/blog/posts/popular", blogHandler.GetPopularPosts)
		v1.GET("/blog/posts/:slug", blogHandler.GetPostBySlug)
		v1.GET("/blog/tags", blogHandler.GetTags)
		v1.POST("/blog/posts/:id/views", blogHandler.IncrementPostViews)

		// Blog admin endpoints (protected)
		adminBlog := v1.Group("/blog/admin").Use(authMiddleware.RequireAuth())
		{
			adminBlog.GET("/posts", blogHandler.GetAllPostsAdmin)
		}

		// Blog management endpoints (protected)
		blogAdmin := v1.Group("/blog").Use(authMiddleware.RequireAuth())
		{
			blogAdmin.POST("/posts", blogHandler.CreatePost)
			blogAdmin.PUT("/posts/:id", blogHandler.UpdatePost)
			blogAdmin.DELETE("/posts/:id", blogHandler.DeletePost)
			blogAdmin.POST("/posts/migrate", blogHandler.MigratePosts)
		}
		
		// MD Import/Export endpoints (protected)
		mdAdmin := v1.Group("/blog").Use(authMiddleware.RequireAuth())
		{
			mdAdmin.POST("/import-md", blogHandler.ImportMD)
			mdAdmin.POST("/import-bulk", blogHandler.ImportBulkMD)
			mdAdmin.GET("/export-md/:slug", blogHandler.ExportMD)
		}

		// Analytics endpoints
		v1.GET("/analytics/stats", analyticsHandler.GetVisitStats)
		v1.GET("/analytics/all", analyticsHandler.GetAllStats)
		v1.POST("/analytics/visit", analyticsHandler.RecordVisit)
		v1.POST("/analytics/test-increment", analyticsHandler.TestIncrementCounters) // Development only

		// Upload endpoints (all protected - admin only)
		uploadAdmin := v1.Group("/upload").Use(authMiddleware.RequireAuth())
		{
			uploadAdmin.POST("", uploadHandler.UploadFile)
			uploadAdmin.POST("/multiple", uploadHandler.UploadMultiple)
			uploadAdmin.POST("/project/:id", uploadHandler.UploadProjectImage) // Smart project image naming
			uploadAdmin.POST("/skill/:skillName", uploadHandler.UploadSkillIcon) // Smart skill icon naming
			uploadAdmin.POST("/blog-image", uploadHandler.UploadBlogImage) // Blog image upload
			uploadAdmin.POST("/rename/:projectId", uploadHandler.RenameProjectImage) // Rename timestamp to smart naming
			uploadAdmin.POST("/rename-skill/:skillName", uploadHandler.RenameSkillIcon) // Rename timestamp to smart naming for skills
			uploadAdmin.POST("/migrate-skills", uploadHandler.MigrateSkillIconsFromFirebase) // Migrate Firebase skill icons to local
			uploadAdmin.GET("/uploads", uploadHandler.GetUploadedFiles)
			uploadAdmin.GET("/project-images", uploadHandler.GetProjectImageURLs) // Get all project image URLs from Redis
			uploadAdmin.DELETE("/uploads/:filename", uploadHandler.DeleteFile)
		}

		// Authentication endpoints (public)
		v1.POST("/auth/login", authHandler.Login)
		v1.POST("/auth/logout", authHandler.Logout)
		v1.GET("/auth/verify", authHandler.Verify)
	}

	// V1 API compatibility group (for migration)
	api := router.Group("/api")
	{
		api.GET("/skills", skillsHandler.GetSkills)         // V1 compatibility
		api.GET("/projects", projectsHandler.GetProjects)   // V1 compatibility
		api.GET("/blog/posts", blogHandler.GetPosts)        // V1 compatibility
		api.GET("/blog/posts/:slug", blogHandler.GetPostBySlug) // V1 compatibility
		api.GET("/blog/tags", blogHandler.GetTags)          // V1 compatibility
		api.POST("/counter", analyticsHandler.IncrementCounter)     // V1 compatibility
		api.POST("/projectviews", analyticsHandler.IncrementProjectView) // V1 compatibility
	}
}

// Redis test handler - Redis bağlantısını ve temel operasyonları test eder
func redisTestHandler(c *gin.Context) {
	// Context oluştur - 5 saniye timeout ile
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel() // İşlem bitince context'i temizle

	// Redis client'ı al
	rdb := config.GetRedisClient()
	
	// Test key-value çifti
	testKey := "test:go-redis"
	testValue := "Hello from Go Redis!"

	// Redis'e veri yaz (SET operation)
	err := rdb.Set(ctx, testKey, testValue, time.Minute*5).Err() // 5 dakika expire
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to write to Redis",
			"details": err.Error(),
		})
		return
	}

	// Redis'den veri oku (GET operation) 
	retrievedValue, err := rdb.Get(ctx, testKey).Result()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to read from Redis",
			"details": err.Error(),
		})
		return
	}

	// Ping test
	pingResult, err := rdb.Ping(ctx).Result()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Redis ping failed",
			"details": err.Error(),
		})
		return
	}

	// Başarılı response döndür
	c.JSON(http.StatusOK, gin.H{
		"message":         "Redis test successful! 🎉",
		"ping":           pingResult,
		"written_value":  testValue,
		"retrieved_value": retrievedValue,
		"values_match":   testValue == retrievedValue,
		"timestamp":      time.Now().Format("2006-01-02 15:04:05"),
	})
}

// Placeholder handlers - No longer needed, using real handlers now