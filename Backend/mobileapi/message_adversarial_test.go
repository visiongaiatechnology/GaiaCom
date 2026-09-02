// STATUS: DIAMANT VGT SUPREME
package mobileapi

import (
	"bytes"
	"errors"
	"testing"
	"time"
)

func TestMessageProtocolRejectsEveryBoundTranscriptMutation(t *testing.T) {
	fixture := readWebMessageFixture(t)
	senderIdentity := deriveFixtureIdentity(t, fixture.SenderMnemonic)
	defer senderIdentity.Close()
	recipientIdentity := deriveFixtureIdentity(t, fixture.RecipientMnemonic)
	defer recipientIdentity.Close()
	sender := mustMessageSender(t, senderIdentity.Ed25519Public(), senderIdentity.Mldsa87Public())
	defer sender.Close()
	original := mustFixtureEnvelope(t, fixture.Vectors[1].Envelope)
	defer original.Close()

	mutations := []struct {
		name   string
		mutate func(*envelopeSnapshot)
	}{
		{"kem-ciphertext", func(value *envelopeSnapshot) { value.kemCiphertext[0] ^= 0x80 }},
		{"ephemeral-public", func(value *envelopeSnapshot) { value.ephemeralPublic[0] ^= 0x80 }},
		{"payload-ciphertext", func(value *envelopeSnapshot) { value.payloadCiphertext[0] ^= 0x80 }},
		{"iv", func(value *envelopeSnapshot) { value.iv[0] ^= 0x80 }},
		{"ed25519-signature", func(value *envelopeSnapshot) { value.ed25519Signature[0] ^= 0x80 }},
		{"mldsa-signature", func(value *envelopeSnapshot) { value.mldsa87Signature[0] ^= 0x80 }},
		{"embedded-mldsa-public", func(value *envelopeSnapshot) { value.senderMldsa87Public[0] ^= 0x80 }},
		{"message-id", func(value *envelopeSnapshot) { value.clientMessageID = "11223344-5566-4788-99aa-bbccddeeff03" }},
		{"timestamp", func(value *envelopeSnapshot) { value.timestampMillis++ }},
		{"device-id", func(value *envelopeSnapshot) { value.recipientDeviceKeyID = "aabbccdd-eeff-4123-8abc-0123456789ac" }},
		{"recipient-box-alias", func(value *envelopeSnapshot) { value.recipientDeviceBoxPublic[0] ^= 0x80 }},
		{"suite-downgrade", func(value *envelopeSnapshot) {
			value.algorithmSuite = standardMessageSuite
			wipe(value.mldsa87Signature)
			wipe(value.senderMldsa87Public)
			value.mldsa87Signature = nil
			value.senderMldsa87Public = nil
		}},
	}
	for index := range mutations {
		mutation := mutations[index]
		t.Run(mutation.name, func(t *testing.T) {
			tampered := mutateMessageEnvelope(t, original, mutation.mutate)
			defer tampered.Close()
			plaintext, err := recipientIdentity.DecryptMessage(sender, tampered)
			wipe(plaintext)
			if err == nil {
				t.Fatal("tampered transcript was accepted")
			}
		})
	}
}

func TestMessageProtocolRejectsTrustedIdentityMismatch(t *testing.T) {
	fixture := readWebMessageFixture(t)
	senderIdentity := deriveFixtureIdentity(t, fixture.SenderMnemonic)
	defer senderIdentity.Close()
	recipientIdentity := deriveFixtureIdentity(t, fixture.RecipientMnemonic)
	defer recipientIdentity.Close()
	envelope := mustFixtureEnvelope(t, fixture.Vectors[1].Envelope)
	defer envelope.Close()

	wrongEdSender := mustMessageSender(
		t,
		recipientIdentity.Ed25519Public(),
		senderIdentity.Mldsa87Public(),
	)
	defer wrongEdSender.Close()
	if plaintext, err := recipientIdentity.DecryptMessage(wrongEdSender, envelope); err == nil {
		wipe(plaintext)
		t.Fatal("mismatched Ed25519 sender was accepted")
	}

	wrongMLSender := mustMessageSender(
		t,
		senderIdentity.Ed25519Public(),
		recipientIdentity.Mldsa87Public(),
	)
	defer wrongMLSender.Close()
	if plaintext, err := recipientIdentity.DecryptMessage(wrongMLSender, envelope); err == nil {
		wipe(plaintext)
		t.Fatal("mismatched ML-DSA-87 sender was accepted")
	}

	correctSender := mustMessageSender(
		t,
		senderIdentity.Ed25519Public(),
		senderIdentity.Mldsa87Public(),
	)
	defer correctSender.Close()
	if plaintext, err := senderIdentity.DecryptMessage(correctSender, envelope); err == nil {
		wipe(plaintext)
		t.Fatal("envelope encrypted to another recipient was accepted")
	}
}

func TestMessageConstructorsEnforceBoundaries(t *testing.T) {
	fixture := readWebMessageFixture(t)
	standard := mustFixtureEnvelope(t, fixture.Vectors[0].Envelope)
	defer standard.Close()
	topSecret := mustFixtureEnvelope(t, fixture.Vectors[1].Envelope)
	defer topSecret.Close()

	invalid := []struct {
		name   string
		base   *MessageEnvelope
		mutate func(*envelopeSnapshot)
	}{
		{"unknown-suite", standard, func(value *envelopeSnapshot) { value.algorithmSuite = "GaiaCom/unknown" }},
		{"short-kem", standard, func(value *envelopeSnapshot) { value.kemCiphertext = value.kemCiphertext[:len(value.kemCiphertext)-1] }},
		{"short-ephemeral", standard, func(value *envelopeSnapshot) { value.ephemeralPublic = value.ephemeralPublic[:31] }},
		{"short-ciphertext", standard, func(value *envelopeSnapshot) { value.payloadCiphertext = value.payloadCiphertext[:15] }},
		{"short-iv", standard, func(value *envelopeSnapshot) { value.iv = value.iv[:11] }},
		{"short-ed-signature", standard, func(value *envelopeSnapshot) { value.ed25519Signature = value.ed25519Signature[:63] }},
		{"invalid-message-id", standard, func(value *envelopeSnapshot) { value.clientMessageID = "not-a-uuid" }},
		{"noncanonical-message-id", standard, func(value *envelopeSnapshot) { value.clientMessageID = "11223344-5566-4788-99AA-BBCCDDEEFF01" }},
		{"zero-timestamp", standard, func(value *envelopeSnapshot) { value.timestampMillis = 0 }},
		{"oversized-timestamp", standard, func(value *envelopeSnapshot) { value.timestampMillis = maximumTimestampMillis + 1 }},
		{"invalid-device-id", standard, func(value *envelopeSnapshot) { value.recipientDeviceKeyID = "device-one" }},
		{"short-recipient-box", standard, func(value *envelopeSnapshot) { value.recipientDeviceBoxPublic = value.recipientDeviceBoxPublic[:31] }},
		{"standard-with-pq-signature", standard, func(value *envelopeSnapshot) { value.mldsa87Signature = make([]byte, 4627) }},
		{"top-secret-without-pq-signature", topSecret, func(value *envelopeSnapshot) { value.mldsa87Signature = nil }},
	}
	for index := range invalid {
		testCase := invalid[index]
		t.Run(testCase.name, func(t *testing.T) {
			value, err := testCase.base.snapshot()
			if err != nil {
				t.Fatalf("snapshot valid envelope: %v", err)
			}
			defer value.wipe()
			testCase.mutate(&value)
			created, err := newMessageEnvelopeFromSnapshot(value)
			if created != nil {
				created.Close()
			}
			if err == nil {
				t.Fatal("invalid envelope boundary was accepted")
			}
		})
	}
}

func TestMessageEncryptionLifecycleAndEntropyFailure(t *testing.T) {
	fixture := readWebMessageFixture(t)
	senderIdentity := deriveFixtureIdentity(t, fixture.SenderMnemonic)
	defer senderIdentity.Close()
	recipientIdentity := deriveFixtureIdentity(t, fixture.RecipientMnemonic)
	defer recipientIdentity.Close()
	recipient := mustMessageRecipient(
		t,
		recipientIdentity.Ed25519Public(),
		recipientIdentity.X25519Public(),
		recipientIdentity.Mlkem1024Public(),
		recipientIdentity.Mldsa87Public(),
		"",
	)

	failureRuntime := messageCryptoRuntime{
		random:          failingMessageReader{},
		now:             time.Now,
		randomizedMLDSA: false,
	}
	if envelope, err := senderIdentity.encryptMessageWithRuntime(
		recipient, []byte("test"), "11223344-5566-4788-99aa-bbccddeeff04", 1, false, failureRuntime,
	); err == nil || envelope != nil {
		t.Fatal("CSPRNG failure did not fail closed")
	}
	if envelope, err := senderIdentity.EncryptMessage(
		recipient, make([]byte, maximumMessagePlaintext+1), "", 0, false,
	); err == nil || envelope != nil {
		t.Fatal("oversized plaintext was accepted")
	}
	recipient.Close()
	if envelope, err := senderIdentity.EncryptMessage(recipient, []byte("test"), "", 0, false); err == nil || envelope != nil {
		t.Fatal("closed recipient capability was accepted")
	}
}

func mutateMessageEnvelope(
	t *testing.T,
	original *MessageEnvelope,
	mutate func(*envelopeSnapshot),
) *MessageEnvelope {
	t.Helper()
	value, err := original.snapshot()
	if err != nil {
		t.Fatalf("snapshot message envelope: %v", err)
	}
	defer value.wipe()
	mutate(&value)
	envelope, err := newMessageEnvelopeFromSnapshot(value)
	if err != nil {
		t.Fatalf("construct structurally valid tampered envelope: %v", err)
	}
	return envelope
}

func newMessageEnvelopeFromSnapshot(value envelopeSnapshot) (*MessageEnvelope, error) {
	return NewMessageEnvelope(
		value.algorithmSuite,
		value.kemCiphertext,
		value.ephemeralPublic,
		value.payloadCiphertext,
		value.iv,
		value.ed25519Signature,
		value.mldsa87Signature,
		value.senderMldsa87Public,
		value.clientMessageID,
		value.timestampMillis,
		value.recipientDeviceKeyID,
		value.recipientDeviceBoxPublic,
	)
}

type failingMessageReader struct{}

func (failingMessageReader) Read([]byte) (int, error) {
	return 0, errors.New("fixture entropy failure")
}

func TestMessageGeneratedMetadataMatchesWebUUIDOrdering(t *testing.T) {
	fixture := readWebMessageFixture(t)
	senderIdentity := deriveFixtureIdentity(t, fixture.SenderMnemonic)
	defer senderIdentity.Close()
	recipientIdentity := deriveFixtureIdentity(t, fixture.RecipientMnemonic)
	defer recipientIdentity.Close()
	recipient := mustMessageRecipient(
		t,
		recipientIdentity.Ed25519Public(),
		recipientIdentity.X25519Public(),
		recipientIdentity.Mlkem1024Public(),
		nil,
		"",
	)
	defer recipient.Close()

	randomBytes := make([]byte, 32+32+12+16)
	for index := range randomBytes {
		randomBytes[index] = byte(index*19 + 7)
	}
	expectedID, err := generateMessageUUID(bytes.NewReader(randomBytes[76:]))
	if err != nil {
		t.Fatalf("generate expected UUID: %v", err)
	}
	fixedTime := time.UnixMilli(1_784_332_801_000)
	envelope, err := senderIdentity.encryptMessageWithRuntime(
		recipient,
		[]byte("metadata"),
		"",
		0,
		false,
		messageCryptoRuntime{
			random:          bytes.NewReader(randomBytes),
			now:             func() time.Time { return fixedTime },
			randomizedMLDSA: false,
		},
	)
	wipe(randomBytes)
	if err != nil {
		t.Fatalf("encrypt with generated metadata: %v", err)
	}
	defer envelope.Close()
	if envelope.ClientMessageID() != expectedID || envelope.TimestampMillis() != fixedTime.UnixMilli() {
		t.Fatal("generated message metadata differs from Web ordering")
	}
}
