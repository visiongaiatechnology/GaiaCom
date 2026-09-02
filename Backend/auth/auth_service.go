// STATUS: DIAMANT VGT SUPREME
package auth

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"os"
	"strings"
	"time"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"

	"golang.org/x/crypto/bcrypt"
)

var dummyPasswordHash = []byte("$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy")

const (
	ContextUserIDKey = "user_id"
	tokenIssuer      = "gaiacom.backend"
	tokenAudience    = "gaiacom.client"
	tokenTTL         = 15 * time.Minute
	refreshTokenTTL  = 30 * 24 * time.Hour
)

type AuthService struct {
	Store     repository.AuthStore
	JWTSecret []byte
}

type jwtHeader struct {
	Algorithm string `json:"alg"`
	Type      string `json:"typ"`
}

type jwtClaims struct {
	Subject   string   `json:"sub"`
	SessionID string   `json:"sid,omitempty"`
	Issuer    string   `json:"iss"`
	Audience  []string `json:"aud"`
	IssuedAt  int64    `json:"iat"`
	NotBefore int64    `json:"nbf"`
	ExpiresAt int64    `json:"exp"`
}

type DeviceMetadata struct {
	DeviceLabel string
	DeviceType  string
	OS          string
	Browser     string
	IPAddress   string
	UserAgent   string
}

func NewAuthService(store repository.AuthStore) (*AuthService, error) {
	secret, err := loadJWTSecret()
	if err != nil {
		return nil, err
	}
	return NewAuthServiceWithSecret(store, secret)
}

func NewAuthServiceWithSecret(store repository.AuthStore, secret []byte) (*AuthService, error) {
	if store == nil {
		return nil, errors.New("auth store is required")
	}
	if len(secret) < 32 {
		return nil, errors.New("JWT signing secret must contain at least 32 bytes")
	}
	return &AuthService{
		Store:     store,
		JWTSecret: append([]byte(nil), secret...),
	}, nil
}

func (s *AuthService) RegisterUser(username, password, publicKey string) (*models.User, error) {
	username = strings.TrimSpace(username)
	if len(username) < 3 || len(username) > 64 {
		return nil, errors.New("username must be between 3 and 64 characters")
	}
	if len(password) < 12 || len(password) > 512 {
		return nil, errors.New("password must be between 12 and 512 characters")
	}

	count, err := s.Store.CountUsersByUsername(username)
	if err != nil {
		return nil, err
	}
	if count > 0 {
		return nil, errors.New("username already taken")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := models.User{
		ID:                  uuid.New(),
		Username:            username,
		PasswordHash:        string(hashedPassword),
		PublicKey:           publicKey,
		AllowAnonymousStats: true,
	}
	if err := s.Store.CreateUser(&user); err != nil {
		return nil, err
	}

	return &user, nil
}

func (s *AuthService) LoginUser(username, password string) (string, *models.User, error) {
	access, _, user, err := s.LoginUserWithDevice(username, password, DeviceMetadata{})
	return access, user, err
}

func (s *AuthService) LoginUserWithDevice(username, password string, metadata DeviceMetadata) (string, string, *models.User, error) {
	user, err := s.Store.FindUserByUsername(strings.TrimSpace(username))
	if err != nil {
		_ = bcrypt.CompareHashAndPassword(dummyPasswordHash, []byte(password))
		return "", "", nil, errors.New("invalid credentials")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return "", "", nil, errors.New("invalid credentials")
	}

	session := models.DeviceSession{
		ID:          uuid.New(),
		UserID:      user.ID,
		DeviceLabel: sanitizeDeviceValue(metadata.DeviceLabel, 80),
		DeviceType:  sanitizeDeviceValue(metadata.DeviceType, 32),
		OS:          sanitizeDeviceValue(metadata.OS, 48),
		Browser:     sanitizeDeviceValue(metadata.Browser, 48),
		IPAddress:   sanitizeDeviceValue(metadata.IPAddress, 64),
		UserAgent:   sanitizeDeviceValue(metadata.UserAgent, 256),
	}
	if session.DeviceLabel == "" {
		session.DeviceLabel = defaultDeviceLabel(session)
	}
	if err := s.Store.CreateDeviceSession(context.Background(), &session); err != nil {
		return "", "", nil, err
	}
	refreshToken, refreshHash, err := newRefreshToken(session.ID)
	if err != nil {
		_ = s.Store.RevokeDeviceSession(context.Background(), user.ID, session.ID)
		return "", "", nil, err
	}
	if err := s.Store.SetDeviceSessionRefresh(context.Background(), session.ID, refreshHash, uuid.New(), time.Now().UTC().Add(refreshTokenTTL)); err != nil {
		_ = s.Store.RevokeDeviceSession(context.Background(), user.ID, session.ID)
		return "", "", nil, err
	}
	accessToken, err := s.generateToken(user.ID, session.ID)
	if err != nil {
		return "", "", nil, err
	}
	return accessToken, refreshToken, user, nil
}

func (s *AuthService) RefreshSession(ctx context.Context, rawToken string) (string, string, *models.User, error) {
	parts := strings.SplitN(strings.TrimSpace(rawToken), ".", 2)
	if len(parts) != 2 {
		return "", "", nil, errors.New("invalid refresh token")
	}
	sessionID, err := uuid.Parse(parts[0])
	if err != nil || sessionID == uuid.Nil {
		return "", "", nil, errors.New("invalid refresh token")
	}
	session, err := s.Store.FindDeviceSessionForRefresh(ctx, sessionID)
	if err != nil || !session.RevokedAt.IsZero() || session.RefreshExpiresAt.Before(time.Now().UTC()) {
		return "", "", nil, errors.New("invalid refresh token")
	}
	presentedHash := hashRefreshToken(rawToken)
	if !hmac.Equal([]byte(session.RefreshTokenHash), []byte(presentedHash)) {
		_ = s.Store.RevokeDeviceSession(ctx, session.UserID, sessionID)
		return "", "", nil, errors.New("refresh token replay rejected")
	}
	nextToken, nextHash, err := newRefreshToken(sessionID)
	if err != nil {
		return "", "", nil, err
	}
	rotated, err := s.Store.RotateDeviceSessionRefresh(ctx, sessionID, presentedHash, nextHash, time.Now().UTC().Add(refreshTokenTTL))
	if err != nil || !rotated {
		_ = s.Store.RevokeDeviceSession(ctx, session.UserID, sessionID)
		return "", "", nil, errors.New("refresh rotation rejected")
	}
	accessToken, err := s.generateToken(session.UserID, sessionID)
	if err != nil {
		return "", "", nil, err
	}
	user, err := s.Store.FindUserByID(session.UserID)
	if err != nil {
		return "", "", nil, err
	}
	return accessToken, nextToken, user, nil
}

func newRefreshToken(sessionID uuid.UUID) (string, string, error) {
	secret := make([]byte, 32)
	if _, err := rand.Read(secret); err != nil {
		return "", "", err
	}
	raw := sessionID.String() + "." + hex.EncodeToString(secret)
	return raw, hashRefreshToken(raw), nil
}

func hashRefreshToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

func (s *AuthService) ChangePassword(ctx context.Context, userID, currentSessionID uuid.UUID, currentPassword, newPassword string) error {
	if userID == uuid.Nil {
		return errors.New("invalid credentials")
	}
	if len(newPassword) < 12 || len(newPassword) > 512 {
		return errors.New("password must be between 12 and 512 characters")
	}

	user, err := s.Store.FindUserByID(userID)
	if err != nil {
		return errors.New("invalid credentials")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(currentPassword)); err != nil {
		return errors.New("invalid credentials")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return s.Store.UpdateUserPasswordAndRevokeSessions(ctx, userID, string(hashedPassword), currentSessionID)
}

func (s *AuthService) Logout(ctx context.Context, userID, sessionID uuid.UUID) error {
	if userID == uuid.Nil || sessionID == uuid.Nil {
		return errors.New("invalid session")
	}
	return s.Store.RevokeDeviceSession(ctx, userID, sessionID)
}

func (s *AuthService) DeleteAccount(ctx context.Context, userID uuid.UUID, currentPassword string) error {
	if userID == uuid.Nil {
		return errors.New("invalid credentials")
	}
	user, err := s.Store.FindUserByID(userID)
	if err != nil {
		return errors.New("invalid credentials")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(currentPassword)); err != nil {
		return errors.New("invalid credentials")
	}
	return s.Store.DeleteUserAccount(ctx, userID)
}

func (s *AuthService) UpdateAnonymousStats(ctx context.Context, userID uuid.UUID, allow bool) (*models.User, error) {
	if userID == uuid.Nil {
		return nil, errors.New("invalid user")
	}
	if err := s.Store.UpdateUserAnonymousStats(ctx, userID, allow); err != nil {
		return nil, err
	}
	return s.Store.FindUserByID(userID)
}

func (s *AuthService) GetNotificationPreferences(ctx context.Context, userID uuid.UUID) (*models.NotificationPreferences, error) {
	if userID == uuid.Nil {
		return nil, errors.New("invalid user")
	}
	return s.Store.GetNotificationPreferences(ctx, userID)
}

func (s *AuthService) SaveNotificationPreferences(ctx context.Context, userID uuid.UUID, preferences models.NotificationPreferences) (*models.NotificationPreferences, error) {
	if userID == uuid.Nil {
		return nil, errors.New("invalid user")
	}
	preferences.UserID = userID
	if !validClockTime(preferences.QuietHoursStart) || !validClockTime(preferences.QuietHoursEnd) {
		return nil, errors.New("invalid quiet hours")
	}
	if err := s.Store.SaveNotificationPreferences(ctx, &preferences); err != nil {
		return nil, err
	}
	return s.Store.GetNotificationPreferences(ctx, userID)
}

func validClockTime(value string) bool {
	if len(value) != 5 || value[2] != ':' {
		return false
	}
	hour := int(value[0]-'0')*10 + int(value[1]-'0')
	minute := int(value[3]-'0')*10 + int(value[4]-'0')
	return value[0] >= '0' && value[0] <= '2' && value[1] >= '0' && value[1] <= '9' && value[3] >= '0' && value[3] <= '5' && value[4] >= '0' && value[4] <= '9' && hour < 24 && minute < 60
}

func (s *AuthService) ValidateToken(tokenString string) (uuid.UUID, error) {
	userID, _, err := s.ValidateTokenWithSession(tokenString)
	return userID, err
}

func (s *AuthService) ValidateTokenWithSession(tokenString string) (uuid.UUID, uuid.UUID, error) {
	claims, err := verifySignedToken(tokenString, s.JWTSecret)
	if err != nil {
		return uuid.Nil, uuid.Nil, errors.New("invalid token")
	}

	now := time.Now().UTC().Unix()
	if claims.Subject == "" || claims.Issuer != tokenIssuer || claims.NotBefore > now || claims.ExpiresAt <= now {
		return uuid.Nil, uuid.Nil, errors.New("invalid token")
	}
	if !stringSliceContains(claims.Audience, tokenAudience) {
		return uuid.Nil, uuid.Nil, errors.New("invalid token")
	}

	userID, err := uuid.Parse(claims.Subject)
	if err != nil {
		return uuid.Nil, uuid.Nil, errors.New("invalid token")
	}
	if strings.TrimSpace(claims.SessionID) == "" {
		return userID, uuid.Nil, nil
	}
	sessionID, err := uuid.Parse(claims.SessionID)
	if err != nil {
		return uuid.Nil, uuid.Nil, errors.New("invalid token")
	}
	session, err := s.Store.FindActiveDeviceSession(context.Background(), sessionID)
	if err != nil || session.UserID != userID {
		return uuid.Nil, uuid.Nil, errors.New("invalid token")
	}
	_ = s.Store.UpdateDeviceSessionLastSeen(context.Background(), sessionID, time.Now().UTC())
	return userID, sessionID, nil
}

func (s *AuthService) ListDeviceSessions(ctx context.Context, userID uuid.UUID, currentSessionID uuid.UUID) ([]models.DeviceSession, error) {
	sessions, err := s.Store.FindDeviceSessionsForUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	for index := range sessions {
		sessions[index].IsCurrent = currentSessionID != uuid.Nil && sessions[index].ID == currentSessionID
	}
	return sessions, nil
}

func (s *AuthService) RevokeDeviceSession(ctx context.Context, userID uuid.UUID, sessionID uuid.UUID, currentSessionID uuid.UUID) error {
	if sessionID == uuid.Nil {
		return errors.New("invalid session")
	}
	if currentSessionID != uuid.Nil && sessionID == currentSessionID {
		return errors.New("current session cannot be revoked here")
	}
	return s.Store.RevokeDeviceSession(ctx, userID, sessionID)
}

func (s *AuthService) generateToken(userID uuid.UUID, sessionID uuid.UUID) (string, error) {
	now := time.Now().UTC()
	return signToken(jwtClaims{
		Subject:   userID.String(),
		SessionID: sessionID.String(),
		Issuer:    tokenIssuer,
		Audience:  []string{tokenAudience},
		IssuedAt:  now.Unix(),
		NotBefore: now.Unix(),
		ExpiresAt: now.Add(tokenTTL).Unix(),
	}, s.JWTSecret)
}

func signToken(claims jwtClaims, secret []byte) (string, error) {
	headerBytes, err := json.Marshal(jwtHeader{Algorithm: "HS256", Type: "JWT"})
	if err != nil {
		return "", err
	}
	claimBytes, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}

	encodedHeader := base64.RawURLEncoding.EncodeToString(headerBytes)
	encodedClaims := base64.RawURLEncoding.EncodeToString(claimBytes)
	signingInput := encodedHeader + "." + encodedClaims
	signature := signBytes([]byte(signingInput), secret)

	return signingInput + "." + base64.RawURLEncoding.EncodeToString(signature), nil
}

func verifySignedToken(tokenString string, secret []byte) (jwtClaims, error) {
	parts := strings.Split(tokenString, ".")
	if len(parts) != 3 {
		return jwtClaims{}, errors.New("invalid token format")
	}

	headerBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return jwtClaims{}, err
	}
	var header jwtHeader
	if err := json.Unmarshal(headerBytes, &header); err != nil {
		return jwtClaims{}, err
	}
	if header.Algorithm != "HS256" || header.Type != "JWT" {
		return jwtClaims{}, errors.New("invalid token header")
	}

	expected := signBytes([]byte(parts[0]+"."+parts[1]), secret)
	actual, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return jwtClaims{}, err
	}
	if !hmac.Equal(expected, actual) {
		return jwtClaims{}, errors.New("invalid token signature")
	}

	claimBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return jwtClaims{}, err
	}
	var claims jwtClaims
	if err := json.Unmarshal(claimBytes, &claims); err != nil {
		return jwtClaims{}, err
	}

	return claims, nil
}

func signBytes(input []byte, secret []byte) []byte {
	mac := hmac.New(sha256.New, secret)
	_, _ = mac.Write(input)
	return mac.Sum(nil)
}

func stringSliceContains(values []string, needle string) bool {
	for _, value := range values {
		if value == needle {
			return true
		}
	}
	return false
}

func sanitizeDeviceValue(value string, maxLen int) string {
	value = strings.TrimSpace(value)
	value = strings.Map(func(r rune) rune {
		if r < 32 || r == 127 {
			return -1
		}
		return r
	}, value)
	runes := []rune(value)
	if len(runes) > maxLen {
		value = string(runes[:maxLen])
	}
	return value
}

func defaultDeviceLabel(session models.DeviceSession) string {
	switch {
	case session.Browser != "" && session.OS != "":
		return session.Browser + " on " + session.OS
	case session.OS != "":
		return session.OS
	case session.DeviceType != "":
		return session.DeviceType
	default:
		return "Unknown device"
	}
}

func loadJWTSecret() ([]byte, error) {
	secret := os.Getenv("GAIACOM_JWT_SECRET")
	if len(secret) < 32 {
		secret = os.Getenv("JWT_SECRET")
	}
	if len(secret) < 32 {
		return nil, errors.New("GAIACOM_JWT_SECRET must be set to at least 32 bytes")
	}
	return []byte(secret), nil
}
