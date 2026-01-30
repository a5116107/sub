package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/Wei-Shaw/sub2api/sdk/go/sub2api"
)

func main() {
	baseURL := os.Getenv("SUB2API_BASE_URL")
	apiKey := os.Getenv("SUB2API_API_KEY")
	model := os.Getenv("SUB2API_MODEL")
	if model == "" {
		model = "gemini-1.5-pro"
	}
	if baseURL == "" || apiKey == "" {
		log.Fatal("Required env vars: SUB2API_BASE_URL, SUB2API_API_KEY (optional: SUB2API_MODEL)")
	}

	client, err := sub2api.NewClient(baseURL)
	if err != nil {
		log.Fatalf("new client: %v", err)
	}
	gw := client.Gateway(apiKey)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	req := map[string]any{
		"contents": []any{
			map[string]any{
				"role": "user",
				"parts": []any{
					map[string]any{"text": "Say hello in one short sentence."},
				},
			},
		},
	}

	raw, err := gw.GeminiGenerateContent(ctx, model, req)
	if err != nil {
		log.Fatalf("gemini generateContent: %v", err)
	}
	fmt.Printf("response=%s\n", string(raw))
}
