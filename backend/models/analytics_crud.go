package models

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// AnalyticsRepository - Analytics için CRUD operations
type AnalyticsRepository struct {
	client *redis.Client
	ctx    context.Context
}

// NewAnalyticsRepository - Repository oluştur
func NewAnalyticsRepository(client *redis.Client) *AnalyticsRepository {
	return &AnalyticsRepository{
		client: client,
		ctx:    context.Background(),
	}
}

// V1 Compatibility Methods (Basit counter'lar)

// IncrementSiteVisits - Site ziyaret sayısını artır (V1: /counter)
func (r *AnalyticsRepository) IncrementSiteVisits() error {
	// Redis INCR komutu - atomic increment
	// JavaScript'te: counter++
	err := r.client.Incr(r.ctx, "analytics:site_visits").Err()
	if err != nil {
		return fmt.Errorf("failed to increment site visits: %w", err)
	}

	// Son güncelleme zamanını kaydet
	r.client.Set(r.ctx, "analytics:last_updated", time.Now().Unix(), 0)
	
	return nil
}

// IncrementProjectViews - Proje görüntüleme sayısını artır (V1: /projectviews)  
func (r *AnalyticsRepository) IncrementProjectViews() error {
	pipe := r.client.Pipeline()

	// Global counter'ı artır (V1 compatibility)
	pipe.Incr(r.ctx, "analytics:project_views")

	// Günlük project views'i de artır
	today := time.Now().Format("2006-01-02")
	dailyProjectViewsKey := fmt.Sprintf("analytics:daily:%s:project_views", today)
	pipe.Incr(r.ctx, dailyProjectViewsKey)
	pipe.Expire(r.ctx, dailyProjectViewsKey, time.Hour*24*30) // 30 gün sakla

	// Son güncelleme zamanını kaydet
	pipe.Set(r.ctx, "analytics:last_updated", time.Now().Unix(), 0)

	_, err := pipe.Exec(r.ctx)
	if err != nil {
		return fmt.Errorf("failed to increment project views: %w", err)
	}

	return nil
}

// IncrementBlogViews - Blog görüntüleme sayısını artır
func (r *AnalyticsRepository) IncrementBlogViews() error {
	err := r.client.Incr(r.ctx, "analytics:blog_views").Err()
	if err != nil {
		return fmt.Errorf("failed to increment blog views: %w", err)
	}

	r.client.Set(r.ctx, "analytics:last_updated", time.Now().Unix(), 0)
	return nil
}

// READ Operations

// GetAnalytics - Mevcut istatistikleri getir
func (r *AnalyticsRepository) GetAnalytics() (*Analytics, error) {
	// Pipeline ile tüm counter'ları al
	pipe := r.client.Pipeline()
	
	siteVisitsCmd := pipe.Get(r.ctx, "analytics:site_visits")
	projectViewsCmd := pipe.Get(r.ctx, "analytics:project_views")  
	blogViewsCmd := pipe.Get(r.ctx, "analytics:blog_views")
	lastUpdatedCmd := pipe.Get(r.ctx, "analytics:last_updated")

	_, err := pipe.Exec(r.ctx)
	if err != nil && err != redis.Nil {
		return nil, fmt.Errorf("failed to get analytics: %w", err)
	}

	// String'leri int'e çevir (default 0)
	siteVisits := r.getIntFromCmd(siteVisitsCmd)
	projectViews := r.getIntFromCmd(projectViewsCmd)
	blogViews := r.getIntFromCmd(blogViewsCmd)
	
	// Last updated timestamp'i al
	lastUpdated := time.Now()
	if lastUpdatedStr, err := lastUpdatedCmd.Result(); err == nil {
		if timestamp, err := time.Parse("1136239445", lastUpdatedStr); err == nil {
			lastUpdated = timestamp
		}
	}

	return &Analytics{
		SiteVisits:     siteVisits,
		ProjectViews:   projectViews,
		BlogViews:      blogViews,
		UniqueVisitors: 0, // TODO: Implement unique visitor tracking
		LastUpdated:    lastUpdated,
	}, nil
}

// V1 API Compatibility - Sadece site visits döndür
func (r *AnalyticsRepository) GetSiteVisits() (int, error) {
	result, err := r.client.Get(r.ctx, "analytics:site_visits").Result()
	if err == redis.Nil {
		return 0, nil // İlk defa çağrılıyor
	}
	if err != nil {
		return 0, fmt.Errorf("failed to get site visits: %w", err)
	}

	// String'i int'e çevir
	var visits int
	fmt.Sscanf(result, "%d", &visits)
	return visits, nil
}

// V1 API Compatibility - Sadece project views döndür  
func (r *AnalyticsRepository) GetProjectViews() (int, error) {
	result, err := r.client.Get(r.ctx, "analytics:project_views").Result()
	if err == redis.Nil {
		return 0, nil
	}
	if err != nil {
		return 0, fmt.Errorf("failed to get project views: %w", err)
	}

	var views int
	fmt.Sscanf(result, "%d", &views)
	return views, nil
}

// Event Tracking (V2 Advanced Features)

// TrackPageVisit - Sayfa ziyareti kaydet
func (r *AnalyticsRepository) TrackPageVisit(visit *PageVisit) error {
	visitJSON, err := visit.ToJSON()
	if err != nil {
		return fmt.Errorf("failed to marshal page visit: %w", err)
	}

	pipe := r.client.Pipeline()

	// Event'i kaydet (24 saat expire)
	pipe.Set(r.ctx, visit.ID, visitJSON, time.Hour*24)

	// Günlük sayfa istatistikleri
	today := time.Now().Format("2006-01-02")
	dailyKey := fmt.Sprintf("analytics:daily:%s:pages", today)
	pipe.HIncrBy(r.ctx, dailyKey, visit.Page, 1)
	pipe.Expire(r.ctx, dailyKey, time.Hour*24*30) // 30 gün sakla

	_, err = pipe.Exec(r.ctx)
	return err
}

// TrackProjectView - Proje görüntüleme eventi kaydet
func (r *AnalyticsRepository) TrackProjectView(event *ProjectViewEvent) error {
	eventJSON, err := event.ToJSON()
	if err != nil {
		return fmt.Errorf("failed to marshal project view: %w", err)
	}

	pipe := r.client.Pipeline()

	// Event'i kaydet
	pipe.Set(r.ctx, event.ID, eventJSON, time.Hour*24)

	// Proje başına görüntüleme sayısı
	projectViewsKey := fmt.Sprintf("analytics:project:%s:views", event.ProjectID)
	pipe.Incr(r.ctx, projectViewsKey)

	_, err = pipe.Exec(r.ctx)
	return err
}

// Helper Methods

// getIntFromCmd - Redis StringCmd'den int çıkar
func (r *AnalyticsRepository) getIntFromCmd(cmd *redis.StringCmd) int {
	result, err := cmd.Result()
	if err != nil {
		return 0 // Default value
	}

	var value int
	fmt.Sscanf(result, "%d", &value)
	return value
}

// ToJSON helper for events
func (pv *PageVisit) ToJSON() (string, error) {
	// Manual JSON creation (basit version)
	json := fmt.Sprintf(`{"id":"%s","page":"%s","ip":"%s","timestamp":"%s","duration":%d}`,
		pv.ID, pv.Page, pv.IP, pv.Timestamp.Format(time.RFC3339), pv.Duration)
	return json, nil
}

func (pve *ProjectViewEvent) ToJSON() (string, error) {
	json := fmt.Sprintf(`{"id":"%s","project_id":"%s","ip":"%s","timestamp":"%s","source":"%s"}`,
		pve.ID, pve.ProjectID, pve.IP, pve.Timestamp.Format(time.RFC3339), pve.Source)
	return json, nil
}

// RESET Operations (Development/Testing)

// ResetAllAnalytics - Tüm istatistikleri sıfırla
func (r *AnalyticsRepository) ResetAllAnalytics() error {
	pipe := r.client.Pipeline()
	
	pipe.Del(r.ctx, "analytics:site_visits")
	pipe.Del(r.ctx, "analytics:project_views")
	pipe.Del(r.ctx, "analytics:blog_views")
	pipe.Del(r.ctx, "analytics:last_updated")

	_, err := pipe.Exec(r.ctx)
	return err
}

// GetDailyStats - Son N günün istatistiklerini getir
func (r *AnalyticsRepository) GetDailyStats(days int) ([]DailyStats, error) {
	var dailyStats []DailyStats
	today := time.Now()

	for i := days - 1; i >= 0; i-- {
		date := today.AddDate(0, 0, -i)
		dateStr := date.Format("2006-01-02")

		// Redis'ten o günün verilerini al
		dailyKey := fmt.Sprintf("analytics:daily:%s:pages", dateStr)
		
		// O günkü sayfa ziyaretlerini topla
		pageVisits, err := r.client.HGetAll(r.ctx, dailyKey).Result()
		var siteVisits int
		if err == nil {
			for _, visits := range pageVisits {
				var visitCount int
				fmt.Sscanf(visits, "%d", &visitCount)
				siteVisits += visitCount
			}
		}

		// Günlük project views'i al
		dailyProjectViewsKey := fmt.Sprintf("analytics:daily:%s:project_views", dateStr)
		projectViews, err := r.client.Get(r.ctx, dailyProjectViewsKey).Result()
		var projectViewsCount int
		if err == nil {
			fmt.Sscanf(projectViews, "%d", &projectViewsCount)
		}
		
		dailyStats = append(dailyStats, DailyStats{
			Date:         dateStr,
			SiteVisits:   siteVisits,
			ProjectViews: projectViewsCount,
			BlogViews:    0, // Blog views henüz günlük tracking'i yok
			UniqueIPs:    0, // Unique IP tracking henüz yok
		})
	}

	return dailyStats, nil
}