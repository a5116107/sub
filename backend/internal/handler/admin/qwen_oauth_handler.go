package admin

import (
	"strconv"
	"strings"

	"github.com/Wei-Shaw/sub2api/internal/handler/dto"
	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/service"

	"github.com/gin-gonic/gin"
)

// QwenOAuthHandler handles Qwen OAuth device flow onboarding and token refresh.
type QwenOAuthHandler struct {
	qwenOAuthService *service.QwenOAuthService
	adminService     service.AdminService
}

func NewQwenOAuthHandler(qwenOAuthService *service.QwenOAuthService, adminService service.AdminService) *QwenOAuthHandler {
	return &QwenOAuthHandler{
		qwenOAuthService: qwenOAuthService,
		adminService:     adminService,
	}
}

type QwenStartDeviceFlowRequest struct {
	ProxyID *int64 `json:"proxy_id"`
}

// StartDeviceFlow starts a Qwen OAuth device flow session.
// POST /api/v1/admin/qwen/device/start
func (h *QwenOAuthHandler) StartDeviceFlow(c *gin.Context) {
	var req QwenStartDeviceFlowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// Allow empty body
		req = QwenStartDeviceFlowRequest{}
	}

	result, err := h.qwenOAuthService.StartDeviceFlow(c.Request.Context(), req.ProxyID)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	response.Success(c, result)
}

type QwenPollDeviceFlowRequest struct {
	SessionID string `json:"session_id" binding:"required"`
}

// PollDeviceFlowToken polls for the Qwen OAuth device flow token once.
// Clients should call this repeatedly until authorization completes.
// POST /api/v1/admin/qwen/device/poll
func (h *QwenOAuthHandler) PollDeviceFlowToken(c *gin.Context) {
	var req QwenPollDeviceFlowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}

	tokenInfo, err := h.qwenOAuthService.PollDeviceFlowToken(c.Request.Context(), req.SessionID)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	response.Success(c, tokenInfo)
}

type QwenRefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
	ProxyID      *int64 `json:"proxy_id"`
}

// RefreshToken refreshes a Qwen OAuth token using a refresh token (manual helper).
// POST /api/v1/admin/qwen/refresh-token
func (h *QwenOAuthHandler) RefreshToken(c *gin.Context) {
	var req QwenRefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}

	var proxyURL string
	if req.ProxyID != nil {
		proxy, err := h.adminService.GetProxy(c.Request.Context(), *req.ProxyID)
		if err == nil && proxy != nil {
			proxyURL = proxy.URL()
		}
	}

	tokenInfo, err := h.qwenOAuthService.RefreshToken(c.Request.Context(), req.RefreshToken, proxyURL)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	response.Success(c, tokenInfo)
}

// RefreshAccountToken refreshes token for a specific Qwen account.
// POST /api/v1/admin/qwen/accounts/:id/refresh
func (h *QwenOAuthHandler) RefreshAccountToken(c *gin.Context) {
	accountID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "Invalid account ID")
		return
	}

	account, err := h.adminService.GetAccount(c.Request.Context(), accountID)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	if account.Platform != service.PlatformQwen {
		response.BadRequest(c, "Account is not a Qwen account")
		return
	}
	if account.Type != service.AccountTypeOAuth {
		response.BadRequest(c, "Cannot refresh non-OAuth account credentials")
		return
	}

	tokenInfo, err := h.qwenOAuthService.RefreshAccountToken(c.Request.Context(), account)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	newCredentials := h.qwenOAuthService.BuildAccountCredentials(tokenInfo)
	for k, v := range account.Credentials {
		if _, exists := newCredentials[k]; !exists {
			newCredentials[k] = v
		}
	}

	updatedAccount, err := h.adminService.UpdateAccount(c.Request.Context(), accountID, &service.UpdateAccountInput{
		Credentials: newCredentials,
	})
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	response.Success(c, dto.AccountFromService(updatedAccount))
}

type QwenCreateAccountFromDeviceFlowRequest struct {
	SessionID   string  `json:"session_id" binding:"required"`
	Name        string  `json:"name"`
	ProxyID     *int64  `json:"proxy_id"`
	Concurrency int     `json:"concurrency"`
	Priority    int     `json:"priority"`
	GroupIDs    []int64 `json:"group_ids"`
}

// CreateAccountFromDeviceFlow completes the device flow (single poll) and creates a Qwen OAuth account.
// POST /api/v1/admin/qwen/create-from-device
func (h *QwenOAuthHandler) CreateAccountFromDeviceFlow(c *gin.Context) {
	var req QwenCreateAccountFromDeviceFlowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}

	tokenInfo, err := h.qwenOAuthService.PollDeviceFlowToken(c.Request.Context(), req.SessionID)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	credentials := h.qwenOAuthService.BuildAccountCredentials(tokenInfo)

	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = "Qwen OAuth Account"
	}

	account, err := h.adminService.CreateAccount(c.Request.Context(), &service.CreateAccountInput{
		Name:        name,
		Platform:    service.PlatformQwen,
		Type:        service.AccountTypeOAuth,
		Credentials: credentials,
		ProxyID:     req.ProxyID,
		Concurrency: req.Concurrency,
		Priority:    req.Priority,
		GroupIDs:    req.GroupIDs,
	})
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	response.Success(c, dto.AccountFromService(account))
}
