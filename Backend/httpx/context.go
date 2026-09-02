package httpx

import (
	"context"

	"gaiacom/backend/core/uuid"
)

type ContextKey string

const (
	ContextUserIDKey    ContextKey = "user_id"
	ContextSessionIDKey ContextKey = "session_id"
)

func WithUserID(ctx context.Context, userID uuid.UUID) context.Context {
	return context.WithValue(ctx, ContextUserIDKey, userID)
}

func UserIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	value := ctx.Value(ContextUserIDKey)
	userID, ok := value.(uuid.UUID)
	return userID, ok && userID != uuid.Nil
}

func WithSessionID(ctx context.Context, sessionID uuid.UUID) context.Context {
	return context.WithValue(ctx, ContextSessionIDKey, sessionID)
}

func SessionIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	value := ctx.Value(ContextSessionIDKey)
	sessionID, ok := value.(uuid.UUID)
	return sessionID, ok && sessionID != uuid.Nil
}
