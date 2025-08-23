package middleware

import (
	"context"
	"net/http"
	"portfolio-backend/config"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
)

// AuthMiddleware - JWT authentication middleware
type AuthMiddleware struct {
	config      *config.Config
	redisClient *redis.Client
}

// NewAuthMiddleware - Yeni auth middleware oluştur
func NewAuthMiddleware(cfg *config.Config, redisClient *redis.Client) *AuthMiddleware {
	return &AuthMiddleware{
		config:      cfg,
		redisClient: redisClient,
	}
}

// Claims - JWT claims structure (auth.go ile aynı)
type Claims struct {
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// RequireAuth - Authentication gerektiren endpoint'ler için middleware
func (m *AuthMiddleware) RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Token'ı extract et
		token := m.extractToken(c)
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authentication required",
			})
			c.Abort()
			return
		}

		// Token'ı validate et
		claims, err := m.validateJWT(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid or expired token",
			})
			c.Abort()
			return
		}

		// User bilgilerini context'e ekle
		c.Set("username", claims.Username)
		c.Set("authenticated", true)

		// Middleware chain'i devam ettir
		c.Next()
	}
}

// OptionalAuth - İsteğe bağlı authentication (debug için)
func (m *AuthMiddleware) OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := m.extractToken(c)
		if token != "" {
			if claims, err := m.validateJWT(token); err == nil {
				c.Set("username", claims.Username)
				c.Set("authenticated", true)
			}
		}
		c.Next()
	}
}

// Helper functions

func (m *AuthMiddleware) extractToken(c *gin.Context) string {
	// Authorization header'dan al
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" && len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		return authHeader[7:]
	}

	// Cookie'den al
	cookie, err := c.Cookie("admin_token")
	if err == nil {
		return cookie
	}

	return ""
}

func (m *AuthMiddleware) validateJWT(tokenString string) (*Claims, error) {
	// Blacklist kontrolü
	if m.isTokenBlacklisted(tokenString) {
		return nil, jwt.ErrTokenInvalidClaims
	}

	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(m.config.Auth.JWTSecret), nil
	})

	if err != nil || !token.Valid {
		return nil, err
	}

	return claims, nil
}

func (m *AuthMiddleware) isTokenBlacklisted(token string) bool {
	ctx := context.Background()
	key := "blacklist:" + token
	_, err := m.redisClient.Get(ctx, key).Result()
	return err == nil
}