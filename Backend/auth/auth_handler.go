package auth

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
	"os"
	"strings"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/httpx"
)

type contextKey string

const userIDContextKey contextKey = ContextUserIDKey
const sessionIDContextKey contextKey = "session_id"

type AuthHandler struct {
	Service *AuthService
}

type RegisterInput struct {
	Username  string `json:"username"`
	Password  string `json:"password"`
	PublicKey string `json:"public_key"`
}

type LoginInput struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type ChangePasswordInput struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

type RevokeDeviceInput struct {
	SessionID uuid.UUID `json:"sessionId"`
}

func NewAuthHandler(service *AuthService) *AuthHandler {
	return &AuthHandler{Service: service}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var input RegisterInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid registration request")
		return
	}

	user, err := h.Service.RegisterUser(input.Username, input.Password, input.PublicKey)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	httpx.WriteJSON(w, http.StatusCreated, map[string]interface{}{
		"user_id":  user.ID,
		"username": user.Username,
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var input LoginInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid login request")
		return
	}

	accessToken, user, err := h.Service.LoginUserWithDevice(input.Username, input.Password, deviceMetadataFromRequest(r))
	if err != nil {
		httpx.WriteError(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "auth_token",
		Value:    accessToken,
		Path:     "/",
		MaxAge:   86400,
		HttpOnly: true,
		Secure:   cookieSecure(),
		SameSite: http.SameSiteStrictMode,
	})

	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"token":    accessToken,
		"user_id":  user.ID,
		"username": user.Username,
		"user": map[string]string{
			"id":       user.ID.String(),
			"username": user.Username,
		},
	})
}

func (h *AuthHandler) GetStatus(w http.ResponseWriter, r *http.Request) {
	tokenString := bearerOrCookieToken(r)
	if tokenString == "" {
		httpx.WriteJSON(w, http.StatusUnauthorized, map[string]string{"status": "unauthenticated"})
		return
	}

	userID, err := h.Service.ValidateToken(tokenString)
	if err != nil {
		httpx.WriteJSON(w, http.StatusUnauthorized, map[string]string{"status": "unauthenticated"})
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{"status": "authenticated", "user_id": userID})
}

func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var input ChangePasswordInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid password change request")
		return
	}

	if err := h.Service.ChangePassword(r.Context(), userID, input.CurrentPassword, input.NewPassword); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "password_changed"})
}

func (h *AuthHandler) ListDevices(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	sessionID, _ := SessionIDFromContext(r.Context())
	sessions, err := h.Service.ListDeviceSessions(r.Context(), userID, sessionID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Could not load devices")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{"devices": sessions})
}

func (h *AuthHandler) RevokeDevice(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var input RevokeDeviceInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid device revoke request")
		return
	}
	currentSessionID, _ := SessionIDFromContext(r.Context())
	if err := h.Service.RevokeDeviceSession(r.Context(), userID, input.SessionID, currentSessionID); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Could not revoke device")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "device_revoked"})
}

func AuthMiddleware(service *AuthService) httpx.Middleware {
	return func(next httpx.HandlerFunc) httpx.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			tokenString := bearerOrCookieToken(r)
			if tokenString == "" {
				httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
				return
			}

			userID, sessionID, err := service.ValidateTokenWithSession(tokenString)
			if err != nil {
				httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
				return
			}

			ctx := context.WithValue(r.Context(), userIDContextKey, userID)
			if sessionID != uuid.Nil {
				ctx = context.WithValue(ctx, sessionIDContextKey, sessionID)
			}
			next(w, r.WithContext(ctx))
		}
	}
}

func WithUserID(ctx context.Context, userID uuid.UUID) context.Context {
	return context.WithValue(ctx, userIDContextKey, userID)
}

func UserIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	value := ctx.Value(userIDContextKey)
	userID, ok := value.(uuid.UUID)
	return userID, ok && userID != uuid.Nil
}

func SessionIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	value := ctx.Value(sessionIDContextKey)
	sessionID, ok := value.(uuid.UUID)
	return sessionID, ok && sessionID != uuid.Nil
}

func bearerOrCookieToken(r *http.Request) string {
	if cookie, err := r.Cookie("auth_token"); err == nil && cookie.Value != "" {
		return cookie.Value
	}

	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	}

	return ""
}

func cookieSecure() bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv("GAIACOM_COOKIE_SECURE")))
	return value == "1" || value == "true" || value == "yes"
}

func deviceMetadataFromRequest(r *http.Request) DeviceMetadata {
	userAgent := strings.TrimSpace(r.UserAgent())
	osName := detectOS(userAgent)
	browser := detectBrowser(userAgent)
	deviceType := detectDeviceType(userAgent)
	return DeviceMetadata{
		DeviceLabel: strings.TrimSpace(browser + " " + osName),
		DeviceType:  deviceType,
		OS:          osName,
		Browser:     browser,
		IPAddress:   clientIP(r),
		UserAgent:   userAgent,
	}
}

func clientIP(r *http.Request) string {
	for _, header := range []string{"X-Forwarded-For", "X-Real-IP"} {
		value := strings.TrimSpace(r.Header.Get(header))
		if value == "" {
			continue
		}
		if header == "X-Forwarded-For" {
			value = strings.TrimSpace(strings.Split(value, ",")[0])
		}
		if parsed := net.ParseIP(value); parsed != nil {
			return parsed.String()
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil {
		if parsed := net.ParseIP(host); parsed != nil {
			return parsed.String()
		}
		return host
	}
	return ""
}

func detectOS(userAgent string) string {
	lower := strings.ToLower(userAgent)
	switch {
	case strings.Contains(lower, "iphone") || strings.Contains(lower, "ipad"):
		return "iOS"
	case strings.Contains(lower, "android"):
		return "Android"
	case strings.Contains(lower, "windows"):
		return "Windows"
	case strings.Contains(lower, "mac os") || strings.Contains(lower, "macintosh"):
		return "macOS"
	case strings.Contains(lower, "linux"):
		return "Linux"
	default:
		return "Unknown OS"
	}
}

func detectBrowser(userAgent string) string {
	lower := strings.ToLower(userAgent)
	switch {
	case strings.Contains(lower, "edg/"):
		return "Edge"
	case strings.Contains(lower, "firefox/"):
		return "Firefox"
	case strings.Contains(lower, "chrome/") || strings.Contains(lower, "crios/"):
		return "Chrome"
	case strings.Contains(lower, "safari/"):
		return "Safari"
	default:
		return "Browser"
	}
}

func detectDeviceType(userAgent string) string {
	lower := strings.ToLower(userAgent)
	switch {
	case strings.Contains(lower, "mobile") || strings.Contains(lower, "iphone") || strings.Contains(lower, "android"):
		return "mobile"
	case strings.Contains(lower, "ipad") || strings.Contains(lower, "tablet"):
		return "tablet"
	default:
		return "desktop"
	}
}
