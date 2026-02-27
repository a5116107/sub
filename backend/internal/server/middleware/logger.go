package middleware

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/pkg/ctxkey"
	"github.com/Wei-Shaw/sub2api/internal/pkg/ip"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

// Logger 请求日志中间件
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()

		method := ""
		path := ""
		if c.Request != nil {
			method = c.Request.Method
			if c.Request.URL != nil {
				path = c.Request.URL.Path
			}
		}

		c.Next()

		latency := time.Since(startTime)
		statusCode := c.Writer.Status()
		route := strings.TrimSpace(c.FullPath())
		if route == "" {
			route = path
		}

		clientIP := strings.TrimSpace(ip.GetClientIP(c))
		userAgent := strings.TrimSpace(c.GetHeader("User-Agent"))
		upstreamRequestID := strings.TrimSpace(c.Writer.Header().Get("x-request-id"))

		clientRequestID := ""
		clientRequestIDProvided := false
		ctx := context.Background()
		if c.Request != nil {
			ctx = c.Request.Context()
			if v, ok := ctx.Value(ctxkey.ClientRequestID).(string); ok {
				clientRequestID = strings.TrimSpace(v)
			}
			if v, ok := ctx.Value(ctxkey.ClientRequestIDProvided).(bool); ok {
				clientRequestIDProvided = v
			}
		}

		bytesIn := int64(-1)
		if c.Request != nil {
			bytesIn = c.Request.ContentLength
		}
		bytesOut := c.Writer.Size()

		var upstreamErrorCount int
		var upstreamLastKind string
		var upstreamLastStatus int
		var upstreamLastAccountID int64
		var upstreamLastPlatform string
		var upstreamLastMessage string
		if v, ok := c.Get(service.OpsUpstreamErrorsKey); ok {
			if arr, ok := v.([]*service.OpsUpstreamErrorEvent); ok && len(arr) > 0 {
				upstreamErrorCount = len(arr)
				if last := arr[len(arr)-1]; last != nil {
					upstreamLastKind = strings.TrimSpace(last.Kind)
					upstreamLastStatus = last.UpstreamStatusCode
					upstreamLastAccountID = last.AccountID
					upstreamLastPlatform = strings.TrimSpace(last.Platform)
					upstreamLastMessage = truncateLogString(last.Message, 256)
				}
			}
		}

		attrs := []slog.Attr{
			slog.String("method", method),
			slog.String("path", path),
			slog.String("route", route),
			slog.Int("status", statusCode),
			slog.Int64("latency_ms", latency.Milliseconds()),
		}
		if clientIP != "" {
			attrs = append(attrs, slog.String("client_ip", clientIP))
		}
		if userAgent != "" {
			attrs = append(attrs, slog.String("user_agent", truncateLogString(userAgent, 256)))
		}
		if clientRequestID != "" {
			attrs = append(attrs,
				slog.String("client_request_id", clientRequestID),
				slog.Bool("client_request_id_provided", clientRequestIDProvided),
			)
		}
		if upstreamRequestID != "" {
			attrs = append(attrs, slog.String("upstream_request_id", upstreamRequestID))
		}
		if bytesIn >= 0 {
			attrs = append(attrs, slog.Int64("bytes_in", bytesIn))
		}
		if bytesOut >= 0 {
			attrs = append(attrs, slog.Int("bytes_out", bytesOut))
		}
		if upstreamErrorCount > 0 {
			attrs = append(attrs, slog.Int("upstream_error_count", upstreamErrorCount))
			if upstreamLastKind != "" {
				attrs = append(attrs, slog.String("upstream_last_kind", upstreamLastKind))
			}
			if upstreamLastPlatform != "" {
				attrs = append(attrs, slog.String("upstream_last_platform", upstreamLastPlatform))
			}
			if upstreamLastAccountID > 0 {
				attrs = append(attrs, slog.Int64("upstream_last_account_id", upstreamLastAccountID))
			}
			if upstreamLastStatus > 0 {
				attrs = append(attrs, slog.Int("upstream_last_status", upstreamLastStatus))
			}
			if upstreamLastMessage != "" {
				attrs = append(attrs, slog.String("upstream_last_message", upstreamLastMessage))
			}
		}

		if apiKey, ok := GetAPIKeyFromContext(c); ok && apiKey != nil {
			attrs = append(attrs, slog.Int64("api_key_id", apiKey.ID))
			if apiKey.UserID > 0 {
				attrs = append(attrs, slog.Int64("user_id", apiKey.UserID))
			}
			if apiKey.GroupID != nil && *apiKey.GroupID > 0 {
				attrs = append(attrs, slog.Int64("group_id", *apiKey.GroupID))
			}
		} else if subject, ok := GetAuthSubjectFromContext(c); ok && subject.UserID > 0 {
			attrs = append(attrs, slog.Int64("user_id", subject.UserID))
		}
		if len(c.Errors) > 0 {
			attrs = append(attrs, slog.Int("gin_error_count", len(c.Errors)))
			if errStr := strings.TrimSpace(c.Errors.String()); errStr != "" {
				attrs = append(attrs, slog.String("gin_errors", truncateLogString(errStr, 512)))
			}
		}

		level := slog.LevelInfo
		if statusCode >= 500 {
			level = slog.LevelWarn
		} else if statusCode >= 400 {
			level = slog.LevelInfo
		}
		slog.LogAttrs(ctx, level, "http_request", attrs...)
	}
}

func truncateLogString(s string, max int) string {
	s = strings.TrimSpace(s)
	if s == "" || max <= 0 {
		return s
	}
	r := []rune(s)
	if len(r) <= max {
		return s
	}
	return string(r[:max]) + "…"
}
