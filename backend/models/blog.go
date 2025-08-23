package models

import (
	"encoding/json"
	"strings"
	"time"
)

// BlogPost struct - Blog yazısı için veri modeli
// V2'nin yeni özelliği, V1'de yoktu
type BlogPost struct {
	ID          string    `json:"id"`           // "blog:modern-css-techniques"
	Title       string    `json:"title"`        // "Modern CSS Techniques"
	Slug        string    `json:"slug"`         // URL için: "modern-css-techniques"  
	Content     string    `json:"content"`      // Markdown content (MDX)
	Excerpt     string    `json:"excerpt"`      // Özet (ilk paragraf)
	Author      string    `json:"author"`       // "Serkan Ursavaş"
	PublishedAt time.Time `json:"published_at"` // Yayın tarihi
	UpdatedAt   time.Time `json:"updated_at"`   // Son güncelleme
	Tags        []string  `json:"tags"`         // ["CSS", "Frontend", "Design"]
	ReadingTime   string    `json:"reading_time"`   // "6 min read"
	ViewCount     int       `json:"view_count"`     // Okunma sayısı
	Featured      bool      `json:"featured"`       // Öne çıkarılsın mı
	Published     bool      `json:"published"`      // Yayında mı, draft mı
	FeaturedImage string    `json:"featured_image"` // Öne çıkan resim URL'i
	
	// SEO için metadata
	MetaDescription string `json:"meta_description,omitempty"` // SEO description
	MetaKeywords    string `json:"meta_keywords,omitempty"`    // SEO keywords
}

// BlogPostSummary - Liste görünümü için hafif version
// Full content'i içermez, performance için
type BlogPostSummary struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Slug        string    `json:"slug"`
	Excerpt     string    `json:"excerpt"`
	Author      string    `json:"author"`
	PublishedAt time.Time `json:"published_at"`
	Tags        []string  `json:"tags"`
	ReadingTime   string    `json:"reading_time"`
	ViewCount     int       `json:"view_count"`
	Featured      bool      `json:"featured"`
	Published     bool      `json:"published"`
	FeaturedImage string    `json:"featured_image"`
}

// BlogResponse - API response'u için
type BlogResponse struct {
	Posts []BlogPostSummary `json:"posts"` // Liste görünümü
	Total int               `json:"total"` // Toplam yazı sayısı  
	Page  int               `json:"page"`  // Sayfa numarası
	Limit int               `json:"limit"` // Sayfa başına yazı
}

// BlogPostResponse - Tek yazı response'u
type BlogPostResponse struct {
	Post     BlogPost `json:"post"`     // Full content ile
	Related  []BlogPostSummary `json:"related"`  // İlgili yazılar
	NextPost *BlogPostSummary  `json:"next"`     // Sonraki yazı
	PrevPost *BlogPostSummary  `json:"previous"` // Önceki yazı
}

// TagResponse - Tag listesi response'u  
type TagResponse struct {
	Tags []TagInfo `json:"tags"`
}

// TagInfo - Tag bilgisi
type TagInfo struct {
	Name  string `json:"name"`  // "CSS"
	Count int    `json:"count"` // Bu tag'de kaç yazı var
}

// NewBlogPost - Yeni blog yazısı oluşturucu
func NewBlogPost(title, content, author string, tags []string) *BlogPost {
	slug := generateSlug(title)
	excerpt := generateExcerpt(content)
	readingTime := calculateReadingTime(content)
	
	return &BlogPost{
		ID:              "blog:" + slug,
		Title:           title,
		Slug:            slug,
		Content:         content,
		Excerpt:         excerpt,
		Author:          author,
		PublishedAt:     time.Now(),
		UpdatedAt:       time.Now(),
		Tags:            tags,
		ReadingTime:     readingTime,
		ViewCount:       0,
		Featured:        false,
		Published:       false, // Default draft
		MetaDescription: excerpt, // Default olarak excerpt kullan
	}
}

// generateSlug - Title'dan URL-friendly slug oluştur
// "Modern CSS Techniques" -> "modern-css-techniques"
func generateSlug(title string) string {
	// Basit implementation - gerçekte regex kullanılır
	slug := strings.ToLower(title)
	slug = strings.ReplaceAll(slug, " ", "-")
	slug = strings.ReplaceAll(slug, ".", "")
	slug = strings.ReplaceAll(slug, ",", "")
	return slug
}

// generateExcerpt - Content'in ilk 150 karakterini al
func generateExcerpt(content string) string {
	if len(content) <= 150 {
		return content
	}
	return content[:150] + "..."
}

// calculateReadingTime - Ortalama okuma süresini hesapla  
// 200 kelime/dakika varsayımı
func calculateReadingTime(content string) string {
	words := strings.Fields(content) // Kelimelere böl
	wordCount := len(words)
	minutes := wordCount / 200 // 200 kelime/dakika
	
	if minutes < 1 {
		return "1 min read"
	}
	return string(rune(minutes)) + " min read"
}

// ToJSON ve FromJSON methodları
func (bp *BlogPost) ToJSON() (string, error) {
	jsonBytes, err := json.Marshal(bp)
	if err != nil {
		return "", err
	}
	return string(jsonBytes), nil
}

func (bp *BlogPost) FromJSON(jsonStr string) error {
	return json.Unmarshal([]byte(jsonStr), bp)
}

// ToSummary - Full post'tan summary oluştur
func (bp *BlogPost) ToSummary() BlogPostSummary {
	return BlogPostSummary{
		ID:            bp.ID,
		Title:         bp.Title,
		Slug:          bp.Slug,
		Excerpt:       bp.Excerpt,
		Author:        bp.Author,
		PublishedAt:   bp.PublishedAt,
		Tags:          bp.Tags,
		ReadingTime:   bp.ReadingTime,
		ViewCount:     bp.ViewCount,
		Featured:      bp.Featured,
		Published:     bp.Published,
		FeaturedImage: bp.FeaturedImage,
	}
}

// IncrementViewCount - Okunma sayısını artır
func (bp *BlogPost) IncrementViewCount() {
	bp.ViewCount++
	bp.UpdatedAt = time.Now()
}

// Publish - Yazıyı yayına al
func (bp *BlogPost) Publish() {
	bp.Published = true
	bp.PublishedAt = time.Now()
	bp.UpdatedAt = time.Now()
}

// HasTag - Belirli tag var mı kontrol et
func (bp *BlogPost) HasTag(tag string) bool {
	for _, t := range bp.Tags {
		if strings.ToLower(t) == strings.ToLower(tag) {
			return true
		}
	}
	return false
}

// Helper functions (utility)

// GetPostsByTag - Tag'e göre filtrele
func GetPostsByTag(posts []BlogPost, tag string) []BlogPost {
	var filtered []BlogPost
	for _, post := range posts {
		if post.HasTag(tag) {
			filtered = append(filtered, post)
		}
	}
	return filtered
}

// GetFeaturedPosts - Öne çıkan yazıları getir
func GetFeaturedPosts(posts []BlogPost) []BlogPost {
	var featured []BlogPost
	for _, post := range posts {
		if post.Featured && post.Published {
			featured = append(featured, post)
		}
	}
	return featured
}

// GetPublishedPosts - Sadece yayındaki yazıları getir
func GetPublishedPosts(posts []BlogPost) []BlogPost {
	var published []BlogPost
	for _, post := range posts {
		if post.Published {
			published = append(published, post)
		}
	}
	return published
}