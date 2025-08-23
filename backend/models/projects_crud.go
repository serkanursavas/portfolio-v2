package models

import (
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/redis/go-redis/v9"
)

// ProjectsRepository - Projects için CRUD operations
type ProjectsRepository struct {
	client *redis.Client
	ctx    context.Context
}

// NewProjectsRepository - Yeni repository oluştur
func NewProjectsRepository(client *redis.Client) *ProjectsRepository {
	return &ProjectsRepository{
		client: client,
		ctx:    context.Background(),
	}
}

// CREATE Operations

// CreateProject - Yeni proje ekle
func (r *ProjectsRepository) CreateProject(project *Project) error {
	// JSON'a çevir
	projectJSON, err := project.ToJSON()
	if err != nil {
		return fmt.Errorf("failed to marshal project: %w", err)
	}

	// Redis'e kaydet
	err = r.client.Set(r.ctx, project.ID, projectJSON, time.Hour*24*365).Err()
	if err != nil {
		return fmt.Errorf("failed to save project to Redis: %w", err)
	}

	// Index'leri güncelle
	pipe := r.client.Pipeline()

	// Status index: "projects:status:Live"
	statusKey := fmt.Sprintf("projects:status:%s", project.Status)
	pipe.SAdd(r.ctx, statusKey, project.ID)

	// Tüm projeler set'i: "projects:all"
	pipe.SAdd(r.ctx, "projects:all", project.ID)

	// Status listesi: "projects:statuses" 
	pipe.SAdd(r.ctx, "projects:statuses", project.Status)

	// Created date için sorted set (timeline'a göre sıralama için)
	// Score olarak Unix timestamp kullan
	createdAt, _ := time.Parse("2006-01-02T15:04:05.000Z", project.CreatedAt)
	pipe.ZAdd(r.ctx, "projects:by_date", redis.Z{
		Score:  float64(createdAt.Unix()),
		Member: project.ID,
	})

	// View count için sorted set (popülerliğe göre sıralama)
	pipe.ZAdd(r.ctx, "projects:by_views", redis.Z{
		Score:  float64(project.ViewCount),
		Member: project.ID,
	})

	_, err = pipe.Exec(r.ctx)
	if err != nil {
		return fmt.Errorf("failed to update project indexes: %w", err)
	}

	return nil
}

// CreateMultipleProjects - V1'den migration için bulk insert
func (r *ProjectsRepository) CreateMultipleProjects(projects []Project) error {
	pipe := r.client.Pipeline()

	for _, project := range projects {
		projectJSON, err := project.ToJSON()
		if err != nil {
			return fmt.Errorf("failed to marshal project %s: %w", project.ID, err)
		}

		// Proje verisi
		pipe.Set(r.ctx, project.ID, projectJSON, time.Hour*24*365)

		// Index'ler
		statusKey := fmt.Sprintf("projects:status:%s", project.Status)
		pipe.SAdd(r.ctx, statusKey, project.ID)
		pipe.SAdd(r.ctx, "projects:all", project.ID)
		pipe.SAdd(r.ctx, "projects:statuses", project.Status)

		// Sorted sets
		createdAt, _ := time.Parse("2006-01-02T15:04:05.000Z", project.CreatedAt)
		pipe.ZAdd(r.ctx, "projects:by_date", redis.Z{
			Score:  float64(createdAt.Unix()),
			Member: project.ID,
		})
		pipe.ZAdd(r.ctx, "projects:by_views", redis.Z{
			Score:  float64(project.ViewCount),
			Member: project.ID,
		})
	}

	_, err := pipe.Exec(r.ctx)
	return err
}

// READ Operations

// GetProjectByID - ID'ye göre proje getir
func (r *ProjectsRepository) GetProjectByID(projectID string) (*Project, error) {
	projectJSON, err := r.client.Get(r.ctx, projectID).Result()
	if err == redis.Nil {
		return nil, fmt.Errorf("project not found: %s", projectID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get project from Redis: %w", err)
	}

	var project Project
	err = project.FromJSON(projectJSON)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal project: %w", err)
	}

	return &project, nil
}

// GetAllProjects - Tüm projeleri getir
func (r *ProjectsRepository) GetAllProjects() ([]Project, error) {
	// Tüm proje ID'lerini al
	projectIDs, err := r.client.SMembers(r.ctx, "projects:all").Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get project IDs: %w", err)
	}

	return r.getProjectsByIDs(projectIDs)
}

// GetProjectsByStatus - Status'a göre projeler
func (r *ProjectsRepository) GetProjectsByStatus(status string) ([]Project, error) {
	statusKey := fmt.Sprintf("projects:status:%s", status)
	projectIDs, err := r.client.SMembers(r.ctx, statusKey).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get projects by status: %w", err)
	}

	return r.getProjectsByIDs(projectIDs)
}

// GetLatestProjects - En yeni projeler (tarih sırası)
func (r *ProjectsRepository) GetLatestProjects(count int) ([]Project, error) {
	// Sorted set'ten en yüksek score'ları al (en yeni tarihler)
	// ZREVRANGE = reverse order (büyükten küçüğe)
	projectIDs, err := r.client.ZRevRange(r.ctx, "projects:by_date", 0, int64(count-1)).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get latest projects: %w", err)
	}

	return r.getProjectsByIDs(projectIDs)
}

// GetPopularProjects - En popüler projeler (view count sırası)
func (r *ProjectsRepository) GetPopularProjects(count int) ([]Project, error) {
	projectIDs, err := r.client.ZRevRange(r.ctx, "projects:by_views", 0, int64(count-1)).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get popular projects: %w", err)
	}

	return r.getProjectsByIDs(projectIDs)
}

// GetStatuses - Tüm status'ları getir
func (r *ProjectsRepository) GetStatuses() ([]string, error) {
	statuses, err := r.client.SMembers(r.ctx, "projects:statuses").Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get statuses: %w", err)
	}
	return statuses, nil
}

// UPDATE Operations

// UpdateProject - Proje güncelle
func (r *ProjectsRepository) UpdateProject(project *Project) error {
	// Mevcut projeyi al (index güncelleme için)
	existingProject, err := r.GetProjectByID(project.ID)
	if err != nil {
		return fmt.Errorf("project not found for update: %w", err)
	}

	// UpdatedAt güncelle
	project.UpdatedAt = time.Now()

	// JSON'a çevir ve kaydet
	projectJSON, err := project.ToJSON()
	if err != nil {
		return fmt.Errorf("failed to marshal project: %w", err)
	}

	err = r.client.Set(r.ctx, project.ID, projectJSON, time.Hour*24*365).Err()
	if err != nil {
		return fmt.Errorf("failed to update project in Redis: %w", err)
	}

	// Index'leri güncelle
	pipe := r.client.Pipeline()

	// Status değiştiyse
	if existingProject.Status != project.Status {
		// Eski status'tan çıkar
		oldStatusKey := fmt.Sprintf("projects:status:%s", existingProject.Status)
		pipe.SRem(r.ctx, oldStatusKey, project.ID)

		// Yeni status'a ekle
		newStatusKey := fmt.Sprintf("projects:status:%s", project.Status)
		pipe.SAdd(r.ctx, newStatusKey, project.ID)
		pipe.SAdd(r.ctx, "projects:statuses", project.Status)
	}

	// View count değiştiyse sorted set güncelle
	if existingProject.ViewCount != project.ViewCount {
		pipe.ZAdd(r.ctx, "projects:by_views", redis.Z{
			Score:  float64(project.ViewCount),
			Member: project.ID,
		})
	}

	_, err = pipe.Exec(r.ctx)
	if err != nil {
		return fmt.Errorf("failed to update project indexes: %w", err)
	}

	return nil
}

// IncrementProjectViews - Proje görüntüleme sayısını artır
// Bu V1'deki /projectviews endpoint'i için
func (r *ProjectsRepository) IncrementProjectViews(projectID string) error {
	project, err := r.GetProjectByID(projectID)
	if err != nil {
		return err
	}

	// View count'u artır
	project.IncrementViewCount()

	// Güncelle
	return r.UpdateProject(project)
}

// DELETE Operations

// DeleteProject - Proje sil
func (r *ProjectsRepository) DeleteProject(projectID string) error {
	// Önce projeyi al (index temizliği için)
	project, err := r.GetProjectByID(projectID)
	if err != nil {
		return fmt.Errorf("project not found for deletion: %w", err)
	}

	// Pipeline ile tüm referansları temizle
	pipe := r.client.Pipeline()

	// Proje verisini sil
	pipe.Del(r.ctx, projectID)

	// Index'lerden çıkar
	pipe.SRem(r.ctx, "projects:all", projectID)
	
	statusKey := fmt.Sprintf("projects:status:%s", project.Status)
	pipe.SRem(r.ctx, statusKey, projectID)

	// Sorted set'lerden çıkar
	pipe.ZRem(r.ctx, "projects:by_date", projectID)
	pipe.ZRem(r.ctx, "projects:by_views", projectID)

	_, err = pipe.Exec(r.ctx)
	if err != nil {
		return fmt.Errorf("failed to delete project: %w", err)
	}

	return nil
}

// DeleteAllProjects - Tüm projeleri sil
func (r *ProjectsRepository) DeleteAllProjects() error {
	projectIDs, err := r.client.SMembers(r.ctx, "projects:all").Result()
	if err != nil {
		return fmt.Errorf("failed to get project IDs: %w", err)
	}

	if len(projectIDs) == 0 {
		return nil
	}

	pipe := r.client.Pipeline()

	// Tüm proje verilerini sil
	for _, projectID := range projectIDs {
		pipe.Del(r.ctx, projectID)
	}

	// Tüm index'leri temizle
	pipe.Del(r.ctx, "projects:all")
	pipe.Del(r.ctx, "projects:statuses")
	pipe.Del(r.ctx, "projects:by_date")
	pipe.Del(r.ctx, "projects:by_views")

	// Status index'lerini temizle
	statuses, _ := r.GetStatuses()
	for _, status := range statuses {
		statusKey := fmt.Sprintf("projects:status:%s", status)
		pipe.Del(r.ctx, statusKey)
	}

	_, err = pipe.Exec(r.ctx)
	return err
}

// Helper Methods

// getProjectsByIDs - ID'lere göre projeleri al (bulk read)
func (r *ProjectsRepository) getProjectsByIDs(projectIDs []string) ([]Project, error) {
	if len(projectIDs) == 0 {
		return []Project{}, nil
	}

	projectJSONs, err := r.client.MGet(r.ctx, projectIDs...).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get projects from Redis: %w", err)
	}

	var projects []Project
	for i, projectJSON := range projectJSONs {
		if projectJSON == nil {
			continue // Silinmiş proje, skip
		}

		var project Project
		err = project.FromJSON(projectJSON.(string))
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal project %s: %w", projectIDs[i], err)
		}

		projects = append(projects, project)
	}

	return projects, nil
}

// GetProjectsResponse - V1 API format'ı
func (r *ProjectsRepository) GetProjectsResponse() (*ProjectsResponse, error) {
	projects, err := r.GetAllProjects()
	if err != nil {
		return nil, err
	}

	// Tarihe göre sırala (en yeni first)
	sort.Slice(projects, func(i, j int) bool {
		timeI, _ := time.Parse("2006-01-02T15:04:05.000Z", projects[i].CreatedAt)
		timeJ, _ := time.Parse("2006-01-02T15:04:05.000Z", projects[j].CreatedAt)
		return timeI.After(timeJ)
	})

	return &ProjectsResponse{
		Count:    len(projects),
		Projects: projects,
	}, nil
}

// GetProjectsByStatusResponse - Status'a göre gruplu response
func (r *ProjectsRepository) GetProjectsByStatusResponse() (*ProjectsByStatus, error) {
	liveProjects, err := r.GetProjectsByStatus("Live")
	if err != nil {
		return nil, err
	}

	githubProjects, err := r.GetProjectsByStatus("Github")
	if err != nil {
		return nil, err
	}

	inProgressProjects, err := r.GetProjectsByStatus("In Progress")
	if err != nil {
		return nil, err
	}

	return &ProjectsByStatus{
		Live:       liveProjects,
		GitHub:     githubProjects,
		InProgress: inProgressProjects,
	}, nil
}