// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package httpx

import (
	"net/http"
	"os"
	"strings"
)

func SecurityHeadersHTTP() Middleware {
	return func(next HandlerFunc) HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			setSecurityHeaders(w.Header())
			next(w, r)
		}
	}
}

func CORSHTTP(config CORSConfig) Middleware {
	originSet := makeSet(config.AllowOrigins)
	methods := strings.Join(config.AllowMethods, ", ")
	headers := strings.Join(config.AllowHeaders, ", ")
	exposed := strings.Join(config.ExposeHeaders, ", ")
	maxAge := intToString(int(config.MaxAge.Seconds()))

	return func(next HandlerFunc) HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if _, allowed := originSet[origin]; allowed {
				header := w.Header()
				header.Set("Access-Control-Allow-Origin", origin)
				header.Set("Vary", "Origin")
				header.Set("Access-Control-Allow-Methods", methods)
				header.Set("Access-Control-Allow-Headers", headers)
				header.Set("Access-Control-Expose-Headers", exposed)
				header.Set("Access-Control-Max-Age", maxAge)
				if config.AllowCredentials {
					header.Set("Access-Control-Allow-Credentials", "true")
				}
			}

			if r.Method == http.MethodOptions {
				if _, allowed := originSet[origin]; !allowed {
					w.WriteHeader(http.StatusForbidden)
					return
				}
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next(w, r)
		}
	}
}

func setSecurityHeaders(header http.Header) {
	header.Set("X-Content-Type-Options", "nosniff")
	header.Set("X-Frame-Options", "DENY")
	header.Set("Referrer-Policy", "strict-origin-when-cross-origin")
	header.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()")
	header.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
	header.Set("Cross-Origin-Opener-Policy", "same-origin")
	header.Set("Cross-Origin-Embedder-Policy", "require-corp")
	header.Set("Cross-Origin-Resource-Policy", "same-origin")

	csp := strings.Join([]string{
		"default-src 'self'",
		"script-src 'self'",
		"style-src 'self'",
		"style-src-attr 'unsafe-inline'",
		"img-src 'self' data: blob:",
		"font-src 'self' data:",
		"connect-src 'self'",
		"worker-src 'self' blob:",
		"manifest-src 'self'",
		"frame-ancestors 'none'",
		"form-action 'self'",
		"object-src 'none'",
		"base-uri 'none'",
		"report-uri /api/v1/public/csp-report",
	}, "; ") + ";"
	if os.Getenv("GAIACOM_DEV_MODE") == "true" {
		csp = strings.Replace(
			csp,
			"connect-src 'self'",
			"connect-src 'self' http://localhost:8080 ws://localhost:8080 http://localhost:3000",
			1,
		)
	}
	header.Set("Content-Security-Policy", csp)
}
