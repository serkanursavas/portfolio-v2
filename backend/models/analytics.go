package models

import (
	"encoding/json"
	"time"
)

// Analytics struct - Site analitikleri için
type Analytics struct {
	// V1 compatibility
	SiteVisits    int `json:"visits"`       // V1'deki /counter
	ProjectViews  int `json:"project_view"` // V1'deki /projectviews
	
	// V2 extensions
	BlogViews     int `json:"blog_views"`     // Blog toplam görüntüleme
	UniqueVisitors int `json:"unique_visitors"` // Benzersiz ziyaretçi
	
	// Timestamp
	LastUpdated time.Time `json:"last_updated"`
}

// PageVisit - Sayfa ziyareti detayı
type PageVisit struct {
	ID        string    `json:"id"`         // "visit:20250109-143022"
	Page      string    `json:"page"`       // "/", "/about", "/blog/post-slug"
	IP        string    `json:"ip"`         // "192.168.1.1" (hash'lenebilir privacy için)
	UserAgent string    `json:"user_agent"` // Browser bilgisi
	Referrer  string    `json:"referrer"`   // Nereden geldi
	Timestamp time.Time `json:"timestamp"`  // Ziyaret zamanı
	Duration  int       `json:"duration"`   // Sayfada kalma süresi (saniye)
}

// ProjectViewEvent - Proje görüntüleme eventi
type ProjectViewEvent struct {
	ID        string    `json:"id"`         // "project_view:20250109-143022"
	ProjectID string    `json:"project_id"` // "project:404-squad"
	IP        string    `json:"ip"`         // Ziyaretçi IP (privacy için hash)
	UserAgent string    `json:"user_agent"` // Browser
	Timestamp time.Time `json:"timestamp"`  // Tıklama zamanı
	Source    string    `json:"source"`     // "homepage", "works_page"
}

// BlogViewEvent - Blog yazısı görüntüleme eventi  
type BlogViewEvent struct {
	ID       string    `json:"id"`        // "blog_view:20250109-143022"
	PostSlug string    `json:"post_slug"` // "modern-css-techniques"
	IP       string    `json:"ip"`        // Hash'li IP
	ReadTime int       `json:"read_time"` // Okuma süresi (saniye)
	Source   string    `json:"source"`    // "search", "social", "direct"
	Timestamp time.Time `json:"timestamp"`
}

// DailyStats - Günlük istatistikler
type DailyStats struct {
	Date         string `json:"date"`          // "2025-01-09"
	SiteVisits   int    `json:"site_visits"`   // Günlük site ziyareti
	ProjectViews int    `json:"project_views"` // Günlük proje görüntüleme
	BlogViews    int    `json:"blog_views"`    // Günlük blog görüntüleme
	UniqueIPs    int    `json:"unique_ips"`    // Günlük benzersiz IP
}

// AnalyticsResponse - API response'u
type AnalyticsResponse struct {
	Current   Analytics    `json:"current"`    // Şu anki toplam sayılar
	Daily     []DailyStats `json:"daily"`      // Son 30 günün istatistikleri
	TopPages  []PageStat   `json:"top_pages"`  // En çok ziyaret edilen sayfalar
	TopPosts  []PostStat   `json:"top_posts"`  // En çok okunan blog yazıları
}

// PageStat - Sayfa istatistiği
type PageStat struct {
	Page      string `json:"page"`       // "/about", "/works"
	Views     int    `json:"views"`      // Görüntüleme sayısı
	UniqueIPs int    `json:"unique_ips"` // Benzersiz ziyaretçi
}

// PostStat - Blog yazısı istatistiği
type PostStat struct {
	Slug      string `json:"slug"`       // "modern-css-techniques"
	Title     string `json:"title"`      // "Modern CSS Techniques"
	Views     int    `json:"views"`      // Görüntüleme sayısı
	AvgReadTime int  `json:"avg_read_time"` // Ortalama okuma süresi
}

// NewAnalytics - Yeni analytics instance oluştur
func NewAnalytics() *Analytics {
	return &Analytics{
		SiteVisits:     0,
		ProjectViews:   0, 
		BlogViews:      0,
		UniqueVisitors: 0,
		LastUpdated:    time.Now(),
	}
}

// NewPageVisit - Yeni sayfa ziyareti kaydet
func NewPageVisit(page, ip, userAgent, referrer string) *PageVisit {
	return &PageVisit{
		ID:        generateVisitID(),
		Page:      page,
		IP:        hashIP(ip), // Privacy için hash
		UserAgent: userAgent,
		Referrer:  referrer,
		Timestamp: time.Now(),
		Duration:  0, // Başlangıçta 0, daha sonra güncellenecek
	}
}

// NewProjectViewEvent - Yeni proje görüntüleme eventi
func NewProjectViewEvent(projectID, ip, userAgent, source string) *ProjectViewEvent {
	return &ProjectViewEvent{
		ID:        generateProjectViewID(),
		ProjectID: projectID,
		IP:        hashIP(ip),
		UserAgent: userAgent,
		Timestamp: time.Now(),
		Source:    source,
	}
}

// NewBlogViewEvent - Yeni blog görüntüleme eventi
func NewBlogViewEvent(postSlug, ip, source string) *BlogViewEvent {
	return &BlogViewEvent{
		ID:        generateBlogViewID(),
		PostSlug:  postSlug,
		IP:        hashIP(ip),
		ReadTime:  0, // Başlangıçta 0
		Source:    source,
		Timestamp: time.Now(),
	}
}

// IncrementSiteVisits - Site ziyaret sayısını artır (V1 compatibility)
func (a *Analytics) IncrementSiteVisits() {
	a.SiteVisits++
	a.LastUpdated = time.Now()
}

// IncrementProjectViews - Proje görüntüleme sayısını artır (V1 compatibility)  
func (a *Analytics) IncrementProjectViews() {
	a.ProjectViews++
	a.LastUpdated = time.Now()
}

// IncrementBlogViews - Blog görüntüleme sayısını artır
func (a *Analytics) IncrementBlogViews() {
	a.BlogViews++
	a.LastUpdated = time.Now()
}

// ToJSON ve FromJSON methodları
func (a *Analytics) ToJSON() (string, error) {
	jsonBytes, err := json.Marshal(a)
	if err != nil {
		return "", err
	}
	return string(jsonBytes), nil
}

func (a *Analytics) FromJSON(jsonStr string) error {
	return json.Unmarshal([]byte(jsonStr), a)
}

// Helper functions

// generateVisitID - Benzersiz ziyaret ID'si oluştur
func generateVisitID() string {
	return "visit:" + time.Now().Format("20060102-150405")
}

// generateProjectViewID - Benzersiz proje görüntüleme ID'si
func generateProjectViewID() string {
	return "project_view:" + time.Now().Format("20060102-150405")
}

// generateBlogViewID - Benzersiz blog görüntüleme ID'si
func generateBlogViewID() string {
	return "blog_view:" + time.Now().Format("20060102-150405")
}

// hashIP - IP adresini privacy için hash'le (basit version)
func hashIP(ip string) string {
	// Basit implementation - gerçekte crypto/sha256 kullanılır
	if len(ip) > 10 {
		return "hashed_" + ip[:10]
	}
	return "hashed_" + ip
}

// GetTodayStats - Bugünün istatistiklerini oluştur
func (a *Analytics) GetTodayStats() DailyStats {
	today := time.Now().Format("2006-01-02")
	return DailyStats{
		Date:         today,
		SiteVisits:   a.SiteVisits,   // Toplam değil, bugünün değeri olacak
		ProjectViews: a.ProjectViews, // Redis'te günlük counter tutulacak
		BlogViews:    a.BlogViews,
		UniqueIPs:    a.UniqueVisitors,
	}
}