package middleware

import (
	"errors"
	"strings"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
	"github.com/Wei-Shaw/sub2api/internal/pkg/googleapi"
	"github.com/Wei-Shaw/sub2api/internal/pkg/ip"
	"github.com/Wei-Shaw/sub2api/internal/service"

	"github.com/gin-gonic/gin"
)

// APIKeyAuthGoogle is a Google-style error wrapper for API key auth.
func APIKeyAuthGoogle(apiKeyService *service.APIKeyService, cfg *config.Config) gin.HandlerFunc {
	return APIKeyAuthWithSubscriptionGoogle(apiKeyService, nil, cfg)
}

// APIKeyAuthWithSubscriptionGoogle behaves like ApiKeyAuthWithSubscription but returns Google-style errors:
// {"error":{"code":401,"message":"...","status":"UNAUTHENTICATED"}}
//
// It is intended for Gemini native endpoints (/v1beta) to match Gemini SDK expectations.
func APIKeyAuthWithSubscriptionGoogle(apiKeyService *service.APIKeyService, subscriptionService *service.SubscriptionService, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if v := strings.TrimSpace(c.Query("api_key")); v != "" {
			abortWithGoogleError(c, 400, "Query parameter api_key is deprecated. Use Authorization header or key instead.")
			return
		}
		apiKeyString := extractAPIKeyForGoogle(c, cfg)
		if apiKeyString == "" {
			abortWithGoogleError(c, 401, "API key is required")
			return
		}

		apiKey, err := apiKeyService.GetByKey(c.Request.Context(), apiKeyString)
		if err != nil {
			if errors.Is(err, service.ErrAPIKeyNotFound) {
				abortWithGoogleError(c, 401, "Invalid API key")
				return
			}
			abortWithGoogleError(c, 500, "Failed to validate API key")
			return
		}

		if !apiKey.IsActive() {
			abortWithGoogleError(c, 401, "API key is disabled")
			return
		}

		// Enforce IP restrictions (allow/deny lists) to prevent bypass via Google-style endpoints.
		// Error message intentionally generic.
		if len(apiKey.IPWhitelist) > 0 || len(apiKey.IPBlacklist) > 0 {
			clientIP := ip.GetClientIP(c)
			allowed, _ := ip.CheckIPRestriction(clientIP, apiKey.IPWhitelist, apiKey.IPBlacklist)
			if !allowed {
				abortWithGoogleError(c, 403, "Access denied")
				return
			}
		}
		if apiKey.User == nil {
			abortWithGoogleError(c, 401, "User associated with API key not found")
			return
		}
		if !apiKey.User.IsActive() {
			abortWithGoogleError(c, 401, "User account is not active")
			return
		}

		// Disabled group must be enforced to prevent privilege bypass.
		if apiKey.Group != nil && !apiKey.Group.IsActive() {
			abortWithGoogleError(c, 403, "Group is disabled")
			return
		}

		// Enforce API key expiration
		if apiKey.ExpiresAt != nil && time.Now().After(*apiKey.ExpiresAt) {
			abortWithGoogleError(c, 401, "API key has expired")
			return
		}

		// Enforce API key quota limit (USD)
		if apiKey.QuotaLimitUSD != nil && apiKey.QuotaUsedUSD >= *apiKey.QuotaLimitUSD {
			abortWithGoogleError(c, 429, "API key quota limit exceeded")
			return
		}

		// Enforce AllowedGroups as runtime ACL (revocation must take effect promptly).
		//
		// For subscription-type groups, the active subscription is the entitlement source.
		// Requiring AllowedGroups here can incorrectly block paid subscribers. In simple mode we still
		// enforce AllowedGroups because subscription checks are skipped.
		if apiKey.Group != nil && (cfg.RunMode == config.RunModeSimple || !apiKey.Group.IsSubscriptionType()) && !apiKey.User.CanBindGroup(apiKey.Group.ID, apiKey.Group.IsExclusive) {
			abortWithGoogleError(c, 403, "Group is not allowed")
			return
		}

		// 简易模式：跳过余额和订阅检查
		if cfg.RunMode == config.RunModeSimple {
			c.Set(string(ContextKeyAPIKey), apiKey)
			c.Set(string(ContextKeyUser), AuthSubject{
				UserID:      apiKey.User.ID,
				Concurrency: computeSubjectConcurrency(apiKey.User.Concurrency, apiKey.Group),
			})
			c.Set(string(ContextKeyUserRole), apiKey.User.Role)
			setGroupContext(c, apiKey.Group)
			c.Next()
			return
		}

		isSubscriptionType := apiKey.Group != nil && apiKey.Group.IsSubscriptionType()
		subscriptionReady := false
		subscriptionFound := false
		if isSubscriptionType && apiKey.AllowSubscription && subscriptionService != nil {
			subscription, subErr := subscriptionService.GetActiveSubscription(
				c.Request.Context(),
				apiKey.User.ID,
				apiKey.Group.ID,
			)
			if subErr == nil {
				subscriptionFound = true
				if err := subscriptionService.ValidateSubscription(c.Request.Context(), subscription); err != nil {
					subErr = err
				} else {
					_ = subscriptionService.CheckAndActivateWindow(c.Request.Context(), subscription)
					_ = subscriptionService.CheckAndResetWindows(c.Request.Context(), subscription)
					if err := subscriptionService.CheckUsageLimits(c.Request.Context(), subscription, apiKey.Group, 0); err != nil {
						subErr = err
					} else {
						c.Set(string(ContextKeySubscription), subscription)
						subscriptionReady = true
					}
				}
			}
			if subErr != nil && !subscriptionReady {
				// If strict subscription is enabled and the user has an active subscription,
				// never fall back to balance.
				if subscriptionFound && apiKey.SubscriptionStrict {
					msg := infraerrors.Message(subErr)
					if msg == "" || msg == infraerrors.UnknownMessage {
						msg = subErr.Error()
					}
					abortWithGoogleError(c, infraerrors.Code(subErr), msg)
					return
				}
				if !apiKey.AllowBalance {
					msg := infraerrors.Message(subErr)
					if msg == "" || msg == infraerrors.UnknownMessage {
						msg = subErr.Error()
					}
					abortWithGoogleError(c, infraerrors.Code(subErr), msg)
					return
				}
			}
		}

		if !subscriptionReady {
			if !apiKey.AllowBalance {
				abortWithGoogleError(c, 403, "This API key is not allowed to use subscription quota or balance")
				return
			}
			if apiKey.User.Balance <= 0 {
				abortWithGoogleError(c, 403, "Insufficient account balance")
				return
			}
		}

		c.Set(string(ContextKeyAPIKey), apiKey)
		c.Set(string(ContextKeyUser), AuthSubject{
			UserID:      apiKey.User.ID,
			Concurrency: computeSubjectConcurrency(apiKey.User.Concurrency, apiKey.Group),
		})
		c.Set(string(ContextKeyUserRole), apiKey.User.Role)
		setGroupContext(c, apiKey.Group)
		c.Next()
	}
}

func extractAPIKeyForGoogle(c *gin.Context, cfg *config.Config) string {
	if key := strings.TrimSpace(c.GetHeader("x-goog-api-key")); key != "" {
		return key
	}

	authHeader := strings.TrimSpace(c.GetHeader("Authorization"))
	if authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
			if key := strings.TrimSpace(parts[1]); key != "" {
				return key
			}
		}
	}

	if key := strings.TrimSpace(c.GetHeader("x-api-key")); key != "" {
		return key
	}
	if allowGoogleQueryKey(cfg, c.Request.URL.Path) {
		if key := strings.TrimSpace(c.Query("key")); key != "" {
			return key
		}
	}
	return ""
}

func allowGoogleQueryKey(cfg *config.Config, path string) bool {
	if cfg == nil || !cfg.Gateway.AllowGoogleQueryKey {
		return false
	}
	return strings.HasPrefix(path, "/v1beta") ||
		strings.HasPrefix(path, "/antigravity/v1beta") ||
		strings.HasPrefix(path, "/v1internal") ||
		strings.HasPrefix(path, "/antigravity/v1internal")
}

func abortWithGoogleError(c *gin.Context, status int, message string) {
	c.JSON(status, gin.H{
		"error": gin.H{
			"code":    status,
			"message": message,
			"status":  googleapi.HTTPStatusToGoogleStatus(status),
		},
	})
	c.Abort()
}
