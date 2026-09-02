// STATUS: DIAMANT VGT SUPREME
package backend

import (
	"context"
	"crypto/ed25519"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"gaiacom/backend/auth"
	"gaiacom/backend/buildinfo"
	"gaiacom/backend/devices"
	"gaiacom/backend/federation"
	"gaiacom/backend/gaiadrop"
	"gaiacom/backend/governance"
	"gaiacom/backend/gsn"
	"gaiacom/backend/httpx"
	"gaiacom/backend/identity"
	"gaiacom/backend/internal/security"
	"gaiacom/backend/mailbox"
	"gaiacom/backend/messaging"
	"gaiacom/backend/networkhealth"
	"gaiacom/backend/noderegistry"
	"gaiacom/backend/operations"
	"gaiacom/backend/presence"
	"gaiacom/backend/publicchannels"
	"gaiacom/backend/repository"
	"gaiacom/backend/room"
	"gaiacom/backend/smtpbridge"
	"gaiacom/backend/storage"
	"gaiacom/backend/trustmesh"
)

func SetupRoutes(store repository.Store) (http.Handler, error) {
	return SetupRoutesWithOperations(context.Background(), store, nil)
}

func SetupRoutesWithContext(rootContext context.Context, store repository.Store) (http.Handler, error) {
	return SetupRoutesWithOperations(rootContext, store, nil)
}

func SetupRoutesWithOperations(rootContext context.Context, store repository.Store, monitor *operations.Monitor) (http.Handler, error) {
	runtimeConfig, err := loadRouteRuntimeConfig()
	if err != nil {
		return nil, err
	}
	return SetupRoutesWithRuntimeConfig(rootContext, store, monitor, runtimeConfig)
}

func SetupRoutesWithRuntimeConfig(rootContext context.Context, store repository.Store, monitor *operations.Monitor, runtimeConfig RouteRuntimeConfig) (http.Handler, error) {
	if rootContext == nil {
		rootContext = context.Background()
	}
	if err := runtimeConfig.Validate(); err != nil {
		return nil, fmt.Errorf("invalid route runtime configuration: %w", err)
	}
	if monitor == nil {
		monitor = newOperationsMonitor(store, runtimeConfig.MetricsToken)
		monitor.SetReady(true)
	}
	router := httpx.NewRouter()
	startedAt := time.Now().UTC()
	serverName := runtimeConfig.ServerName
	serverPrivKey := runtimeConfig.ServerPrivateKey
	trustMeshEpochSecret := runtimeConfig.TrustMeshEpochSecret

	// Governance bootstrap must be loaded before every role-aware subsystem snapshots it.
	governance.LoadBootstrapConfig()

	secSystem, err := security.NewSecuritySystemWithConfig(store, security.SystemConfig{
		HMACKey: runtimeConfig.ShieldSecret,
		NodeID:  serverName,
	})
	if err != nil {
		return nil, fmt.Errorf("initialize GaiaShield: %w", err)
	}
	security.BootstrapGaiaID = governance.BootstrapGaiaID
	security.BootstrapGaiaIDs = governance.BootstrapGaiaIDs
	secHandler := security.NewSecurityHandler(secSystem)

	router.Use(httpx.SecurityHeadersHTTP())
	router.Use(monitor.Middleware())
	router.Use(secSystem.EdgeShieldMiddleware())
	router.Use(httpx.CORSHTTP(httpx.CORSConfig{
		AllowOrigins:     runtimeConfig.AllowOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-Gaia-S2S-V1", "X-Gaia-Pairing-Secret"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	authService, err := auth.NewAuthServiceWithSecret(store, runtimeConfig.JWTSecret)
	if err != nil {
		return nil, fmt.Errorf("initialize authentication: %w", err)
	}
	authHandler := auth.NewAuthHandler(authService, secSystem)

	identityService := identity.NewIdentityService(store)
	identityHandler := identity.NewIdentityHandler(identityService)

	msgService := messaging.NewMessagingService(store, store)
	msgHandler := messaging.NewMessagingHandler(msgService, secSystem)
	mailboxService := mailbox.NewService(store)
	mailboxHandler := mailbox.NewHandler(mailboxService)

	storageService, err := storage.NewStorageServiceWithConfig(store, storage.ServiceConfig{
		LocalStorageRoot: runtimeConfig.StorageRoot,
	})
	if err != nil {
		return nil, fmt.Errorf("initialize storage: %w", err)
	}
	storageHandler := storage.NewStorageHandler(storageService, secSystem)

	roomService := room.NewService(store)
	roomHandler := room.NewHandler(roomService)
	channelService := publicchannels.NewService(store)
	channelHandler := publicchannels.NewHandler(channelService)

	gaiaDropService := gaiadrop.NewService(store)
	gaiaDropHandler := gaiadrop.NewHandler(gaiaDropService)
	smtpBridgeService := smtpbridge.NewService(store, store, secSystem)
	smtpBridgeHandler := smtpbridge.NewHandler(smtpBridgeService)

	draftScheduler := NewDraftScheduler(store, msgService, smtpBridgeService)

	trustMeshService := trustmesh.NewService(store, trustMeshEpochSecret)
	trustMeshHandler := trustmesh.NewHandler(trustMeshService)
	fedService := federation.NewService(store, serverName, serverPrivKey)
	fedHandler := federation.NewHandler(fedService, secSystem)
	nodeRegistryService := noderegistry.NewService(store, serverName, serverPrivKey.Public().(ed25519.PublicKey))
	nodeRegistryHandler := noderegistry.NewHandler(nodeRegistryService, store)
	healthService := networkhealth.NewService(store, serverName, serverPrivKey, startedAt)
	healthHandler := networkhealth.NewHandler(healthService)
	presenceService := presence.NewService(store)
	presenceHandler := presence.NewHandler(presenceService)
	devicePairingHandler := devices.NewHandler(devices.NewService(store))

	// Governance / Abuse consensus initialization
	govService := governance.NewService(store, serverPrivKey, serverName)
	govHandler := governance.NewHandler(govService)
	if err := govService.MintBootstrapCredentialsIfNeeded(rootContext); err != nil {
		return nil, fmt.Errorf("initialize governance credentials: %w", err)
	}

	gsnService := gsn.NewService(store, fedService, secSystem)
	gsnHandler := gsn.NewHandler(gsnService)

	router.POST("/api/v1/auth/register", authHandler.Register)
	router.GET("/livez", monitor.Liveness)
	router.GET("/readyz", monitor.Readiness)
	router.GET("/metrics", monitor.Metrics)
	router.POST("/api/v1/auth/login", authHandler.Login)
	router.POST("/api/v1/auth/refresh", authHandler.Refresh)
	router.GET("/api/v1/auth/status", authHandler.GetStatus)
	router.GET("/api/v1/public/identity/:gaiaID", identityHandler.GetPublicIdentity)
	router.GET("/api/v1/public/trust-passport/:gaiaID", identityHandler.GetTrustPassport)
	router.POST("/api/v1/public/gaiadrop/submit", gaiaDropHandler.Submit)
	router.POST("/api/v1/public/smtp/ingest", smtpBridgeHandler.Ingest)
	router.GET("/api/v1/public/nodes", fedHandler.GetNodes)
	router.POST("/api/v1/public/node-registry/ping", nodeRegistryHandler.PublicPing)
	router.GET("/api/v1/public/node-registry/nodes", nodeRegistryHandler.PublicNodes)
	router.GET("/api/v1/public/network-health", healthHandler.Dashboard)
	router.GET("/api/v1/public/version", func(w http.ResponseWriter, r *http.Request) {
		httpx.WriteJSON(w, http.StatusOK, buildinfo.Current())
	})
	var (
		cspLimiterMu sync.Mutex
		cspLimiter   = make(map[string]time.Time)
	)

	router.POST("/api/v1/public/csp-report", func(w http.ResponseWriter, r *http.Request) {
		ip, _, err := net.SplitHostPort(r.RemoteAddr)
		if err == nil {
			cspLimiterMu.Lock()
			now := time.Now()
			for k, t := range cspLimiter {
				if now.Sub(t) > 1*time.Minute {
					delete(cspLimiter, k)
				}
			}
			if lastReq, exists := cspLimiter[ip]; exists && now.Sub(lastReq) < 5*time.Second {
				cspLimiterMu.Unlock()
				w.WriteHeader(http.StatusTooManyRequests)
				return
			}
			cspLimiter[ip] = now
			cspLimiterMu.Unlock()
		}

		r.Body = http.MaxBytesReader(w, r.Body, 16384)

		ct := r.Header.Get("Content-Type")
		if !strings.HasPrefix(ct, "application/json") && !strings.HasPrefix(ct, "application/csp-report") {
			w.WriteHeader(http.StatusUnsupportedMediaType)
			return
		}

		body, err := io.ReadAll(r.Body)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		// Ensure it is valid JSON (JSON parser mit Size Limit)
		var dummy map[string]interface{}
		if err := json.Unmarshal(body, &dummy); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		var sb strings.Builder
		for _, char := range string(body) {
			if char >= 32 && char <= 126 {
				sb.WriteRune(char)
			} else if char == '\n' || char == '\r' || char == '\t' {
				sb.WriteRune(' ')
			}
		}
		sanitized := sb.String()
		if len(sanitized) > 2000 {
			sanitized = sanitized[:2000] + "..."
		}

		log.Printf("CSP VIOLATION REPORT: %s", sanitized)
		w.WriteHeader(http.StatusNoContent)
	})

	router.GET("/.well-known/gaiacom/server", fedHandler.HandleServerDiscovery)
	router.GET("/.well-known/gaiacom/nodeinfo", fedHandler.HandleNodeInfo)
	router.GET("/.well-known/gaiacom/nodes", nodeRegistryHandler.PublicNodes)
	router.POST("/.well-known/gaiacom/s2s/v1/forward", fedHandler.HandleS2SForward)
	router.POST("/_gaiacom/s2s/v1/forward", fedHandler.HandleS2SForward)

	protected := withAuth(router, auth.AuthMiddleware(authService))
	protected.POST("/api/v1/auth/change-password", authHandler.ChangePassword)
	protected.POST("/api/v1/auth/logout", authHandler.Logout)
	protected.POST("/api/v1/auth/delete-account", authHandler.DeleteAccount)
	protected.POST("/api/v1/auth/privacy", authHandler.UpdatePrivacy)
	protected.GET("/api/v1/auth/notification-preferences", authHandler.GetNotificationPreferences)
	protected.POST("/api/v1/auth/notification-preferences", authHandler.SaveNotificationPreferences)
	protected.GET("/api/v1/auth/devices", authHandler.ListDevices)
	protected.POST("/api/v1/auth/devices/revoke", authHandler.RevokeDevice)
	protected.POST("/api/v1/devices/pairings", devicePairingHandler.Start)
	protected.GET("/api/v1/devices/pairings/:id", devicePairingHandler.Get)
	protected.POST("/api/v1/devices/pairings/:id/approve", devicePairingHandler.Approve)
	protected.POST("/api/v1/devices/pairings/:id/consume", devicePairingHandler.Consume)
	protected.GET("/api/v1/devices/keys", devicePairingHandler.ListKeys)
	protected.GET("/api/v1/devices/recipient-keys", devicePairingHandler.RecipientKeys)
	protected.POST("/api/v1/devices/keys/:id/revoke", devicePairingHandler.RevokeKey)
	protected.POST("/api/v1/identity/create", identityHandler.CreateIdentity)
	protected.GET("/api/v1/identity/me", identityHandler.GetMyIdentities)
	protected.POST("/api/v1/identity/human-proof", identityHandler.SaveHumanProof)
	protected.POST("/api/v1/messaging/send", msgHandler.SendMessage)
	protected.POST("/api/v1/smtp/send", smtpBridgeHandler.Send)
	protected.GET("/api/v1/messaging/inbox", msgHandler.GetInbox)
	protected.POST("/api/v1/messaging/read", msgHandler.MarkRead)
	protected.POST("/api/v1/messaging/edit", msgHandler.EditMessage)
	protected.POST("/api/v1/messaging/reaction", msgHandler.ToggleReaction)
	protected.GET("/api/v1/messaging/proof", msgHandler.GetMessageProof)
	protected.POST("/api/v1/messaging/delete", msgHandler.DeleteInboxMessage)
	protected.POST("/api/v1/messaging/clear", msgHandler.ClearInboxConversation)
	protected.POST("/api/v1/presence/heartbeat", presenceHandler.Heartbeat)
	protected.GET("/api/v1/presence/status", presenceHandler.Status)
	protected.POST("/api/v1/presence/typing", presenceHandler.UpdateTyping)
	protected.GET("/api/v1/presence/typing", presenceHandler.TypingStatus)
	protected.GET("/api/v1/mailbox/messages", mailboxHandler.ListMessages)
	protected.POST("/api/v1/mailbox/state", mailboxHandler.UpdateStates)
	protected.GET("/api/v1/mailbox/drafts", mailboxHandler.ListDrafts)
	protected.POST("/api/v1/mailbox/drafts/save", mailboxHandler.SaveDraft)
	protected.POST("/api/v1/mailbox/drafts/delete", mailboxHandler.DeleteDraft)
	protected.GET("/api/v1/mailbox/labels", mailboxHandler.ListLabels)
	protected.POST("/api/v1/mailbox/labels/save", mailboxHandler.SaveLabel)
	protected.GET("/api/v1/mailbox/contacts", mailboxHandler.ListContacts)
	protected.POST("/api/v1/mailbox/contacts/save", mailboxHandler.SaveContact)
	protected.GET("/api/v1/mailbox/filters", mailboxHandler.ListFilters)
	protected.POST("/api/v1/mailbox/filters/save", mailboxHandler.SaveFilter)
	protected.GET("/api/v1/mailbox/settings", mailboxHandler.GetSettings)
	protected.POST("/api/v1/mailbox/settings", mailboxHandler.SaveSettings)
	protected.GET("/api/v1/search/global", mailboxHandler.GlobalSearch)
	protected.POST("/api/v1/storage/init", storageHandler.InitUpload)
	protected.POST("/api/v1/storage/chunk", storageHandler.UploadChunk)
	protected.POST("/api/v1/storage/complete", storageHandler.CompleteUpload)
	protected.POST("/api/v1/storage/grant", storageHandler.GrantAccess)
	protected.GET("/api/v1/storage/download/:fileId", storageHandler.DownloadFile)
	protected.POST("/api/v1/reports/submit", trustMeshHandler.SubmitReport)
	protected.GET("/api/v1/gaiadrop/inbox", gaiaDropHandler.ListInbox)
	protected.POST("/api/v1/gaiadrop/read", gaiaDropHandler.MarkRead)
	protected.POST("/api/v1/gaiadrop/delete", gaiaDropHandler.Delete)

	// GSN (GaiaSocialNetwork) routes
	protected.POST("/api/v1/gsn/posts", gsnHandler.CreatePost)
	protected.DELETE("/api/v1/gsn/posts/:id", gsnHandler.DeletePost)
	protected.GET("/api/v1/gsn/feed/node", gsnHandler.GetFeedNode)
	protected.GET("/api/v1/gsn/feed/following", gsnHandler.GetFeedFollowing)
	protected.POST("/api/v1/gsn/posts/:id/react", gsnHandler.ReactToPost)
	protected.POST("/api/v1/gsn/posts/:id/comment", gsnHandler.AddComment)
	protected.GET("/api/v1/gsn/posts/:id/comments", gsnHandler.GetComments)
	protected.DELETE("/api/v1/gsn/posts/:id/comments/:commentId", gsnHandler.DeleteComment)
	protected.POST("/api/v1/gsn/follow", gsnHandler.FollowUser)
	protected.POST("/api/v1/gsn/unfollow", gsnHandler.UnfollowUser)
	protected.GET("/api/v1/gsn/profile/:gaia_id", gsnHandler.GetProfile)
	protected.POST("/api/v1/gsn/profile", gsnHandler.UpdateProfile)

	protected.POST("/api/v1/rooms/create", roomHandler.CreateRoom)
	protected.POST("/api/v1/rooms/update", roomHandler.UpdateRoom)
	protected.GET("/api/v1/rooms", roomHandler.GetRooms)
	protected.POST("/api/v1/rooms/join", roomHandler.JoinRoomByHash)
	protected.POST("/api/v1/rooms/leave", roomHandler.LeaveRoom)
	protected.POST("/api/v1/rooms/channels", roomHandler.CreateChannel)
	protected.GET("/api/v1/rooms/channels", roomHandler.GetChannels)
	protected.POST("/api/v1/rooms/members/role", roomHandler.UpdateMemberRole)
	protected.POST("/api/v1/rooms/delete", roomHandler.DeleteRoom)
	protected.GET("/api/v1/rooms/search", roomHandler.SearchPublicRooms)
	protected.POST("/api/v1/rooms/members/kick", roomHandler.KickMember)
	protected.POST("/api/v1/rooms/transfer-ownership", roomHandler.TransferOwnership)
	protected.GET("/api/v1/rooms/pins", roomHandler.GetRoomPinnedMessages)
	protected.POST("/api/v1/rooms/pins/toggle", roomHandler.ToggleRoomMessagePin)
	protected.POST("/api/v1/rooms/invites/create", roomHandler.CreateRoomInviteLink)
	protected.POST("/api/v1/rooms/invites/join", roomHandler.JoinRoomViaInviteLink)
	protected.GET("/api/v1/rooms/join-requests", roomHandler.GetRoomJoinRequests)
	protected.POST("/api/v1/rooms/join-requests/create", roomHandler.CreateRoomJoinRequest)
	protected.POST("/api/v1/rooms/join-requests/moderate", roomHandler.ModerateRoomJoinRequest)
	protected.GET("/api/v1/rooms/moderation-logs", roomHandler.GetRoomModerationLogs)
	protected.GET("/api/v1/public-channels", channelHandler.List)
	protected.POST("/api/v1/public-channels/create", channelHandler.Create)
	protected.POST("/api/v1/public-channels/update", channelHandler.Update)
	protected.POST("/api/v1/public-channels/comments", channelHandler.UpdateComments)
	protected.POST("/api/v1/public-channels/delete", channelHandler.Delete)
	protected.POST("/api/v1/public-channels/subscribe", channelHandler.Subscribe)
	protected.POST("/api/v1/public-channels/unsubscribe", channelHandler.Unsubscribe)
	protected.GET("/api/v1/public-channels/posts", channelHandler.ListPosts)
	protected.POST("/api/v1/public-channels/posts/create", channelHandler.CreatePost)
	protected.POST("/api/v1/public-channels/posts/reaction", channelHandler.TogglePostReaction)
	protected.POST("/api/v1/public-channels/posts/comment", channelHandler.CreatePostComment)
	protected.POST("/api/v1/public-channels/posts/pin", channelHandler.UpdatePostPin)
	protected.POST("/api/v1/public-channels/block", channelHandler.Block)
	protected.POST("/api/v1/public-channels/unblock", channelHandler.Unblock)
	protected.GET("/api/v1/public-channels/discover", channelHandler.Discover)
	protected.POST("/api/v1/public-channels/posts/comments/delete", channelHandler.DeleteComment)
	protected.POST("/api/v1/public-channels/posts/comments/moderate", channelHandler.ModerateComment)

	// Governance & Abuse consensus API routes
	router.GET("/api/v1/public/transparency", govHandler.GetPublicTransparency)
	router.POST("/api/v1/public/gaias-eyes/consume", govHandler.ConsumeGaiasEyesGrant)

	protected.GET("/api/v1/governance/roles", govHandler.CheckRoles)
	protected.POST("/api/v1/reports", govHandler.CreateReport)
	protected.GET("/api/v1/reports/mine", govHandler.GetMyReports)
	protected.GET("/api/v1/reports/:caseID", govHandler.GetReportDetail)
	protected.POST("/api/v1/reports/:caseID/disclosures", govHandler.CreateCaseDisclosure)
	protected.POST("/api/v1/reviewer/cases/:caseID/disclosure-requests", govHandler.RequestCaseDisclosure)
	protected.POST("/api/v1/reports/:caseID/appeal", govHandler.AppealReport)
	protected.POST("/api/v1/gaias-eyes/grants", govHandler.CreateGaiasEyesGrant)

	protected.GET("/api/v1/reviewer/cases", govHandler.GetReviewerQueue)
	protected.POST("/api/v1/reviewer/cases/:caseID/review", govHandler.SubmitReview)

	protected.GET("/api/v1/node/abuse/queue", govHandler.GetNodeOperatorQueue)
	protected.POST("/api/v1/node/abuse/actions", govHandler.ApplyNodeOperatorAction)
	protected.POST("/api/v1/node/transparency/snapshot", govHandler.CreateTransparencySnapshot)

	// GaiaShield routes
	router.GET("/api/v1/public/security/health", secHandler.GetPublicHealth)
	protected.GET("/api/v1/security/me/summary", secHandler.GetMySummary)
	protected.GET("/api/v1/security/me/events", secHandler.GetMyEvents)
	protected.POST("/api/v1/security/me/events/:event_id/acknowledge", secHandler.AcknowledgeEvent)
	protected.GET("/api/v1/security/me/report", secHandler.ExportReport)
	protected.GET("/api/v1/node/security/summary", secHandler.GetNodeSummary)
	protected.GET("/api/v1/node/security/events", secHandler.GetNodeEvents)
	protected.GET("/api/v1/node/registry/summary", nodeRegistryHandler.GetSummary)
	protected.POST("/api/v1/node/registry/secrets", nodeRegistryHandler.GenerateSecrets)
	protected.POST("/api/v1/node/registry/ping-main", nodeRegistryHandler.PingMain)
	protected.POST("/api/v1/node/registry/:domain/status", nodeRegistryHandler.UpdateStatus)

	launchRouteWorker(runtimeConfig, func() { secSystem.RunRetentionSweeper(rootContext) })
	launchRouteWorker(runtimeConfig, func() { storageService.RunFileRetentionSweeper(rootContext) })
	launchRouteWorker(runtimeConfig, func() { draftScheduler.Start(rootContext) })
	launchRouteWorker(runtimeConfig, func() { govService.StartAutoGovernanceWorker(rootContext) })
	launchRouteWorker(runtimeConfig, func() { fedService.StartWorker(rootContext) })

	return router, nil
}
