package admin

import (
	"io"
	"net/http"
	"strconv"
	"strings"

	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/service"

	"github.com/gin-gonic/gin"
)

type ModelPricingHandler struct {
	pricingService *service.PricingService
}

func NewModelPricingHandler(pricingService *service.PricingService) *ModelPricingHandler {
	return &ModelPricingHandler{pricingService: pricingService}
}

// GetStatus returns current pricing service status.
// GET /api/v1/admin/model-pricing/status
func (h *ModelPricingHandler) GetStatus(c *gin.Context) {
	if h == nil || h.pricingService == nil {
		response.ErrorFrom(c, infraerrors.InternalServer("PRICING_SERVICE_UNAVAILABLE", "pricing service unavailable"))
		return
	}
	status, err := h.pricingService.GetAdminStatus()
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, status)
}

// Download exports the current pricing JSON file.
// GET /api/v1/admin/model-pricing/download
func (h *ModelPricingHandler) Download(c *gin.Context) {
	if h == nil || h.pricingService == nil {
		response.ErrorFrom(c, infraerrors.InternalServer("PRICING_SERVICE_UNAVAILABLE", "pricing service unavailable"))
		return
	}

	data, err := h.pricingService.ExportPricingJSON()
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	c.Header("Content-Type", "application/json")
	c.Header("Content-Disposition", "attachment; filename=model_pricing.json")
	c.Data(http.StatusOK, "application/json", data)
}

type modelPricingOverrideRequest struct {
	Enabled bool `json:"enabled"`
}

// SetOverride enables/disables local override marker (disables remote auto-sync when enabled).
// PUT /api/v1/admin/model-pricing/override
func (h *ModelPricingHandler) SetOverride(c *gin.Context) {
	if h == nil || h.pricingService == nil {
		response.ErrorFrom(c, infraerrors.InternalServer("PRICING_SERVICE_UNAVAILABLE", "pricing service unavailable"))
		return
	}

	var req modelPricingOverrideRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorFrom(c, infraerrors.BadRequest("INVALID_REQUEST", "invalid request body").WithCause(err))
		return
	}

	if err := h.pricingService.SetOverrideEnabled(req.Enabled); err != nil {
		response.ErrorFrom(c, err)
		return
	}
	status, err := h.pricingService.GetAdminStatus()
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, status)
}

// Import uploads a pricing JSON file and applies it immediately.
// POST /api/v1/admin/model-pricing/import
//
// Accepts:
// - multipart/form-data with field name "file"
// - or raw JSON body
//
// Query:
// - override=true|false (default true)
func (h *ModelPricingHandler) Import(c *gin.Context) {
	if h == nil || h.pricingService == nil {
		response.ErrorFrom(c, infraerrors.InternalServer("PRICING_SERVICE_UNAVAILABLE", "pricing service unavailable"))
		return
	}

	override := true
	if v := strings.TrimSpace(c.Query("override")); v != "" {
		if parsed, err := strconv.ParseBool(v); err == nil {
			override = parsed
		}
	}

	const maxUploadBytes = 20 << 20 // 20 MiB

	var body []byte
	if fileHeader, err := c.FormFile("file"); err == nil && fileHeader != nil {
		f, err := fileHeader.Open()
		if err != nil {
			response.ErrorFrom(c, infraerrors.BadRequest("PRICING_IMPORT_FAILED", "failed to open uploaded file").WithCause(err))
			return
		}
		defer func() { _ = f.Close() }()
		body, err = io.ReadAll(io.LimitReader(f, maxUploadBytes))
		if err != nil {
			response.ErrorFrom(c, infraerrors.BadRequest("PRICING_IMPORT_FAILED", "failed to read uploaded file").WithCause(err))
			return
		}
	} else {
		raw, err := io.ReadAll(io.LimitReader(c.Request.Body, maxUploadBytes))
		if err != nil {
			response.ErrorFrom(c, infraerrors.BadRequest("PRICING_IMPORT_FAILED", "failed to read request body").WithCause(err))
			return
		}
		body = raw
	}

	status, err := h.pricingService.ImportPricingJSON(body, override)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, status)
}

type modelPricingSyncRequest struct {
	DisableOverride bool `json:"disable_override"`
}

// Sync triggers a remote pricing sync (download).
// POST /api/v1/admin/model-pricing/sync
//
// Body (optional):
// - disable_override: bool (default true)
func (h *ModelPricingHandler) Sync(c *gin.Context) {
	if h == nil || h.pricingService == nil {
		response.ErrorFrom(c, infraerrors.InternalServer("PRICING_SERVICE_UNAVAILABLE", "pricing service unavailable"))
		return
	}

	disableOverride := true
	if strings.TrimSpace(c.GetHeader("Content-Type")) == "application/json" {
		var req modelPricingSyncRequest
		if err := c.ShouldBindJSON(&req); err == nil {
			disableOverride = req.DisableOverride
		}
	}

	status, err := h.pricingService.SyncFromRemote(disableOverride)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, status)
}
