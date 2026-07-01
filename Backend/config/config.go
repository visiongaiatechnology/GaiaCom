// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
package config

import (
	"log"
	"os"
	"strings"
)

type Config struct {
	ServerPort   string
	DBDriver     string // "postgres" oder "sqlite"
	DBHost       string
	DBUser       string
	DBPassword   string
	DBName       string
	DBPort       string
	DatabasePath string
}

func LoadConfig() *Config {
	dbDriver := getEnv("DB_DRIVER", "sqlite")
	dbPassword := getEnv("DB_PASSWORD", "")
	if !devMode() && dbDriver != "sqlite" && dbPassword == "" {
		log.Fatal("DB_PASSWORD must be set when DB_DRIVER is not sqlite")
	}

	return &Config{
		ServerPort:   getEnv("SERVER_PORT", "8080"),
		DBDriver:     dbDriver,
		DBHost:       getEnv("DB_HOST", "localhost"),
		DBUser:       getEnv("DB_USER", "postgres"),
		DBPassword:   dbPassword,
		DBName:       getEnv("DB_NAME", "gaiacom"),
		DBPort:       getEnv("DB_PORT", "5432"),
		DatabasePath: getEnv("DB_PATH", "gaiacom.db"),
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func devMode() bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv("GAIACOM_DEV_MODE")))
	return value == "1" || value == "true" || value == "yes"
}
