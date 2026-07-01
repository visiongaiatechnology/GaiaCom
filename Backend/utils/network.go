// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package utils

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"os"
	"strings"
	"syscall"
	"time"
)

// IsPrivateIP checks if an IP is a private, loopback, link-local, multicast, unspecified or reserved address.
func IsPrivateIP(ip net.IP) bool {
	if ip == nil {
		return true
	}
	
	// Convert IPv4-mapped IPv6 to pure IPv4 to prevent bypasses
	if ip4 := ip.To4(); ip4 != nil {
		ip = ip4
	}
	
	// Check loopback
	if ip.IsLoopback() {
		return true
	}
	
	// Check link local
	if ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() {
		return true
	}
	
	// Check interface local multicast
	if ip.IsInterfaceLocalMulticast() {
		return true
	}

	// Check unspecified (0.0.0.0 and ::)
	if ip.IsUnspecified() {
		return true
	}

	// Check global unicast (if it's NOT global unicast, it's reserved/private/local)
	if !ip.IsGlobalUnicast() {
		return true
	}

	// IPv4 Checks
	if ip4 := ip.To4(); ip4 != nil {
		// RFC 1122: 0.0.0.0/8 (This host on this network / current network)
		if ip4[0] == 0 {
			return true
		}
		// RFC 1918 private IPv4:
		// 10.0.0.0/8
		if ip4[0] == 10 {
			return true
		}
		// 172.16.0.0/12
		if ip4[0] == 172 && ip4[1] >= 16 && ip4[1] <= 31 {
			return true
		}
		// 192.168.0.0/16
		if ip4[0] == 192 && ip4[1] == 168 {
			return true
		}
		// RFC 2544 / RFC 5737 / RFC 3927 (link local, e.g. 169.254.x.x)
		if ip4[0] == 169 && ip4[1] == 254 {
			return true
		}
		// Carrier-Grade NAT (100.64.0.0/10)
		if ip4[0] == 100 && ip4[1] >= 64 && ip4[1] <= 127 {
			return true
		}
		// IETF Protocol Assignments (192.0.0.0/24)
		if ip4[0] == 192 && ip4[1] == 0 && ip4[2] == 0 {
			return true
		}
		// Benchmarking (198.18.0.0/15)
		if ip4[0] == 198 && ip4[1] >= 18 && ip4[1] <= 19 {
			return true
		}
		// Documentation Range 1 (192.0.2.0/24)
		if ip4[0] == 192 && ip4[1] == 0 && ip4[2] == 2 {
			return true
		}
		// Documentation Range 2 (198.51.100.0/24)
		if ip4[0] == 198 && ip4[1] == 51 && ip4[2] == 100 {
			return true
		}
		// Documentation Range 3 (203.0.113.0/24)
		if ip4[0] == 203 && ip4[1] == 0 && ip4[2] == 113 {
			return true
		}
		// RFC 1700 Class E Reserved / Multicast (224.0.0.0/4 and 240.0.0.0/4)
		if ip4[0] >= 224 {
			return true
		}
		// Broadcast
		if ip.Equal(net.IPv4bcast) {
			return true
		}
	} else {
		// IPv6 Checks
		// Unique Local Unicast (fc00::/7)
		if len(ip) == 16 && (ip[0]&0xfe) == 0xfc {
			return true
		}
	}
	
	return false
}

// SafeDialContext returns a dial context function that blocks private/loopback connections.
func SafeDialContext(devMode bool) func(ctx context.Context, network, addr string) (net.Conn, error) {
	dialer := &net.Dialer{
		Timeout:   15 * time.Second,
		KeepAlive: 15 * time.Second,
		Control: func(network, address string, c syscall.RawConn) error {
			host, portStr, err := net.SplitHostPort(address)
			if err != nil {
				return err
			}
			
			// If developer mode is active, allow any address (including mock servers like remotefed.org which resolve to localhost)
			if devMode {
				return nil
			}
			
			// Resolve IP
			ips, err := net.LookupIP(host)
			if err != nil {
				return fmt.Errorf("SSRF control: DNS resolution failed: %w", err)
			}
			if len(ips) == 0 {
				return errors.New("SSRF control: no IP address found")
			}
			
			// Check all resolved IPs
			for _, ip := range ips {
				if IsPrivateIP(ip) {
					return fmt.Errorf("SSRF control: connection to private/reserved IP %s is blocked", ip.String())
				}
			}

			// Validate ports: limit to standard ports (80, 443) in production
			if !devMode {
				port, err := net.LookupPort(network, portStr)
				if err != nil {
					return fmt.Errorf("SSRF control: invalid port: %w", err)
				}
				if port != 80 && port != 443 {
					return fmt.Errorf("SSRF control: port %d is blocked (only 80 and 443 allowed)", port)
				}
			}
			
			return nil
		},
	}
	return dialer.DialContext
}

// NewSecureHTTPClient returns an http.Client configured with SSRF mitigations.
func NewSecureHTTPClient() *http.Client {
	devMode := os.Getenv("GAIACOM_DEV_MODE") == "true"
	
	transport := &http.Transport{
		DialContext:           SafeDialContext(devMode),
		Proxy:                 nil, // Explicitly disable proxy support to prevent environment proxy bypass
		MaxIdleConns:          100,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   10 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
	}

	client := &http.Client{
		Timeout:   30 * time.Second,
		Transport: transport,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 10 {
				return errors.New("stopped after 10 redirects")
			}
			
			// Ensure only http/https schemes are allowed
			scheme := strings.ToLower(req.URL.Scheme)
			if scheme != "http" && scheme != "https" {
				return fmt.Errorf("SSRF redirect: disallowed scheme: %s", scheme)
			}
			
			// Disallow userinfo
			if req.URL.User != nil {
				return errors.New("SSRF redirect: userinfo credentials are not allowed")
			}

			// Hostname check
			host := req.URL.Hostname()
			if devMode {
				if host == "localhost" || host == "127.0.0.1" || host == "::1" || strings.HasPrefix(host, "192.168.") {
					return nil
				}
			}

			ips, err := net.LookupIP(host)
			if err != nil {
				return fmt.Errorf("SSRF redirect check: DNS lookup failed: %w", err)
			}
			for _, ip := range ips {
				if IsPrivateIP(ip) {
					return fmt.Errorf("SSRF redirect check: private/reserved IP %s is blocked", ip.String())
				}
			}

			return nil
		},
	}
	
	return client
}

// IsPrivateOrLoopbackIP is a legacy check for validation before calls.
func IsPrivateOrLoopbackIP(domain string) bool {
	if os.Getenv("GAIACOM_DEV_MODE") == "true" {
		return false
	}
	
	ips, err := net.LookupIP(domain)
	if err != nil {
		return true // Fail closed
	}
	for _, ip := range ips {
		if IsPrivateIP(ip) {
			return true
		}
	}
	return false
}
