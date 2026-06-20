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
	
	csp := "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; report-uri /api/v1/public/csp-report;"
	if os.Getenv("GAIACOM_DEV_MODE") == "true" {
		csp += " connect-src 'self' http://localhost:8080 ws://localhost:8080 http://localhost:3000;"
	} else {
		csp += " connect-src 'self';"
	}
	header.Set("Content-Security-Policy", csp)
}
