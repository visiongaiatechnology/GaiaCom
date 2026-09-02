// STATUS: DIAMANT VGT SUPREME
package auth

import (
	"net/http"
	"strings"

	"gaiacom/backend/internal/security"
)

const (
	AndroidNativeClientHeader = "X-Gaia-Client"
	AndroidNativeClientID     = "android-native-v1"
	TauriAppOrigin            = "tauri://localhost"
	TauriHTTPOrigin           = "http://tauri.localhost"
)

func deviceMetadataFromRequest(r *http.Request) DeviceMetadata {
	userAgent := strings.TrimSpace(r.UserAgent())
	osName := detectOS(userAgent)
	browser := detectBrowser(userAgent)
	deviceType := detectDeviceType(userAgent)
	return DeviceMetadata{
		DeviceLabel: strings.TrimSpace(browser + " " + osName),
		DeviceType:  deviceType,
		OS:          osName,
		Browser:     browser,
		IPAddress:   security.ClientIP(r),
		UserAgent:   userAgent,
	}
}

func isNativeClientRequest(r *http.Request) bool {
	return isTauriClientRequest(r) || isAndroidNativeClientRequest(r)
}

func isTauriClientRequest(r *http.Request) bool {
	origins := r.Header.Values("Origin")
	if len(origins) != 1 {
		return false
	}
	return origins[0] == TauriAppOrigin || origins[0] == TauriHTTPOrigin
}

func isAndroidNativeClientRequest(r *http.Request) bool {
	if len(r.Header.Values("Origin")) != 0 || hasBrowserFetchMetadata(r.Header) {
		return false
	}
	clientValues := r.Header.Values(AndroidNativeClientHeader)
	return len(clientValues) == 1 && clientValues[0] == AndroidNativeClientID
}

func hasBrowserFetchMetadata(header http.Header) bool {
	for name := range header {
		if strings.HasPrefix(strings.ToLower(name), "sec-fetch-") {
			return true
		}
	}
	return false
}

func detectOS(userAgent string) string {
	lower := strings.ToLower(userAgent)
	switch {
	case strings.Contains(lower, "iphone") || strings.Contains(lower, "ipad"):
		return "iOS"
	case strings.Contains(lower, "android"):
		return "Android"
	case strings.Contains(lower, "windows"):
		return "Windows"
	case strings.Contains(lower, "mac os") || strings.Contains(lower, "macintosh"):
		return "macOS"
	case strings.Contains(lower, "linux"):
		return "Linux"
	default:
		return "Unknown OS"
	}
}

func detectBrowser(userAgent string) string {
	lower := strings.ToLower(userAgent)
	switch {
	case strings.Contains(lower, "edg/"):
		return "Edge"
	case strings.Contains(lower, "firefox/"):
		return "Firefox"
	case strings.Contains(lower, "chrome/") || strings.Contains(lower, "crios/"):
		return "Chrome"
	case strings.Contains(lower, "safari/"):
		return "Safari"
	default:
		return "Browser"
	}
}

func detectDeviceType(userAgent string) string {
	lower := strings.ToLower(userAgent)
	switch {
	case strings.Contains(lower, "mobile") || strings.Contains(lower, "iphone") || strings.Contains(lower, "android"):
		return "mobile"
	case strings.Contains(lower, "ipad") || strings.Contains(lower, "tablet"):
		return "tablet"
	default:
		return "desktop"
	}
}
