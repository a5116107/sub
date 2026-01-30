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

type settingRepoStub struct {
	values map[string]string
}

func (s *settingRepoStub) Get(ctx context.Context, key string) (*service.Setting, error) {
	return nil, nil
}

func (s *settingRepoStub) GetValue(ctx context.Context, key string) (string, error) {
	if s.values == nil {
		return "", nil
	}
	return s.values[key], nil
}

func (s *settingRepoStub) Set(ctx context.Context, key, value string) error {
	if s.values == nil {
		s.values = map[string]string{}
	}
	s.values[key] = value
	return nil
}

func (s *settingRepoStub) GetMultiple(ctx context.Context, keys []string) (map[string]string, error) {
	out := map[string]string{}
	for _, k := range keys {
		out[k] = ""
		if s.values != nil {
			out[k] = s.values[k]
		}
	}
	return out, nil
}

func (s *settingRepoStub) SetMultiple(ctx context.Context, settings map[string]string) error {
	if s.values == nil {
		s.values = map[string]string{}
	}
	for k, v := range settings {
		s.values[k] = v
	}
	return nil
}

func (s *settingRepoStub) GetAll(ctx context.Context) (map[string]string, error) {
	if s.values == nil {
		return map[string]string{}, nil
	}
	out := map[string]string{}
	for k, v := range s.values {
		out[k] = v
	}
	return out, nil
}

func (s *settingRepoStub) Delete(ctx context.Context, key string) error {
	if s.values != nil {
		delete(s.values, key)
	}
	return nil
}

func TestSettingHandler_AdminAPIKeyManagement_RequiresJWT(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)

	repo := &settingRepoStub{}
	settingService := service.NewSettingService(repo, nil)
	h := NewSettingHandler(settingService, nil, nil, nil)

	t.Run("GetAdminAPIKey forbidden for admin_api_key auth", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/admin/settings/admin-api-key", nil)
		c.Set("auth_method", "admin_api_key")

		h.GetAdminAPIKey(c)

		require.Equal(t, http.StatusForbidden, w.Code)
		var resp response.Response
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
		require.Equal(t, http.StatusForbidden, resp.Code)
	})

	t.Run("RegenerateAdminAPIKey forbidden for admin_api_key auth", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/admin/settings/admin-api-key/regenerate", nil)
		c.Set("auth_method", "admin_api_key")

		h.RegenerateAdminAPIKey(c)

		require.Equal(t, http.StatusForbidden, w.Code)
	})

	t.Run("DeleteAdminAPIKey forbidden for admin_api_key auth", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodDelete, "/api/v1/admin/settings/admin-api-key", nil)
		c.Set("auth_method", "admin_api_key")

		h.DeleteAdminAPIKey(c)

		require.Equal(t, http.StatusForbidden, w.Code)
	})

	t.Run("Admin API key management works with jwt auth", func(t *testing.T) {
		repo.values = map[string]string{service.SettingKeyAdminAPIKey: "admin-abcdef"}

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/admin/settings/admin-api-key", nil)
		c.Set("auth_method", "jwt")
		h.GetAdminAPIKey(c)
		require.Equal(t, http.StatusOK, w.Code)

		w2 := httptest.NewRecorder()
		c2, _ := gin.CreateTestContext(w2)
		c2.Request = httptest.NewRequest(http.MethodPost, "/api/v1/admin/settings/admin-api-key/regenerate", nil)
		c2.Set("auth_method", "jwt")
		h.RegenerateAdminAPIKey(c2)
		require.Equal(t, http.StatusOK, w2.Code)

		w3 := httptest.NewRecorder()
		c3, _ := gin.CreateTestContext(w3)
		c3.Request = httptest.NewRequest(http.MethodDelete, "/api/v1/admin/settings/admin-api-key", nil)
		c3.Set("auth_method", "jwt")
		h.DeleteAdminAPIKey(c3)
		require.Equal(t, http.StatusOK, w3.Code)
	})
}
