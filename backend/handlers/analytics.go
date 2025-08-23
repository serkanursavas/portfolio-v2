package handlers

import (
	"fmt"
	"net/http"
	"portfolio-backend/models"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// AnalyticsHandler - Analytics endpoint'leri için handler
type AnalyticsHandler struct {
	analyticsRepo *models.AnalyticsRepository
}

// NewAnalyticsHandler - Yeni handler oluştur
func NewAnalyticsHandler(redisClient *redis.Client) *AnalyticsHandler {
	return &AnalyticsHandler{
		analyticsRepo: models.NewAnalyticsRepository(redisClient),
	}
}

// RecordVisit - Site ziyaretini kaydet
// POST /api/analytics/visit
// Body: {"page": "/", "user_agent": "...", "ip": "..."}
func (h *AnalyticsHandler) RecordVisit(c *gin.Context) {
	var request struct {
		Page     string `json:"page" binding:"required"`
		Duration int    `json:"duration"` // seconds
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// IP adresini header'dan al
	clientIP := c.ClientIP()

	// PageVisit oluştur
	pageVisit := &models.PageVisit{
		ID:        "visit:" + fmt.Sprintf("%d", time.Now().UnixNano()),
		Page:      request.Page,
		IP:        clientIP,
		Timestamp: time.Now(),
		Duration:  request.Duration,
	}

	// Repository'ye kaydet
	err := h.analyticsRepo.TrackPageVisit(pageVisit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to record visit",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":    "Visit recorded successfully",
		"visit_id":   pageVisit.ID,
		"timestamp":  pageVisit.Timestamp,
	})
}

// GetVisitStats - Ziyaret istatistiklerini getir
// GET /api/analytics/stats
func (h *AnalyticsHandler) GetVisitStats(c *gin.Context) {
	stats, err := h.analyticsRepo.GetAnalytics()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get visit stats",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// Basit analytics - V1 API uyumluluğu için sadece temel endpoints

// IncrementProjectView - Proje görüntüleme sayısını artır (V1 compatibility)
// POST /api/projectviews
// Body: {"id": "project-id"} veya boş body
func (h *AnalyticsHandler) IncrementProjectView(c *gin.Context) {
	// V1 API sadece genel project views sayısını artırıyordu
	err := h.analyticsRepo.IncrementProjectViews()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to increment project views",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Project views incremented successfully",
		"timestamp": time.Now(),
	})
}

// IncrementCounter - Genel sayaç artırma (V1 compatibility)
// POST /api/counter
// V1'de body boş, sadece site visits artır
func (h *AnalyticsHandler) IncrementCounter(c *gin.Context) {
	// V1 API sadece site visits sayısını artırıyordu
	err := h.analyticsRepo.IncrementSiteVisits()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to increment site visits",
			"details": err.Error(),
		})
		return
	}

	// Güncel sayıyı da döndür
	currentCount, err := h.analyticsRepo.GetSiteVisits()
	if err != nil {
		currentCount = 0 // Error durumunda 0 döndür
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Site visits incremented successfully",
		"count":     currentCount,
		"timestamp": time.Now(),
	})
}

// GetAllStats - Tüm istatistikleri getir (V2 feature)
// GET /api/analytics/all
func (h *AnalyticsHandler) GetAllStats(c *gin.Context) {
	analytics, err := h.analyticsRepo.GetAnalytics()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get all stats",
			"details": err.Error(),
		})
		return
	}

	// Günlük verileri de ekle
	dailyStats, err := h.analyticsRepo.GetDailyStats(7) // Son 7 gün
	if err != nil {
		fmt.Printf("Warning: Failed to get daily stats: %v\n", err)
		dailyStats = []models.DailyStats{} // Empty slice
	}

	response := gin.H{
		"visits":       analytics.SiteVisits,
		"project_view": analytics.ProjectViews,
		"blog_views":   analytics.BlogViews,
		"last_updated": analytics.LastUpdated,
		"daily_stats":  dailyStats,
	}

	c.JSON(http.StatusOK, response)
}

// TestIncrementCounters - Test için counter'ları artır (Development only)
// POST /api/analytics/test-increment
func (h *AnalyticsHandler) TestIncrementCounters(c *gin.Context) {
	// Basit test verileri oluştur
	for i := 0; i < 10; i++ {
		h.analyticsRepo.IncrementSiteVisits()
	}
	
	for i := 0; i < 5; i++ {
		h.analyticsRepo.IncrementProjectViews()
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Test counters incremented",
		"site_visits_added": 10,
		"project_views_added": 5,
	})
}