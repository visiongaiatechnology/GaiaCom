// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package gsn

import (
	"context"
	"crypto/ed25519"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"gaiacom/backend/core/uuid"
	"gaiacom/backend/core/validate"
	"gaiacom/backend/federation"
	identitysvc "gaiacom/backend/identity"
	"gaiacom/backend/internal/security"
	"gaiacom/backend/models"
	"gaiacom/backend/repository"
)

type Service struct {
	store      repository.Store
	fedService *federation.Service
	secSystem  *security.SecuritySystem
}

var ErrInvalidProfile = errors.New("invalid profile")

func NewService(store repository.Store, fedService *federation.Service, secSystem *security.SecuritySystem) *Service {
	return &Service{
		store:      store,
		fedService: fedService,
		secSystem:  secSystem,
	}
}

// verifySignature resolves the public key of the given GaiaID and checks the Ed25519 signature of the message.
func (s *Service) verifySignature(gaiaID string, message []byte, signatureStr string) (bool, error) {
	ident, err := s.store.FindIdentityByGaiaID(gaiaID)
	if err != nil {
		return false, fmt.Errorf("identity not found: %w", err)
	}

	var record struct {
		PublicKeys struct {
			Identity string `json:"identity"`
		} `json:"public_keys"`
	}
	if err := json.Unmarshal(ident.PublicRecord, &record); err != nil {
		return false, fmt.Errorf("failed to parse identity record: %w", err)
	}

	keyStr := strings.TrimSpace(record.PublicKeys.Identity)
	if keyStr == "" {
		return false, errors.New("identity public key is empty")
	}

	// Try hex decode first
	pubKeyBytes, err := hex.DecodeString(keyStr)
	if err != nil || len(pubKeyBytes) != ed25519.PublicKeySize {
		// Try base64
		pubKeyBytes, err = base64.StdEncoding.DecodeString(keyStr)
		if err != nil || len(pubKeyBytes) != ed25519.PublicKeySize {
			if len(keyStr) == ed25519.PublicKeySize {
				pubKeyBytes = []byte(keyStr)
			} else {
				return false, fmt.Errorf("invalid public key format/size")
			}
		}
	}

	// Try hex decode signature
	sigBytes, err := hex.DecodeString(signatureStr)
	if err != nil || len(sigBytes) != ed25519.SignatureSize {
		// Try base64
		sigBytes, err = base64.StdEncoding.DecodeString(signatureStr)
		if err != nil || len(sigBytes) != ed25519.SignatureSize {
			return false, fmt.Errorf("invalid signature format/size")
		}
	}

	return ed25519.Verify(pubKeyBytes, message, sigBytes), nil
}

// broadcastPDU broadcasts a PDU to all known federation nodes.
func (s *Service) broadcastPDU(pduType string, senderGaiaID string, payload interface{}) {
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		log.Printf("GSN broadcast: failed to marshal payload: %v", err)
		return
	}

	servers, err := s.store.FindAllFederationServers()
	if err != nil {
		log.Printf("GSN broadcast: failed to fetch federation servers: %v", err)
		return
	}

	for _, server := range servers {
		if server.IsBlocked {
			continue
		}
		// S2S requires a destination GaiaID. We format a virtual placeholder system recipient for that node.
		dest := fmt.Sprintf("@system:%s", server.Domain)
		if err := validate.GaiaID(dest); err != nil {
			log.Printf("GSN broadcast: invalid virtual destination %s: %v", dest, err)
			continue
		}

		pdu := models.PDU{
			PDUID:       uuid.New().String(),
			Type:        pduType,
			Sender:      senderGaiaID,
			Destination: dest,
			Payload:     string(payloadBytes),
			Signature:   "gsn-broadcast",
			CreatedAt:   time.Now().Unix(),
		}

		if err := s.fedService.QueueOutgoingPDU(pdu, server.Domain); err != nil {
			log.Printf("GSN broadcast: failed to queue outgoing PDU to %s: %v", server.Domain, err)
		}
	}
}

func (s *Service) CreatePost(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, body string, imageAttachment string, signature string, repostOfPostID string, timestamp string, r *http.Request) (*models.GsnPost, error) {
	ident, err := s.store.FindIdentityByID(identityID)
	if err != nil {
		return nil, fmt.Errorf("invalid identity: %w", err)
	}

	// Validate timestamp skew (max 5 minutes)
	t, err := time.Parse(time.RFC3339, timestamp)
	if err != nil {
		return nil, errors.New("invalid timestamp format")
	}
	if time.Since(t) > 5*time.Minute || time.Until(t) > 5*time.Minute {
		return nil, errors.New("timestamp skew too large")
	}

	// 1. GaiaShield Post Flooding Rate Limit Check: > 5 posts/comments in 30s
	count, err := s.store.CountGsnPostsCommentsInDuration(ctx, ident.GaiaID, 30*time.Second)
	if err != nil {
		return nil, err
	}
	if count >= 5 {
		s.secSystem.RecordSecurityEvent(ctx, &userID, &identityID, "post_flooding", "high", "gsn",
			fmt.Sprintf("GaiaID %s attempted post flood: exceeded limit of 5 in 30s (current: %d)", ident.GaiaID, count), "block", r)
		return nil, errors.New("rate limit exceeded: post flooding detected")
	}

	// 2. Validate Client Signature
	msgBytes := []byte(fmt.Sprintf("%s:%s:%s:%s", timestamp, body, imageAttachment, repostOfPostID))
	ok, err := s.verifySignature(ident.GaiaID, msgBytes, signature)
	if err != nil || !ok {
		return nil, errors.New("invalid signature: cryptographic proof verification failed")
	}

	if strings.TrimSpace(imageAttachment) != "" {
		var imageMeta struct {
			FileID string `json:"fileId"`
		}
		if err := json.Unmarshal([]byte(imageAttachment), &imageMeta); err != nil {
			return nil, errors.New("invalid image attachment")
		}
		imageFileID, err := uuid.Parse(imageMeta.FileID)
		if err != nil {
			return nil, errors.New("invalid image attachment")
		}
		if err := s.store.MarkFilePublic(ctx, imageFileID, userID); err != nil {
			return nil, errors.New("image attachment access rejected")
		}
	}

	// Get Node Owner status, Governance status, Trust Passport summary
	isOp := false
	isGov := false
	// Node Operator check: we can see if the user is the node owner/operator
	// Let's check how node ownership is verified. Let's assume it's true if the gaiaID matches node owner or has credentials.
	// We can check if their roles include "owner" or "admin".
	// Fetch roles from trust passport
	roles := []string{}
	creds, err := s.store.GetCredentialsBySubject(ctx, ident.GaiaID)
	if err == nil {
		now := time.Now()
		for _, cred := range creds {
			if now.After(cred.ValidUntil) || now.Before(cred.ValidFrom) {
				continue
			}
			rev, err := s.store.GetCredentialRevocation(ctx, cred.ID)
			if err != nil || rev != nil {
				continue
			}
			roles = append(roles, cred.Role)
			if cred.Role == "owner" || cred.Role == "admin" {
				isGov = true
			}
		}
	}

	// Check if this user is a registered Node Operator (Operator status)
	// Usually the node name matches the domain of the server. Let's see if we can resolve operator
	// If the user's role contains "operator" or "owner"
	for _, r := range roles {
		if r == "operator" || r == "owner" || r == "node_operator" {
			isOp = true
		}
	}

	// Build profile info to get avatar and passport summary
	profile, err := s.store.GetGsnProfile(ctx, ident.GaiaID)
	var avatar string
	isPass := false
	if err == nil && profile != nil {
		avatar = profile.Avatar
		isPass = profile.IsVerifiedPassport
	} else {
		avatar = ""
	}

	post := &models.GsnPost{
		ID:                   uuid.New().String(),
		GaiaID:               ident.GaiaID,
		DisplayName:          ident.DisplayName,
		Avatar:               avatar,
		NodeID:               s.fedService.GetServerName(),
		Timestamp:            timestamp,
		Body:                 body,
		ImageAttachment:      imageAttachment,
		Signature:            signature,
		RepostOfPostID:       repostOfPostID,
		IsVerifiedOperator:   isOp,
		IsVerifiedGovernance: isGov,
		IsVerifiedPassport:   isPass,
	}

	// Save Post
	if err := s.store.CreateGsnPost(ctx, post); err != nil {
		return nil, err
	}

	// Broadcast Post via Federation
	s.broadcastPDU("gsn.post.v1", ident.GaiaID, post)

	return post, nil
}

func (s *Service) DeletePost(ctx context.Context, userID uuid.UUID, postID string) error {
	post, err := s.store.GetGsnPost(ctx, postID)
	if err != nil {
		return err
	}

	idents, err := s.store.FindIdentitiesByUserID(userID)
	if err != nil {
		return err
	}

	isAuthorized := false
	for _, ident := range idents {
		// 1. Post creator can delete
		if ident.GaiaID == post.GaiaID {
			isAuthorized = true
			break
		}
		// 2. Node Operator check
		isLocalContent := post.NodeID == s.fedService.GetServerName() || strings.HasSuffix(post.GaiaID, ":"+s.fedService.GetServerName())
		if isLocalContent {
			creds, err := s.store.GetCredentialsBySubject(ctx, ident.GaiaID)
			if err == nil {
				now := time.Now()
				for _, cred := range creds {
					if now.After(cred.ValidUntil) || now.Before(cred.ValidFrom) {
						continue
					}
					rev, err := s.store.GetCredentialRevocation(ctx, cred.ID)
					if err != nil || rev != nil {
						continue
					}
					if cred.Role == "owner" || cred.Role == "admin" || cred.Role == "operator" {
						isAuthorized = true
						break
					}
				}
			}
		}
		if isAuthorized {
			break
		}
	}

	if !isAuthorized {
		return errors.New("unauthorized: only post creator or node operator can delete this post")
	}

	if err := s.store.DeleteGsnPost(ctx, postID); err != nil {
		return err
	}

	// Broadcast Post Delete PDU
	deletePayload := struct {
		PostID string `json:"postId"`
	}{
		PostID: postID,
	}
	s.broadcastPDU("gsn.post_delete.v1", post.GaiaID, deletePayload)

	return nil
}

func (s *Service) ListPostsByNode(ctx context.Context, nodeID string) ([]models.GsnPost, error) {
	posts, err := s.store.ListGsnPostsByNode(ctx, nodeID)
	if err != nil {
		return nil, err
	}
	s.hydratePostProfiles(ctx, posts)
	return posts, nil
}

func (s *Service) ListPostsByFollowed(ctx context.Context, followerGaiaID string) ([]models.GsnPost, error) {
	posts, err := s.store.ListGsnPostsByFollowed(ctx, followerGaiaID)
	if err != nil {
		return nil, err
	}
	s.hydratePostProfiles(ctx, posts)
	return posts, nil
}

func (s *Service) ListComments(ctx context.Context, postID string) ([]models.GsnComment, error) {
	comments, err := s.store.ListGsnComments(ctx, postID)
	if err != nil {
		return nil, err
	}
	s.hydrateCommentProfiles(ctx, comments)
	return comments, nil
}

func (s *Service) hydratePostProfiles(ctx context.Context, posts []models.GsnPost) {
	profiles := make(map[string]*models.GsnProfile)
	for index := range posts {
		profile := s.cachedGsnProfile(ctx, profiles, posts[index].GaiaID)
		if profile == nil {
			continue
		}
		if profile.DisplayName != "" {
			posts[index].DisplayName = profile.DisplayName
		}
		if profile.Avatar != "" {
			posts[index].Avatar = profile.Avatar
		}
		posts[index].IsVerifiedOperator = profile.IsVerifiedOperator
		posts[index].IsVerifiedGovernance = profile.IsVerifiedGovernance
		posts[index].IsVerifiedPassport = profile.IsVerifiedPassport
	}
}

func (s *Service) hydrateCommentProfiles(ctx context.Context, comments []models.GsnComment) {
	profiles := make(map[string]*models.GsnProfile)
	for index := range comments {
		profile := s.cachedGsnProfile(ctx, profiles, comments[index].GaiaID)
		if profile == nil {
			continue
		}
		if profile.DisplayName != "" {
			comments[index].DisplayName = profile.DisplayName
		}
		if profile.Avatar != "" {
			comments[index].Avatar = profile.Avatar
		}
	}
}

func (s *Service) cachedGsnProfile(ctx context.Context, profiles map[string]*models.GsnProfile, gaiaID string) *models.GsnProfile {
	if gaiaID == "" {
		return nil
	}
	if profile, exists := profiles[gaiaID]; exists {
		return profile
	}
	profile, err := s.store.GetGsnProfile(ctx, gaiaID)
	if err != nil {
		profiles[gaiaID] = nil
		return nil
	}
	profiles[gaiaID] = profile
	return profile
}

func (s *Service) DeleteComment(ctx context.Context, userID uuid.UUID, commentID string) error {
	comment, err := s.store.GetGsnComment(ctx, commentID)
	if err != nil {
		return err
	}

	post, err := s.store.GetGsnPost(ctx, comment.PostID)
	if err != nil {
		return err
	}

	idents, err := s.store.FindIdentitiesByUserID(userID)
	if err != nil {
		return err
	}

	isAuthorized := false
	for _, ident := range idents {
		// 1. Comment creator can delete
		if ident.GaiaID == comment.GaiaID {
			isAuthorized = true
			break
		}
		// 2. Post creator can delete
		if ident.GaiaID == post.GaiaID {
			isAuthorized = true
			break
		}
		// 3. Node Operator check
		isLocalContent := post.NodeID == s.fedService.GetServerName() || strings.HasSuffix(comment.GaiaID, ":"+s.fedService.GetServerName())
		if isLocalContent {
			creds, err := s.store.GetCredentialsBySubject(ctx, ident.GaiaID)
			if err == nil {
				now := time.Now()
				for _, cred := range creds {
					if now.After(cred.ValidUntil) || now.Before(cred.ValidFrom) {
						continue
					}
					rev, err := s.store.GetCredentialRevocation(ctx, cred.ID)
					if err != nil || rev != nil {
						continue
					}
					if cred.Role == "owner" || cred.Role == "admin" || cred.Role == "operator" {
						isAuthorized = true
						break
					}
				}
			}
		}
		if isAuthorized {
			break
		}
	}

	if !isAuthorized {
		return errors.New("unauthorized: you do not have permission to delete this comment")
	}

	if err := s.store.DeleteGsnComment(ctx, commentID); err != nil {
		return err
	}

	// Broadcast Comment Delete PDU
	deletePayload := struct {
		CommentID string `json:"commentId"`
		PostID    string `json:"postId"`
	}{
		CommentID: commentID,
		PostID:    comment.PostID,
	}
	s.broadcastPDU("gsn.comment_delete.v1", post.GaiaID, deletePayload)

	return nil
}

func (s *Service) CreateComment(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, postID string, body string, signature string, timestamp string, r *http.Request) (*models.GsnComment, error) {
	ident, err := s.store.FindIdentityByID(identityID)
	if err != nil {
		return nil, fmt.Errorf("invalid identity: %w", err)
	}

	// Validate timestamp skew (max 5 minutes)
	t, err := time.Parse(time.RFC3339, timestamp)
	if err != nil {
		return nil, errors.New("invalid timestamp format")
	}
	if time.Since(t) > 5*time.Minute || time.Until(t) > 5*time.Minute {
		return nil, errors.New("timestamp skew too large")
	}

	// 1. GaiaShield Post Flooding Rate Limit Check: > 5 posts/comments in 30s
	count, err := s.store.CountGsnPostsCommentsInDuration(ctx, ident.GaiaID, 30*time.Second)
	if err != nil {
		return nil, err
	}
	if count >= 5 {
		s.secSystem.RecordSecurityEvent(ctx, &userID, &identityID, "post_flooding", "high", "gsn",
			fmt.Sprintf("GaiaID %s attempted comment flood: exceeded limit of 5 in 30s (current: %d)", ident.GaiaID, count), "block", r)
		return nil, errors.New("rate limit exceeded: comment flooding detected")
	}

	// Verify post exists
	_, err = s.store.GetGsnPost(ctx, postID)
	if err != nil {
		return nil, fmt.Errorf("post not found: %w", err)
	}

	// 2. Validate Client Signature
	msgBytes := []byte(fmt.Sprintf("%s:%s:%s", timestamp, postID, body))
	ok, err := s.verifySignature(ident.GaiaID, msgBytes, signature)
	if err != nil || !ok {
		return nil, errors.New("invalid signature: cryptographic proof verification failed")
	}

	// Get Avatar
	profile, err := s.store.GetGsnProfile(ctx, ident.GaiaID)
	var avatar string
	if err == nil && profile != nil {
		avatar = profile.Avatar
	}

	comment := &models.GsnComment{
		ID:          uuid.New().String(),
		PostID:      postID,
		GaiaID:      ident.GaiaID,
		DisplayName: ident.DisplayName,
		Avatar:      avatar,
		Timestamp:   timestamp,
		Body:        body,
		Signature:   signature,
	}

	if err := s.store.CreateGsnComment(ctx, comment); err != nil {
		return nil, err
	}

	// Broadcast Comment via Federation
	s.broadcastPDU("gsn.comment.v1", ident.GaiaID, comment)

	return comment, nil
}

func (s *Service) ReactToPost(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, postID string, emoji string, r *http.Request) (string, error) {
	ident, err := s.store.FindIdentityByID(identityID)
	if err != nil {
		return "", fmt.Errorf("invalid identity: %w", err)
	}

	// Verify post exists
	_, err = s.store.GetGsnPost(ctx, postID)
	if err != nil {
		return "", fmt.Errorf("post not found: %w", err)
	}

	action, err := s.store.ToggleGsnReaction(ctx, postID, ident.GaiaID, emoji)
	if err != nil {
		return "", err
	}

	// Broadcast Reaction via Federation
	reactionPayload := struct {
		PostID string `json:"postId"`
		GaiaID string `json:"gaiaId"`
		Emoji  string `json:"emoji"`
		Action string `json:"action"`
	}{
		PostID: postID,
		GaiaID: ident.GaiaID,
		Emoji:  emoji,
		Action: action,
	}
	s.broadcastPDU("gsn.reaction.v1", ident.GaiaID, reactionPayload)

	return action, nil
}

func (s *Service) FollowUser(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, followingGaiaID string, r *http.Request) error {
	ident, err := s.store.FindIdentityByID(identityID)
	if err != nil {
		return fmt.Errorf("invalid identity: %w", err)
	}

	if ident.GaiaID == followingGaiaID {
		return errors.New("you cannot follow yourself")
	}

	// 1. GaiaShield Mass Follow Rate Limit Check: > 10 follows in 1m
	count, err := s.store.CountGsnFollowsInDuration(ctx, ident.GaiaID, 1*time.Minute)
	if err != nil {
		return err
	}
	if count >= 10 {
		s.secSystem.RecordSecurityEvent(ctx, &userID, &identityID, "mass_follow", "medium", "gsn",
			fmt.Sprintf("GaiaID %s attempted mass follow: exceeded limit of 10 in 1m (current: %d)", ident.GaiaID, count), "block", r)
		return errors.New("rate limit exceeded: mass follow detected")
	}

	if err := s.store.FollowGsnUser(ctx, ident.GaiaID, followingGaiaID); err != nil {
		return err
	}

	// Broadcast Follow PDU
	followPayload := struct {
		FollowerGaiaID  string `json:"followerGaiaId"`
		FollowingGaiaID string `json:"followingGaiaId"`
	}{
		FollowerGaiaID:  ident.GaiaID,
		FollowingGaiaID: followingGaiaID,
	}
	s.broadcastPDU("gsn.follow.v1", ident.GaiaID, followPayload)

	return nil
}

func (s *Service) UnfollowUser(ctx context.Context, identityID uuid.UUID, followingGaiaID string) error {
	ident, err := s.store.FindIdentityByID(identityID)
	if err != nil {
		return fmt.Errorf("invalid identity: %w", err)
	}

	if err := s.store.UnfollowGsnUser(ctx, ident.GaiaID, followingGaiaID); err != nil {
		return err
	}

	// Broadcast Unfollow PDU
	unfollowPayload := struct {
		FollowerGaiaID  string `json:"followerGaiaId"`
		FollowingGaiaID string `json:"followingGaiaId"`
	}{
		FollowerGaiaID:  ident.GaiaID,
		FollowingGaiaID: followingGaiaID,
	}
	s.broadcastPDU("gsn.unfollow.v1", ident.GaiaID, unfollowPayload)

	return nil
}

func (s *Service) UpdateProfile(ctx context.Context, userID uuid.UUID, identityID uuid.UUID, realName string, displayName string, description string, avatar string, website string) (*models.GsnProfile, error) {
	ident, err := s.store.FindIdentityByID(identityID)
	if err != nil {
		return nil, fmt.Errorf("invalid identity: %w", err)
	}
	sharedProfile, err := normalizeIdentityPublicProfile(realName, displayName, description, avatar, website)
	if err != nil {
		return nil, err
	}
	updatedIdentity, err := s.store.UpdateIdentityPublicProfile(ctx, userID, identityID, sharedProfile)
	if err != nil {
		return nil, err
	}
	if err := s.markProfileAvatarPublic(ctx, userID, sharedProfile.Avatar); err != nil {
		return nil, err
	}
	ident = updatedIdentity

	// Build Trust Passport for verification status
	tp := s.buildTrustPassportSummary(ident)

	profile := &models.GsnProfile{
		IdentityID:           ident.ID.String(),
		GaiaID:               ident.GaiaID,
		RealName:             sharedProfile.RealName,
		DisplayName:          sharedProfile.DisplayName,
		Description:          sharedProfile.Bio,
		Avatar:               sharedProfile.Avatar,
		Website:              sharedProfile.Website,
		IsVerifiedOperator:   tp.isVerifiedOperator,
		IsVerifiedGovernance: tp.isVerifiedGovernance,
		IsVerifiedPassport:   tp.isVerifiedPassport,
		TrustPassportSummary: tp.summary,
		UpdatedAt:            time.Now().UTC().Format(time.RFC3339),
	}

	if err := s.store.UpdateGsnProfile(ctx, profile); err != nil {
		return nil, err
	}

	// Broadcast Profile update PDU
	s.broadcastPDU("gsn.profile.v1", ident.GaiaID, profile)

	// Fetch to return fully populated profile with follower counts
	return s.store.GetGsnProfile(ctx, ident.GaiaID)
}

func (s *Service) markProfileAvatarPublic(ctx context.Context, userID uuid.UUID, avatar string) error {
	if avatar == "" || !strings.HasPrefix(avatar, `{"fileId"`) {
		return nil
	}
	var envelope struct {
		FileID string `json:"fileId"`
	}
	if err := json.Unmarshal([]byte(avatar), &envelope); err != nil {
		return ErrInvalidProfile
	}
	fileID, err := uuid.Parse(envelope.FileID)
	if err != nil {
		return ErrInvalidProfile
	}
	return s.store.MarkFilePublic(ctx, fileID, userID)
}

func normalizeIdentityPublicProfile(realName string, displayName string, bio string, avatar string, website string) (models.IdentityPublicProfile, error) {
	profile := models.IdentityPublicProfile{
		RealName:    strings.TrimSpace(realName),
		DisplayName: strings.TrimSpace(displayName),
		Bio:         strings.TrimSpace(bio),
		Avatar:      strings.TrimSpace(avatar),
		Website:     strings.TrimSpace(website),
	}
	if profile.DisplayName == "" || len([]rune(profile.DisplayName)) > 80 {
		return models.IdentityPublicProfile{}, fmt.Errorf("%w: display name", ErrInvalidProfile)
	}
	if len([]rune(profile.RealName)) > 120 {
		return models.IdentityPublicProfile{}, fmt.Errorf("%w: real name", ErrInvalidProfile)
	}
	if len([]rune(profile.Bio)) > 500 {
		return models.IdentityPublicProfile{}, fmt.Errorf("%w: bio", ErrInvalidProfile)
	}
	if len(profile.Avatar) > 4096 {
		return models.IdentityPublicProfile{}, fmt.Errorf("%w: avatar", ErrInvalidProfile)
	}
	if len(profile.Website) > 300 {
		return models.IdentityPublicProfile{}, fmt.Errorf("%w: website", ErrInvalidProfile)
	}
	if profile.Website != "" {
		parsed, err := url.ParseRequestURI(profile.Website)
		if err != nil || parsed == nil || (parsed.Scheme != "https" && parsed.Scheme != "http") || parsed.Host == "" {
			return models.IdentityPublicProfile{}, fmt.Errorf("%w: website", ErrInvalidProfile)
		}
	}
	return profile, nil
}

type trustPassportSummaryData struct {
	isVerifiedOperator   bool
	isVerifiedGovernance bool
	isVerifiedPassport   bool
	summary              string
}

func (s *Service) buildTrustPassportSummary(identity *models.Identity) trustPassportSummaryData {
	data := trustPassportSummaryData{
		isVerifiedOperator:   false,
		isVerifiedGovernance: false,
		isVerifiedPassport:   false,
	}

	roles := []string{}
	creds, err := s.store.GetCredentialsBySubject(context.Background(), identity.GaiaID)
	if err == nil {
		now := time.Now()
		for _, cred := range creds {
			if now.After(cred.ValidUntil) || now.Before(cred.ValidFrom) {
				continue
			}
			rev, err := s.store.GetCredentialRevocation(context.Background(), cred.ID)
			if err != nil || rev != nil {
				continue
			}
			roles = append(roles, cred.Role)
			if cred.Role == "owner" || cred.Role == "admin" {
				data.isVerifiedGovernance = true
			}
			if cred.Role == "operator" || cred.Role == "owner" || cred.Role == "node_operator" {
				data.isVerifiedOperator = true
			}
		}
	}

	// Check if they have an active trust age
	ageDays := int(time.Since(identity.CreatedAt).Hours() / 24)
	if ageDays >= 30 {
		data.isVerifiedPassport = true
	}

	summaryMap := map[string]interface{}{
		"trustAgeDays": ageDays,
		"roles":        roles,
		"abuseScore":   0,
	}
	passport := identitysvc.NewIdentityService(s.store).BuildTrustPassport(identity)
	if humanProof, ok := passport["humanProof"]; ok {
		summaryMap["humanProof"] = humanProof
		summaryMap["isHumanVerified"] = true
		data.isVerifiedPassport = true
	}

	var record struct {
		PublicKeys map[string]string `json:"public_keys"`
	}
	if err := json.Unmarshal(identity.PublicRecord, &record); err == nil {
		identityKey := strings.TrimSpace(record.PublicKeys["identity"])
		if identityKey != "" {
			score, err := s.store.GetAbuseScore(identityKey)
			if err == nil && score != nil {
				summaryMap["abuseScore"] = score.Score
				if score.Score < 10 {
					data.isVerifiedPassport = true
				}
			}
		}
	}

	summaryBytes, _ := json.Marshal(summaryMap)
	data.summary = string(summaryBytes)

	return data
}
