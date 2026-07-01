// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package security

import (
	"context"
	"time"
)

// StartRetentionSweeper runs a background task to sweep expired private security contexts.
func (s *SecuritySystem) StartRetentionSweeper(ctx context.Context) {
	ticker := time.NewTicker(24 * time.Hour)
	go func() {
		for {
			select {
			case <-ticker.C:
				s.SweepExpiredPrivateContexts(ctx)
			case <-ctx.Done():
				ticker.Stop()
				return
			}
		}
	}()
}

func (s *SecuritySystem) SweepExpiredPrivateContexts(ctx context.Context) {
	// Execute deletion of private context records where retention_until < now
	nowStr := time.Now().UTC().Format(time.RFC3339Nano)
	if sqlStore, ok := s.Store.(interface {
		DeleteExpiredSecurityContexts(ctx context.Context, now string) error
	}); ok {
		_ = sqlStore.DeleteExpiredSecurityContexts(ctx, nowStr)
	}
}
