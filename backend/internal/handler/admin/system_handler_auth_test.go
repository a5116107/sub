package admin

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

type updateServiceStub struct {
	updateCalled   bool
	rollbackCalled bool
}

func (s *updateServiceStub) CheckUpdate(ctx context.Context, force bool) (*service.UpdateInfo, error) {
	return &service.UpdateInfo{CurrentVersion: "v0.0.0"}, nil
}

func (s *updateServiceStub) PerformUpdate(ctx context.Context) error {
	s.updateCalled = true
	return nil
}

func (s *updateServiceStub) Rollback() error {
	s.rollbackCalled = true
	return nil
}

func TestSystemHandler_SystemOps_RequireJWT(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)

	stub := &updateServiceStub{}
	h := &SystemHandler{updateSvc: stub, restartSvc: func() {}}

	t.Run("PerformUpdate forbidden for admin_api_key auth", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/admin/system/update", nil)
		c.Set("auth_method", "admin_api_key")

		h.PerformUpdate(c)

		require.Equal(t, http.StatusForbidden, w.Code)
		require.False(t, stub.updateCalled)
	})

	t.Run("Rollback forbidden for admin_api_key auth", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/admin/system/rollback", nil)
		c.Set("auth_method", "admin_api_key")

		h.Rollback(c)

		require.Equal(t, http.StatusForbidden, w.Code)
		require.False(t, stub.rollbackCalled)
	})

	t.Run("Restart forbidden for admin_api_key auth", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/admin/system/restart", nil)
		c.Set("auth_method", "admin_api_key")

		h.RestartService(c)

		require.Equal(t, http.StatusForbidden, w.Code)
	})

	t.Run("PerformUpdate ok for jwt auth", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/admin/system/update", nil)
		c.Set("auth_method", "jwt")

		h.PerformUpdate(c)

		require.Equal(t, http.StatusOK, w.Code)
		require.True(t, stub.updateCalled)

		var resp response.Response
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
		require.Equal(t, 0, resp.Code)
	})
}
