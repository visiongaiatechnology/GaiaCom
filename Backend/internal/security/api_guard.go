// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package security

import (
	"errors"
	"net/http"

	"gaiacom/backend/core/uuid"
)

func (s *SecuritySystem) CheckAPIAction(r *http.Request, action string, userID uuid.UUID, resourceID uuid.UUID) error {
	if userID == uuid.Nil {
		return errors.New("unauthorized")
	}

	switch action {
	case "use_identity":
		belongs, err := s.Store.IdentityBelongsToUser(resourceID, userID)
		if err != nil || !belongs {
			s.RecordSecurityEvent(r.Context(), &userID, &resourceID, "actor_forgery", "high", "api_guard",
				"Identitätsfälschung (Actor Forgery) blockiert: Benutzer versuchte eine fremde Identity ID zu nutzen.", "reject", r)
			return errors.New("forbidden: sender identity not authorized")
		}

	case "manage_room":
		isAdmin, err := s.Store.UserIsRoomAdmin(r.Context(), userID, resourceID)
		if err != nil || !isAdmin {
			s.RecordSecurityEvent(r.Context(), &userID, nil, "bfla_attempt", "high", "api_guard",
				"BFLA-Versuch blockiert: Benutzer ohne Administratorrechte versuchte Room-Einstellungen zu ändern.", "reject", r)
			return errors.New("forbidden: room administrator privileges required")
		}

	case "view_report":
		// Fetch report and make sure it is owned or accessible
		report, err := s.Store.GetAbuseCase(r.Context(), resourceID.String())
		if err != nil || report == nil {
			s.RecordSecurityEvent(r.Context(), &userID, nil, "bola_attempt", "high", "api_guard",
				"BOLA-Versuch blockiert: Zugriff auf nicht existierenden oder nicht autorisierten Report.", "reject", r)
			return errors.New("forbidden: report details inaccessible")
		}
	}

	return nil
}
