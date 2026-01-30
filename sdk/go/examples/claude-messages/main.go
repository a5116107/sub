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
		model = "claude-3-5-sonnet-20241022"
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

	resp, err := gw.ClaudeMessages(ctx, &sub2api.ClaudeMessagesRequest{
		Model:     model,
		MaxTokens: 256,
		Messages: []sub2api.ClaudeMessage{
			{
				Role: "user",
				Content: []map[string]any{
					{"type": "text", "text": "Write a 1-sentence hello."},
				},
			},
		},
	})
	if err != nil {
		log.Fatalf("claude messages: %v", err)
	}

	fmt.Printf("model=%s\n", resp.Model)
	fmt.Printf("content=%v\n", resp.Content)
}
