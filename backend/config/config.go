package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Server struct {
		Port    string
		GinMode string
	}
	Redis struct {
		Host     string
		Port     string
		Password string
		DB       int
	}
	API struct {
		Version     string
		CORSOrigins string
	}
	V1 struct {
		APIURL string
		APIKey string
	}
	Auth struct {
		JWTSecret        string
		JWTExpiration    string
		AdminUsername    string
		AdminPasswordHash string
		SessionTimeout   string
		MaxLoginAttempts int
		LoginCooldown    string
	}
}

func LoadConfig() *Config {
	// Load .env file
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found, using environment variables")
	}

	config := &Config{}

	// Server configuration
	config.Server.Port = getEnv("PORT", "8080")
	config.Server.GinMode = getEnv("GIN_MODE", "debug")

	// Redis configuration
	config.Redis.Host = getEnv("REDIS_HOST", "localhost")
	config.Redis.Port = getEnv("REDIS_PORT", "6379")
	config.Redis.Password = getEnv("REDIS_PASSWORD", "")
	config.Redis.DB = getEnvAsInt("REDIS_DB", 0)

	// API configuration
	config.API.Version = getEnv("API_VERSION", "v1")
	config.API.CORSOrigins = getEnv("CORS_ORIGINS", "*")

	// V1 API compatibility
	config.V1.APIURL = getEnv("V1_API_URL", "")
	config.V1.APIKey = getEnv("V1_API_KEY", "")

	// Auth configuration
	config.Auth.JWTSecret = getEnv("JWT_SECRET", "default-secret-change-in-production")
	config.Auth.JWTExpiration = getEnv("JWT_EXPIRATION", "30m")
	config.Auth.AdminUsername = getEnv("ADMIN_USERNAME", "admin")
	config.Auth.AdminPasswordHash = getEnv("ADMIN_PASSWORD_HASH", "")
	config.Auth.SessionTimeout = getEnv("SESSION_TIMEOUT", "30m")
	config.Auth.MaxLoginAttempts = getEnvAsInt("MAX_LOGIN_ATTEMPTS", 5)
	config.Auth.LoginCooldown = getEnv("LOGIN_COOLDOWN", "15m")

	return config
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}