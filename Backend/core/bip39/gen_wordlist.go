// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
//go:build ignore

package main

import (
	"fmt"
	"io"
	"net/http"
	"strings"
)

func main() {
	resp, err := http.Get("https://raw.githubusercontent.com/bitcoin/bips/master/bip-0039/english.txt")
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		panic(err)
	}

	words := strings.Fields(string(body))
	if len(words) != 2048 {
		panic(fmt.Sprintf("expected 2048 words, got %d", len(words)))
	}

	fmt.Println("package bip39")
	fmt.Println()
	fmt.Println("// englishWordlist is the complete BIP-39 English word list (2048 words).")
	fmt.Println("// Source: https://github.com/bitcoin/bips/blob/master/bip-0039/english.txt")
	fmt.Println("var englishWordlist = [2048]string{")
	for i := 0; i < 2048; i += 8 {
		end := i + 8
		if end > 2048 {
			end = 2048
		}
		group := words[i:end]
		quoted := make([]string, len(group))
		for j, w := range group {
			quoted[j] = fmt.Sprintf("%q", w)
		}
		fmt.Printf("\t%s,\n", strings.Join(quoted, ", "))
	}
	fmt.Println("}")
}
