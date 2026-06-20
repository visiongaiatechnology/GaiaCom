package auth

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
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

const (
	ContextUserIDKey = "user_id"
	tokenIssuer      = "gaiacom.backend"
	tokenAudience    = "gaiacom.client"
	tokenTTL         = 24 * time.Hour
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

func NewAuthService(store repository.AuthStore) *AuthService {
	return &AuthService{
		Store:     store,
		JWTSecret: loadJWTSecret(),
	}
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
		ID:           uuid.New(),
		Username:     username,
		PasswordHash: string(hashedPassword),
		PublicKey:    publicKey,
	}
	if err := s.Store.CreateUser(&user); err != nil {
		return nil, err
	}

	return &user, nil
}

func (s *AuthService) LoginUser(username, password string) (string, *models.User, error) {
	return s.LoginUserWithDevice(username, password, DeviceMetadata{})
}

func (s *AuthService) LoginUserWithDevice(username, password string, metadata DeviceMetadata) (string, *models.User, error) {
	user, err := s.Store.FindUserByUsername(strings.TrimSpace(username))
	if err != nil {
		return "", nil, errors.New("invalid credentials")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return "", nil, errors.New("invalid credentials")
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
		return "", nil, err
	}

	token, err := s.generateToken(user.ID, session.ID)
	if err != nil {
		return "", nil, err
	}
	return token, user, nil
}

func (s *AuthService) ChangePassword(ctx context.Context, userID uuid.UUID, currentPassword, newPassword string) error {
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
	return s.Store.UpdateUserPasswordHash(ctx, userID, string(hashedPassword))
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

func loadJWTSecret() []byte {
	secret := os.Getenv("GAIACOM_JWT_SECRET")
	if len(secret) < 32 {
		secret = os.Getenv("JWT_SECRET")
	}
	if len(secret) < 32 {
		panic("GAIACOM_JWT_SECRET must be set to at least 32 bytes")
	}
	return []byte(secret)
}
