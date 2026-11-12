package smtpbridge

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strconv"
	"testing"
	"time"
)

func signSMTPMessage(t *testing.T, secret, target, from, subject, body string, timestamp int64) string {
	t.Helper()
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(smtpMessageCanonical(target, from, subject, body, strconv.FormatInt(timestamp, 10))))
	return hex.EncodeToString(mac.Sum(nil))
}

func TestSMTPMessageAuthRejectsMissingInvalidAndStale(t *testing.T) {
	auth := newSMTPMessageAuth("bridge-message-secret-32-bytes!!")
	now := time.Unix(1_800_000_000, 0).UTC()
	auth.now = func() time.Time { return now }
	signature := signSMTPMessage(t, "bridge-message-secret-32-bytes!!", "@alice:gaiacom.de", "source@example.net", "Subject", "Body", now.Unix())

	if err := auth.VerifyIngestMessage("@alice:gaiacom.de", "source@example.net", "Subject", "Body", strconv.FormatInt(now.Unix(), 10), signature); err != nil {
		t.Fatalf("valid message rejected: %v", err)
	}
	cases := []struct {
		name      string
		timestamp string
		signature string
		want      error
	}{
		{"missing", "", "", errSMTPMessageSignature},
		{"bad signature", strconv.FormatInt(now.Unix(), 10), "deadbeef", errSMTPMessageSignature},
		{"stale", strconv.FormatInt(now.Add(-10*time.Minute).Unix(), 10), signSMTPMessage(t, "bridge-message-secret-32-bytes!!", "@alice:gaiacom.de", "source@example.net", "Subject", "Body", now.Add(-10*time.Minute).Unix()), errSMTPMessageSignature},
		{"tampered body", strconv.FormatInt(now.Unix(), 10), signSMTPMessage(t, "bridge-message-secret-32-bytes!!", "@alice:gaiacom.de", "source@example.net", "Subject", "Other", now.Unix()), errSMTPMessageSignature},
	}
	for _, testCase := range cases {
		err := auth.VerifyIngestMessage("@alice:gaiacom.de", "source@example.net", "Subject", "Body", testCase.timestamp, testCase.signature)
		if !errors.Is(err, testCase.want) {
			t.Fatalf("%s: got %v, want %v", testCase.name, err, testCase.want)
		}
	}
}

func TestSMTPMessageAuthDisabledForLegacyBridge(t *testing.T) {
	var auth *smtpMessageAuth
	if err := auth.VerifyIngestMessage("@alice:gaiacom.de", "source@example.net", "Subject", "Body", "", ""); err != nil {
		t.Fatalf("disabled message auth must not reject legacy ingest: %v", err)
	}
}
