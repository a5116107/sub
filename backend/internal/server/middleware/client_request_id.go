package middleware

import (
	"context"
	"strings"

	"github.com/Wei-Shaw/sub2api/internal/pkg/ctxkey"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	clientRequestIDHeaderOut = "X-Client-Request-Id"
	maxClientRequestIDLen    = 128
)

func sanitizeClientRequestID(v string) string {
	v = strings.TrimSpace(v)
	if v == "" {
		return ""
	}
	if len(v) > maxClientRequestIDLen {
		return ""
	}
	// Reject header injection and control chars.
	for _, r := range v {
		if r == '\r' || r == '\n' || r == 0 {
			return ""
		}
		if r < 0x20 || r == 0x7f {
			return ""
		}
	}
	return v
}

func extractClientProvidedRequestID(c *gin.Context) string {
	if c == nil {
		return ""
	}
	// Priority order: prefer explicit client correlation/idempotency headers.
	for _, key := range []string{
		"X-Client-Request-Id",
		"X-Request-Id",
		"X-Request-ID",
		"Idempotency-Key",
		"X-Idempotency-Key",
	} {
		if v := sanitizeClientRequestID(c.GetHeader(key)); v != "" {
			return v
		}
	}
	return ""
}

// ClientRequestID ensures every request has a unique client_request_id in request.Context().
//
// This is used by the Ops monitoring module for end-to-end request correlation.
func ClientRequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request == nil {
			c.Next()
			return
		}

		if v := c.Request.Context().Value(ctxkey.ClientRequestID); v != nil {
			c.Next()
			return
		}

		provided := false
		id := extractClientProvidedRequestID(c)
		if id == "" {
			id = uuid.New().String()
		} else {
			provided = true
		}

		ctx := context.WithValue(c.Request.Context(), ctxkey.ClientRequestID, id)
		ctx = context.WithValue(ctx, ctxkey.ClientRequestIDProvided, provided)
		c.Request = c.Request.WithContext(ctx)

		// Expose correlation id to clients without clobbering upstream X-Request-Id.
		c.Writer.Header().Set(clientRequestIDHeaderOut, id)
		c.Next()
	}
}
