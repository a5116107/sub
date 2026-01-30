package admin

import (
	"context"
	"net/http"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/pkg/sysutil"
	"github.com/Wei-Shaw/sub2api/internal/service"

	"github.com/gin-gonic/gin"
)

type systemUpdateService interface {
	CheckUpdate(ctx context.Context, force bool) (*service.UpdateInfo, error)
	PerformUpdate(ctx context.Context) error
	Rollback() error
}

// SystemHandler handles system-related operations
type SystemHandler struct {
	updateSvc  systemUpdateService
	restartSvc func()
}

// NewSystemHandler creates a new SystemHandler
func NewSystemHandler(updateSvc *service.UpdateService) *SystemHandler {
	return &SystemHandler{
		updateSvc:  updateSvc,
		restartSvc: sysutil.RestartServiceAsync,
	}
}

// GetVersion returns the current version
// GET /api/v1/admin/system/version
func (h *SystemHandler) GetVersion(c *gin.Context) {
	info, _ := h.updateSvc.CheckUpdate(c.Request.Context(), false)
	response.Success(c, gin.H{
		"version": info.CurrentVersion,
	})
}

// CheckUpdates checks for available updates
// GET /api/v1/admin/system/check-updates
func (h *SystemHandler) CheckUpdates(c *gin.Context) {
	force := c.Query("force") == "true"
	info, err := h.updateSvc.CheckUpdate(c.Request.Context(), force)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(c, info)
}

// PerformUpdate downloads and applies the update
// POST /api/v1/admin/system/update
func (h *SystemHandler) PerformUpdate(c *gin.Context) {
	if !requireAdminJWT(c, "System update") {
		return
	}
	if err := h.updateSvc.PerformUpdate(c.Request.Context()); err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(c, gin.H{
		"message":      "Update completed. Please restart the service.",
		"need_restart": true,
	})
}

// Rollback restores the previous version
// POST /api/v1/admin/system/rollback
func (h *SystemHandler) Rollback(c *gin.Context) {
	if !requireAdminJWT(c, "System rollback") {
		return
	}
	if err := h.updateSvc.Rollback(); err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(c, gin.H{
		"message":      "Rollback completed. Please restart the service.",
		"need_restart": true,
	})
}

// RestartService restarts the systemd service
// POST /api/v1/admin/system/restart
func (h *SystemHandler) RestartService(c *gin.Context) {
	if !requireAdminJWT(c, "System restart") {
		return
	}
	// Schedule service restart in background after sending response
	// This ensures the client receives the success response before the service restarts
	restartSvc := h.restartSvc
	if restartSvc == nil {
		restartSvc = sysutil.RestartServiceAsync
	}
	go func() {
		// Wait a moment to ensure the response is sent
		time.Sleep(500 * time.Millisecond)
		restartSvc()
	}()

	response.Success(c, gin.H{
		"message": "Service restart initiated",
	})
}
