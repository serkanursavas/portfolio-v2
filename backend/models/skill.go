package models

import (
	"encoding/json"
	"time"
)

// Skill struct - Tek bir yetenek için veri modeli
// Go'da struct = JavaScript'teki class/interface
type Skill struct {
	// JSON tag'leri API response'unda nasıl görüneceğini belirtir
	ID       string `json:"id"`       // Redis key için
	Category string `json:"category"` // "Languages", "Frameworks" vs
	Skill    string `json:"skill"`    // "JavaScript", "React" vs  
	Icon     string `json:"icon"`     // Local uploads or external URL
	
	// Metadata (V1'de yoktu ama V2'de ekleyebiliriz)
	CreatedAt time.Time `json:"created_at,omitempty"` // omitempty = boşsa JSON'a dahil etme
	UpdatedAt time.Time `json:"updated_at,omitempty"`
}

// SkillCategory struct - Kategori bilgisi için
type SkillCategory struct {
	Name  string `json:"name"`  // "Languages"
	Count int    `json:"count"` // Bu kategoride kaç skill var
}

// SkillsResponse - API response'u için
// V1 API format'ına uygun: {"categories": [...], "skills": [...]}
type SkillsResponse struct {
	Categories []string `json:"categories"` // ["Languages", "Frameworks", ...]
	Skills     []Skill  `json:"skills"`     // Tüm skillerin listesi
}

// NewSkill - Yeni skill oluşturucu fonksiyon (constructor gibi)
// Bu Go'da factory pattern'dir
func NewSkill(category, skill, icon string) *Skill {
	return &Skill{
		ID:        generateSkillID(category, skill), // Helper fonksiyonla ID üret
		Category:  category,
		Skill:     skill,
		Icon:      icon,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}

// generateSkillID - Skill için unique ID oluştur
// Redis key format: "skill:languages:javascript"
func generateSkillID(category, skill string) string {
	return "skill:" + category + ":" + skill
}

// ToJSON - Struct'ı JSON string'e çevir
// JavaScript'teki JSON.stringify() gibi
func (s *Skill) ToJSON() (string, error) {
	jsonBytes, err := json.Marshal(s)
	if err != nil {
		return "", err
	}
	return string(jsonBytes), nil
}

// FromJSON - JSON string'den struct oluştur  
// JavaScript'teki JSON.parse() gibi
func (s *Skill) FromJSON(jsonStr string) error {
	return json.Unmarshal([]byte(jsonStr), s)
}

// GetByCategory - Belirli kategorideki skilleri filtrele
// JavaScript'teki Array.filter() gibi
func GetSkillsByCategory(skills []Skill, category string) []Skill {
	var filtered []Skill
	for _, skill := range skills {
		if skill.Category == category {
			filtered = append(filtered, skill)
		}
	}
	return filtered
}

// GetCategories - Skill'lerden unique kategori listesi çıkar
// JavaScript'teki [...new Set(array)] gibi
func GetCategories(skills []Skill) []string {
	categoryMap := make(map[string]bool) // Set gibi kullanacağız
	
	for _, skill := range skills {
		categoryMap[skill.Category] = true
	}
	
	// Map'ten slice'a çevir
	var categories []string
	for category := range categoryMap {
		categories = append(categories, category)
	}
	
	return categories
}