package federation

import (
	"encoding/base64"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"time"

	"gaiacom/backend/httpx"
)

const maxFederationBodyBytes = 2 * 1024 * 1024

// Handler verarbeitet eingehende Föderations-Anfragen.
type Handler struct {
	Service *Service
}

// NewHandler erstellt einen neuen Föderations-Handler.
func NewHandler(service *Service) *Handler {
	return &Handler{Service: service}
}

// HandleS2SForward verarbeitet die Haupt-Föderations-Route.
func (h *Handler) HandleS2SForward(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	bodyBytes, err := io.ReadAll(io.LimitReader(r.Body, maxFederationBodyBytes+1))
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusInternalServerError)
		return
	}
	defer r.Body.Close()
	if len(bodyBytes) == 0 || len(bodyBytes) > maxFederationBodyBytes {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	// Anfrage verifizieren
	err = h.Service.VerifyReceivedRequest(r, bodyBytes) // KORRIGIERT
	if err != nil {
		log.Printf("federation auth rejected: %v", err)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var payload FederationPayload
	if err := json.Unmarshal(bodyBytes, &payload); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}
	if payload.Origin == "" || len(payload.PDUs) == 0 {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	for _, pdu := range payload.PDUs {
		if score, err := h.Service.GetAbuseScoreForGaiaID(pdu.Sender); err == nil && score != nil {
			if score.FrictionLimit < 1.0 && score.FrictionLimit > 0 {
				delay := time.Duration((1.0/score.FrictionLimit - 1.0) * float64(time.Second))
				if delay > 0 {
					log.Printf("Applying incoming delivery friction delay of %v for sender %s", delay, pdu.Sender)
					time.Sleep(delay)
				}
			}
		}

		if err := h.Service.SaveIncomingPDU(r.Context(), pdu); err != nil {
			log.Printf("Warning: failed to save incoming PDU from %s to %s: %v", pdu.Sender, pdu.Destination, err)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"accepted"}`))
}

// HandleServerDiscovery verarbeitet die Server-Discovery-Anfragen.
func (h *Handler) HandleServerDiscovery(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	pubKey := h.Service.GetPublicKey()
	pubKeyBase64 := base64.StdEncoding.EncodeToString(pubKey)

	doc := map[string]string{
		"server_name":        h.Service.GetServerName(),
		"ed25519_public_key": pubKeyBase64,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(doc)
}

func (h *Handler) HandleNodeInfo(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	doc := map[string]interface{}{
		"server_name": h.Service.GetServerName(),
		"protocols":   []string{"gaiacom.s2s.v1"},
		"endpoints": map[string]string{
			"s2s_forward": "/.well-known/gaiacom/s2s/v1/forward",
			"node_list":   "/api/v1/public/nodes",
		},
		"software": map[string]string{
			"name":    "GaiaCOM",
			"version": "GaiaCom Beta v2",
		},
		"policy": map[string]interface{}{
			"https_required": true,
			"max_body_bytes": maxFederationBodyBytes,
			"signature":      "ed25519:sha256(timestamp.body)",
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(doc)
}

func (h *Handler) GetNodes(w http.ResponseWriter, r *http.Request) {
	var domains []string
	servers, err := h.Service.GetAllFederationServers()
	if err == nil {
		for _, srv := range servers {
			if !srv.IsBlocked {
				domains = append(domains, srv.Domain)
			}
		}
	}

	localServer := h.Service.GetServerName()
	foundLocal := false
	for _, d := range domains {
		if d == localServer {
			foundLocal = true
			break
		}
	}
	if !foundLocal {
		domains = append([]string{localServer}, domains...)
	}

	foundGaiacom := false
	for _, d := range domains {
		if d == "gaiacom.de" {
			foundGaiacom = true
			break
		}
	}
	if !foundGaiacom {
		domains = append(domains, "gaiacom.de")
	}

	httpx.WriteJSON(w, http.StatusOK, map[string]interface{}{"nodes": domains})
}
