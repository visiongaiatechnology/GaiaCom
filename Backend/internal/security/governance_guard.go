package security

import (
	"context"
	"errors"
	"net/http"
)

func (s *SecuritySystem) CheckGovernanceAction(ctx context.Context, actorIdentity string, action string, targetNode string, r *http.Request) error {
	// 1. Enforce that Node Operators only apply actions on their own node name
	if action == "node_operator_action" {
		if targetNode != s.NodeID {
			s.RecordSecurityEvent(ctx, nil, nil, "governance_abuse", "high", "governance_guard",
				"Governance Bypass: Node-Operator versuchte Aktionen auf fremdem Node ("+targetNode+") auszuführen.", "reject", r)
			return errors.New("forbidden: node operator can only perform actions on their own node")
		}
	}

	return nil
}
