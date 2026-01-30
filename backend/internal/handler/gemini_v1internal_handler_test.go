package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/Wei-Shaw/sub2api/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

type googleErrorResponse struct {
	Error struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Status  string `json:"status"`
	} `json:"error"`
}

func TestGeminiV1Internal_UnsupportedMethod(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()

	apiKey := &service.APIKey{
		ID:     1,
		Key:    "k",
		Status: service.StatusActive,
		User: &service.User{
			ID:          10,
			Status:      service.StatusActive,
			Balance:     1,
			Concurrency: 1,
		},
		Group: &service.Group{
			ID:       2,
			Name:     "g",
			Status:   service.StatusActive,
			Platform: service.PlatformGemini,
			Hydrated: true,
		},
	}
	apiKey.GroupID = &apiKey.Group.ID

	r.Use(func(c *gin.Context) {
		c.Set(string(middleware.ContextKeyAPIKey), apiKey)
		c.Set(string(middleware.ContextKeyUser), middleware.AuthSubject{UserID: apiKey.User.ID, Concurrency: apiKey.User.Concurrency})
		c.Next()
	})

	h := &GatewayHandler{}
	r.POST("/v1internal:method", h.GeminiV1Internal)

	req := httptest.NewRequest(http.MethodPost, "/v1internal:unknown", strings.NewReader(`{}`))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	require.Equal(t, http.StatusNotFound, rec.Code)

	var resp googleErrorResponse
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	require.Equal(t, http.StatusNotFound, resp.Error.Code)
	require.Contains(t, resp.Error.Message, "Unsupported method")
}
