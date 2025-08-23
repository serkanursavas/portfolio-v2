package models

import (
	"encoding/json"
	"time"
)

// ProjectTool - Projede kullanılan teknoloji/tool
// V1'de tools array içindeki her element için
type ProjectTool struct {
	Skill string `json:"skill"` // "React", "TailwindCSS" vs
	Icon  string `json:"icon"`  // Local uploads or external URL
}

// Project struct - Tek bir proje için veri modeli
// V1 API format'ına tam uygun
type Project struct {
	ID          string        `json:"id"`                    // MongoDB ObjectID'den geldi
	Title       string        `json:"title"`                 // "404 Squad"
	Description string        `json:"description"`           // Açıklama
	Tools       []ProjectTool `json:"tools"`                 // Kullanılan teknolojiler
	Link        string        `json:"link"`                  // Live URL veya GitHub
	Image       string        `json:"image"`                 // Proje görseli (local uploads)
	Status      string        `json:"status"`                // "Live", "Github", "In Progress"
	CreatedAt   string        `json:"createdAt,omitempty"`   // V1'den gelen format
	
	// V2'de ekleyebileceğimiz alanlar
	ViewCount   int       `json:"view_count,omitempty"`   // Kaç kez görüntülendi  
	Featured    bool      `json:"featured,omitempty"`     // Öne çıkarılsın mı
	UpdatedAt   time.Time `json:"updated_at,omitempty"`   // Son güncelleme
}

// ProjectsResponse - API response'u için
// V1 format: {"count": 6, "projects": [...]}
type ProjectsResponse struct {
	Count    int       `json:"count"`    // Toplam proje sayısı
	Projects []Project `json:"projects"` // Projeler listesi
}

// ProjectsByStatus - Status'a göre gruplu response
type ProjectsByStatus struct {
	Live       []Project `json:"live"`        // Canlı projeler
	GitHub     []Project `json:"github"`      // GitHub'daki projeler  
	InProgress []Project `json:"in_progress"` // Devam eden projeler
}

// NewProject - Yeni proje oluşturucu
func NewProject(title, description, link, image, status string, tools []ProjectTool) *Project {
	return &Project{
		ID:          generateProjectID(title), // Helper fonksiyonla ID üret
		Title:       title,
		Description: description,
		Tools:       tools,
		Link:        link,
		Image:       image,
		Status:      status,
		CreatedAt:   time.Now().Format("2006-01-02T15:04:05.000Z"), // V1 format
		ViewCount:   0,
		Featured:    false,
		UpdatedAt:   time.Now(),
	}
}

// generateProjectID - Proje için unique ID oluştur
// Redis key format: "project:404-squad"
func generateProjectID(title string) string {
	// Title'dan safe ID oluştur (basit version)
	return "project:" + title
}

// ToJSON - JSON string'e çevir
func (p *Project) ToJSON() (string, error) {
	jsonBytes, err := json.Marshal(p)
	if err != nil {
		return "", err
	}
	return string(jsonBytes), nil
}

// FromJSON - JSON string'den struct oluştur
func (p *Project) FromJSON(jsonStr string) error {
	return json.Unmarshal([]byte(jsonStr), p)
}

// GetByStatus - Belirli status'taki projeleri filtrele
func GetProjectsByStatus(projects []Project, status string) []Project {
	var filtered []Project
	for _, project := range projects {
		if project.Status == status {
			filtered = append(filtered, project)
		}
	}
	return filtered
}

// GetLatest - En yeni projeleri getir (CreatedAt'e göre)
func GetLatestProjects(projects []Project, count int) []Project {
	// Basit implementation - gerçekte sorting yapılacak
	if len(projects) <= count {
		return projects
	}
	return projects[:count]
}

// IncrementViewCount - Görüntüleme sayısını artır
// Bu method Redis'te counter'ı güncelleyecek
func (p *Project) IncrementViewCount() {
	p.ViewCount++
	p.UpdatedAt = time.Now()
}

// GetToolNames - Sadece tool isimlerini al (Redis için)
func (p *Project) GetToolNames() []string {
	var toolNames []string
	for _, tool := range p.Tools {
		toolNames = append(toolNames, tool.Skill)
	}
	return toolNames
}

// HasTool - Projede belirli bir tool kullanılıyor mu?
func (p *Project) HasTool(toolName string) bool {
	for _, tool := range p.Tools {
		if tool.Skill == toolName {
			return true
		}
	}
	return false
}