// STATUS: DIAMANT VGT SUPREME
package mobileapi

import (
	"crypto/sha256"
	"encoding/binary"
)

type messageTranscript struct {
	algorithmSuite       string
	senderIdentity       []byte
	recipientIdentity    []byte
	recipientDevice      []byte
	recipientDeviceKeyID string
	ephemeralPublic      []byte
	kemCiphertext        []byte
	messageID            string
	timestampMillis      int64
	iv                   []byte
	payloadCiphertext    []byte
}

func buildMessageAAD(input messageTranscript) []byte {
	kemHash := sha256.Sum256(input.kemCiphertext)
	deviceIDSize := prefixedSize(input.recipientDeviceKeyID)
	capacity := prefixedSize(messageProtocolVersion) + prefixedSize(input.algorithmSuite) +
		messageIdentityKeySize + messageIdentityKeySize + messageX25519KeySize + deviceIDSize +
		messageX25519KeySize + sha256.Size + prefixedSize(input.messageID) + 8 + messageIVSize

	output := make([]byte, 0, capacity)
	output = appendPrefixedString(output, messageProtocolVersion)
	output = appendPrefixedString(output, input.algorithmSuite)
	output = append(output, input.senderIdentity...)
	output = append(output, input.recipientIdentity...)
	output = append(output, input.recipientDevice...)
	if input.recipientDeviceKeyID != "" {
		output = appendPrefixedString(output, input.recipientDeviceKeyID)
	}
	output = append(output, input.ephemeralPublic...)
	output = append(output, kemHash[:]...)
	output = appendPrefixedString(output, input.messageID)
	output = appendTimestamp(output, input.timestampMillis)
	output = append(output, input.iv...)
	return output
}

func buildMessageSignaturePayload(input messageTranscript) []byte {
	kemHash := sha256.Sum256(input.kemCiphertext)
	ciphertextHash := sha256.Sum256(input.payloadCiphertext)
	deviceIDSize := prefixedSize(input.recipientDeviceKeyID)
	capacity := prefixedSize(messageProtocolVersion) + prefixedSize(input.algorithmSuite) +
		messageIdentityKeySize + messageIdentityKeySize + messageX25519KeySize + deviceIDSize +
		messageX25519KeySize + sha256.Size + prefixedSize(input.messageID) + 8 + messageIVSize + sha256.Size

	output := make([]byte, 0, capacity)
	output = appendPrefixedString(output, messageProtocolVersion)
	output = appendPrefixedString(output, input.algorithmSuite)
	output = append(output, input.senderIdentity...)
	output = append(output, input.recipientIdentity...)
	output = append(output, input.recipientDevice...)
	if input.recipientDeviceKeyID != "" {
		output = appendPrefixedString(output, input.recipientDeviceKeyID)
	}
	output = append(output, input.ephemeralPublic...)
	output = append(output, kemHash[:]...)
	output = appendPrefixedString(output, input.messageID)
	output = appendTimestamp(output, input.timestampMillis)
	output = append(output, input.iv...)
	output = append(output, ciphertextHash[:]...)
	return output
}

func prefixedSize(value string) int {
	if value == "" {
		return 0
	}
	return 2 + len([]byte(value))
}

func appendPrefixedString(destination []byte, value string) []byte {
	encoded := []byte(value)
	var length [2]byte
	binary.BigEndian.PutUint16(length[:], uint16(len(encoded)))
	destination = append(destination, length[:]...)
	return append(destination, encoded...)
}

func appendTimestamp(destination []byte, timestamp int64) []byte {
	var encoded [8]byte
	binary.BigEndian.PutUint64(encoded[:], uint64(timestamp))
	return append(destination, encoded[:]...)
}

func combineHybridSecrets(x25519Secret, mlkemSecret []byte) []byte {
	output := make([]byte, 4+len(x25519Secret)+4+len(mlkemSecret))
	binary.BigEndian.PutUint32(output[0:4], uint32(len(x25519Secret)))
	copy(output[4:4+len(x25519Secret)], x25519Secret)
	offset := 4 + len(x25519Secret)
	binary.BigEndian.PutUint32(output[offset:offset+4], uint32(len(mlkemSecret)))
	copy(output[offset+4:], mlkemSecret)
	return output
}
