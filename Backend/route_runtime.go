// STATUS: DIAMANT VGT SUPREME
package backend

import (
	"crypto/ed25519"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"strings"
	"sync"

	"gaiacom/backend/auth"
	"gaiacom/backend/config"
	"gaiacom/backend/httpx"
	"gaiacom/backend/operations"
	"gaiacom/backend/repository"
)

var productionRouteOrigins = []string{
	auth.TauriAppOrigin,
	auth.TauriHTTPOrigin,
}

var developmentRouteOrigins = []string{
	"http://localhost:3000",
	"http://localhost:1420",
}

type RouteRuntimeConfig struct {
	ServerName           string
	ServerPrivateKey     ed25519.PrivateKey
	TrustMeshEpochSecret []byte
	JWTSecret            []byte
	ShieldSecret         []byte
	MetricsToken         string
	AllowOrigins         []string
	StorageRoot          string
	workerGroup          *sync.WaitGroup
}

func (c RouteRuntimeConfig) Validate() error {
	if !config.ValidProductionServerName(c.ServerName) && c.ServerName != "localhost" {
		return errors.New("server name must be localhost or a fully-qualified DNS name")
	}
	if len(c.ServerPrivateKey) != ed25519.PrivateKeySize {
		return errors.New("server private key must be an Ed25519 private key")
	}
	if len(c.TrustMeshEpochSecret) != 32 {
		return errors.New("TrustMesh epoch secret must contain exactly 32 bytes")
	}
	if len(c.JWTSecret) < 32 {
		return errors.New("JWT signing secret must contain at least 32 bytes")
	}
	if len(c.ShieldSecret) < 32 {
		return errors.New("GaiaShield signing secret must contain at least 32 bytes")
	}
	if strings.TrimSpace(c.StorageRoot) == "" {
		return errors.New("storage root is required")
	}
	return nil
}

func loadRouteRuntimeConfig() (RouteRuntimeConfig, error) {
	serverName, privateKey, trustSecret, err := loadRouteIdentity()
	if err != nil {
		return RouteRuntimeConfig{}, err
	}
	jwtSecret, err := environmentSecret("GAIACOM_JWT_SECRET", "JWT_SECRET", 32)
	if err != nil {
		return RouteRuntimeConfig{}, err
	}
	shieldSecret, err := environmentSecret("GAIACOM_SHIELD_SECRET", "", 32)
	if err != nil {
		return RouteRuntimeConfig{}, err
	}
	return RouteRuntimeConfig{
		ServerName:           serverName,
		ServerPrivateKey:     privateKey,
		TrustMeshEpochSecret: trustSecret,
		JWTSecret:            jwtSecret,
		ShieldSecret:         shieldSecret,
		MetricsToken:         strings.TrimSpace(os.Getenv("GAIACOM_METRICS_TOKEN")),
		AllowOrigins:         defaultAllowOrigins(),
		StorageRoot:          environmentStorageRoot(),
	}, nil
}

func defaultAllowOrigins() []string {
	origins := append([]string(nil), productionRouteOrigins...)
	if routesDevMode() {
		origins = append(origins, developmentRouteOrigins...)
	}
	return origins
}

func environmentStorageRoot() string {
	value := strings.TrimSpace(os.Getenv("GAIACOM_STORAGE_ROOT"))
	if value == "" {
		return "./uploads"
	}
	return value
}

func launchRouteWorker(config RouteRuntimeConfig, worker func()) {
	if config.workerGroup == nil {
		go worker()
		return
	}
	config.workerGroup.Add(1)
	go func() {
		defer config.workerGroup.Done()
		worker()
	}()
}

func loadRouteIdentity() (string, ed25519.PrivateKey, []byte, error) {
	development := routesDevMode()
	serverName := strings.ToLower(strings.TrimSpace(os.Getenv("GAIACOM_SERVER_NAME")))
	if serverName == "" {
		if !development {
			return "", nil, nil, errors.New("GAIACOM_SERVER_NAME must be set")
		}
		serverName = "localhost"
	}
	if !development && !config.ValidProductionServerName(serverName) {
		return "", nil, nil, errors.New("GAIACOM_SERVER_NAME must be a valid fully-qualified DNS name")
	}

	privateKeyHex := strings.TrimSpace(os.Getenv("GAIACOM_SERVER_PRIVATE_KEY"))
	keyBytes, err := hex.DecodeString(privateKeyHex)
	if privateKeyHex == "" && development {
		_, generated, generationErr := ed25519.GenerateKey(nil)
		if generationErr != nil {
			return "", nil, nil, fmt.Errorf("generate development server key: %w", generationErr)
		}
		keyBytes = generated
	} else if err != nil || len(keyBytes) != ed25519.PrivateKeySize {
		return "", nil, nil, errors.New("GAIACOM_SERVER_PRIVATE_KEY must encode an Ed25519 private key")
	}

	trustSecretHex := strings.TrimSpace(os.Getenv("GAIACOM_TRUSTMESH_EPOCH_SECRET"))
	trustSecret, err := hex.DecodeString(trustSecretHex)
	if trustSecretHex == "" && development {
		trustSecret = make([]byte, 32)
	} else if err != nil || len(trustSecret) != 32 {
		return "", nil, nil, errors.New("GAIACOM_TRUSTMESH_EPOCH_SECRET must encode exactly 32 bytes")
	}
	return serverName, ed25519.PrivateKey(keyBytes), trustSecret, nil
}

func environmentSecret(primary, fallback string, minimum int) ([]byte, error) {
	value := os.Getenv(primary)
	if len(value) < minimum && fallback != "" {
		value = os.Getenv(fallback)
	}
	if len(value) < minimum && routesDevMode() {
		value = strings.Repeat("d", minimum)
	}
	if len(value) < minimum {
		return nil, fmt.Errorf("%s must contain at least %d bytes", primary, minimum)
	}
	return []byte(value), nil
}

func validProductionServerName(name string) bool {
	return config.ValidProductionServerName(name)
}

func newOperationsMonitor(store repository.Store, metricsToken string) *operations.Monitor {
	probe, _ := store.(operations.DatabaseProbe)
	return operations.NewMonitor(probe, strings.TrimSpace(metricsToken))
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

func (g routeGroup) DELETE(pattern string, handler httpx.HandlerFunc) {
	g.router.DELETE(pattern, g.middleware(handler))
}

func routesDevMode() bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv("GAIACOM_DEV_MODE")))
	return value == "1" || value == "true" || value == "yes"
}
