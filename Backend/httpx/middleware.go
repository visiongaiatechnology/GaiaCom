// STATUS: DIAMANT VGT SUPREME
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
	methodSet := makeSet(config.AllowMethods)
	headerSet := makeFoldedSet(config.AllowHeaders)
	methods := strings.Join(config.AllowMethods, ", ")
	headers := strings.Join(config.AllowHeaders, ", ")
	exposed := strings.Join(config.ExposeHeaders, ", ")
	maxAge := intToString(int(config.MaxAge.Seconds()))

	return func(next HandlerFunc) HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			_, originAllowed := originSet[origin]
			header := w.Header()
			header.Add("Vary", "Origin")

			if r.Method == http.MethodOptions {
				header.Add("Vary", "Access-Control-Request-Method")
				header.Add("Vary", "Access-Control-Request-Headers")
				if !originAllowed || !validPreflightRequest(r, methodSet, headerSet) {
					w.WriteHeader(http.StatusForbidden)
					return
				}
				setCORSResponseHeaders(header, origin, methods, headers, exposed, maxAge, config.AllowCredentials)
				w.WriteHeader(http.StatusNoContent)
				return
			}

			if originAllowed {
				setCORSResponseHeaders(header, origin, methods, headers, exposed, maxAge, config.AllowCredentials)
			}
			next(w, r)
		}
	}
}

func validPreflightRequest(r *http.Request, methodSet, headerSet map[string]struct{}) bool {
	requestedMethod := r.Header.Get("Access-Control-Request-Method")
	if _, allowed := methodSet[requestedMethod]; !allowed {
		return false
	}

	requestedHeaders := strings.TrimSpace(r.Header.Get("Access-Control-Request-Headers"))
	if requestedHeaders == "" {
		return true
	}
	for _, rawHeader := range strings.Split(requestedHeaders, ",") {
		name := strings.TrimSpace(rawHeader)
		if name == "" {
			return false
		}
		if _, allowed := headerSet[strings.ToLower(name)]; !allowed {
			return false
		}
	}
	return true
}

func setCORSResponseHeaders(header http.Header, origin, methods, headers, exposed, maxAge string, allowCredentials bool) {
	header.Set("Access-Control-Allow-Origin", origin)
	header.Set("Access-Control-Allow-Methods", methods)
	header.Set("Access-Control-Allow-Headers", headers)
	header.Set("Access-Control-Expose-Headers", exposed)
	header.Set("Access-Control-Max-Age", maxAge)
	if allowCredentials {
		header.Set("Access-Control-Allow-Credentials", "true")
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
