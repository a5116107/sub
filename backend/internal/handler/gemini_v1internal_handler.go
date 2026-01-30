package handler

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/pkg/ctxkey"
	"github.com/Wei-Shaw/sub2api/internal/pkg/ip"
	"github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/Wei-Shaw/sub2api/internal/service/payloadrules"

	"github.com/gin-gonic/gin"
)

var geminiV1InternalAllowlist = map[string]struct{}{
	"generateContent":       {},
	"streamGenerateContent": {},
	"fetchAvailableModels":  {},
}

// GeminiV1Internal proxies Gemini Code Assist (cloudcode-pa) endpoints:
// POST /v1internal:{method}
func (h *GatewayHandler) GeminiV1Internal(c *gin.Context) {
	apiKey, ok := middleware.GetAPIKeyFromContext(c)
	if !ok || apiKey == nil {
		googleError(c, http.StatusUnauthorized, "Invalid API key")
		return
	}
	authSubject, ok := middleware.GetAuthSubjectFromContext(c)
	if !ok {
		googleError(c, http.StatusInternalServerError, "User context not found")
		return
	}

	// Only allow on Gemini groups (no mixed scheduling for v1internal).
	if apiKey.Group == nil || apiKey.Group.Platform != service.PlatformGemini {
		googleError(c, http.StatusBadRequest, "API key group platform is not gemini")
		return
	}

	method := strings.TrimSpace(c.Param("method"))
	method = strings.TrimPrefix(method, "/")
	method = strings.TrimPrefix(method, ":")
	method = strings.TrimSpace(method)
	if method == "" {
		googleError(c, http.StatusNotFound, "Missing method in URL")
		return
	}
	if _, allowed := geminiV1InternalAllowlist[method]; !allowed {
		googleError(c, http.StatusNotFound, "Unsupported method: "+method)
		return
	}
	stream := method == "streamGenerateContent"

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		if maxErr, ok := extractMaxBytesError(err); ok {
			googleError(c, http.StatusRequestEntityTooLarge, buildBodyTooLargeMessage(maxErr.Limit))
			return
		}
		googleError(c, http.StatusBadRequest, "Failed to read request body")
		return
	}
	if len(body) == 0 {
		googleError(c, http.StatusBadRequest, "Request body is empty")
		return
	}

	var parsed struct {
		Model   string `json:"model"`
		Request struct {
			SessionID string `json:"sessionId"`
		} `json:"request"`
	}
	_ = json.Unmarshal(body, &parsed)
	modelName := strings.TrimSpace(parsed.Model)
	sessionID := strings.TrimSpace(parsed.Request.SessionID)

	setOpsRequestContext(c, modelName, stream, body)

	// Get subscription (may be nil)
	subscription, _ := middleware.GetSubscriptionFromContext(c)

	// For Gemini native/CodeAssist API, do not send Claude-style ping frames.
	geminiConcurrency := NewConcurrencyHelper(h.concurrencyHelper.concurrencyService, SSEPingFormatNone, 0)

	// 0) wait queue check
	maxWait := service.CalculateMaxWait(authSubject.Concurrency)
	canWait, err := geminiConcurrency.IncrementWaitCount(c.Request.Context(), authSubject.UserID, maxWait)
	waitCounted := false
	if err != nil {
		log.Printf("Increment wait count failed: %v", err)
	} else if !canWait {
		googleError(c, http.StatusTooManyRequests, "Too many pending requests, please retry later")
		return
	}
	if err == nil && canWait {
		waitCounted = true
	}
	defer func() {
		if waitCounted {
			geminiConcurrency.DecrementWaitCount(c.Request.Context(), authSubject.UserID)
		}
	}()

	// 1) user concurrency slot
	streamStarted := false
	userReleaseFunc, err := geminiConcurrency.AcquireUserSlotWithWait(c, authSubject.UserID, authSubject.Concurrency, stream, &streamStarted)
	if err != nil {
		googleError(c, http.StatusTooManyRequests, err.Error())
		return
	}
	if waitCounted {
		geminiConcurrency.DecrementWaitCount(c.Request.Context(), authSubject.UserID)
		waitCounted = false
	}
	userReleaseFunc = wrapReleaseOnDone(c.Request.Context(), userReleaseFunc)
	if userReleaseFunc != nil {
		defer userReleaseFunc()
	}

	// 2) sticky session (optional, based on request.sessionId)
	sessionKey := ""
	if sessionID != "" {
		sessionKey = "gemini_internal:" + sessionID
	}

	// Apply generic payload rules (safe subset) before billing reservation, so reservation reflects the final payload.
	if h.payloadRulesEngine != nil && h.payloadRulesEngine.HasRules() {
		mutated, stats := h.payloadRulesEngine.Apply(payloadrules.ApplyInput{
			Protocol: payloadrules.ProtocolGeminiV1Internal,
			Path:     c.Request.URL.Path,
			Model:    modelName,
			Payload:  body,
		})
		if h.payloadRulesStats != nil {
			h.payloadRulesStats.Record(stats)
		}
		if stats.Changed {
			var updated struct {
				Model string `json:"model"`
			}
			_ = json.Unmarshal(mutated, &updated)
			updatedModel := strings.TrimSpace(updated.Model)
			if updatedModel == "" {
				log.Printf("[PayloadRules] v1internal: mutated payload missing model; ignored (path=%s model=%s)", c.Request.URL.Path, modelName)
			} else {
				body = mutated
				modelName = updatedModel
				setOpsRequestContext(c, modelName, stream, body)
			}
		}
	}

	// 3) billing eligibility check (after wait)
	reserveUSD := 0.0
	if apiKey.Group != nil && apiKey.Group.IsSubscriptionType() && subscription != nil {
		estimated, err := h.gatewayService.EstimateSubscriptionReservationUSD(modelName, body, service.SubscriptionReserveGemini)
		if err != nil {
			log.Printf("Estimate subscription reservation failed: %v", err)
			googleError(c, http.StatusServiceUnavailable, "Billing service temporarily unavailable. Please retry later.")
			return
		}
		reserveUSD = estimated
		if h.gatewayService.ApplyRateMultiplierToSubscription() {
			multiplier := apiKey.Group.RateMultiplier
			if multiplier <= 0 {
				multiplier = 1.0
			}
			reserveUSD = reserveUSD * multiplier
		}
	}

	reservation, err := h.billingCacheService.CheckBillingEligibilityAndReserve(c.Request.Context(), apiKey.User, apiKey, apiKey.Group, subscription, reserveUSD)
	released := false
	defer func() {
		if reservation == nil || released {
			return
		}
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		_ = h.billingCacheService.FinalizeSubscriptionReservation(ctx, reservation.UserID, reservation.GroupID, reservation.AmountUSD, 0)
	}()

	if err != nil {
		status, _, message := billingErrorDetails(err)
		googleError(c, status, message)
		return
	}

	maxAccountSwitches := h.maxAccountSwitchesGemini
	switchCount := 0
	excludedAccountIDs := make(map[int64]struct{})
	lastFailoverStatus := 0

	for {
		selection, err := h.gatewayService.SelectAccountWithLoadAwareness(c.Request.Context(), apiKey.GroupID, sessionKey, modelName, excludedAccountIDs, "")
		if err != nil {
			if switchCount == 0 {
				googleError(c, http.StatusServiceUnavailable, "No available Gemini Code Assist accounts: "+err.Error())
				return
			}
			handleGeminiFailoverExhausted(c, lastFailoverStatus)
			return
		}
		account := selection.Account
		if account == nil {
			googleError(c, http.StatusServiceUnavailable, "No available Gemini accounts")
			return
		}

		// Only allow Gemini OAuth accounts with project_id (Code Assist).
		if account.Platform != service.PlatformGemini || account.Type != service.AccountTypeOAuth || strings.TrimSpace(account.GetCredential("project_id")) == "" {
			if selection.ReleaseFunc != nil {
				selection.ReleaseFunc()
			}
			excludedAccountIDs[account.ID] = struct{}{}
			continue
		}

		setOpsSelectedAccount(c, account.ID)

		// 4) account concurrency slot
		accountReleaseFunc := selection.ReleaseFunc
		if !selection.Acquired {
			if selection.WaitPlan == nil {
				googleError(c, http.StatusServiceUnavailable, "No available Gemini accounts")
				return
			}
			accountWaitCounted := false
			canWait, err := geminiConcurrency.IncrementAccountWaitCount(c.Request.Context(), account.ID, selection.WaitPlan.MaxWaiting)
			if err != nil {
				log.Printf("Increment account wait count failed: %v", err)
			} else if !canWait {
				log.Printf("Account wait queue full: account=%d", account.ID)
				googleError(c, http.StatusTooManyRequests, "Too many pending requests, please retry later")
				return
			}
			if err == nil && canWait {
				accountWaitCounted = true
			}
			defer func() {
				if accountWaitCounted {
					geminiConcurrency.DecrementAccountWaitCount(c.Request.Context(), account.ID)
				}
			}()

			accountReleaseFunc, err = geminiConcurrency.AcquireAccountSlotWithWaitTimeout(
				c,
				account.ID,
				selection.WaitPlan.MaxConcurrency,
				selection.WaitPlan.Timeout,
				stream,
				&streamStarted,
			)
			if err != nil {
				googleError(c, http.StatusTooManyRequests, err.Error())
				return
			}
			if accountWaitCounted {
				geminiConcurrency.DecrementAccountWaitCount(c.Request.Context(), account.ID)
				accountWaitCounted = false
			}
			if err := h.gatewayService.BindStickySession(c.Request.Context(), apiKey.GroupID, sessionKey, account.ID); err != nil {
				log.Printf("Bind sticky session failed: %v", err)
			}
		}
		accountReleaseFunc = wrapReleaseOnDone(c.Request.Context(), accountReleaseFunc)

		// 5) forward
		result, err := h.geminiCompatService.ForwardV1Internal(c.Request.Context(), c, account, method, stream, body)
		if accountReleaseFunc != nil {
			accountReleaseFunc()
		}
		if err != nil {
			var failoverErr *service.UpstreamFailoverError
			if errors.As(err, &failoverErr) {
				excludedAccountIDs[account.ID] = struct{}{}
				if switchCount >= maxAccountSwitches {
					lastFailoverStatus = failoverErr.StatusCode
					handleGeminiFailoverExhausted(c, lastFailoverStatus)
					return
				}
				lastFailoverStatus = failoverErr.StatusCode
				switchCount++
				log.Printf("Gemini v1internal account %d: upstream error %d, switching account %d/%d", account.ID, failoverErr.StatusCode, switchCount, maxAccountSwitches)
				continue
			}
			// ForwardV1Internal already wrote the response
			log.Printf("Gemini v1internal forward failed: %v", err)
			return
		}

		// Capture request info for async logging (avoid accessing gin.Context in goroutine).
		userAgent := c.GetHeader("User-Agent")
		clientIP := ip.GetClientIP(c)

		// 6) record usage async
		clientRequestID, _ := c.Request.Context().Value(ctxkey.ClientRequestID).(string)
		reservedUSD := 0.0
		if reservation != nil {
			reservedUSD = reservation.AmountUSD
			released = true
		}
		go func(result *service.ForwardResult, usedAccount *service.Account, ua, ip, clientRequestID string, reservedUSD float64) {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			if strings.TrimSpace(clientRequestID) != "" {
				ctx = context.WithValue(ctx, ctxkey.ClientRequestID, strings.TrimSpace(clientRequestID))
			}
			if err := h.gatewayService.RecordUsage(ctx, &service.RecordUsageInput{
				Result:       result,
				APIKey:       apiKey,
				User:         apiKey.User,
				Account:      usedAccount,
				Subscription: subscription,
				UserAgent:    ua,
				IPAddress:    ip,
				ReservedUSD:  reservedUSD,
			}); err != nil {
				log.Printf("Record usage failed: %v", err)
			}
		}(result, account, userAgent, clientIP, clientRequestID, reservedUSD)
		return
	}
}
