// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package uuid

import (
	"crypto/rand"
	"database/sql/driver"
	"encoding/hex"
	"errors"
	"fmt"
)

type UUID [16]byte

var Nil UUID

func New() UUID {
	var value UUID
	if _, err := rand.Read(value[:]); err != nil {
		panic("uuid entropy failure")
	}
	value[6] = (value[6] & 0x0f) | 0x40
	value[8] = (value[8] & 0x3f) | 0x80
	return value
}

func Parse(input string) (UUID, error) {
	var value UUID
	if len(input) != 36 {
		return Nil, errors.New("invalid uuid length")
	}
	if input[8] != '-' || input[13] != '-' || input[18] != '-' || input[23] != '-' {
		return Nil, errors.New("invalid uuid format")
	}

	compact := make([]byte, 32)
	offset := 0
	for i := 0; i < len(input); i++ {
		if input[i] == '-' {
			continue
		}
		if offset >= len(compact) {
			return Nil, errors.New("invalid uuid format")
		}
		compact[offset] = input[i]
		offset++
	}
	if offset != len(compact) {
		return Nil, errors.New("invalid uuid format")
	}

	if _, err := hex.Decode(value[:], compact); err != nil {
		return Nil, err
	}
	return value, nil
}

func (u UUID) String() string {
	var buf [36]byte
	hex.Encode(buf[0:8], u[0:4])
	buf[8] = '-'
	hex.Encode(buf[9:13], u[4:6])
	buf[13] = '-'
	hex.Encode(buf[14:18], u[6:8])
	buf[18] = '-'
	hex.Encode(buf[19:23], u[8:10])
	buf[23] = '-'
	hex.Encode(buf[24:36], u[10:16])
	return string(buf[:])
}

func (u UUID) MarshalText() ([]byte, error) {
	return []byte(u.String()), nil
}

func (u *UUID) UnmarshalText(text []byte) error {
	parsed, err := Parse(string(text))
	if err != nil {
		return err
	}
	*u = parsed
	return nil
}

func (u UUID) MarshalJSON() ([]byte, error) {
	out := make([]byte, 0, 38)
	out = append(out, '"')
	out = append(out, u.String()...)
	out = append(out, '"')
	return out, nil
}

func (u *UUID) UnmarshalJSON(data []byte) error {
	if len(data) != 38 || data[0] != '"' || data[len(data)-1] != '"' {
		return errors.New("invalid uuid json value")
	}
	return u.UnmarshalText(data[1 : len(data)-1])
}

func (u UUID) Value() (driver.Value, error) {
	if u == Nil {
		return nil, nil
	}
	return u.String(), nil
}

func (u *UUID) Scan(value interface{}) error {
	if value == nil {
		*u = Nil
		return nil
	}

	switch typed := value.(type) {
	case string:
		parsed, err := Parse(typed)
		if err != nil {
			return err
		}
		*u = parsed
		return nil
	case []byte:
		parsed, err := Parse(string(typed))
		if err != nil {
			return err
		}
		*u = parsed
		return nil
	default:
		return fmt.Errorf("cannot scan uuid from %T", value)
	}
}
