// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package mailbox

import (
	"encoding/json"
	"net/http"
	"strconv"

	"gaiacom/backend/auth"
	"gaiacom/backend/core/uuid"
	"gaiacom/backend/httpx"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) ListMessages(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	identityID, err := uuid.Parse(r.URL.Query().Get("identityId"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identity ID")
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	query := repository.MailboxQuery{
		Folder:    r.URL.Query().Get("folder"),
		Text:      r.URL.Query().Get("q"),
		From:      r.URL.Query().Get("from"),
		Subject:   r.URL.Query().Get("subject"),
		DateFrom:  parseRequestTime(r.URL.Query().Get("dateFrom")),
		DateTo:    parseRequestTime(r.URL.Query().Get("dateTo")),
		Label:     r.URL.Query().Get("label"),
		Unread:    r.URL.Query().Get("unread") == "1" || r.URL.Query().Get("unread") == "true",
		Starred:   r.URL.Query().Get("starred") == "1" || r.URL.Query().Get("starred") == "true",
		Important: r.URL.Query().Get("important") == "1" || r.URL.Query().Get("important") == "true",
		Limit:     limit,
	}
	messages, err := h.service.Messages(r.Context(), userID, identityID, query)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Mailbox query rejected")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, messages)
}

func (h *Handler) UpdateStates(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var input struct {
		IdentityID string                `json:"identityId"`
		States     []models.MailboxState `json:"states"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid mailbox state request")
		return
	}
	identityID, err := uuid.Parse(input.IdentityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identity ID")
		return
	}
	if err := h.service.UpdateStates(r.Context(), userID, identityID, input.States); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Mailbox state rejected")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (h *Handler) ListDrafts(w http.ResponseWriter, r *http.Request) {
	userID, identityID, ok := h.identityFromQuery(w, r)
	if !ok {
		return
	}
	drafts, err := h.service.Drafts(r.Context(), userID, identityID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Draft query rejected")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, drafts)
}

func (h *Handler) SaveDraft(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var draft models.MailDraft
	if err := json.NewDecoder(r.Body).Decode(&draft); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid draft request")
		return
	}
	saved, err := h.service.SaveDraft(r.Context(), userID, &draft)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Draft rejected")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, saved)
}

func (h *Handler) DeleteDraft(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var input struct {
		DraftID string `json:"draftId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid draft delete request")
		return
	}
	draftID, err := uuid.Parse(input.DraftID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid draft ID")
		return
	}
	if err := h.service.DeleteDraft(r.Context(), userID, draftID); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Draft delete rejected")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (h *Handler) ListLabels(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	labels, err := h.service.Labels(r.Context(), userID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Label query rejected")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, labels)
}

func (h *Handler) SaveLabel(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var label models.MailLabel
	if err := json.NewDecoder(r.Body).Decode(&label); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid label request")
		return
	}
	saved, err := h.service.SaveLabel(r.Context(), userID, &label)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Label rejected")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, saved)
}

func (h *Handler) ListContacts(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	contacts, err := h.service.Contacts(r.Context(), userID, r.URL.Query().Get("q"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Contact query rejected")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, contacts)
}

func (h *Handler) SaveContact(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var contact models.MailContact
	if err := json.NewDecoder(r.Body).Decode(&contact); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid contact request")
		return
	}
	saved, err := h.service.SaveContact(r.Context(), userID, &contact)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Contact rejected")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, saved)
}

func (h *Handler) ListFilters(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	rules, err := h.service.FilterRules(r.Context(), userID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Filter query rejected")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, rules)
}

func (h *Handler) SaveFilter(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var rule models.MailFilterRule
	if err := json.NewDecoder(r.Body).Decode(&rule); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid filter request")
		return
	}
	saved, err := h.service.SaveFilterRule(r.Context(), userID, &rule)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Filter rejected")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, saved)
}

func (h *Handler) GetSettings(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	settings, err := h.service.Settings(r.Context(), userID)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Settings query rejected")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, settings)
}

func (h *Handler) SaveSettings(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	var settings models.MailSettings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid settings request")
		return
	}
	saved, err := h.service.SaveSettings(r.Context(), userID, &settings)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Settings rejected")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, saved)
}

func (h *Handler) GlobalSearch(w http.ResponseWriter, r *http.Request) {
	userID, identityID, ok := h.identityFromQuery(w, r)
	if !ok {
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	results, err := h.service.GlobalSearch(r.Context(), userID, identityID, r.URL.Query().Get("q"), limit)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Search rejected")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, results)
}

func (h *Handler) identityFromQuery(w http.ResponseWriter, r *http.Request) (uuid.UUID, uuid.UUID, bool) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return uuid.Nil, uuid.Nil, false
	}
	identityID, err := uuid.Parse(r.URL.Query().Get("identityId"))
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Invalid identity ID")
		return uuid.Nil, uuid.Nil, false
	}
	return userID, identityID, true
}
