package routes

import (
	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/handler"
	"github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/Wei-Shaw/sub2api/internal/service"

	"github.com/gin-gonic/gin"
)

// RegisterGatewayRoutes 注册 API 网关路由（Claude/OpenAI/Gemini 兼容）
func RegisterGatewayRoutes(
	r *gin.Engine,
	h *handler.Handlers,
	apiKeyAuth middleware.APIKeyAuthMiddleware,
	apiKeyService *service.APIKeyService,
	subscriptionService *service.SubscriptionService,
	opsService *service.OpsService,
	cfg *config.Config,
) {
	bodyLimit := middleware.RequestBodyLimit(cfg.Gateway.MaxBodySize)
	clientRequestID := middleware.ClientRequestID()
	opsErrorLogger := handler.OpsErrorLoggerMiddleware(opsService)

	// API网关（Claude API兼容）
	gateway := r.Group("/v1")
	gateway.Use(bodyLimit)
	gateway.Use(clientRequestID)
	gateway.Use(opsErrorLogger)
	gateway.Use(gin.HandlerFunc(apiKeyAuth))
	{
		gateway.POST("/messages", h.Gateway.Messages)
		gateway.POST("/messages/count_tokens", h.Gateway.CountTokens)
		gateway.GET("/models", h.Gateway.Models)
		gateway.GET("/usage", h.Gateway.Usage)
		// OpenAI Responses API
		gateway.POST("/responses", h.OpenAIGateway.Responses)
		// OpenAI Chat Completions / Completions compatibility
		gateway.POST("/chat/completions", h.OpenAIGateway.ChatCompletions)
		gateway.POST("/completions", h.OpenAIGateway.Completions)
	}

	// Gemini 原生 API 兼容层（Gemini SDK/CLI 直连）
	gemini := r.Group("/v1beta")
	gemini.Use(bodyLimit)
	gemini.Use(clientRequestID)
	gemini.Use(opsErrorLogger)
	gemini.Use(middleware.APIKeyAuthWithSubscriptionGoogle(apiKeyService, subscriptionService, cfg))
	{
		gemini.GET("/models", h.Gateway.GeminiV1BetaListModels)
		gemini.GET("/models/:model", h.Gateway.GeminiV1BetaGetModel)
		// Gin treats ":" as a param marker, but Gemini uses "{model}:{action}" in the same segment.
		gemini.POST("/models/*modelAction", h.Gateway.GeminiV1BetaModels)
	}

	// Gemini CLI v1internal endpoints (cloudcode-pa)
	// Supports POST /v1internal:{method} (Gin treats ":" as a param marker, so we bind it as a named param).
	r.POST(
		"/v1internal:method",
		bodyLimit,
		clientRequestID,
		opsErrorLogger,
		middleware.APIKeyAuthWithSubscriptionGoogle(apiKeyService, subscriptionService, cfg),
		h.Gateway.GeminiV1Internal,
	)

	// OpenAI Responses API（不带v1前缀的别名）
	r.POST("/responses", bodyLimit, clientRequestID, opsErrorLogger, gin.HandlerFunc(apiKeyAuth), h.OpenAIGateway.Responses)

	// Antigravity 模型列表
	r.GET("/antigravity/models", gin.HandlerFunc(apiKeyAuth), h.Gateway.AntigravityModels)

	// Antigravity 专用路由（仅使用 antigravity 账户，不混合调度）
	antigravityV1 := r.Group("/antigravity/v1")
	antigravityV1.Use(bodyLimit)
	antigravityV1.Use(clientRequestID)
	antigravityV1.Use(opsErrorLogger)
	antigravityV1.Use(middleware.ForcePlatform(service.PlatformAntigravity))
	antigravityV1.Use(gin.HandlerFunc(apiKeyAuth))
	{
		antigravityV1.POST("/messages", h.Gateway.Messages)
		antigravityV1.POST("/messages/count_tokens", h.Gateway.CountTokens)
		antigravityV1.GET("/models", h.Gateway.AntigravityModels)
		antigravityV1.GET("/usage", h.Gateway.Usage)
	}

	antigravityV1Beta := r.Group("/antigravity/v1beta")
	antigravityV1Beta.Use(bodyLimit)
	antigravityV1Beta.Use(clientRequestID)
	antigravityV1Beta.Use(opsErrorLogger)
	antigravityV1Beta.Use(middleware.ForcePlatform(service.PlatformAntigravity))
	antigravityV1Beta.Use(middleware.APIKeyAuthWithSubscriptionGoogle(apiKeyService, subscriptionService, cfg))
	{
		antigravityV1Beta.GET("/models", h.Gateway.GeminiV1BetaListModels)
		antigravityV1Beta.GET("/models/:model", h.Gateway.GeminiV1BetaGetModel)
		antigravityV1Beta.POST("/models/*modelAction", h.Gateway.GeminiV1BetaModels)
	}

	// Amp-style provider route aliases
	//
	// Examples:
	// - /api/provider/openai/v1/chat/completions -> /v1/chat/completions
	// - /api/provider/anthropic/v1/messages -> /v1/messages
	// - /api/provider/gemini/v1beta/models... -> /v1beta/models...
	provider := r.Group("/api/provider")
	provider.Use(bodyLimit)
	provider.Use(clientRequestID)
	provider.Use(opsErrorLogger)

	// OpenAI-compatible provider aliases
	providerOpenAI := provider.Group("/openai")
	providerOpenAI.Use(gin.HandlerFunc(apiKeyAuth))
	{
		// Root-level routes (for clients that omit /v1, e.g. some Amp flows)
		providerOpenAI.GET("/models", h.Gateway.Models)
		providerOpenAI.POST("/chat/completions", h.OpenAIGateway.ChatCompletions)
		providerOpenAI.POST("/completions", h.OpenAIGateway.Completions)
		providerOpenAI.POST("/responses", h.OpenAIGateway.Responses)

		openaiV1 := providerOpenAI.Group("/v1")
		openaiV1.GET("/models", h.Gateway.Models)
		openaiV1.POST("/responses", h.OpenAIGateway.Responses)
		openaiV1.POST("/chat/completions", h.OpenAIGateway.ChatCompletions)
		openaiV1.POST("/completions", h.OpenAIGateway.Completions)
	}

	// Anthropic-compatible provider aliases
	providerAnthropic := provider.Group("/anthropic")
	providerAnthropic.Use(gin.HandlerFunc(apiKeyAuth))
	{
		// Root-level routes (for clients that omit /v1)
		providerAnthropic.POST("/messages", h.Gateway.Messages)
		providerAnthropic.POST("/messages/count_tokens", h.Gateway.CountTokens)
		providerAnthropic.GET("/models", h.Gateway.Models)
		providerAnthropic.GET("/usage", h.Gateway.Usage)

		anthropicV1 := providerAnthropic.Group("/v1")
		anthropicV1.POST("/messages", h.Gateway.Messages)
		anthropicV1.POST("/messages/count_tokens", h.Gateway.CountTokens)
		anthropicV1.GET("/models", h.Gateway.Models)
		anthropicV1.GET("/usage", h.Gateway.Usage)
	}

	// Gemini provider aliases
	providerGemini := provider.Group("/gemini")
	providerGemini.Use(middleware.APIKeyAuthWithSubscriptionGoogle(apiKeyService, subscriptionService, cfg))
	{
		geminiV1Beta := providerGemini.Group("/v1beta")
		geminiV1Beta.GET("/models", h.Gateway.GeminiV1BetaListModels)
		geminiV1Beta.GET("/models/:model", h.Gateway.GeminiV1BetaGetModel)
		geminiV1Beta.POST("/models/*modelAction", h.Gateway.GeminiV1BetaModels)
	}

	// Google provider name alias (Amp commonly uses "google" for Gemini)
	providerGoogle := provider.Group("/google")
	providerGoogle.Use(middleware.APIKeyAuthWithSubscriptionGoogle(apiKeyService, subscriptionService, cfg))
	{
		googleV1Beta := providerGoogle.Group("/v1beta")
		googleV1Beta.GET("/models", h.Gateway.GeminiV1BetaListModels)
		googleV1Beta.GET("/models/:model", h.Gateway.GeminiV1BetaGetModel)
		googleV1Beta.POST("/models/*modelAction", h.Gateway.GeminiV1BetaModels)

		// Amp-style Gemini v1beta1 bridge (non-standard /publishers/google/models/... paths)
		providerGoogle.Any("/v1beta1/*path", h.Gateway.GeminiV1Beta1Bridge)
	}
}
