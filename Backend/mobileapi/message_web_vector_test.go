// STATUS: DIAMANT VGT SUPREME
package mobileapi

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"os"
	"testing"
	"time"
)

type webMessageFixture struct {
	Source            string             `json:"source"`
	SenderMnemonic    string             `json:"sender_mnemonic"`
	RecipientMnemonic string             `json:"recipient_mnemonic"`
	Vectors           []webMessageVector `json:"vectors"`
}

type webMessageVector struct {
	Plaintext        string             `json:"plaintext"`
	KEMSeed          string             `json:"kem_seed"`
	EphemeralPrivate string             `json:"ephemeral_private"`
	IV               string             `json:"iv"`
	Envelope         webMessageEnvelope `json:"envelope"`
}

type webMessageEnvelope struct {
	AlgorithmSuite           string `json:"algorithm_suite"`
	KEMCiphertext            string `json:"kem_ciphertext"`
	EphemeralPublic          string `json:"ephemeral_pub"`
	PayloadCiphertext        string `json:"payload_ciphertext"`
	IV                       string `json:"iv"`
	Signature                string `json:"signature"`
	SenderMLDSA87Public      string `json:"sender_mldsa87_public"`
	ClientMessageID          string `json:"client_message_id"`
	Timestamp                int64  `json:"timestamp"`
	RecipientDeviceKeyID     string `json:"recipient_device_key_id"`
	RecipientDeviceBoxPublic string `json:"recipient_device_box_public"`
	SignatureBundle          struct {
		Ed25519       string `json:"ed25519"`
		MLDSA87       string `json:"ml_dsa_87"`
		MLDSA87Public string `json:"ml_dsa_87_public"`
	} `json:"signature_bundle"`
}

func TestMessageProtocolMatchesActualWebImplementation(t *testing.T) {
	fixture := readWebMessageFixture(t)
	if fixture.Source != "Frontend/frontend/src/crypto.js" || len(fixture.Vectors) != 2 {
		t.Fatal("web fixture provenance or vector count is invalid")
	}
	senderIdentity := deriveFixtureIdentity(t, fixture.SenderMnemonic)
	defer senderIdentity.Close()
	recipientIdentity := deriveFixtureIdentity(t, fixture.RecipientMnemonic)
	defer recipientIdentity.Close()

	sender := mustMessageSender(t, senderIdentity.Ed25519Public(), senderIdentity.Mldsa87Public())
	defer sender.Close()
	for index := range fixture.Vectors {
		vector := fixture.Vectors[index]
		t.Run(vector.Envelope.AlgorithmSuite, func(t *testing.T) {
			expected := mustFixtureEnvelope(t, vector.Envelope)
			defer expected.Close()
			plaintext, err := recipientIdentity.DecryptMessage(sender, expected)
			if err != nil {
				t.Fatalf("native decryption of web vector failed: %v", err)
			}
			if !bytes.Equal(plaintext, []byte(vector.Plaintext)) {
				t.Fatal("native plaintext differs from web plaintext bytes")
			}
			wipe(plaintext)

			recipient := mustMessageRecipient(
				t,
				recipientIdentity.Ed25519Public(),
				recipientIdentity.X25519Public(),
				recipientIdentity.Mlkem1024Public(),
				recipientIdentity.Mldsa87Public(),
				vector.Envelope.RecipientDeviceKeyID,
			)
			defer recipient.Close()
			randomBytes := append(mustHex(t, vector.KEMSeed), mustHex(t, vector.EphemeralPrivate)...)
			randomBytes = append(randomBytes, mustHex(t, vector.IV)...)
			randomReader := bytes.NewReader(randomBytes)
			actual, err := senderIdentity.encryptMessageWithRuntime(
				recipient,
				[]byte(vector.Plaintext),
				vector.Envelope.ClientMessageID,
				vector.Envelope.Timestamp,
				vector.Envelope.AlgorithmSuite == topSecretMessageSuite,
				messageCryptoRuntime{
					random:          randomReader,
					now:             func() time.Time { return time.UnixMilli(vector.Envelope.Timestamp) },
					randomizedMLDSA: false,
				},
			)
			wipe(randomBytes)
			if err != nil {
				t.Fatalf("deterministic native encryption failed: %v", err)
			}
			defer actual.Close()
			if randomReader.Len() != 0 {
				t.Fatalf("native encryption left %d deterministic random bytes unread", randomReader.Len())
			}
			assertEnvelopeEqual(t, actual, expected)
		})
	}
}

func readWebMessageFixture(t *testing.T) webMessageFixture {
	t.Helper()
	data, err := os.ReadFile("testdata/web_message_vectors.json")
	if err != nil {
		t.Fatalf("read web message fixture: %v", err)
	}
	defer wipe(data)
	var fixture webMessageFixture
	if err := json.Unmarshal(data, &fixture); err != nil {
		t.Fatalf("decode web message fixture: %v", err)
	}
	return fixture
}

func deriveFixtureIdentity(t *testing.T, mnemonic string) *KeyBundle {
	t.Helper()
	identity, err := DeriveIdentity([]byte(mnemonic))
	if err != nil {
		t.Fatalf("derive fixture identity: %v", err)
	}
	return identity
}

func mustFixtureEnvelope(t *testing.T, value webMessageEnvelope) *MessageEnvelope {
	t.Helper()
	if value.SignatureBundle.Ed25519 != value.Signature ||
		value.SignatureBundle.MLDSA87Public != value.SenderMLDSA87Public {
		t.Fatal("web envelope signature aliases disagree")
	}
	envelope, err := NewMessageEnvelope(
		value.AlgorithmSuite,
		mustHex(t, value.KEMCiphertext),
		mustHex(t, value.EphemeralPublic),
		mustHex(t, value.PayloadCiphertext),
		mustHex(t, value.IV),
		mustHex(t, value.Signature),
		mustHex(t, value.SignatureBundle.MLDSA87),
		mustHex(t, value.SenderMLDSA87Public),
		value.ClientMessageID,
		value.Timestamp,
		value.RecipientDeviceKeyID,
		mustHex(t, value.RecipientDeviceBoxPublic),
	)
	if err != nil {
		t.Fatalf("construct web envelope: %v", err)
	}
	return envelope
}

func mustHex(t *testing.T, value string) []byte {
	t.Helper()
	decoded, err := hex.DecodeString(value)
	if err != nil {
		t.Fatalf("decode fixture hex: %v", err)
	}
	return decoded
}

func mustMessageRecipient(
	t *testing.T,
	edPublic, xPublic, kemPublic, mlPublic []byte,
	deviceID string,
) *MessageRecipient {
	t.Helper()
	recipient, err := NewMessageRecipient(edPublic, xPublic, kemPublic, mlPublic, deviceID)
	if err != nil {
		t.Fatalf("construct recipient capability: %v", err)
	}
	return recipient
}

func mustMessageSender(t *testing.T, edPublic, mlPublic []byte) *MessageSender {
	t.Helper()
	sender, err := NewMessageSender(edPublic, mlPublic)
	if err != nil {
		t.Fatalf("construct sender capability: %v", err)
	}
	return sender
}

func assertEnvelopeEqual(t *testing.T, actual, expected *MessageEnvelope) {
	t.Helper()
	if actual.AlgorithmSuite() != expected.AlgorithmSuite() ||
		actual.ClientMessageID() != expected.ClientMessageID() ||
		actual.TimestampMillis() != expected.TimestampMillis() ||
		actual.RecipientDeviceKeyID() != expected.RecipientDeviceKeyID() ||
		actual.IsTopSecret() != expected.IsTopSecret() {
		t.Fatal("native and web envelope metadata differ")
	}
	pairs := [][2][]byte{
		{actual.KemCiphertext(), expected.KemCiphertext()},
		{actual.EphemeralPublic(), expected.EphemeralPublic()},
		{actual.PayloadCiphertext(), expected.PayloadCiphertext()},
		{actual.IV(), expected.IV()},
		{actual.Ed25519Signature(), expected.Ed25519Signature()},
		{actual.Mldsa87Signature(), expected.Mldsa87Signature()},
		{actual.SenderMldsa87Public(), expected.SenderMldsa87Public()},
		{actual.RecipientDeviceBoxPublic(), expected.RecipientDeviceBoxPublic()},
	}
	for index := range pairs {
		if !bytes.Equal(pairs[index][0], pairs[index][1]) {
			t.Fatalf("native and web envelope binary field %d differs", index)
		}
		wipe(pairs[index][0])
		wipe(pairs[index][1])
	}
}
