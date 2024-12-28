package cmd

import (
	"fmt"

	"github.com/urfave/cli/v2"
	"go.bug.st/serial"
)

func ListAllBoard(ctx *cli.Context) error {
	ports, err := serial.GetPortsList()

	if err != nil {
		return err
	}

	if len(ports) == 0 {
		fmt.Println("Tidak ada papan yang terhubung!")

		return nil
	}

	fmt.Print("Berhasil menemukan beberapa papan!\n\n")

	for _, port := range ports {
		fmt.Printf("- Port: %v\n", port)
	}

	return nil
}
