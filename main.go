package main

import (
	"embed"
	"log"
	"os"
	"path/filepath"

	"recap-cuid/cmd"

	"github.com/urfave/cli/v2"
)

var isProdBuild string

//go:embed database/migrations/*.sql
var migrations embed.FS

func main() {
	dir, err := os.UserHomeDir()

	if err != nil {
		log.Fatal(err)
	}

	appDir := filepath.Join(dir, ".sora-recap-cuid")

	if _, err := os.Stat(appDir); os.IsNotExist(err) {
		err = os.MkdirAll(appDir, os.ModePerm)

		if err != nil {
			log.Fatal(err)
		}
	}

	fullDbPath := filepath.Join(appDir, "participant-data.db")
	fullSettingsPath := filepath.Join(appDir, "settings.json")

	cmd.SetBuildFlag(isProdBuild == "y" || isProdBuild == "yes")
	cmd.SetFullDBPath(fullDbPath)
	cmd.SetDBMigrations(migrations)
	cmd.SetSettingsFile(fullSettingsPath)

	app := &cli.App{
		Name:  "recap-cuid",
		Usage: "sora recap cuid (card unique identifier) | Sebuah CLI app yang berfungsi untuk merekam dan merekap data kartu untuk menjadi pemilih tetap yang valid.",
		Commands: []*cli.Command{
			{
				Name:    "list",
				Aliases: []string{"l", "board", "b"},
				Usage:   "List semua pembaca kartu yang terhubung dengan perangkat ini.",
				Action:  cmd.ListAllBoard,
			},
			{
				Flags: []cli.Flag{
					&cli.IntFlag{
						Name:    "port",
						Aliases: []string{"p"},
						Value:   8080,
						Usage:   "Pada port berapa web berjalan",
					},

					&cli.StringFlag{
						Name:    "board-port",
						Aliases: []string{"board", "b"},
						Usage:   "Port pembaca kartu yang telah terdeteksi oleh perintah list",
					},

					&cli.IntFlag{
						Name:    "baud-rate",
						Aliases: []string{"rate", "r"},
						Value:   115200,
						Usage:   "Pada baud rate berapa pembaca kartu berjalan",
					},

					&cli.BoolFlag{
						Name:    "debug",
						Aliases: []string{"d"},
						Value:   false,
						Usage:   "Menjalankan program ini dalam mode debugging",
					},
				},
				Name:    "start",
				Aliases: []string{"s"},
				Usage:   "Menjalankan server dengan UI berbasis web untuk merekam dan merekap data peserta pemilihan.",
				Action:  cmd.StartWebServer,
			},
		},
	}

	if err := app.Run(os.Args); err != nil {
		log.Fatal(err)
	}
}
