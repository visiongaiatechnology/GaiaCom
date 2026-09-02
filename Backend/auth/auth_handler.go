// STATUS: DIAMANT VGT SUPREME
package auth

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/httpx"
	"gaiacom/backend/internal/security"
	"gaiacom/backend/models"
)

type AuthHandler struct {
	Service  *AuthService
	Security *security.SecuritySystem
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

type RefreshInput struct {
	RefreshToken string `json:"refreshToken"`
}

type ChangePasswordInput struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

type DeleteAccountInput struct {
	CurrentPassword string `json:"currentPassword"`
}

type PrivacyInput struct {
	AllowAnonymousStats bool `json:"allowAnonymousStats"`
}

type NotificationPreferencesInput struct {
	Enabled           bool   `json:"enabled"`
	ShowPreview       bool   `json:"showPreview"`
	QuietHoursEnabled bool   `json:"quietHoursEnabled"`
	QuietHoursStart   string `json:"quietHoursStart"`
	QuietHoursEnd     string `json:"quietHoursEnd"`
}

type RevokeDeviceInput struct {
	SessionID uuid.UUID `json:"sessionId"`
}

func NewAuthHandler(service *AuthService, securitySystems ...*security.SecuritySystem) *AuthHandler {
	handler := &AuthHandler{Service: service}
	if len(securitySystems) > 0 {
		handler.Security = securitySystems[0]
	}
	return handler
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	if sec := h.Security; sec != nil {
		if err := sec.CheckRegistrationLimit(r.Context(), r); err != nil {
			log.Printf("auth registration rate limit rejected: %v", err)
			httpx.WriteError(w, http.StatusTooManyRequests, "Registration temporarily throttled")
			return
		}
	}

	var input RegisterInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid registration request")
		return
	}

	user, err := h.Service.RegisterUser(input.Username, input.Password, input.PublicKey)
	if err != nil {
		log.Printf("auth registration rejected: %v", err)
		httpx.WriteError(w, http.StatusBadRequest, "Registration rejected")
		return
	}

	httpx.WriteJSON(w, http.StatusCreated, map[string]interface{}{
		"user_id":             user.ID,
		"username":            user.Username,
		"allowAnonymousStats": user.AllowAnonymousStats,
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var input LoginInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid login request")
		return
	}

	if sec := h.Security; sec != nil {
		if sec.IsAuthBlocked(r, input.Username) {
			httpx.WriteError(w, http.StatusTooManyRequests, "Too many failed login attempts. Temporarily blocked.")
			return
		}
	}

	accessToken, refreshToken, user, err := h.Service.LoginUserWithDevice(input.Username, input.Password, deviceMetadataFromRequest(r))
	if err != nil {
		if sec := h.Security; sec != nil {
			_ = sec.CheckAuth(r, input.Username, false, err)
		}
		httpx.WriteError(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	if sec := h.Security; sec != nil {
		if err := sec.CheckAuth(r, input.Username, true, nil); err != nil {
			log.Printf("auth login rate limit rejected: %v", err)
			httpx.WriteError(w, http.StatusTooManyRequests, "Login temporarily throttled")
			return
		}
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "auth_token",
		Value:    accessToken,
		Path:     "/",
		MaxAge:   int(tokenTTL.Seconds()),
		HttpOnly: true,
		Secure:   cookieSecure(),
		SameSite: http.SameSiteStrictMode,
	})
	h.setRefreshCookie(w, refreshToken)

	response := map[string]interface{}{
		"user_id":             user.ID,
		"username":            user.Username,
		"allowAnonymousStats": user.AllowAnonymousStats,
		"user": map[string]interface{}{
			"id":                  user.ID.String(),
			"username":            user.Username,
			"allowAnonymousStats": user.AllowAnonymousStats,
		},
	}
	if isNativeClientRequest(r) {
		// Native bearer material is emitted only for an exact Tauri app origin
		// or an originless Android request that passes the native-client policy.
		response["access_token"] = accessToken
		response["token_type"] = "Bearer"
		response["expires_in"] = int(tokenTTL.Seconds())
		response["refresh_token"] = refreshToken
		response["refresh_expires_in"] = int(refreshTokenTTL.Seconds())
	}
	httpx.WriteJSON(w, http.StatusOK, response)
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	rawToken := ""
	if cookie, err := r.Cookie("refresh_token"); err == nil {
		rawToken = cookie.Value
	}
	if rawToken == "" && isNativeClientRequest(r) {
		var input RefreshInput
		if err := json.NewDecoder(r.Body).Decode(&input); err == nil {
			rawToken = input.RefreshToken
		}
	}
	accessToken, nextRefresh, user, err := h.Service.RefreshSession(r.Context(), rawToken)
	if err != nil {
		h.clearAuthCookie(w)
		httpx.WriteError(w, http.StatusUnauthorized, "Session refresh rejected")
		return
	}
	http.SetCookie(w, &http.Cookie{Name: "auth_token", Value: accessToken, Path: "/", MaxAge: int(tokenTTL.Seconds()), HttpOnly: true, Secure: cookieSecure(), SameSite: http.SameSiteStrictMode})
	h.setRefreshCookie(w, nextRefresh)
	response := map[string]interface{}{"status": "refreshed", "user_id": user.ID, "expires_in": int(tokenTTL.Seconds())}
	if isNativeClientRequest(r) {
		response["access_token"] = accessToken
		response["refresh_token"] = nextRefresh
		response["token_type"] = "Bearer"
		response["refresh_expires_in"] = int(refreshTokenTTL.Seconds())
	}
	httpx.WriteJSON(w, http.StatusOK, response)
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

	user, err := h.Service.Store.FindUserByID(userID)
	if err != nil {
		httpx.WriteJSON(w, http.StatusUnauthorized, map[string]string{"status": "unauthenticated"})
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"status":              "authenticated",
		"user_id":             userID,
		"username":            user.Username,
		"allowAnonymousStats": user.AllowAnonymousStats,
		"user": map[string]interface{}{
			"id":                  user.ID.String(),
			"username":            user.Username,
			"allowAnonymousStats": user.AllowAnonymousStats,
		},
	})
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

	sessionID, _ := SessionIDFromContext(r.Context())
	if err := h.Service.ChangePassword(r.Context(), userID, sessionID, input.CurrentPassword, input.NewPassword); err != nil {
		log.Printf("auth password change rejected for user %s: %v", userID.String(), err)
		httpx.WriteError(w, http.StatusBadRequest, "Password change rejected")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "password_changed"})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	userID, userOK := UserIDFromContext(r.Context())
	sessionID, sessionOK := SessionIDFromContext(r.Context())
	if !userOK || !sessionOK {
		h.clearAuthCookie(w)
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	if err := h.Service.Logout(r.Context(), userID, sessionID); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Logout rejected")
		return
	}
	h.clearAuthCookie(w)
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "logged_out"})
}

func (h *AuthHandler) clearAuthCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{Name: "auth_token", Value: "", Path: "/", MaxAge: -1, HttpOnly: true, Secure: cookieSecure(), SameSite: http.SameSiteStrictMode})
	http.SetCookie(w, &http.Cookie{Name: "refresh_token", Value: "", Path: "/api/v1/auth", MaxAge: -1, HttpOnly: true, Secure: cookieSecure(), SameSite: http.SameSiteStrictMode})
}

func (h *AuthHandler) setRefreshCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{Name: "refresh_token", Value: token, Path: "/api/v1/auth", MaxAge: int(refreshTokenTTL.Seconds()), HttpOnly: true, Secure: cookieSecure(), SameSite: http.SameSiteStrictMode})
}

func (h *AuthHandler) DeleteAccount(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var input DeleteAccountInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid account deletion request")
		return
	}

	if err := h.Service.DeleteAccount(r.Context(), userID, input.CurrentPassword); err != nil {
		httpx.WriteError(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "auth_token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   cookieSecure(),
		SameSite: http.SameSiteStrictMode,
	})
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "account_deleted"})
}

func (h *AuthHandler) UpdatePrivacy(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var input PrivacyInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid privacy request")
		return
	}

	user, err := h.Service.UpdateAnonymousStats(r.Context(), userID, input.AllowAnonymousStats)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Privacy update rejected")
		return
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"status":              "privacy_updated",
		"allowAnonymousStats": user.AllowAnonymousStats,
		"user": map[string]interface{}{
			"id":                  user.ID.String(),
			"username":            user.Username,
			"allowAnonymousStats": user.AllowAnonymousStats,
		},
	})
}

func (h *AuthHandler) GetNotificationPreferences(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	preferences, err := h.Service.GetNotificationPreferences(r.Context(), userID)
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Could not load notification preferences")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, preferences)
}

func (h *AuthHandler) SaveNotificationPreferences(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var input NotificationPreferencesInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid notification preferences")
		return
	}
	preferences, err := h.Service.SaveNotificationPreferences(r.Context(), userID, models.NotificationPreferences{
		Enabled: input.Enabled, ShowPreview: input.ShowPreview, QuietHoursEnabled: input.QuietHoursEnabled,
		QuietHoursStart: input.QuietHoursStart, QuietHoursEnd: input.QuietHoursEnd,
	})
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Notification preferences rejected")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, preferences)
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

			ctx := httpx.WithUserID(r.Context(), userID)
			if sessionID != uuid.Nil {
				ctx = httpx.WithSessionID(ctx, sessionID)
			}
			next(w, r.WithContext(ctx))
		}
	}
}

func WithUserID(ctx context.Context, userID uuid.UUID) context.Context {
	return httpx.WithUserID(ctx, userID)
}

func UserIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	return httpx.UserIDFromContext(ctx)
}

func SessionIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	return httpx.SessionIDFromContext(ctx)
}

func bearerOrCookieToken(r *http.Request) string {
	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	}
	if cookie, err := r.Cookie("auth_token"); err == nil && cookie.Value != "" {
		return cookie.Value
	}

	return ""
}

func cookieSecure() bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv("GAIACOM_COOKIE_SECURE")))
	dev := strings.ToLower(strings.TrimSpace(os.Getenv("GAIACOM_DEV_MODE"))) == "true"
	if value == "0" || value == "false" || value == "no" {
		return !dev
	}
	if value == "" {
		return !dev
	}
	if value == "1" || value == "true" || value == "yes" {
		return true
	}
	return !dev
}
