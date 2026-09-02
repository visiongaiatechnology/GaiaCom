// STATUS: DIAMANT VGT SUPREME
package security

import (
	"context"
	"time"
)

func (s *SecuritySystem) StartRetentionSweeper(ctx context.Context) {
	go s.RunRetentionSweeper(ctx)
}

// RunRetentionSweeper blocks until cancellation so embedded runtimes can join its lifecycle.
func (s *SecuritySystem) RunRetentionSweeper(ctx context.Context) {
	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			s.SweepExpiredPrivateContexts(ctx)
		case <-ctx.Done():
			return
		}
	}
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
