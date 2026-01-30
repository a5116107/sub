package routes

import (
	"github.com/Wei-Shaw/sub2api/internal/handler"
	"github.com/Wei-Shaw/sub2api/internal/server/middleware"

	"github.com/gin-gonic/gin"
)

// RegisterPaymentRoutes registers payment related routes.
// Webhook endpoints are public (signature-verified).
// User endpoints require JWT auth.
func RegisterPaymentRoutes(v1 *gin.RouterGroup, h *handler.Handlers, jwtAuth middleware.JWTAuthMiddleware) {
	// Public webhooks
	webhooks := v1.Group("/payments/webhooks")
	{
		webhooks.POST("/paypal", h.Payment.PayPalWebhook)
		webhooks.POST("/creem", h.Payment.CreemWebhook)
		webhooks.GET("/epay", h.Payment.EPayWebhook)
		webhooks.POST("/epay", h.Payment.EPayWebhook)
	}

	// Authenticated endpoints
	authenticated := v1.Group("")
	authenticated.Use(gin.HandlerFunc(jwtAuth))
	{
		authenticated.GET("/payments/providers", h.Payment.ListProviders)
		authenticated.POST("/payments/orders", h.Payment.CreateTopUp)
		authenticated.GET("/payments/orders/:id", h.Payment.GetOrder)
	}
}
