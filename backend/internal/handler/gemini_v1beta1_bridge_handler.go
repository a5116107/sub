package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// GeminiV1Beta1Bridge bridges Amp-style Gemini v1beta1 paths to our standard v1beta handlers.
//
// AMP path examples:
//   - /publishers/google/models/gemini-3-pro-preview:streamGenerateContent
//   - /publishers/google/models (list)
//
// Standard handlers expect:
//   - POST /v1beta/models/{model}:{method}  (param: modelAction)
//   - GET  /v1beta/models                  (no params)
//   - GET  /v1beta/models/:model           (param: model)
func (h *GatewayHandler) GeminiV1Beta1Bridge(c *gin.Context) {
	path := c.Param("path")
	if strings.TrimSpace(path) == "" {
		googleError(c, http.StatusBadRequest, "Invalid Gemini API path format")
		return
	}

	const modelsPrefix = "/models/"
	method := strings.ToUpper(strings.TrimSpace(c.Request.Method))

	switch method {
	case http.MethodPost:
		if idx := strings.Index(path, modelsPrefix); idx >= 0 {
			actionPart := path[idx+len(modelsPrefix):]
			if actionPart == "" {
				googleError(c, http.StatusBadRequest, "Invalid Gemini API path format")
				return
			}
			if slash := strings.Index(actionPart, "/"); slash >= 0 {
				actionPart = actionPart[:slash]
			}
			if actionPart == "" {
				googleError(c, http.StatusBadRequest, "Invalid Gemini API path format")
				return
			}
			c.Params = append(c.Params, gin.Param{Key: "modelAction", Value: "/" + actionPart})
			h.GeminiV1BetaModels(c)
			return
		}

	case http.MethodGet:
		trimmed := strings.TrimSuffix(path, "/")
		if strings.HasSuffix(trimmed, "/models") && !strings.Contains(trimmed, modelsPrefix) {
			h.GeminiV1BetaListModels(c)
			return
		}
		if idx := strings.Index(path, modelsPrefix); idx >= 0 {
			modelPart := path[idx+len(modelsPrefix):]
			if modelPart == "" {
				googleError(c, http.StatusBadRequest, "Invalid Gemini API path format")
				return
			}
			if slash := strings.Index(modelPart, "/"); slash >= 0 {
				modelPart = modelPart[:slash]
			}
			if modelPart == "" {
				googleError(c, http.StatusBadRequest, "Invalid Gemini API path format")
				return
			}
			c.Params = append(c.Params, gin.Param{Key: "model", Value: modelPart})
			h.GeminiV1BetaGetModel(c)
			return
		}
	}

	googleError(c, http.StatusBadRequest, "Invalid Gemini API path format")
}
