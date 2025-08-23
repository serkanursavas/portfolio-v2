package config

import (
	"context"
	"fmt"
	"log"

	"github.com/redis/go-redis/v9"
)

// Global Redis client instance
// Go'da global değişkenler böyle tanımlanır
var RedisClient *redis.Client

// InitRedis - Redis bağlantısını başlatır
// Bu fonksiyon bir kez çağrılır ve Redis client'ı hazırlar
func InitRedis(cfg *Config) error {
	// Redis client options oluştur
	// Bu JavaScript'teki object gibi
	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.Redis.Host + ":" + cfg.Redis.Port, // "localhost:6379"
		Password: cfg.Redis.Password,                     // Şifre (bizde yok)
		DB:       cfg.Redis.DB,                           // Database numarası (0)
	})

	// Context oluştur - Go'da önemli bir kavram
	// Context = işlemlerin zaman aşımı, iptal vs için kullanılır
	ctx := context.Background()

	// Bağlantıyı test et
	// Ping gönder, Pong dönmesini bekle
	_, err := rdb.Ping(ctx).Result()
	if err != nil {
		return fmt.Errorf("Redis connection failed: %v", err)
	}

	// Global değişkene ata ki diğer dosyalardan erişebilelim
	RedisClient = rdb
	
	log.Println("✅ Redis connection successful!")
	return nil
}

// GetRedisClient - Redis client'ı döndürür
// Bu getter pattern - client'a güvenli erişim sağlar
func GetRedisClient() *redis.Client {
	if RedisClient == nil {
		log.Fatal("❌ Redis client not initialized. Call InitRedis() first!")
	}
	return RedisClient
}

// CloseRedis - Uygulama kapanırken Redis bağlantısını kapat
func CloseRedis() {
	if RedisClient != nil {
		RedisClient.Close()
		log.Println("🔌 Redis connection closed")
	}
}