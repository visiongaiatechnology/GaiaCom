// STATUS: DIAMANT VGT SUPREME
package main

import (
	"log"
	"os"

	backend "gaiacom/backend"
)

func main() {
	if err := backend.Execute(os.Args[1:], os.Stdout, os.Stderr); err != nil {
		log.Printf("Fatal server failure: %v", err)
		os.Exit(1)
	}
}
