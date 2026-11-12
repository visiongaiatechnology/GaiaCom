package smtpbridge

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strconv"
	"strings"
	"time"
)

// Optional per-message authentication for the legacy SMTP ingest bridge.
//
// The static bridge token authenticates the bridge as a whole; it cannot bind a
// single message to the bridge that produced it. When
// GAIACOM_SMTP_MESSAGE_SECRET is configured, every ingest request must carry a
// timestamp and an HMAC-SHA256 over the message fields. The static token remains
// the first factor; the HMAC closes the "leaked token replay" gap until the
// signed bridge protocol v2 is available.
const smtpMessageMaxSkew = 5 * time.Minute

var (
	errSMTPMessageSignature = errors.New("smtp message signature rejected")
	smtpMessageSkew         = smtpMessageMaxSkew
)

type smtpMessageAuth struct {
	secret []byte
	now    func() time.Time
}

func newSMTPMessageAuth(raw string) *smtpMessageAuth {
	secret := strings.TrimSpace(raw)
	if secret == "" {
		return nil
	}
	return &smtpMessageAuth{secret: []byte(secret), now: time.Now}
}

func smtpMessageCanonical(target, externalFrom, subject, body, timestamp string) string {
	return strings.Join([]string{target, externalFrom, subject, body, timestamp}, "\x00")
}

// VerifyIngestMessage authenticates one inbound bridge message. A nil receiver
// means the optional feature is disabled for compatibility with existing bridge
// deployments; the static token and rate limits still apply.
func (a *smtpMessageAuth) VerifyIngestMessage(target, externalFrom, subject, body, timestampHeader, signatureHeader string) error {
	if a == nil {
		return nil
	}
	timestampValue := strings.TrimSpace(timestampHeader)
	signatureValue := strings.TrimSpace(signatureHeader)
	if timestampValue == "" || signatureValue == "" {
		return errSMTPMessageSignature
	}
	seconds, err := strconv.ParseInt(timestampValue, 10, 64)
	if err != nil {
		return errSMTPMessageSignature
	}
	now := a.now()
	if now.Sub(time.Unix(seconds, 0)) > smtpMessageSkew || time.Unix(seconds, 0).Sub(now) > smtpMessageSkew {
		return errSMTPMessageSignature
	}
	supplied, err := hex.DecodeString(signatureValue)
	if err != nil || len(supplied) == 0 {
		return errSMTPMessageSignature
	}
	mac := hmac.New(sha256.New, a.secret)
	_, _ = mac.Write([]byte(smtpMessageCanonical(target, externalFrom, subject, body, timestampValue)))
	if !hmac.Equal(supplied, mac.Sum(nil)) {
		return errSMTPMessageSignature
	}
	return nil
}
