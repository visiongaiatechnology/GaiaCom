package networkhealth

import (
	"net/http"

	"gaiacom/backend/httpx"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Dashboard(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.Dashboard(r.Context())
	if err != nil {
		httpx.WriteError(w, http.StatusInternalServerError, "Network health unavailable")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, response)
}
