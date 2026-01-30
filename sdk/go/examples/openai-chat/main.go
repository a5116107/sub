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
		model = "gpt-4o-mini"
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

	resp, err := gw.ChatCompletions(ctx, &sub2api.OpenAIChatCompletionsRequest{
		Model: model,
		Messages: []sub2api.OpenAIChatMessage{
			{Role: "user", Content: "Say hello in one sentence."},
		},
	})
	if err != nil {
		log.Fatalf("chat completions: %v", err)
	}

	if len(resp.Choices) == 0 {
		log.Fatal("no choices returned")
	}
	fmt.Printf("model=%s\n", resp.Model)
	fmt.Printf("reply=%v\n", resp.Choices[0].Message.Content)
}
