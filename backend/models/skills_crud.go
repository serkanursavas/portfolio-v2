package models

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// SkillsRepository - Skills için CRUD operations
// Repository pattern: Veri erişim katmanı
type SkillsRepository struct {
	client *redis.Client
	ctx    context.Context
}

// NewSkillsRepository - Yeni repository oluştur
func NewSkillsRepository(client *redis.Client) *SkillsRepository {
	return &SkillsRepository{
		client: client,
		ctx:    context.Background(), // Default context
	}
}

// CREATE Operations

// CreateSkill - Yeni skill ekle
// Redis key: "skill:Languages:JavaScript"
// Redis value: JSON string
func (r *SkillsRepository) CreateSkill(skill *Skill) error {
	// Skill'i JSON'a çevir
	skillJSON, err := skill.ToJSON()
	if err != nil {
		return fmt.Errorf("failed to marshal skill: %w", err)
	}

	// Redis'e kaydet (expire: 1 yıl)
	err = r.client.Set(r.ctx, skill.ID, skillJSON, time.Hour*24*365).Err()
	if err != nil {
		return fmt.Errorf("failed to save skill to Redis: %w", err)
	}

	// Kategori index'ini güncelle
	// Set'e kategori ekle: "skills:categories"
	err = r.client.SAdd(r.ctx, "skills:categories", skill.Category).Err()
	if err != nil {
		return fmt.Errorf("failed to update category index: %w", err)
	}

	// Kategori başına skill listesi: "skills:category:Languages"
	categoryKey := fmt.Sprintf("skills:category:%s", skill.Category)
	err = r.client.SAdd(r.ctx, categoryKey, skill.ID).Err()
	if err != nil {
		return fmt.Errorf("failed to update category skills: %w", err)
	}

	return nil
}

// CreateMultipleSkills - Birden fazla skill ekle (Bulk operation)
func (r *SkillsRepository) CreateMultipleSkills(skills []Skill) error {
	// Pipeline kullan - birden fazla işlemi batch'le
	// JavaScript'teki Promise.all() gibi
	pipe := r.client.Pipeline()

	for _, skill := range skills {
		skillJSON, err := skill.ToJSON()
		if err != nil {
			return fmt.Errorf("failed to marshal skill %s: %w", skill.ID, err)
		}

		// Pipeline'a ekle
		pipe.Set(r.ctx, skill.ID, skillJSON, time.Hour*24*365)
		pipe.SAdd(r.ctx, "skills:categories", skill.Category)
		
		categoryKey := fmt.Sprintf("skills:category:%s", skill.Category)
		pipe.SAdd(r.ctx, categoryKey, skill.ID)
	}

	// Pipeline'ı execute et
	_, err := pipe.Exec(r.ctx)
	if err != nil {
		return fmt.Errorf("failed to execute skills pipeline: %w", err)
	}

	return nil
}

// READ Operations

// GetSkillByID - ID'ye göre skill getir
func (r *SkillsRepository) GetSkillByID(skillID string) (*Skill, error) {
	// Redis'ten JSON string al
	skillJSON, err := r.client.Get(r.ctx, skillID).Result()
	if err == redis.Nil {
		return nil, fmt.Errorf("skill not found: %s", skillID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get skill from Redis: %w", err)
	}

	// JSON'dan struct'a çevir
	var skill Skill
	err = skill.FromJSON(skillJSON)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal skill: %w", err)
	}

	return &skill, nil
}

// GetAllSkills - Tüm skilleri getir
func (r *SkillsRepository) GetAllSkills() ([]Skill, error) {
	// Tüm skill ID'lerini al
	skillIDs, err := r.getAllSkillIDs()
	if err != nil {
		return nil, err
	}

	if len(skillIDs) == 0 {
		return []Skill{}, nil
	}

	// Bulk read için MGET kullan
	// JavaScript'teki Promise.all([...]) gibi
	skillJSONs, err := r.client.MGet(r.ctx, skillIDs...).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get skills from Redis: %w", err)
	}

	// JSON'ları struct'lara çevir
	var skills []Skill
	for i, skillJSON := range skillJSONs {
		if skillJSON == nil {
			// Bu skill silinmiş olabilir, skip et
			continue
		}

		var skill Skill
		err = skill.FromJSON(skillJSON.(string))
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal skill %s: %w", skillIDs[i], err)
		}

		skills = append(skills, skill)
	}

	return skills, nil
}

// GetSkillsByCategory - Kategoriye göre skilleri getir
func (r *SkillsRepository) GetSkillsByCategory(category string) ([]Skill, error) {
	// Kategori skill ID'lerini al
	categoryKey := fmt.Sprintf("skills:category:%s", category)
	skillIDs, err := r.client.SMembers(r.ctx, categoryKey).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get category skills: %w", err)
	}

	if len(skillIDs) == 0 {
		return []Skill{}, nil
	}

	// Bulk read
	skillJSONs, err := r.client.MGet(r.ctx, skillIDs...).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get skills from Redis: %w", err)
	}

	var skills []Skill
	for i, skillJSON := range skillJSONs {
		if skillJSON == nil {
			continue
		}

		var skill Skill
		err = skill.FromJSON(skillJSON.(string))
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal skill %s: %w", skillIDs[i], err)
		}

		skills = append(skills, skill)
	}

	return skills, nil
}

// GetCategories - Tüm kategorileri getir
func (r *SkillsRepository) GetCategories() ([]string, error) {
	categories, err := r.client.SMembers(r.ctx, "skills:categories").Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get categories: %w", err)
	}
	return categories, nil
}

// UPDATE Operations

// UpdateSkill - Skill'i güncelle
func (r *SkillsRepository) UpdateSkill(skill *Skill) error {
	// Önce mevcut skill'i al (kategori değişikliği için)
	existingSkill, err := r.GetSkillByID(skill.ID)
	if err != nil {
		return fmt.Errorf("skill not found for update: %w", err)
	}

	// UpdatedAt'i güncelle
	skill.UpdatedAt = time.Now()

	// JSON'a çevir ve kaydet
	skillJSON, err := skill.ToJSON()
	if err != nil {
		return fmt.Errorf("failed to marshal skill: %w", err)
	}

	err = r.client.Set(r.ctx, skill.ID, skillJSON, time.Hour*24*365).Err()
	if err != nil {
		return fmt.Errorf("failed to update skill in Redis: %w", err)
	}

	// Eğer kategori değiştiyse index'leri güncelle
	if existingSkill.Category != skill.Category {
		// Eski kategoriden çıkar
		oldCategoryKey := fmt.Sprintf("skills:category:%s", existingSkill.Category)
		r.client.SRem(r.ctx, oldCategoryKey, skill.ID)

		// Yeni kategoriye ekle
		r.client.SAdd(r.ctx, "skills:categories", skill.Category)
		newCategoryKey := fmt.Sprintf("skills:category:%s", skill.Category)
		r.client.SAdd(r.ctx, newCategoryKey, skill.ID)
	}

	return nil
}

// DELETE Operations

// DeleteSkill - Skill'i sil
func (r *SkillsRepository) DeleteSkill(skillID string) error {
	// Önce skill'i al (kategori bilgisi için)
	skill, err := r.GetSkillByID(skillID)
	if err != nil {
		return fmt.Errorf("skill not found for deletion: %w", err)
	}

	// Redis'ten sil
	err = r.client.Del(r.ctx, skillID).Err()
	if err != nil {
		return fmt.Errorf("failed to delete skill from Redis: %w", err)
	}

	// Kategori index'inden çıkar
	categoryKey := fmt.Sprintf("skills:category:%s", skill.Category)
	err = r.client.SRem(r.ctx, categoryKey, skillID).Err()
	if err != nil {
		return fmt.Errorf("failed to remove from category index: %w", err)
	}

	return nil
}

// DeleteAllSkills - Tüm skilleri sil (Temizlik için)
func (r *SkillsRepository) DeleteAllSkills() error {
	// Tüm skill ID'lerini al
	skillIDs, err := r.getAllSkillIDs()
	if err != nil {
		return err
	}

	if len(skillIDs) == 0 {
		return nil // Zaten boş
	}

	// Batch delete
	pipe := r.client.Pipeline()
	
	// Skill'leri sil
	for _, skillID := range skillIDs {
		pipe.Del(r.ctx, skillID)
	}
	
	// Index'leri temizle
	pipe.Del(r.ctx, "skills:categories")
	
	// Kategori index'lerini temizle
	categories, _ := r.GetCategories()
	for _, category := range categories {
		categoryKey := fmt.Sprintf("skills:category:%s", category)
		pipe.Del(r.ctx, categoryKey)
	}

	_, err = pipe.Exec(r.ctx)
	if err != nil {
		return fmt.Errorf("failed to delete all skills: %w", err)
	}

	return nil
}

// Helper Methods

// getAllSkillIDs - Tüm skill ID'lerini getir
func (r *SkillsRepository) getAllSkillIDs() ([]string, error) {
	// Redis'te "skill:*" pattern'ine uyan tüm key'leri bul
	skillIDs, err := r.client.Keys(r.ctx, "skill:*").Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get skill IDs: %w", err)
	}
	return skillIDs, nil
}

// GetSkillsResponse - V1 API format'ında response hazırla
func (r *SkillsRepository) GetSkillsResponse() (*SkillsResponse, error) {
	// Tüm skilleri al
	skills, err := r.GetAllSkills()
	if err != nil {
		return nil, err
	}

	// Kategorileri al
	categories, err := r.GetCategories()
	if err != nil {
		return nil, err
	}

	return &SkillsResponse{
		Categories: categories,
		Skills:     skills,
	}, nil
}