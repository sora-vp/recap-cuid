package cmd

import (
  "fmt"
	"io/fs"
	"log"
	"net/http"
  "strconv"
  "time"
  "bufio"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
  "github.com/gofiber/fiber/v2/middleware/recover"
 	"github.com/valyala/fasthttp"
	"github.com/urfave/cli/v2"
	"go.bug.st/serial"

	"recap-cuid/web"
)

func StartWebServer(cCtx *cli.Context) error {
	serverPort := cCtx.Int("port")
	arduinoPort := cCtx.String("board-port")
	arduinoBaudRate := cCtx.Int("baud-rate")
	// isDebugMode = cCtx.Bool("debug")

	arduinoMode := &serial.Mode{
		BaudRate: arduinoBaudRate,
	}

	if len(arduinoPort) == 0 {
		fmt.Println("Mohon sebutkan pada port berapa pembaca kartu telah terhubung dengan perintah list.")
		return nil
	}

	// port, arduErr := serial.Open(arduinoPort, arduinoMode)
	_, arduErr := serial.Open(arduinoPort, arduinoMode)
	if arduErr != nil {
		fmt.Println("Gagal terhubung ke pembaca kartu:", arduErr)
		return nil
	}

	app := fiber.New()

	index, err := fs.Sub(ui.Index, "dist")
	if err != nil {
		panic(err)
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
	}

	for _, path := range uiPaths {
		app.Get(path, serveUI)
	}

  app.Get("/sse", func(c *fiber.Ctx) error {
		c.Set("Content-Type", "text/event-stream")
		c.Set("Cache-Control", "no-cache")
		c.Set("Connection", "keep-alive")
		c.Set("Transfer-Encoding", "chunked")

		c.Status(fiber.StatusOK).Context().SetBodyStreamWriter(fasthttp.StreamWriter(func(w *bufio.Writer) {
			for {
				msg := fmt.Sprintf("the time is %v",time.Now())
				fmt.Fprintf(w, "data: Message: %s\n\n", msg)

				err := w.Flush()
				if err != nil {
					fmt.Printf("Error while flushing: %v. Closing http connection.\n", err)

					break
				}
				time.Sleep(5 * time.Millisecond)
			}

		}))

		return nil
	})

  log.Fatal(app.Listen("127.0.0.1:" + strconv.Itoa(serverPort)))

	return nil
}
