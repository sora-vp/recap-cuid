package cmd

import (
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/urfave/cli/v2"
	"go.bug.st/serial"

	ui "recap-cuid/web"
)

var isDebugMode = false
var incomingMessage = ""
var isProduction bool
var dbFullPath string

func SetBuildFlag(status bool) {
	isProduction = status
}

func SetFullDBPath(path string) {
	dbFullPath = path
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

	arduinoMode := &serial.Mode{
		BaudRate: arduinoBaudRate,
	}

	buff := make([]byte, 32)

	if len(arduinoPort) == 0 {
		fmt.Println("Mohon sebutkan pada port berapa pembaca kartu telah terhubung dengan perintah list.")
		return nil
	}

	port, arduErr := serial.Open(arduinoPort, arduinoMode)
	if arduErr != nil {
		fmt.Println("Gagal terhubung ke pembaca kartu:", arduErr)
		return nil
	}

	emitter := NewEventEmitter()

	go func() {
		app := fiber.New()
		dataChan := make(chan string)

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

		log.Fatal(app.Listen("127.0.0.1:" + strconv.Itoa(serverPort)))
	}()

	for {
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

	return nil
}
