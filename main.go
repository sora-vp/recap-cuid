package main

import (
	"io/fs"
	"log"
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
  "github.com/gofiber/fiber/v2/middleware/recover"
	"recap-cuid/web"
)

func main() {
	app := fiber.New()
  app.Use(recover.New())

	index, err := fs.Sub(ui.Index, "dist")
	if err != nil {
		panic(err)
	}

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

	log.Fatal(app.Listen(":8080"))
}
