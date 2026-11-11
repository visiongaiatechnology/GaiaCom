package smtpbridge

import (
	"encoding/json"
	"errors"
	"net/http"

	"gaiacom/backend/auth"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/httpx"
	"gaiacom/backend/internal/security"
)

type Handler struct {
	Service  *Service
	Security *security.SecuritySystem
	limiter  *smtpIngestLimiter
}

type sendLegacyInput struct {
	SenderIdentityID string       `json:"senderIdentityId"`
	To               string       `json:"to"`
	Subject          string       `json:"subject"`
	Body             string       `json:"body"`
	Attachments      []Attachment `json:"attachments"`
}

type ingestLegacyInput struct {
	TargetGaiaID string       `json:"targetGaiaId"`
	ExternalFrom string       `json:"externalFrom"`
	Subject      string       `json:"subject"`
	Body         string       `json:"body"`
	Attachments  []Attachment `json:"attachments"`
}

// NewHandler builds the SMTP bridge handler. The optional security system is the
// same variadic pattern as auth.NewAuthHandler: it is used for GaiaShield audit
// events on rate-limit rejections, never for authorization.
func NewHandler(service *Service, securitySystems ...*security.SecuritySystem) *Handler {
	handler := &Handler{Service: service, limiter: newSMTPIngestLimiter()}
	if len(securitySystems) > 0 {
		handler.Security = securitySystems[0]
	}
	return handler
}

func (h *Handler) Send(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxSMTPIngestBodyBytes)
	var input sendLegacyInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeSMTPDecodeError(w, err, "Invalid SMTP request")
		return
	}
	senderID, err := uuid.Parse(input.SenderIdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid sender ID")
		return
	}
	if err := h.Service.SendLegacyMail(r.Context(), userID, senderID, input.To, input.Subject, input.Body, input.Attachments); err != nil {
		writeSMTPError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "sent", "transport": "smtp.legacy"})
}

func (h *Handler) Ingest(w http.ResponseWriter, r *http.Request) {
	// Explicit route-scoped size ceiling for the public ingest endpoint (the
	// global shield default is broader). Oversized bodies are rejected before
	// JSON decoding can allocate.
	r.Body = http.MaxBytesReader(w, r.Body, maxSMTPIngestBodyBytes)
	var input ingestLegacyInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeSMTPDecodeError(w, err, "Invalid SMTP ingest request")
		return
	}

	// Rate budget (per source IP, target, sender, node) before the expensive
	// identity lookup and persistence. Fails closed with 429.
	if err := h.CheckSMTPIngestLimits(r, input.TargetGaiaID, input.ExternalFrom); err != nil {
		writeSMTPError(w, err)
		return
	}

	token := r.Header.Get("X-Gaia-SMTP-Token")
	if err := h.Service.IngestLegacyMail(r.Context(), token, input.TargetGaiaID, input.ExternalFrom, input.Subject, input.Body, input.Attachments); err != nil {
		writeSMTPError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusAccepted, map[string]string{"status": "accepted", "transport": "smtp.legacy"})
}

func writeSMTPDecodeError(w http.ResponseWriter, err error, fallback string) {
	var maxBytesErr *http.MaxBytesError
	if errors.As(err, &maxBytesErr) {
		httpx.WriteError(w, http.StatusRequestEntityTooLarge, "SMTP bridge request too large")
		return
	}
	httpx.WriteError(w, http.StatusBadRequest, fallback)
}

func writeSMTPError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, errSMTPNotConfigured):
		httpx.WriteError(w, http.StatusServiceUnavailable, "SMTP bridge is not configured")
	case errors.Is(err, errSMTPUnauthorized):
		httpx.WriteError(w, http.StatusUnauthorized, "SMTP bridge token rejected")
	case errors.Is(err, errSMTPRateLimited):
		httpx.WriteError(w, http.StatusTooManyRequests, "SMTP bridge ingest temporarily throttled")
	default:
		httpx.WriteError(w, http.StatusBadRequest, "SMTP bridge request rejected")
	}
}
