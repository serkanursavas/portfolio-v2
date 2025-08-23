package handlers

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"portfolio-backend/config"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

// AuthHandler - Authentication için handler
type AuthHandler struct {
	config      *config.Config
	redisClient *redis.Client
}

// NewAuthHandler - Yeni auth handler oluştur
func NewAuthHandler(cfg *config.Config, redisClient *redis.Client) *AuthHandler {
	return &AuthHandler{
		config:      cfg,
		redisClient: redisClient,
	}
}

// LoginRequest - Login request strukturu
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse - Login response strukturu
type LoginResponse struct {
	Token     string `json:"token"`
	ExpiresAt int64  `json:"expires_at"`
	Message   string `json:"message"`
}

// Claims - JWT claims
type Claims struct {
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// Login - Admin giriş endpoint'i
// POST /api/v1/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
		})
		return
	}

	// Rate limiting kontrolü
	clientIP := c.ClientIP()
	if h.isRateLimited(clientIP) {
		c.JSON(http.StatusTooManyRequests, gin.H{
			"error": "Too many login attempts. Please try again later.",
		})
		return
	}

	// Credentials kontrolü
	if !h.validateCredentials(req.Username, req.Password) {
		// Failed attempt'i kaydet
		h.recordFailedAttempt(clientIP)
		
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid credentials",
		})
		return
	}

	// JWT token oluştur
	token, expiresAt, err := h.generateJWT(req.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate token",
		})
		return
	}

	// Successful login - failed attempts'i temizle
	h.clearFailedAttempts(clientIP)

	// Cookie olarak da set et (güvenlik için)
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "admin_token",
		Value:    token,
		Expires:  time.Unix(expiresAt, 0),
		HttpOnly: true,
		Secure:   false, // Development için false, production'da true olmalı
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
	})

	c.JSON(http.StatusOK, LoginResponse{
		Token:     token,
		ExpiresAt: expiresAt,
		Message:   "Login successful",
	})
}

// Logout - Admin çıkış endpoint'i
// POST /api/v1/auth/logout
func (h *AuthHandler) Logout(c *gin.Context) {
	// Token'ı blacklist'e ekle
	token := h.extractToken(c)
	if token != "" {
		h.blacklistToken(token)
	}

	// Cookie'yi temizle
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "admin_token",
		Value:    "",
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		Path:     "/",
	})

	c.JSON(http.StatusOK, gin.H{
		"message": "Logout successful",
	})
}

// Verify - Token doğrulama endpoint'i
// GET /api/v1/auth/verify
func (h *AuthHandler) Verify(c *gin.Context) {
	token := h.extractToken(c)
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "No token provided",
		})
		return
	}

	claims, err := h.validateJWT(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid token",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid":    true,
		"username": claims.Username,
		"expires":  claims.ExpiresAt.Unix(),
	})
}

// Helper functions

func (h *AuthHandler) validateCredentials(username, password string) bool {
	// Username kontrolü
	if username != h.config.Auth.AdminUsername {
		return false
	}

	// Password hash kontrolü
	err := bcrypt.CompareHashAndPassword([]byte(h.config.Auth.AdminPasswordHash), []byte(password))
	return err == nil
}

func (h *AuthHandler) generateJWT(username string) (string, int64, error) {
	// Expiration time
	duration, err := time.ParseDuration(h.config.Auth.JWTExpiration)
	if err != nil {
		duration = 30 * time.Minute
	}
	expirationTime := time.Now().Add(duration)

	// Claims oluştur
	claims := &Claims{
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "portfolio-admin",
		},
	}

	// Token oluştur
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(h.config.Auth.JWTSecret))
	if err != nil {
		return "", 0, err
	}

	return tokenString, expirationTime.Unix(), nil
}

func (h *AuthHandler) validateJWT(tokenString string) (*Claims, error) {
	// Blacklist kontrolü
	if h.isTokenBlacklisted(tokenString) {
		return nil, jwt.ErrTokenInvalidClaims
	}

	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(h.config.Auth.JWTSecret), nil
	})

	if err != nil || !token.Valid {
		return nil, err
	}

	return claims, nil
}

func (h *AuthHandler) extractToken(c *gin.Context) string {
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

func (h *AuthHandler) isRateLimited(clientIP string) bool {
	ctx := context.Background()
	key := "login_attempts:" + clientIP
	attempts, err := h.redisClient.Get(ctx, key).Result()
	if err != nil {
		return false
	}

	attemptsCount, _ := strconv.Atoi(attempts)
	return attemptsCount >= h.config.Auth.MaxLoginAttempts
}

func (h *AuthHandler) recordFailedAttempt(clientIP string) {
	ctx := context.Background()
	key := "login_attempts:" + clientIP
	cooldownDuration, _ := time.ParseDuration(h.config.Auth.LoginCooldown)
	h.redisClient.Incr(ctx, key)
	h.redisClient.Expire(ctx, key, cooldownDuration)
}

func (h *AuthHandler) clearFailedAttempts(clientIP string) {
	ctx := context.Background()
	key := "login_attempts:" + clientIP
	h.redisClient.Del(ctx, key)
}

func (h *AuthHandler) blacklistToken(token string) {
	ctx := context.Background()
	key := "blacklist:" + token
	// Token'ın kalan süresini hesapla
	duration, _ := time.ParseDuration(h.config.Auth.JWTExpiration)
	h.redisClient.Set(ctx, key, "1", duration)
}

func (h *AuthHandler) isTokenBlacklisted(token string) bool {
	ctx := context.Background()
	key := "blacklist:" + token
	_, err := h.redisClient.Get(ctx, key).Result()
	return err == nil
}