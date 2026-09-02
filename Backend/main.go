// STATUS: DIAMANT VGT SUPREME
package backend

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"gaiacom/backend/buildinfo"
	"gaiacom/backend/config"
	"gaiacom/backend/database"
	"gaiacom/backend/operations"
	"gaiacom/backend/provision"
	"gaiacom/backend/repository"
)

func Execute(arguments []string, stdout, stderr io.Writer) error {
	return execute(arguments, stdout, stderr)
}

func execute(arguments []string, stdout, stderr io.Writer) error {
	if len(arguments) == 0 {
		return run()
	}
	switch arguments[0] {
	case "setup":
		return runSetupCommand(arguments[1:], stdout, stderr)
	case "doctor":
		return runDoctorCommand(arguments[1:], stdout, stderr)
	case "version":
		info := buildinfo.Current()
		_, err := fmt.Fprintf(stdout, "GaiaCom %s protocol=%s commit=%s built=%s\n", info.Version, info.ProtocolVersion, info.Commit, info.BuiltAt)
		return err
	default:
		return fmt.Errorf("unknown command %q; expected setup, doctor, version, or no command", arguments[0])
	}
}

func runSetupCommand(arguments []string, stdout, stderr io.Writer) error {
	flags := flag.NewFlagSet("gaiacom setup", flag.ContinueOnError)
	flags.SetOutput(stderr)
	serverName := flags.String("server-name", "", "public fully-qualified node domain")
	configPath := flags.String("config", "/etc/gaiacom/gaiacom.env", "production environment file")
	databasePath := flags.String("db-path", "/var/lib/gaiacom/gaiacom.db", "SQLite database file")
	serverPort := flags.String("port", "8080", "backend listen port")
	if err := flags.Parse(arguments); err != nil {
		return err
	}
	if flags.NArg() != 0 {
		return errors.New("setup does not accept positional arguments")
	}
	result, err := provision.Setup(provision.SetupOptions{
		ServerName:   *serverName,
		ConfigPath:   *configPath,
		DatabasePath: *databasePath,
		ServerPort:   *serverPort,
	})
	if err != nil {
		return fmt.Errorf("setup failed: %w", err)
	}
	action := "verified"
	if result.Created {
		action = "created"
	}
	_, err = fmt.Fprintf(stdout, "Production configuration %s at %s; secrets were not printed.\n", action, result.ConfigPath)
	return err
}

func runDoctorCommand(arguments []string, stdout, stderr io.Writer) error {
	flags := flag.NewFlagSet("gaiacom doctor", flag.ContinueOnError)
	flags.SetOutput(stderr)
	configPath := flags.String("config", "/etc/gaiacom/gaiacom.env", "production environment file")
	if err := flags.Parse(arguments); err != nil {
		return err
	}
	if flags.NArg() != 0 {
		return errors.New("doctor does not accept positional arguments")
	}
	report, err := provision.Doctor(*configPath)
	if err != nil {
		return fmt.Errorf("doctor failed: %w", err)
	}
	_, err = fmt.Fprintf(stdout, "GaiaCom production configuration is healthy (%d checks): %s\n", len(report.Checks), report.ConfigPath)
	return err
}

func run() error {
	if !routesDevMode() && !buildinfo.IsRelease() {
		return errors.New("production binary is missing immutable release metadata")
	}
	rootContext, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	cfg, err := config.LoadConfig()
	if err != nil {
		return fmt.Errorf("load configuration: %w", err)
	}
	db, err := database.ConnectDB(cfg)
	if err != nil {
		return fmt.Errorf("initialize database: %w", err)
	}
	defer db.Close()

	store := repository.NewSQLStore(db)
	monitor := operations.NewMonitor(store, cfg.MetricsToken)
	handler, err := SetupRoutesWithOperations(rootContext, store, monitor)
	if err != nil {
		return fmt.Errorf("initialize HTTP routes: %w", err)
	}

	address := net.JoinHostPort(cfg.ServerBindAddress, cfg.ServerPort)
	server := &http.Server{
		Addr:              address,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       120 * time.Second,
		MaxHeaderBytes:    32 * 1024,
		BaseContext: func(_ net.Listener) context.Context {
			return rootContext
		},
	}

	log.Printf("Server startet auf %s", address)
	monitor.SetReady(true)
	serverErrors := make(chan error, 1)
	go func() {
		serverErrors <- server.ListenAndServe()
	}()

	select {
	case <-rootContext.Done():
		monitor.SetReady(false)
		log.Printf("Shutdown signal received")
	case err := <-serverErrors:
		monitor.SetReady(false)
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			return fmt.Errorf("server listener failed: %w", err)
		}
		stop()
	}

	shutdownContext, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownContext); err != nil {
		_ = server.Close()
		return fmt.Errorf("graceful shutdown failed: %w", err)
	}
	return nil
}
