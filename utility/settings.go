package utility

import (
	"encoding/json"
	"errors"
	"os"
	"sync"
)

// Settings holds the global settings schema
type Settings struct {
	Author  string `json:"author"`
	Subpart string `json:"subpart"`
}

var (
	mu               sync.Mutex
	globalSettings   *Settings
	settingsFilePath string
)

func LoadSettings(filePath string) (*Settings, error) {
	mu.Lock()
	defer mu.Unlock()

	if filePath != "" {
		settingsFilePath = filePath
	} else {
		return nil, errors.New("tidak ada path file yang di sediakan")
	}

	if globalSettings != nil {
		return globalSettings, nil
	}

	file, err := os.Open(settingsFilePath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			// Create a new settings instance if the file does not exist
			globalSettings = &Settings{}
			return globalSettings, nil
		}
		return nil, err
	}
	defer file.Close()

	decoder := json.NewDecoder(file)
	globalSettings = &Settings{}
	err = decoder.Decode(globalSettings)
	if err != nil {
		return nil, err
	}

	return globalSettings, nil
}

func SaveSettings() error {
	mu.Lock()
	defer mu.Unlock()

	if globalSettings == nil {
		return errors.New("settings not initialized")
	}

	file, err := os.Create(settingsFilePath)
	if err != nil {
		return err
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	return encoder.Encode(globalSettings)
}

func UpdateSettings(author, subpart string) error {
	mu.Lock()

	if globalSettings == nil {
		globalSettings = &Settings{}
	}

	globalSettings.Author = author
	globalSettings.Subpart = subpart

	mu.Unlock()

	return SaveSettings()
}

func GetSettings() *Settings {
	mu.Lock()
	defer mu.Unlock()

	return globalSettings
}
