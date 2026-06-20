package config

import (
	"os"
)

type Config struct {
	ServerPort   string
	DBDriver     string // "postgres" oder "sqlite"
	DBHost       string
	DBUser       string
	DBPassword   string
	DBName       string
	DBPort       string
	DatabasePath string // HINZUGEFÜGT: Pfad zur SQLite Datei
}

func LoadConfig() *Config {
	return &Config{
		ServerPort: getEnv("SERVER_PORT", "8080"),
		// Standardmäßig SQLite für schnelles lokales Testen ohne Docker
		DBDriver:     getEnv("DB_DRIVER", "sqlite"),
		DBHost:       getEnv("DB_HOST", "localhost"),
		DBUser:       getEnv("DB_USER", "postgres"),
		DBPassword:   getEnv("DB_PASSWORD", "password"),
		DBName:       getEnv("DB_NAME", "gaiacom"),
		DBPort:       getEnv("DB_PORT", "5432"),
		DatabasePath: getEnv("DB_PATH", "gaiacom.db"), // HINZUGEFÜGT: Initialisierung
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
