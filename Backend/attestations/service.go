package attestations

import (
	"context"
	"crypto/ed25519"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
)

var (
	// ErrForbidden is returned when the actor does not hold node_operator.
	ErrForbidden = errors.New("node_operator role required")
	// ErrInvalidInput is returned for invalid payloads/parameters.
	ErrInvalidInput = errors.New("invalid attestation input")
	// ErrSubjectNotFound is returned when the subject identity does not exist locally.
	ErrSubjectNotFound = errors.New("subject identity not found on this node")
	// ErrDuplicate is returned when an active attestation with the same key exists.
	ErrDuplicate = errors.New("an active attestation already exists for this subject/type/issuer")
	// ErrNotFound is returned when the attestation ID is unknown.
	ErrNotFound = errors.New("attestation not found")
	// ErrAlreadyRevoked is returned when revoking an already revoked attestation.
	ErrAlreadyRevoked = errors.New("attestation already revoked")
)

const (
	canonicalVersion  = "gaia-attestation-v1"
	algorithmEd25519  = "Ed25519"
	maxAttestationAge = 100
)

var allowedTypes = map[string]struct{}{
	"human": {}, "organization": {}, "node_operator": {}, "moderator": {}, "official": {},
}

var allowedAuthorities = map[string]struct{}{
	"node": {}, "governance": {}, "domain_proof": {}, "organization": {},
}

// typeAuthority maps each attestation type to the only valid issuing authority.
var typeAuthority = map[string]string{
	"human":         "node",
	"organization":  "node",
	"moderator":     "governance",
	"node_operator": "governance",
	"official":      "governance",
}

// Store is the persistence surface required by the attestation service.
type Store interface {
	repository.AttestationStore
	FindIdentityByGaiaID(gaiaID string) (*models.Identity, error)
	FindIdentitiesByUserID(userID uuid.UUID) ([]models.Identity, error)
}

// RoleChecker is satisfied by governance.Service (HasRole).
type RoleChecker interface {
	HasRole(ctx context.Context, gaiaID string, role string) (bool, error)
}

// Service issues, revokes and lists node attestations and operator transparency data.
type Service struct {
	store      Store
	roles      RoleChecker
	nodeName   string
	privateKey ed25519.PrivateKey
	publicKey  ed25519.PublicKey
	now        func() time.Time
}

// NewService creates the attestation service with the node Ed25519 signing key.
func NewService(store Store, roles RoleChecker, nodeName string, privateKey ed25519.PrivateKey) (*Service, error) {
	if store == nil || roles == nil {
		return nil, errors.New("attestation service requires store and role checker")
	}
	if len(privateKey) != ed25519.PrivateKeySize {
		return nil, errors.New("attestation service requires a node Ed25519 private key")
	}
	publicKey, ok := privateKey.Public().(ed25519.PublicKey)
	if !ok || len(publicKey) != ed25519.PublicKeySize {
		return nil, errors.New("attestation service can not derive the node public key")
	}
	return &Service{
		store:      store,
		roles:      roles,
		nodeName:   strings.TrimSpace(nodeName),
		privateKey: privateKey,
		publicKey:  publicKey,
		now:        time.Now,
	}, nil
}

// CreateAttestationInput is the validated operator input for a new attestation.
type CreateAttestationInput struct {
	Subject       string `json:"subject"`
	Type          string `json:"type"`
	Authority     string `json:"authority"`
	EvidenceRef   string `json:"evidence_ref"`
	ExpiresInDays int    `json:"expires_in_days"`
}

// AttestationView is the JSON shape returned by the audit endpoints.
type AttestationView struct {
	ID                  string `json:"id"`
	Type                string `json:"type"`
	IssuerGaiaID        string `json:"issuer_gaia_id"`
	Authority           string `json:"authority"`
	EvidenceRef         string `json:"evidence_ref"`
	IssuedAt            string `json:"issued_at"`
	ExpiresAt           string `json:"expires_at"`
	Status              string `json:"status"`
	Canonical           string `json:"canonical"`
	SignatureHex        string `json:"signature_hex"`
	SigningPublicKeyHex string `json:"signing_public_key_hex"`
	Algorithm           string `json:"algorithm"`
}

type canonicalPayload struct {
	Version     string `json:"version"`
	Subject     string `json:"subject"`
	Type        string `json:"type"`
	Issuer      string `json:"issuer"`
	Authority   string `json:"authority"`
	EvidenceRef string `json:"evidence_ref"`
	IssuedAt    string `json:"issued_at"`
	ExpiresAt   string `json:"expires_at"`
}

func (s *Service) clock() time.Time {
	if s.now != nil {
		return s.now().UTC()
	}
	return time.Now().UTC()
}

// OperatorActor resolves the acting GaiaID for a user only when it holds node_operator.
func (s *Service) OperatorActor(ctx context.Context, userID uuid.UUID) (string, bool) {
	identities, err := s.store.FindIdentitiesByUserID(userID)
	if err != nil {
		return "", false
	}
	for _, identity := range identities {
		has, err := s.roles.HasRole(ctx, identity.GaiaID, "node_operator")
		if err == nil && has {
			return identity.GaiaID, true
		}
	}
	return "", false
}

func (s *Service) requireOperator(ctx context.Context, actorGaiaID string) error {
	has, err := s.roles.HasRole(ctx, actorGaiaID, "node_operator")
	if err != nil {
		return fmt.Errorf("role check failed: %w", err)
	}
	if !has {
		return ErrForbidden
	}
	return nil
}

// CreateAttestation validates and persists a node-signed attestation.
func (s *Service) CreateAttestation(ctx context.Context, actorGaiaID string, input CreateAttestationInput) (*models.IdentityAttestation, error) {
	if err := s.requireOperator(ctx, actorGaiaID); err != nil {
		return nil, err
	}
	subject := strings.ToLower(strings.TrimSpace(input.Subject))
	attestationType := strings.ToLower(strings.TrimSpace(input.Type))
	authority := strings.ToLower(strings.TrimSpace(input.Authority))
	evidenceRef := strings.TrimSpace(input.EvidenceRef)
	if subject == "" {
		return nil, fmt.Errorf("%w: subject is required", ErrInvalidInput)
	}
	if _, ok := allowedTypes[attestationType]; !ok {
		return nil, fmt.Errorf("%w: unsupported type", ErrInvalidInput)
	}
	if _, ok := allowedAuthorities[authority]; !ok {
		return nil, fmt.Errorf("%w: unsupported authority", ErrInvalidInput)
	}
	if authority != typeAuthority[attestationType] {
		return nil, fmt.Errorf("%w: authority %q is not valid for type %q", ErrInvalidInput, authority, attestationType)
	}
	if len(evidenceRef) < 4 {
		return nil, fmt.Errorf("%w: evidence_ref must be at least 4 characters", ErrInvalidInput)
	}
	if input.ExpiresInDays < 1 || input.ExpiresInDays > 3650 {
		return nil, fmt.Errorf("%w: expires_in_days must be between 1 and 3650", ErrInvalidInput)
	}

	// The subject must already exist on this node; remote resolution is never used.
	subjectIdentity, err := s.store.FindIdentityByGaiaID(subject)
	if err != nil || subjectIdentity == nil {
		return nil, ErrSubjectNotFound
	}
	issuer := strings.ToLower(strings.TrimSpace(actorGaiaID))
	existing, err := s.store.CountActiveAttestationKey(ctx, subject, attestationType, issuer)
	if err != nil {
		return nil, fmt.Errorf("check existing attestation: %w", err)
	}
	if existing > 0 {
		return nil, ErrDuplicate
	}

	now := s.clock()
	issuedAt := now.Format(time.RFC3339)
	expiresAt := now.AddDate(0, 0, input.ExpiresInDays).Format(time.RFC3339)
	payload := canonicalPayload{
		Version:     canonicalVersion,
		Subject:     subject,
		Type:        attestationType,
		Issuer:      issuer,
		Authority:   authority,
		EvidenceRef: evidenceRef,
		IssuedAt:    issuedAt,
		ExpiresAt:   expiresAt,
	}
	canonicalBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("canonicalize attestation: %w", err)
	}
	signature := ed25519.Sign(s.privateKey, canonicalBytes)
	attestation := &models.IdentityAttestation{
		ID:                  uuid.New().String(),
		SubjectIdentityID:   subjectIdentity.ID.String(),
		SubjectGaiaID:       subject,
		Type:                attestationType,
		IssuerGaiaID:        issuer,
		Authority:           authority,
		EvidenceRef:         evidenceRef,
		IssuedAt:            issuedAt,
		ExpiresAt:           expiresAt,
		Canonical:           string(canonicalBytes),
		SignatureHex:        hex.EncodeToString(signature),
		SigningPublicKeyHex: hex.EncodeToString(s.publicKey),
		Algorithm:           algorithmEd25519,
		CreatedAt:           issuedAt,
	}
	if err := s.store.CreateAttestation(ctx, attestation); err != nil {
		if errors.Is(err, repository.ErrAttestationDuplicate) {
			return nil, ErrDuplicate
		}
		return nil, fmt.Errorf("persist attestation: %w", err)
	}
	return attestation, nil
}

// RevokeAttestation marks an attestation revoked, preserving the audit row.
func (s *Service) RevokeAttestation(ctx context.Context, actorGaiaID, attestationID, reason string) error {
	if err := s.requireOperator(ctx, actorGaiaID); err != nil {
		return err
	}
	attestationID = strings.TrimSpace(attestationID)
	reason = strings.TrimSpace(reason)
	if attestationID == "" {
		return fmt.Errorf("%w: attestation id is required", ErrInvalidInput)
	}
	if len(reason) < 4 {
		return fmt.Errorf("%w: reason must be at least 4 characters", ErrInvalidInput)
	}
	current, err := s.store.GetAttestationByID(ctx, attestationID)
	if err != nil || current == nil {
		return ErrNotFound
	}
	if current.RevokedAt != "" {
		return ErrAlreadyRevoked
	}
	revokedAt := s.clock().Format(time.RFC3339)
	ok, err := s.store.RevokeAttestation(ctx, attestationID, revokedAt, reason)
	if err != nil {
		return fmt.Errorf("revoke attestation: %w", err)
	}
	if !ok {
		return ErrAlreadyRevoked
	}
	return nil
}

// ListSubjectAttestations returns all attestations for one subject (max 100).
func (s *Service) ListSubjectAttestations(ctx context.Context, subjectGaiaID string) ([]AttestationView, error) {
	subject := strings.ToLower(strings.TrimSpace(subjectGaiaID))
	if subject == "" {
		return nil, fmt.Errorf("%w: subject is required", ErrInvalidInput)
	}
	attestations, err := s.store.ListAttestationsBySubject(ctx, subject, maxAttestationAge)
	if err != nil {
		return nil, fmt.Errorf("list attestations: %w", err)
	}
	views := make([]AttestationView, 0, len(attestations))
	for _, attestation := range attestations {
		views = append(views, s.view(attestation, s.clock()))
	}
	return views, nil
}

// ListIssuedAttestations returns issued attestations for the operator view.
func (s *Service) ListIssuedAttestations(ctx context.Context, actorGaiaID, status string, limit int, cursor string) ([]AttestationView, string, error) {
	if err := s.requireOperator(ctx, actorGaiaID); err != nil {
		return nil, "", err
	}
	activeOnly := true
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "", "active":
		activeOnly = true
	case "all":
		activeOnly = false
	default:
		return nil, "", fmt.Errorf("%w: status must be active or all", ErrInvalidInput)
	}
	offset, err := parseCursor(cursor)
	if err != nil {
		return nil, "", err
	}
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	attestations, err := s.store.ListAttestationsForOperator(ctx, activeOnly, limit, offset)
	if err != nil {
		return nil, "", fmt.Errorf("list issued attestations: %w", err)
	}
	now := s.clock()
	views := make([]AttestationView, 0, len(attestations))
	for _, attestation := range attestations {
		views = append(views, s.view(attestation, now))
	}
	nextCursor := ""
	if len(views) == limit {
		nextCursor = strconv.Itoa(offset + limit)
	}
	return views, nextCursor, nil
}

// OperatorStats returns real aggregate node counts for the operator dashboard.
func (s *Service) OperatorStats(ctx context.Context, actorGaiaID string) (*models.OperatorStats, error) {
	if err := s.requireOperator(ctx, actorGaiaID); err != nil {
		return nil, err
	}
	now := s.clock()
	stats, err := s.store.OperatorStats(ctx, now.Format(time.RFC3339), now.Add(-24*time.Hour).Format(time.RFC3339))
	if err != nil {
		return nil, fmt.Errorf("operator stats: %w", err)
	}
	return stats, nil
}

// Directory returns the minimised identity directory and writes one access-log row.
func (s *Service) Directory(ctx context.Context, actorGaiaID, reason, query string, limit int, cursor string) ([]models.OperatorDirectoryEntry, string, int64, error) {
	if err := s.requireOperator(ctx, actorGaiaID); err != nil {
		return nil, "", 0, err
	}
	reason = strings.TrimSpace(reason)
	if len(reason) < 20 {
		return nil, "", 0, fmt.Errorf("%w: reason must be at least 20 characters", ErrInvalidInput)
	}
	offset, err := parseCursor(cursor)
	if err != nil {
		return nil, "", 0, err
	}
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	entries, total, err := s.store.ListOperatorDirectory(ctx, strings.TrimSpace(query), limit, offset)
	if err != nil {
		return nil, "", 0, fmt.Errorf("identity directory: %w", err)
	}
	now := s.clock()
	access := &models.NodeIdentityAccessLog{
		ID:             uuid.New().String(),
		OperatorGaiaID: strings.ToLower(strings.TrimSpace(actorGaiaID)),
		Reason:         reason,
		ResultCount:    len(entries),
		CreatedAt:      now.Format(time.RFC3339),
	}
	if err := s.store.RecordIdentityDirectoryAccess(ctx, access); err != nil {
		return nil, "", 0, fmt.Errorf("record directory access: %w", err)
	}
	nextCursor := ""
	if int64(offset+len(entries)) < total {
		nextCursor = strconv.Itoa(offset + len(entries))
	}
	return entries, nextCursor, total, nil
}

// AccessLog returns the latest transparency-log rows (any authenticated role).
func (s *Service) AccessLog(ctx context.Context) ([]models.NodeIdentityAccessLog, error) {
	events, err := s.store.ListIdentityAccessLog(ctx, 50)
	if err != nil {
		return nil, fmt.Errorf("identity access log: %w", err)
	}
	return events, nil
}

// ToView renders one persisted attestation for API responses.
func (s *Service) ToView(attestation *models.IdentityAttestation) AttestationView {
	if attestation == nil {
		return AttestationView{}
	}
	return s.view(*attestation, s.clock())
}

func (s *Service) view(attestation models.IdentityAttestation, now time.Time) AttestationView {
	return AttestationView{
		ID:                  attestation.ID,
		Type:                attestation.Type,
		IssuerGaiaID:        attestation.IssuerGaiaID,
		Authority:           attestation.Authority,
		EvidenceRef:         attestation.EvidenceRef,
		IssuedAt:            attestation.IssuedAt,
		ExpiresAt:           attestation.ExpiresAt,
		Status:              attestationStatus(attestation, now),
		Canonical:           attestation.Canonical,
		SignatureHex:        attestation.SignatureHex,
		SigningPublicKeyHex: attestation.SigningPublicKeyHex,
		Algorithm:           attestation.Algorithm,
	}
}

func attestationStatus(attestation models.IdentityAttestation, now time.Time) string {
	if attestation.RevokedAt != "" {
		return "revoked"
	}
	expiresAt, err := time.Parse(time.RFC3339, attestation.ExpiresAt)
	if err != nil || !now.Before(expiresAt) {
		return "expired"
	}
	return "valid"
}

func parseCursor(cursor string) (int, error) {
	cursor = strings.TrimSpace(cursor)
	if cursor == "" {
		return 0, nil
	}
	offset, err := strconv.Atoi(cursor)
	if err != nil || offset < 0 {
		return 0, fmt.Errorf("%w: invalid cursor", ErrInvalidInput)
	}
	return offset, nil
}
