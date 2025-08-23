package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"portfolio-backend/config"
	"portfolio-backend/models"
	"time"
)

// V1 API Response structs
type V1SkillsResponse struct {
	Categories []string     `json:"categories"`
	Skills     []V1Skill    `json:"skills"`
}

type V1Skill struct {
	Category string `json:"category"`
	Skill    string `json:"skill"`
	Icon     string `json:"icon"`
}

type V1ProjectsResponse struct {
	Count    int         `json:"count"`
	Projects []V1Project `json:"projects"`
}

type V1Project struct {
	ID          string      `json:"_id"`
	Title       string      `json:"title"`
	Description string      `json:"desc"`     // V1'de "desc"
	Tools       string      `json:"tools"`    // V1'de JSON string
	Link        string      `json:"link"`
	Image       string      `json:"img"`      // V1'de "img"
	Status      string      `json:"status"`
	CreatedAt   string      `json:"createdAt"`
}

type V1Tool struct {
	Skill string `json:"skill"`
	Icon  string `json:"icon"`
}

const (
	V1_API_BASE = "https://portfolio-apis-eight.vercel.app/api"
	V1_API_KEY  = "527825"
)

func main() {
	fmt.Println("🚀 Portfolio V1 to V2 Data Migration Started")
	fmt.Println("====================================================")

	// Load configuration
	cfg := config.LoadConfig()

	// Initialize Redis connection
	err := config.InitRedis(cfg)
	if err != nil {
		log.Fatal("Failed to initialize Redis:", err)
	}
	defer config.CloseRedis()

	redisClient := config.GetRedisClient()
	
	// Create repositories
	skillsRepo := models.NewSkillsRepository(redisClient)
	projectsRepo := models.NewProjectsRepository(redisClient)

	// Migration steps
	fmt.Println("📋 Migration Steps:")
	fmt.Println("1. Fetch V1 Skills Data")
	fmt.Println("2. Convert and Import Skills to V2")
	fmt.Println("3. Fetch V1 Projects Data")
	fmt.Println("4. Convert and Import Projects to V2")
	fmt.Println("5. Validate Migration")
	fmt.Println("")

	// Step 1: Migrate Skills
	fmt.Println("🔧 Step 1: Migrating Skills...")
	err = migrateSkills(skillsRepo)
	if err != nil {
		log.Fatal("Skills migration failed:", err)
	}
	fmt.Println("✅ Skills migration completed!")

	// Step 2: Migrate Projects
	fmt.Println("🔧 Step 2: Migrating Projects...")
	err = migrateProjects(projectsRepo)
	if err != nil {
		log.Fatal("Projects migration failed:", err)
	}
	fmt.Println("✅ Projects migration completed!")

	// Step 3: Validation
	fmt.Println("🔍 Step 3: Validation...")
	err = validateMigration(skillsRepo, projectsRepo)
	if err != nil {
		log.Fatal("Migration validation failed:", err)
	}

	fmt.Println("")
	fmt.Println("🎉 Migration Successfully Completed!")
	fmt.Println("====================================================")
}

// migrateSkills - V1 skills'leri V2'ye migrate et
func migrateSkills(skillsRepo *models.SkillsRepository) error {
	// V1 API'dan skills'leri çek
	fmt.Println("  📡 Fetching skills from V1 API...")
	
	v1Skills, err := fetchV1Skills()
	if err != nil {
		return fmt.Errorf("failed to fetch V1 skills: %w", err)
	}

	fmt.Printf("  📊 Found %d skills in V1 API\n", len(v1Skills.Skills))

	// V1 skills'leri V2 format'ına convert et
	fmt.Println("  🔄 Converting V1 skills to V2 format...")
	
	var v2Skills []models.Skill
	for _, v1Skill := range v1Skills.Skills {
		v2Skill := models.NewSkill(v1Skill.Category, v1Skill.Skill, v1Skill.Icon)
		v2Skills = append(v2Skills, *v2Skill)
	}

	// Bulk import to Redis
	fmt.Println("  💾 Importing skills to Redis...")
	err = skillsRepo.CreateMultipleSkills(v2Skills)
	if err != nil {
		return fmt.Errorf("failed to import skills: %w", err)
	}

	fmt.Printf("  ✅ Successfully imported %d skills\n", len(v2Skills))
	return nil
}

// migrateProjects - V1 projects'leri V2'ye migrate et
func migrateProjects(projectsRepo *models.ProjectsRepository) error {
	// V1 API'dan projects'leri çek
	fmt.Println("  📡 Fetching projects from V1 API...")
	
	v1Projects, err := fetchV1Projects()
	if err != nil {
		return fmt.Errorf("failed to fetch V1 projects: %w", err)
	}

	fmt.Printf("  📊 Found %d projects in V1 API\n", len(v1Projects.Projects))

	// V1 projects'leri V2 format'ına convert et
	fmt.Println("  🔄 Converting V1 projects to V2 format...")
	
	var v2Projects []models.Project
	for _, v1Project := range v1Projects.Projects {
		// V1'deki JSON string tools'u parse et
		var v1Tools []V1Tool
		if v1Project.Tools != "" {
			err := json.Unmarshal([]byte(v1Project.Tools), &v1Tools)
			if err != nil {
				fmt.Printf("  ⚠️  Warning: Failed to parse tools for project %s: %v\n", v1Project.Title, err)
				v1Tools = []V1Tool{} // Empty tools
			}
		}

		// V1 tools'u V2 ProjectTool'a convert et
		var v2Tools []models.ProjectTool
		for _, v1Tool := range v1Tools {
			v2Tools = append(v2Tools, models.ProjectTool{
				Skill: v1Tool.Skill,
				Icon:  v1Tool.Icon,
			})
		}

		// V2 Project oluştur
		v2Project := models.NewProject(
			v1Project.Title,
			v1Project.Description,
			v1Project.Link,
			v1Project.Image,
			v1Project.Status,
			v2Tools,
		)

		// V1'deki ID ve CreatedAt'i koru
		v2Project.ID = "project:" + v1Project.Title // Title-based ID
		if v1Project.CreatedAt != "" {
			v2Project.CreatedAt = v1Project.CreatedAt
		}

		v2Projects = append(v2Projects, *v2Project)
	}

	// Bulk import to Redis
	fmt.Println("  💾 Importing projects to Redis...")
	err = projectsRepo.CreateMultipleProjects(v2Projects)
	if err != nil {
		return fmt.Errorf("failed to import projects: %w", err)
	}

	fmt.Printf("  ✅ Successfully imported %d projects\n", len(v2Projects))
	return nil
}

// fetchV1Skills - V1 API'dan skills'leri çek
func fetchV1Skills() (*V1SkillsResponse, error) {
	url := V1_API_BASE + "/skills"
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	// V1 API x-api-key header kullanıyor
	req.Header.Set("x-api-key", V1_API_KEY)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("V1 API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var skillsResponse V1SkillsResponse
	err = json.Unmarshal(body, &skillsResponse)
	if err != nil {
		return nil, fmt.Errorf("failed to parse skills response: %w", err)
	}

	return &skillsResponse, nil
}

// fetchV1Projects - V1 API'dan projects'leri çek
func fetchV1Projects() (*V1ProjectsResponse, error) {
	url := V1_API_BASE + "/projects"
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	// V1 API x-api-key header kullanıyor
	req.Header.Set("x-api-key", V1_API_KEY)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("V1 API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var projectsResponse V1ProjectsResponse
	err = json.Unmarshal(body, &projectsResponse)
	if err != nil {
		return nil, fmt.Errorf("failed to parse projects response: %w", err)
	}

	return &projectsResponse, nil
}

// validateMigration - Migration'ı validate et
func validateMigration(skillsRepo *models.SkillsRepository, projectsRepo *models.ProjectsRepository) error {
	fmt.Println("  🔍 Validating skills migration...")
	
	// Skills validation
	skills, err := skillsRepo.GetAllSkills()
	if err != nil {
		return fmt.Errorf("failed to get migrated skills: %w", err)
	}
	fmt.Printf("  📊 V2 Redis contains %d skills\n", len(skills))

	categories, err := skillsRepo.GetCategories()
	if err != nil {
		return fmt.Errorf("failed to get skill categories: %w", err)
	}
	fmt.Printf("  📂 V2 Redis contains %d skill categories\n", len(categories))

	// Projects validation  
	fmt.Println("  🔍 Validating projects migration...")
	
	projects, err := projectsRepo.GetAllProjects()
	if err != nil {
		return fmt.Errorf("failed to get migrated projects: %w", err)
	}
	fmt.Printf("  📊 V2 Redis contains %d projects\n", len(projects))

	statuses, err := projectsRepo.GetStatuses()
	if err != nil {
		return fmt.Errorf("failed to get project statuses: %w", err)
	}
	fmt.Printf("  📂 V2 Redis contains %d project statuses\n", len(statuses))

	fmt.Println("  ✅ Migration validation completed!")
	
	return nil
}