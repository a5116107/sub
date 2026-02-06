package handler

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestPaymentWebhooks_BodyTooLarge_Returns413(t *testing.T) {
	gin.SetMode(gin.TestMode)

	limit := int64(64)
	router := gin.New()
	router.Use(middleware.RequestBodyLimit(limit))

	h := &PaymentHandler{paymentService: nil}
	router.POST("/paypal", h.PayPalWebhook)
	router.POST("/creem", h.CreemWebhook)

	payload := bytes.Repeat([]byte("a"), int(limit)+1)

	req := httptest.NewRequest(http.MethodPost, "/paypal", bytes.NewReader(payload))
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	require.Equal(t, http.StatusRequestEntityTooLarge, rec.Code)
	require.Contains(t, rec.Body.String(), buildBodyTooLargeMessage(limit))

	req2 := httptest.NewRequest(http.MethodPost, "/creem", bytes.NewReader(payload))
	rec2 := httptest.NewRecorder()
	router.ServeHTTP(rec2, req2)
	require.Equal(t, http.StatusRequestEntityTooLarge, rec2.Code)
	require.Contains(t, rec2.Body.String(), buildBodyTooLargeMessage(limit))
}
