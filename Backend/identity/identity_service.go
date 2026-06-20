package identity

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/core/validate"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
	"gaiacom/backend/utils"
)

type Service struct {
	Store repository.IdentityStore
}

type CreateIdentityInput struct {
	GaiaID       string                 `json:"gaiaId"`
	DisplayName  string                 `json:"displayName"`
	PublicRecord map[string]interface{} `json:"publicRecord"`
}

func NewIdentityService(store repository.IdentityStore) *Service {
	return &Service{Store: store}
}

func (s *Service) CreateIdentity(userID uuid.UUID, input CreateIdentityInput) (*models.Identity, error) {
	if userID == uuid.Nil {
		return nil, errors.New("invalid user")
	}
	if err := validate.GaiaID(input.GaiaID); err != nil {
		return nil, errors.New("invalid gaiaId")
	}
	if len(input.PublicRecord) == 0 {
		return nil, errors.New("publicRecord is required")
	}

	// Enforce limit of maximum 2 identities per user
	existing, err := s.Store.FindIdentitiesByUserID(userID)
	if err != nil {
		return nil, err
	}
	if len(existing) >= 2 {
		return nil, errors.New("maximum identity limit reached (2)")
	}

	count, err := s.Store.CountIdentitiesByGaiaID(input.GaiaID)
	if err != nil {
		return nil, err
	}
	if count > 0 {
		return nil, errors.New("gaiaId already taken")
	}

	publicRecordBytes, err := json.Marshal(input.PublicRecord)
	if err != nil {
		return nil, fmt.Errorf("invalid public record format: %w", err)
	}

	newIdentity := models.Identity{
		ID:           uuid.New(),
		UserID:       userID,
		GaiaID:       input.GaiaID,
		DisplayName:  input.DisplayName,
		PublicRecord: models.JSONB(publicRecordBytes),
		IsActive:     true,
	}

	if err := s.Store.CreateIdentity(&newIdentity); err != nil {
		return nil, err
	}

	return &newIdentity, nil
}

func (s *Service) GetIdentityByGaiaID(gaiaID string) (*models.Identity, error) {
	identity, err := s.Store.FindIdentityByGaiaID(gaiaID)
	if err != nil {
		return nil, errors.New("identity not found")
	}
	return identity, nil
}

func (s *Service) BuildTrustPassport(identity *models.Identity) map[string]interface{} {
	passport := map[string]interface{}{
		"gaiaId":           identity.GaiaID,
		"fingerprint":      "",
		"trustAgeDays":     0,
		"keyHistory":       []map[string]interface{}{},
		"verifiedContacts": 0,
		"abuseScore": map[string]interface{}{
			"score":           0,
			"escalationLevel": 0,
		},
		"nodeReputation": "local-verified",
	}
	if !identity.CreatedAt.IsZero() {
		passport["trustAgeDays"] = int(time.Since(identity.CreatedAt).Hours() / 24)
	}

	var record struct {
		PublicKeys map[string]string `json:"public_keys"`
	}
	if err := json.Unmarshal(identity.PublicRecord, &record); err == nil {
		identityKey := strings.TrimSpace(record.PublicKeys["identity"])
		if identityKey != "" {
			sum := sha256.Sum256([]byte(identityKey))
			passport["fingerprint"] = hex.EncodeToString(sum[:])
			passport["keyHistory"] = []map[string]interface{}{
				{
					"type":        "identity",
					"fingerprint": hex.EncodeToString(sum[:]),
					"firstSeenAt": identity.CreatedAt,
					"lastSeenAt":  identity.UpdatedAt,
					"confirmed":   true,
					"warning":     "",
				},
			}
			if trustStore, ok := s.Store.(repository.TrustMeshStore); ok {
				score, err := trustStore.GetAbuseScore(identityKey)
				if err == nil && score != nil {
					passport["abuseScore"] = map[string]interface{}{
						"score":           score.Score,
						"escalationLevel": score.EscalationLevel,
					}
				}
			}
		}
	}
	return passport
}

func (s *Service) ResolveRemoteIdentity(gaiaID string) (map[string]interface{}, error) {
	if err := validate.GaiaID(gaiaID); err != nil {
		return nil, err
	}

	separator := strings.LastIndex(gaiaID, ":")
	if separator == -1 {
		return nil, errors.New("invalid gaiaId format")
	}
	domain := gaiaID[separator+1:]

	if utils.IsPrivateOrLoopbackIP(domain) && !strings.Contains(domain, "localhost") {
		return nil, errors.New("resolve remote identity aborted: target is on private or local network (SSRF protection)")
	}

	scheme := "https"
	if strings.Contains(domain, "localhost") || strings.Contains(domain, "127.0.0.1") || strings.Contains(domain, "192.168.") {
		scheme = "http"
	}

	url := fmt.Sprintf("%s://%s/api/v1/public/identity/%s", scheme, domain, gaiaID)
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Get(url)

	if err != nil || (resp != nil && resp.StatusCode != http.StatusOK) {
		if resp != nil {
			resp.Body.Close()
			resp = nil
		}
		log.Printf("Primary node resolution failed for %s. Attempting decentralized lookup fallback...", gaiaID)
		if fedStore, ok := s.Store.(repository.FederationStore); ok {
			servers, errList := fedStore.FindAllFederationServers()
			if errList == nil {
				for _, srv := range servers {
					if srv.IsBlocked || srv.Domain == domain {
						continue
					}
					altScheme := "https"
					if strings.Contains(srv.Domain, "localhost") || strings.Contains(srv.Domain, "127.0.0.1") || strings.Contains(srv.Domain, "192.168.") {
						altScheme = "http"
					}
					altURL := fmt.Sprintf("%s://%s/api/v1/public/identity/%s", altScheme, srv.Domain, gaiaID)
					altResp, altErr := client.Get(altURL)
					if altErr == nil && altResp.StatusCode == http.StatusOK {
						resp = altResp
						err = nil
						log.Printf("Successfully resolved identity %s via alternative federated server: %s", gaiaID, srv.Domain)
						break
					}
					if altResp != nil {
						altResp.Body.Close()
					}
				}
			}
		}
	}

	if err != nil {
		return nil, fmt.Errorf("failed to fetch remote identity: %w", err)
	}
	if resp == nil {
		return nil, errors.New("remote server returned empty response")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("remote server returned status %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode remote response: %w", err)
	}

	var remoteID uuid.UUID
	if idStr, ok := result["id"].(string); ok && idStr != "" {
		remoteID, _ = uuid.Parse(idStr)
	}
	if remoteID == uuid.Nil {
		remoteID = uuid.New()
	}

	displayName := "Remote User"
	if disp, ok := result["displayName"].(string); ok && disp != "" {
		displayName = disp
	} else if disp, ok := result["displayName"]; ok {
		displayName = fmt.Sprintf("%v", disp)
	} else {
		localPart := gaiaID[1:separator]
		displayName = strings.Title(localPart)
	}

	var pubRecordStr string
	if pubRec, ok := result["publicRecord"].(string); ok {
		pubRecordStr = pubRec
	} else if pubRec, ok := result["publicRecord"]; ok {
		pubRecBytes, _ := json.Marshal(pubRec)
		pubRecordStr = string(pubRecBytes)
	}

	existsCount, err := s.Store.CountIdentitiesByGaiaID(gaiaID)
	if err == nil && existsCount == 0 {
		now := time.Now().UTC()
		stub := &models.Identity{
			ID:           remoteID,
			UserID:       uuid.Nil,
			GaiaID:       gaiaID,
			DisplayName:  displayName,
			PublicRecord: models.JSONB([]byte(pubRecordStr)),
			IsActive:     true,
			CreatedAt:    now,
			UpdatedAt:    now,
		}
		_ = s.Store.CreateIdentity(stub)
	}

	return map[string]interface{}{
		"id":           remoteID.String(),
		"gaiaId":       gaiaID,
		"gaiaID":       gaiaID,
		"displayName":  displayName,
		"publicRecord": pubRecordStr,
	}, nil
}

func (s *Service) GetIdentitiesForUser(userID uuid.UUID) ([]models.Identity, error) {
	return s.Store.FindIdentitiesByUserID(userID)
}

func (s *Service) IdentityBelongsToUser(identityID uuid.UUID, userID uuid.UUID) (bool, error) {
	return s.Store.IdentityBelongsToUser(identityID, userID)
}
