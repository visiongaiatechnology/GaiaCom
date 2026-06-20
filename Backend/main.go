package main

import (
	"log"
	"net/http"
	"time"

	"gaiacom/backend/config"
	"gaiacom/backend/database"
	"gaiacom/backend/repository"
)

func main() {
	cfg := config.LoadConfig()
	db := database.ConnectDB(cfg)
	defer db.Close()

	store := repository.NewSQLStore(db)

	address := "0.0.0.0:" + cfg.ServerPort
	server := &http.Server{
		Addr:              address,
		Handler:           SetupRoutes(store),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	log.Printf("Server startet auf %s", address)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server Error: %v", err)
	}
}
