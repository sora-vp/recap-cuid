package main

import (
	"log"
	"os"

	"github.com/urfave/cli/v2"
	"recap-cuid/cmd"
)

func main() {
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
