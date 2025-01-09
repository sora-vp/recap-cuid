package cmd

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/sqlite"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/urfave/cli/v2"
	"go.bug.st/serial"
	_ "modernc.org/sqlite"

	dataScheme "recap-cuid/db"
	"recap-cuid/utility"
	ui "recap-cuid/web"
)

var (
	isDebugMode     = false
	incomingMessage = ""
	isProduction    bool
	dbFullPath      string

	dbMigrations embed.FS
	settingsPath string
)

func SetBuildFlag(status bool) {
	isProduction = status
}

func SetFullDBPath(path string) {
	dbFullPath = path
}

func SetDBMigrations(migrationsFS embed.FS) {
	dbMigrations = migrationsFS
}

func SetSettingsFile(path string) {
	settingsPath = path
}

// EventEmitter is a simple event emitter.
type EventEmitter struct {
	listeners map[string][]chan string
	mu        sync.Mutex
}

// NewEventEmitter creates a new EventEmitter.
func NewEventEmitter() *EventEmitter {
	return &EventEmitter{
		listeners: make(map[string][]chan string),
	}
}

// On registers a listener for an event.
func (e *EventEmitter) On(event string, ch chan string) {
	e.mu.Lock()

	defer e.mu.Unlock()

	e.listeners[event] = append(e.listeners[event], ch)
}

// Off removes a listener for an event.
func (e *EventEmitter) Off(event string, ch chan string) {
	e.mu.Lock()

	defer e.mu.Unlock()

	listeners := e.listeners[event]

	for i, listener := range listeners {
		if listener == ch {
			e.listeners[event] = append(listeners[:i], listeners[i+1:]...)
			break
		}
	}
}

// Emit emits an event to all listeners.
func (e *EventEmitter) Emit(event string, msg string) {
	e.mu.Lock()

	defer e.mu.Unlock()

	for _, ch := range e.listeners[event] {
		select {
		case ch <- msg:
		default:
		}
	}
}

var hasActiveConnection bool
var activeConnectionMu sync.Mutex

// Function to set the active connection status
func setActiveConnection(status bool) bool {
	activeConnectionMu.Lock()
	defer activeConnectionMu.Unlock()

	if hasActiveConnection && status {
		// If there's already an active connection and we're trying to set a new one
		return false
	}

	// Update the status
	hasActiveConnection = status
	return true
}

func StartWebServer(cCtx *cli.Context) error {
	serverPort := cCtx.Int("port")
	arduinoPort := cCtx.String("board-port")
	arduinoBaudRate := cCtx.Int("baud-rate")
	isDebugMode = cCtx.Bool("debug")

	formattedDBPath := fmt.Sprintf("file:%s?cache=shared&mode=rwc", dbFullPath)

	db, err := sql.Open("sqlite", formattedDBPath)
	if err != nil {
		log.Fatal(err.Error())
	}
	defer db.Close()

	source, err := iofs.New(dbMigrations, "database/migrations")
	if err != nil {
		log.Fatalf("Could not create migration source: %v", err)
	}

	// Create a SQLite driver instance
	driver, err := sqlite.WithInstance(db, &sqlite.Config{})
	if err != nil {
		log.Fatalf("Could not create SQLite driver: %v", err)
	}

	// Run migrations
	m, err := migrate.NewWithInstance(
		"iofs", source, "sqlite", driver,
	)
	if err != nil {
		log.Fatalf("Could not initialize migration: %v", err)
	}

	// Apply migrations
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		log.Fatalf("Migration failed: %v", err)
	}

	queries := dataScheme.New(db)

	_, err = utility.LoadSettings(settingsPath)
	if err != nil {
		log.Fatalf("Failed to load settings: %v", err)
	}

	arduinoMode := &serial.Mode{
		BaudRate: arduinoBaudRate,
	}

	if len(arduinoPort) == 0 {
		fmt.Println("Mohon sebutkan pada port berapa pembaca kartu telah terhubung dengan perintah list.")
		return nil
	}

	port, arduErr := serial.Open(arduinoPort, arduinoMode)
	if arduErr != nil {
		fmt.Println("Gagal terhubung ke pembaca kartu:", arduErr)
		return nil
	}
	defer port.Close()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	app := fiber.New()
	defer app.Shutdown()

	dataChan := make(chan string)
	emitter := NewEventEmitter()

	go func() {
		index, err := fs.Sub(ui.Index, "dist")
		if err != nil {
			panic(err)
		}

		if !isProduction {
			app.Use(cors.New())
		}

		app.Use(recover.New())

		app.Use("/", filesystem.New(filesystem.Config{
			Root:   http.FS(index),
			Index:  "index.html",
			Browse: false,
		}))

		serveUI := func(ctx *fiber.Ctx) error {
			return filesystem.SendFile(ctx, http.FS(index), "index.html")
		}

		uiPaths := []string{
			"/",
			"/recap",
			"/settings",
		}

		for _, path := range uiPaths {
			app.Get(path, serveUI)
		}

		app.Get("/ws", func(c *fiber.Ctx) error {
			if !setActiveConnection(true) {
				fmt.Println("Connection already active")
				return c.Status(fiber.StatusTooManyRequests).SendString("Another connection is already active.")
			}

			return websocket.New(func(conn *websocket.Conn) {
				defer func() {
					setActiveConnection(false)
					conn.Close()

					if isDebugMode {
						fmt.Println("WebSocket client disconnected")
					}
				}()

				emitter.On("instruction", dataChan)

				for {
					select {
					case <-ctx.Done():
						return
					case dataFromMachine := <-dataChan:
						message := fmt.Sprint(dataFromMachine)
						if err := conn.WriteMessage(websocket.TextMessage, []byte(message)); err != nil {
							if isDebugMode {
								fmt.Println("WebSocket write error:", err)
							}

							return
						}
					}
				}
			})(c)
		})

		app.Get("/api/get-participant/:cuid", func(c *fiber.Ctx) error {
			cuid := c.Params("cuid")

			if len(cuid) < 4 || len(cuid) > 28 {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"success": false,
					"message": "CUID harus memiliki panjang minimal 4 dan maksimal 28 karakter",
				})
			}

			participant, err := queries.GetSpecificParticipant(ctx, cuid)

			if err != nil {
				if err == sql.ErrNoRows {
					return c.Status(fiber.StatusOK).JSON(fiber.Map{
						"success": true,
						"exists":  false,
					})
				}

				log.Printf("[DB-ERROR]: %v", err)

				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"success": false,
					"message": "Internal server error",
				})
			}

			if participant.Name == "" && participant.Subpart == "" {
				return c.Status(fiber.StatusOK).JSON(fiber.Map{
					"success": true,
					"exists":  false,
				})
			}

			return c.Status(fiber.StatusOK).JSON(fiber.Map{
				"success": true,
				"exists":  true,
				"data":    participant,
			})
		})
		app.Post("/api/insert-participant", func(c *fiber.Ctx) error {
			c.Accepts("application/json")

			payload := struct {
				Name    string `json:"name"`
				Cuid    string `json:"cuid"`
				Subpart string `json:"subpart"`
			}{}

			if err := c.BodyParser(&payload); err != nil {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"success": false,
					"message": "Mohon perhatikan kembali susunan data yang anda kirim.",
				})
			}

			if err := queries.InsertNewParticipant(ctx, dataScheme.InsertNewParticipantParams{
				Cuid:    payload.Cuid,
				Name:    payload.Name,
				Subpart: payload.Subpart,
			}); err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"success": false,
					"message": "Terjadi masalah pada database saat menambahkan data, coba lagi nanti.",
				})
			}

			return c.Status(fiber.StatusOK).JSON(fiber.Map{
				"success": true,
			})
		})
		app.Get("/api/get-participants", func(c *fiber.Ctx) error {
			participants, err := queries.ListAllParticipants(ctx)

			if err != nil {
				if err == sql.ErrNoRows {
					return c.Status(fiber.StatusOK).JSON([]string{})
				}

				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"success": false,
					"message": "Terjadi masalah pada database saat menambahkan data, coba lagi nanti.",
				})
			}

			return c.Status(fiber.StatusOK).JSON(participants)
		})
		app.Delete("/api/remove-participant/:cuid", func(c *fiber.Ctx) error {
			cuid := c.Params("cuid")

			if len(cuid) < 4 || len(cuid) > 28 {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"success": false,
					"message": "CUID harus memiliki panjang minimal 4 dan maksimal 28 karakter",
				})
			}

			participant, err := queries.GetSpecificParticipant(ctx, cuid)

			if err != nil {
				if err == sql.ErrNoRows {
					return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
						"success": false,
						"message": "Peserta tidak dapat ditemukan.",
					})
				}

				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"success": false,
					"message": "Terjadi masalah pada database saat menghapus data, mohon coba lagi nanti (step: 1).",
				})
			}

			if participant.Name == "" || participant.Subpart == "" {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
					"success": false,
					"message": "Peserta tidak dapat di verifikasi.",
				})
			}

			if err := queries.DeleteSpecificParticipant(ctx, cuid); err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"success": false,
					"message": "Terjadi masalah pada database saat menghapus data, mohon coba lagi nanti (step: 2).",
				})
			}

			return c.Status(fiber.StatusOK).JSON(fiber.Map{
				"success": true,
				"message": "Berhasil menghapus peserta dengan CUID: " + cuid,
			})
		})

		app.Get("/api/get-settings", func(c *fiber.Ctx) error {
			settings := utility.GetSettings()

			return c.Status(fiber.StatusOK).JSON(fiber.Map{
				"author":  settings.Author,
				"subpart": settings.Subpart,
			})
		})

		app.Put("/api/update-settings", func(c *fiber.Ctx) error {
			c.Accepts("application/json")

			payload := struct {
				Author  string `json:"author"`
				Subpart string `json:"subpart"`
			}{}

			if err := c.BodyParser(&payload); err != nil {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"success": false,
					"message": "Mohon perhatikan kembali susunan data yang anda kirim.",
				})
			}

			if payload.Author == "" || payload.Subpart == "" {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"success": false,
					"message": "Mohon perhatikan kembali data yang anda kirim.",
				})
			}

			if err = utility.UpdateSettings(payload.Author, payload.Subpart); err != nil {
				log.Printf("Failed to update settings: %v", err)

				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"success": false,
					"message": "Gagal dalam mengubah data, mohon coba lagi nanti.",
				})
			}

			return c.Status(fiber.StatusOK).JSON(fiber.Map{
				"success": true,
			})
		})

		log.Fatal(app.Listen(fmt.Sprintf("127.0.0.1:%d", serverPort)))
	}()

	buff := make([]byte, 32)
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			default:
				n, err := port.Read(buff)

				if err != nil {
					log.Fatal("Error reading data:", err)
					break
				}

				incomingData := strings.TrimSpace(string(buff[:n]))

				if strings.EqualFold(incomingData, "") {
					continue
				}

				if isDebugMode {
					dt := time.Now()
					fmt.Println("[", dt.Format(time.StampMilli), "]", incomingData)
				}

				// Implement start bit with < and the > character as a stop bit.
				// Ensuring stable and consistent data without normalizer.
				for i := 0; i < len(incomingData); i++ {
					char := string(incomingData[i])

					if char == "<" {
						incomingMessage = ""
					} else if char == ">" {
						if isDebugMode {
							dt := time.Now()
							fmt.Println("[", dt.Format(time.StampMilli), "]", incomingMessage)
						}

						// Emit the normalized keybind message to WebSocket clients
						if strings.HasPrefix(incomingMessage, "SORA-") {
							emitter.Emit("instruction", incomingMessage)
						}

						// Reset value
						incomingMessage = ""
					} else {
						incomingMessage += char
					}
				}
			}
		}
	}()

	<-ctx.Done()
	log.Println("Shutting down gracefully...")
	return nil
}
