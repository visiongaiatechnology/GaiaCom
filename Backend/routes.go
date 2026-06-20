package main

import (
	"context"
	"crypto/ed25519"
	"encoding/hex"
	"encoding/json"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"gaiacom/backend/auth"
	"gaiacom/backend/federation"
	"gaiacom/backend/gaiadrop"
	"gaiacom/backend/httpx"
	"gaiacom/backend/identity"
	"gaiacom/backend/messaging"
	"gaiacom/backend/repository"
	"gaiacom/backend/room"
	"gaiacom/backend/smtpbridge"
	"gaiacom/backend/storage"
	"gaiacom/backend/trustmesh"
)

func SetupRoutes(store repository.Store) http.Handler {
	router := httpx.NewRouter()
	router.Use(httpx.SecurityHeadersHTTP())
	router.Use(httpx.CORSHTTP(httpx.CORSConfig{
		AllowOrigins:     []string{"http://localhost:3000", "https://app.gaiacom.net", "tauri://localhost", "http://tauri.localhost", "http://localhost:1420"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-Gaia-S2S-V1"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	authService := auth.NewAuthService(store)
	authHandler := auth.NewAuthHandler(authService)

	identityService := identity.NewIdentityService(store)
	identityHandler := identity.NewIdentityHandler(identityService)

	msgService := messaging.NewMessagingService(store, store)
	msgHandler := messaging.NewMessagingHandler(msgService)

	storageService := storage.NewStorageService(store)
	storageHandler := storage.NewStorageHandler(storageService)

	roomService := room.NewService(store)
	roomHandler := room.NewHandler(roomService)

	gaiaDropService := gaiadrop.NewService(store)
	gaiaDropHandler := gaiadrop.NewHandler(gaiaDropService)
	smtpBridgeService := smtpbridge.NewService(store, store)
	smtpBridgeHandler := smtpbridge.NewHandler(smtpBridgeService)

	epochMasterKeyHex := os.Getenv("GAIACOM_EPOCH_MASTER_KEY")
	var epochMasterKey []byte
	if epochMasterKeyHex != "" {
		keyBytes, err := hex.DecodeString(epochMasterKeyHex)
		if err == nil && len(keyBytes) == 32 {
			epochMasterKey = keyBytes
		}
	}
	trustMeshService := trustmesh.NewService(store, epochMasterKey)
	trustMeshHandler := trustmesh.NewHandler(trustMeshService)

	serverName := os.Getenv("GAIACOM_SERVER_NAME")
	if serverName == "" {
		serverName = "localhost"
	}
	var serverPrivKey ed25519.PrivateKey
	privKeyHex := os.Getenv("GAIACOM_SERVER_PRIVATE_KEY")
	if privKeyHex != "" {
		keyBytes, err := hex.DecodeString(privKeyHex)
		if err == nil && len(keyBytes) == ed25519.PrivateKeySize {
			serverPrivKey = ed25519.PrivateKey(keyBytes)
		}
	}
	if serverPrivKey == nil {
		_, ephemeralKey, err := ed25519.GenerateKey(nil)
		if err == nil {
			serverPrivKey = ephemeralKey
		}
	}
	fedService := federation.NewService(store, serverName, serverPrivKey)
	fedHandler := federation.NewHandler(fedService)

	go fedService.StartWorker(context.Background())

	router.POST("/api/v1/auth/register", authHandler.Register)
	router.POST("/api/v1/auth/login", authHandler.Login)
	router.GET("/api/v1/auth/status", authHandler.GetStatus)
	router.GET("/api/v1/public/identity/:gaiaID", identityHandler.GetPublicIdentity)
	router.GET("/api/v1/public/trust-passport/:gaiaID", identityHandler.GetTrustPassport)
	router.POST("/api/v1/public/gaiadrop/submit", gaiaDropHandler.Submit)
	router.POST("/api/v1/public/smtp/ingest", smtpBridgeHandler.Ingest)
	router.GET("/api/v1/public/nodes", fedHandler.GetNodes)
	router.GET("/api/v1/public/version", func(w http.ResponseWriter, r *http.Request) {
		httpx.WriteJSON(w, http.StatusOK, map[string]string{
			"version":   "GaiaCom Beta v2",
			"consensus": "gaiacom.v1",
		})
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
	router.POST("/.well-known/gaiacom/s2s/v1/forward", fedHandler.HandleS2SForward)
	router.POST("/_gaiacom/s2s/v1/forward", fedHandler.HandleS2SForward)

	protected := withAuth(router, auth.AuthMiddleware(authService))
	protected.POST("/api/v1/auth/change-password", authHandler.ChangePassword)
	protected.GET("/api/v1/auth/devices", authHandler.ListDevices)
	protected.POST("/api/v1/auth/devices/revoke", authHandler.RevokeDevice)
	protected.POST("/api/v1/identity/create", identityHandler.CreateIdentity)
	protected.GET("/api/v1/identity/me", identityHandler.GetMyIdentities)
	protected.POST("/api/v1/messaging/send", msgHandler.SendMessage)
	protected.POST("/api/v1/smtp/send", smtpBridgeHandler.Send)
	protected.GET("/api/v1/messaging/inbox", msgHandler.GetInbox)
	protected.POST("/api/v1/messaging/read", msgHandler.MarkRead)
	protected.GET("/api/v1/messaging/proof", msgHandler.GetMessageProof)
	protected.POST("/api/v1/messaging/delete", msgHandler.DeleteInboxMessage)
	protected.POST("/api/v1/messaging/clear", msgHandler.ClearInboxConversation)
	protected.POST("/api/v1/storage/init", storageHandler.InitUpload)
	protected.POST("/api/v1/storage/chunk", storageHandler.UploadChunk)
	protected.POST("/api/v1/storage/complete", storageHandler.CompleteUpload)
	protected.POST("/api/v1/reports/submit", trustMeshHandler.SubmitReport)
	protected.GET("/api/v1/gaiadrop/inbox", gaiaDropHandler.ListInbox)
	protected.POST("/api/v1/gaiadrop/read", gaiaDropHandler.MarkRead)
	protected.POST("/api/v1/gaiadrop/delete", gaiaDropHandler.Delete)

	protected.POST("/api/v1/rooms/create", roomHandler.CreateRoom)
	protected.POST("/api/v1/rooms/update", roomHandler.UpdateRoom)
	protected.GET("/api/v1/rooms", roomHandler.GetRooms)
	protected.POST("/api/v1/rooms/join", roomHandler.JoinRoomByHash)
	protected.POST("/api/v1/rooms/leave", roomHandler.LeaveRoom)
	protected.POST("/api/v1/rooms/channels", roomHandler.CreateChannel)
	protected.GET("/api/v1/rooms/channels", roomHandler.GetChannels)
	protected.POST("/api/v1/rooms/members/role", roomHandler.UpdateMemberRole)
	protected.POST("/api/v1/rooms/delete", roomHandler.DeleteRoom)

	return router
}

type routeGroup struct {
	router     *httpx.Router
	middleware httpx.Middleware
}

func withAuth(router *httpx.Router, middleware httpx.Middleware) routeGroup {
	return routeGroup{router: router, middleware: middleware}
}

func (g routeGroup) GET(pattern string, handler httpx.HandlerFunc) {
	g.router.GET(pattern, g.middleware(handler))
}

func (g routeGroup) POST(pattern string, handler httpx.HandlerFunc) {
	g.router.POST(pattern, g.middleware(handler))
}
