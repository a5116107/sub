package service

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	mathrand "math/rand"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync/atomic"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/pkg/antigravity"
	"github.com/Wei-Shaw/sub2api/internal/pkg/ctxkey"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	antigravityStickySessionTTL  = time.Hour
	antigravityDefaultMaxRetries = 5
	antigravityRetryBaseDelay    = 1 * time.Second
	antigravityRetryMaxDelay     = 16 * time.Second
)

// upstreamHopByHopHeaders 透传请求头时需要排除的 hop-by-hop 头
var upstreamHopByHopHeaders = map[string]bool{
	"connection":          true,
	"keep-alive":          true,
	"proxy-authenticate":  true,
	"proxy-authorization": true,
	"proxy-connection":    true,
	"te":                  true,
	"trailer":             true,
	"transfer-encoding":   true,
	"upgrade":             true,
	"host":                true,
	"content-length":      true,
}

const (
	antigravityMaxRetriesEnv            = "GATEWAY_ANTIGRAVITY_MAX_RETRIES"
	antigravityMaxRetriesAfterSwitchEnv = "GATEWAY_ANTIGRAVITY_AFTER_SWITCHMAX_RETRIES"
	antigravityMaxRetriesAfterSwitchAlt = "GATEWAY_ANTIGRAVITY_AFTER_SWITCH_MAX_RETRIES"
	antigravityMaxRetriesClaudeEnv      = "GATEWAY_ANTIGRAVITY_MAX_RETRIES_CLAUDE"
	antigravityMaxRetriesGeminiTextEnv  = "GATEWAY_ANTIGRAVITY_MAX_RETRIES_GEMINI_TEXT"
	antigravityMaxRetriesGeminiImageEnv = "GATEWAY_ANTIGRAVITY_MAX_RETRIES_GEMINI_IMAGE"
	antigravityScopeRateLimitEnv        = "GATEWAY_ANTIGRAVITY_429_SCOPE_LIMIT"
	antigravityBillingModelEnv          = "GATEWAY_ANTIGRAVITY_BILL_WITH_MAPPED_MODEL"
	antigravityFallbackSecondsEnv       = "GATEWAY_ANTIGRAVITY_FALLBACK_COOLDOWN_SECONDS"
)

// antigravityRetryLoopParams 重试循环的参数
type antigravityRetryLoopParams struct {
	ctx            context.Context
	prefix         string
	account        *Account
	proxyURL       string
	accessToken    string
	action         string
	body           []byte
	quotaScope     AntigravityQuotaScope
	c              *gin.Context
	httpUpstream   HTTPUpstream
	settingService *SettingService
	handleError    func(ctx context.Context, prefix string, account *Account, statusCode int, headers http.Header, body []byte, quotaScope AntigravityQuotaScope)
	maxRetries     int // optional; <=0 means platform default
}

// antigravityRetryLoopResult 重试循环的结果
type antigravityRetryLoopResult struct {
	resp *http.Response
}

// antigravityRetryLoop 执行带 URL fallback 的重试循环
func antigravityRetryLoop(p antigravityRetryLoopParams) (*antigravityRetryLoopResult, error) {
	baseURLs := antigravity.ForwardBaseURLs()

	// Upstream passthrough account: route requests to account-scoped base_url only.
	// This avoids going through shared Antigravity URL pools.
	useGlobalAvailability := true
	if p.account != nil && p.account.Type == AccountTypeUpstream {
		upstreamBaseURL := normalizeUpstreamBaseURL(p.account.GetCredential("base_url"))
		if upstreamBaseURL == "" {
			return nil, errors.New("upstream account missing base_url in credentials")
		}
		baseURLs = []string{upstreamBaseURL}
		useGlobalAvailability = false
	}

	availableURLs := baseURLs
	if useGlobalAvailability {
		availableURLs = antigravity.DefaultURLAvailability.GetAvailableURLsWithBase(baseURLs)
		if len(availableURLs) == 0 {
			availableURLs = baseURLs
		}
	}
	maxRetries := p.maxRetries
	if maxRetries <= 0 {
		maxRetries = antigravityMaxRetries()
	}

	var resp *http.Response
	var usedBaseURL string
	logBody := p.settingService != nil && p.settingService.cfg != nil && p.settingService.cfg.Gateway.LogUpstreamErrorBody
	maxBytes := 2048
	if p.settingService != nil && p.settingService.cfg != nil && p.settingService.cfg.Gateway.LogUpstreamErrorBodyMaxBytes > 0 {
		maxBytes = p.settingService.cfg.Gateway.LogUpstreamErrorBodyMaxBytes
	}
	getUpstreamDetail := func(body []byte) string {
		if !logBody {
			return ""
		}
		return truncateString(string(body), maxBytes)
	}

urlFallbackLoop:
	for urlIdx, baseURL := range availableURLs {
		usedBaseURL = baseURL
		for attempt := 1; attempt <= maxRetries; attempt++ {
			select {
			case <-p.ctx.Done():
				log.Printf("%s status=context_canceled error=%v", p.prefix, p.ctx.Err())
				return nil, p.ctx.Err()
			default:
			}

			upstreamReq, err := antigravity.NewAPIRequestWithURL(p.ctx, baseURL, p.action, p.accessToken, p.body)
			if err != nil {
				return nil, err
			}

			// Capture upstream request body for ops retry of this attempt.
			if p.c != nil && len(p.body) > 0 {
				p.c.Set(OpsUpstreamRequestBodyKey, string(p.body))
			}

			resp, err = p.httpUpstream.Do(upstreamReq, p.proxyURL, p.account.ID, p.account.Concurrency)
			if err != nil {
				safeErr := sanitizeUpstreamErrorMessage(err.Error())
				appendOpsUpstreamError(p.c, OpsUpstreamErrorEvent{
					Platform:           p.account.Platform,
					AccountID:          p.account.ID,
					AccountName:        p.account.Name,
					UpstreamStatusCode: 0,
					Kind:               "request_error",
					Message:            safeErr,
				})
				if shouldAntigravityFallbackToNextURL(err, 0) && urlIdx < len(availableURLs)-1 {
					log.Printf("%s URL fallback (connection error): %s -> %s", p.prefix, baseURL, availableURLs[urlIdx+1])
					continue urlFallbackLoop
				}
				if attempt < maxRetries {
					log.Printf("%s status=request_failed retry=%d/%d error=%v", p.prefix, attempt, maxRetries, err)
					if !sleepAntigravityBackoffWithContext(p.ctx, attempt) {
						log.Printf("%s status=context_canceled_during_backoff", p.prefix)
						return nil, p.ctx.Err()
					}
					continue
				}
				log.Printf("%s status=request_failed retries_exhausted error=%v", p.prefix, err)
				setOpsUpstreamError(p.c, 0, safeErr, "")
				return nil, fmt.Errorf("upstream request failed after retries: %w", err)
			}

			// 429 限流处理：区分 URL 级别限流和账户配额限流
			if resp.StatusCode == http.StatusTooManyRequests {
				respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
				_ = resp.Body.Close()

				// "Resource has been exhausted" 是 URL 级别限流，切换 URL
				if isURLLevelRateLimit(respBody) && urlIdx < len(availableURLs)-1 {
					log.Printf("%s URL fallback (429): %s -> %s", p.prefix, baseURL, availableURLs[urlIdx+1])
					continue urlFallbackLoop
				}

				// 账户/模型配额限流，按最大重试次数做指数退避
				if attempt < maxRetries {
					upstreamMsg := strings.TrimSpace(extractAntigravityErrorMessage(respBody))
					upstreamMsg = sanitizeUpstreamErrorMessage(upstreamMsg)
					appendOpsUpstreamError(p.c, OpsUpstreamErrorEvent{
						Platform:           p.account.Platform,
						AccountID:          p.account.ID,
						AccountName:        p.account.Name,
						UpstreamStatusCode: resp.StatusCode,
						UpstreamRequestID:  resp.Header.Get("x-request-id"),
						Kind:               "retry",
						Message:            upstreamMsg,
						Detail:             getUpstreamDetail(respBody),
					})
					log.Printf("%s status=429 retry=%d/%d body=%s", p.prefix, attempt, maxRetries, truncateForLog(respBody, 200))
					if !sleepAntigravityBackoffWithContext(p.ctx, attempt) {
						log.Printf("%s status=context_canceled_during_backoff", p.prefix)
						return nil, p.ctx.Err()
					}
					continue
				}

				// 重试用尽，标记账户限流
				p.handleError(p.ctx, p.prefix, p.account, resp.StatusCode, resp.Header, respBody, p.quotaScope)
				log.Printf("%s status=429 rate_limited base_url=%s body=%s", p.prefix, baseURL, truncateForLog(respBody, 200))
				resp = &http.Response{
					StatusCode: resp.StatusCode,
					Header:     resp.Header.Clone(),
					Body:       io.NopCloser(bytes.NewReader(respBody)),
				}
				break urlFallbackLoop
			}

			// 其他可重试错误
			if resp.StatusCode >= 400 && shouldRetryAntigravityError(resp.StatusCode) {
				respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
				_ = resp.Body.Close()

				if attempt < maxRetries {
					upstreamMsg := strings.TrimSpace(extractAntigravityErrorMessage(respBody))
					upstreamMsg = sanitizeUpstreamErrorMessage(upstreamMsg)
					appendOpsUpstreamError(p.c, OpsUpstreamErrorEvent{
						Platform:           p.account.Platform,
						AccountID:          p.account.ID,
						AccountName:        p.account.Name,
						UpstreamStatusCode: resp.StatusCode,
						UpstreamRequestID:  resp.Header.Get("x-request-id"),
						Kind:               "retry",
						Message:            upstreamMsg,
						Detail:             getUpstreamDetail(respBody),
					})
					log.Printf("%s status=%d retry=%d/%d body=%s", p.prefix, resp.StatusCode, attempt, maxRetries, truncateForLog(respBody, 500))
					if !sleepAntigravityBackoffWithContext(p.ctx, attempt) {
						log.Printf("%s status=context_canceled_during_backoff", p.prefix)
						return nil, p.ctx.Err()
					}
					continue
				}
				resp = &http.Response{
					StatusCode: resp.StatusCode,
					Header:     resp.Header.Clone(),
					Body:       io.NopCloser(bytes.NewReader(respBody)),
				}
				break urlFallbackLoop
			}

			break urlFallbackLoop
		}
	}

	if resp != nil && resp.StatusCode < 400 && usedBaseURL != "" {
		antigravity.DefaultURLAvailability.MarkSuccess(usedBaseURL)
	}

	return &antigravityRetryLoopResult{resp: resp}, nil
}

func normalizeUpstreamBaseURL(raw string) string {
	baseURL := strings.TrimRight(strings.TrimSpace(raw), "/")
	if strings.HasSuffix(baseURL, "/antigravity") {
		baseURL = strings.TrimSuffix(baseURL, "/antigravity")
		baseURL = strings.TrimRight(baseURL, "/")
	}
	return baseURL
}

// shouldRetryAntigravityError 判断是否应该重试
func shouldRetryAntigravityError(statusCode int) bool {
	switch statusCode {
	case 429, 500, 502, 503, 504, 529:
		return true
	default:
		return false
	}
}

// isURLLevelRateLimit 判断是否为 URL 级别的限流（应切换 URL 重试）
// "Resource has been exhausted" 是 URL/节点级别限流，切换 URL 可能成功
// "exhausted your capacity on this model" 是账户/模型配额限流，切换 URL 无效
func isURLLevelRateLimit(body []byte) bool {
	// 快速检查：包含 "Resource has been exhausted" 且不包含 "capacity on this model"
	bodyStr := string(body)
	return strings.Contains(bodyStr, "Resource has been exhausted") &&
		!strings.Contains(bodyStr, "capacity on this model")
}

// isAntigravityConnectionError 判断是否为连接错误（网络超时、DNS 失败、连接拒绝）
func isAntigravityConnectionError(err error) bool {
	if err == nil {
		return false
	}

	// 检查超时错误
	var netErr net.Error
	if errors.As(err, &netErr) && netErr.Timeout() {
		return true
	}

	// 检查连接错误（DNS 失败、连接拒绝）
	var opErr *net.OpError
	return errors.As(err, &opErr)
}

// shouldAntigravityFallbackToNextURL 判断是否应切换到下一个 URL
// 仅连接错误和 HTTP 429 触发 URL 降级
func shouldAntigravityFallbackToNextURL(err error, statusCode int) bool {
	if isAntigravityConnectionError(err) {
		return true
	}
	return statusCode == http.StatusTooManyRequests
}

// getSessionID 从 gin.Context 获取 session_id（用于日志追踪）
func getSessionID(c *gin.Context) string {
	if c == nil {
		return ""
	}
	return c.GetHeader("session_id")
}

// logPrefix 生成统一的日志前缀
func logPrefix(sessionID, accountName string) string {
	if sessionID != "" {
		return fmt.Sprintf("[antigravity-Forward] session=%s account=%s", sessionID, accountName)
	}
	return fmt.Sprintf("[antigravity-Forward] account=%s", accountName)
}

// Antigravity 直接支持的模型（精确匹配透传）
// 注意：gemini-2.5 系列已移除，统一映射到 gemini-3 系列
var antigravitySupportedModels = map[string]bool{
	"claude-opus-4-6-thinking":   true,
	"claude-opus-4-5-thinking":   true,
	"claude-sonnet-4-5":          true,
	"claude-sonnet-4-5-thinking": true,
	"gemini-3-flash":             true,
	"gemini-3-pro-low":           true,
	"gemini-3-pro-high":          true,
	"gemini-3-pro-image":         true,
}

// Antigravity 前缀映射表（按前缀长度降序排列，确保最长匹配优先）
// 用于处理模型版本号变化（如 -20251111, -thinking, -preview 等后缀）
// gemini-2.5 系列统一映射到 gemini-3 系列（Antigravity 上游不再支持 2.5）
var antigravityPrefixMapping = []struct {
	prefix string
	target string
}{
	// gemini-2.5 → gemini-3 映射（长前缀优先）
	{"gemini-2.5-flash-thinking", "gemini-3-flash"},  // gemini-2.5-flash-thinking → gemini-3-flash
	{"gemini-2.5-flash-image", "gemini-3-pro-image"}, // gemini-2.5-flash-image → gemini-3-pro-image
	{"gemini-2.5-flash-lite", "gemini-3-flash"},      // gemini-2.5-flash-lite → gemini-3-flash
	{"gemini-2.5-flash", "gemini-3-flash"},           // gemini-2.5-flash → gemini-3-flash
	{"gemini-2.5-pro-preview", "gemini-3-pro-high"},  // gemini-2.5-pro-preview → gemini-3-pro-high
	{"gemini-2.5-pro-exp", "gemini-3-pro-high"},      // gemini-2.5-pro-exp → gemini-3-pro-high
	{"gemini-2.5-pro", "gemini-3-pro-high"},          // gemini-2.5-pro → gemini-3-pro-high
	// gemini-3 前缀映射
	{"gemini-3-pro-image", "gemini-3-pro-image"}, // gemini-3-pro-image-preview 等
	{"gemini-3-flash", "gemini-3-flash"},         // gemini-3-flash-preview 等 → gemini-3-flash
	{"gemini-3-pro", "gemini-3-pro-high"},        // gemini-3-pro, gemini-3-pro-preview 等
	// Claude 映射
	{"claude-3-5-sonnet", "claude-sonnet-4-5"}, // 旧版 claude-3-5-sonnet-xxx
	{"claude-sonnet-4-5", "claude-sonnet-4-5"}, // claude-sonnet-4-5-xxx
	{"claude-haiku-4-5", "claude-sonnet-4-5"},  // claude-haiku-4-5-xxx → sonnet
	{"claude-opus-4-6", "claude-opus-4-6-thinking"},
	{"claude-opus-4-5", "claude-opus-4-5-thinking"},
	{"claude-3-haiku", "claude-sonnet-4-5"}, // 旧版 claude-3-haiku-xxx → sonnet
	{"claude-sonnet-4", "claude-sonnet-4-5"},
	{"claude-haiku-4", "claude-sonnet-4-5"}, // → sonnet
	{"claude-opus-4", "claude-opus-4-5-thinking"},
}

var antigravityDefaultModelMapping = map[string]string{
	"claude-opus-4-6":            "claude-opus-4-6-thinking",
	"claude-opus-4-5-thinking":   "claude-opus-4-5-thinking",
	"claude-opus-4-5-20251101":   "claude-opus-4-5-thinking",
	"claude-sonnet-4-5":          "claude-sonnet-4-5",
	"claude-sonnet-4-5-thinking": "claude-sonnet-4-5-thinking",
	"claude-sonnet-4-5-20250929": "claude-sonnet-4-5",
	"claude-haiku-4-5":           "claude-sonnet-4-5",
	"claude-haiku-4-5-20251001":  "claude-sonnet-4-5",
	"claude-3-5-sonnet-20241022": "claude-sonnet-4-5",
	"claude-3-5-sonnet-20240620": "claude-sonnet-4-5",
	"claude-3-haiku-20240307":    "claude-sonnet-4-5",
	"gemini-3-flash":             "gemini-3-flash",
	"gemini-3-pro-low":           "gemini-3-pro-low",
	"gemini-3-pro-high":          "gemini-3-pro-high",
	"gemini-3-pro-image":         "gemini-3-pro-image",
	"gemini-3-flash-preview":     "gemini-3-flash",
	"gemini-3-pro-preview":       "gemini-3-pro-high",
	"gemini-3-pro-image-preview": "gemini-3-pro-image",
	"gemini-2.5-flash":           "gemini-3-flash",
	"gemini-2.5-flash-lite":      "gemini-3-flash",
	"gemini-2.5-flash-thinking":  "gemini-3-flash",
	"gemini-2.5-pro":             "gemini-3-pro-high",
	"gemini-2.5-pro-preview":     "gemini-3-pro-high",
	"gemini-2.5-pro-exp":         "gemini-3-pro-high",
	"gpt-oss-120b-medium":        "gpt-oss-120b-medium",
	"tab_flash_lite_preview":     "tab_flash_lite_preview",
}

func GetAntigravityDefaultModelMapping() map[string]string {
	result := make(map[string]string, len(antigravityDefaultModelMapping))
	for from, to := range antigravityDefaultModelMapping {
		result[from] = to
	}
	return result
}

// AntigravityGatewayService 处理 Antigravity 平台的 API 转发
type AntigravityGatewayService struct {
	accountRepo      AccountRepository
	tokenProvider    *AntigravityTokenProvider
	rateLimitService *RateLimitService
	httpUpstream     HTTPUpstream
	settingService   *SettingService
}

func NewAntigravityGatewayService(
	accountRepo AccountRepository,
	_ GatewayCache,
	tokenProvider *AntigravityTokenProvider,
	rateLimitService *RateLimitService,
	httpUpstream HTTPUpstream,
	settingService *SettingService,
) *AntigravityGatewayService {
	return &AntigravityGatewayService{
		accountRepo:      accountRepo,
		tokenProvider:    tokenProvider,
		rateLimitService: rateLimitService,
		httpUpstream:     httpUpstream,
		settingService:   settingService,
	}
}

// GetTokenProvider 返回 token provider
func (s *AntigravityGatewayService) GetTokenProvider() *AntigravityTokenProvider {
	return s.tokenProvider
}

// getMappedModel 获取映射后的模型名
// 逻辑：账户映射（含通配符）→ 直接支持透传 → 前缀映射 → gemini透传 → 默认值
func (s *AntigravityGatewayService) getMappedModel(account *Account, requestedModel string) string {
	// 1. 账户级映射（用户自定义优先）
	// 当配置了 model_mapping 时：
	// - mapped != requested: 命中映射，直接返回 mapped
	// - mapped == requested: 需区分“真的命中（例如通配符目标恰好等于请求名）”和“未命中”
	//   通过 IsModelSupported 再确认，避免误走默认回退模型。
	if len(account.GetModelMapping()) > 0 {
		if mapped := account.GetMappedModel(requestedModel); mapped != requestedModel {
			return mapped
		}
		if account.IsModelSupported(requestedModel) {
			return requestedModel
		}
	}

	// 2. 直接支持的模型透传
	if antigravitySupportedModels[requestedModel] {
		return requestedModel
	}

	// 3. 前缀映射（处理版本号变化，如 -20251111, -thinking, -preview）
	for _, pm := range antigravityPrefixMapping {
		if strings.HasPrefix(requestedModel, pm.prefix) {
			return pm.target
		}
	}

	// 4. Gemini 模型透传（未匹配到前缀的 gemini 模型）
	if strings.HasPrefix(requestedModel, "gemini-") {
		return requestedModel
	}

	// 5. 默认值
	return "claude-sonnet-4-5"
}

func mapAntigravityModelForScheduling(account *Account, requestedModel string) string {
	if account == nil {
		return ""
	}
	requestedModel = strings.TrimSpace(requestedModel)
	if requestedModel == "" {
		return ""
	}

	if len(account.GetModelMapping()) > 0 {
		if mapped := account.GetMappedModel(requestedModel); mapped != requestedModel {
			return mapped
		}
		if account.IsModelSupported(requestedModel) {
			return requestedModel
		}
		return ""
	}

	if !IsAntigravityModelSupported(requestedModel) {
		return ""
	}
	if antigravitySupportedModels[requestedModel] {
		return requestedModel
	}
	for _, pm := range antigravityPrefixMapping {
		if strings.HasPrefix(requestedModel, pm.prefix) {
			return pm.target
		}
	}
	if strings.HasPrefix(requestedModel, "gemini-") {
		return requestedModel
	}
	return "claude-sonnet-4-5"
}

func isAntigravityModelSupportedByAccount(account *Account, requestedModel string) bool {
	if account == nil {
		return false
	}
	if strings.TrimSpace(requestedModel) == "" {
		return true
	}
	return mapAntigravityModelForScheduling(account, requestedModel) != ""
}

// IsModelSupported 检查模型是否被支持
// 所有 claude- 和 gemini- 前缀的模型都能通过映射或透传支持
func (s *AntigravityGatewayService) IsModelSupported(requestedModel string) bool {
	return strings.HasPrefix(requestedModel, "claude-") ||
		strings.HasPrefix(requestedModel, "gemini-")
}

// TestConnectionResult 测试连接结果
type TestConnectionResult struct {
	Text        string // 响应文本
	MappedModel string // 实际使用的模型
}

// TestConnection 测试 Antigravity 账号连接（非流式，无重试、无计费）
// 支持 Claude 和 Gemini 两种协议，根据 modelID 前缀自动选择
func (s *AntigravityGatewayService) TestConnection(ctx context.Context, account *Account, modelID string) (*TestConnectionResult, error) {
	if account != nil && account.Type == AccountTypeUpstream {
		return s.testUpstreamConnection(ctx, account, modelID)
	}

	// 获取 token
	if s.tokenProvider == nil {
		return nil, errors.New("antigravity token provider not configured")
	}
	accessToken, err := s.tokenProvider.GetAccessToken(ctx, account)
	if err != nil {
		return nil, fmt.Errorf("获取 access_token 失败: %w", err)
	}

	// 获取 project_id（部分账户类型可能没有）
	projectID := strings.TrimSpace(account.GetCredential("project_id"))

	// 模型映射
	mappedModel := s.getMappedModel(account, modelID)

	// 构建请求体
	var requestBody []byte
	if strings.HasPrefix(modelID, "gemini-") {
		// Gemini 模型：直接使用 Gemini 格式
		requestBody, err = s.buildGeminiTestRequest(projectID, mappedModel)
	} else {
		// Claude 模型：使用协议转换
		requestBody, err = s.buildClaudeTestRequest(projectID, mappedModel)
	}
	if err != nil {
		return nil, fmt.Errorf("构建请求失败: %w", err)
	}

	// 代理 URL
	proxyURL := ""
	if account.ProxyID != nil && account.Proxy != nil {
		proxyURL = account.Proxy.URL()
	}

	// URL fallback 循环
	baseURLs := antigravity.ForwardBaseURLs()
	availableURLs := antigravity.DefaultURLAvailability.GetAvailableURLsWithBase(baseURLs)
	if len(availableURLs) == 0 {
		availableURLs = baseURLs // 所有 URL 都不可用时，按转发顺序重试
	}

	var lastErr error
	for urlIdx, baseURL := range availableURLs {
		// 构建 HTTP 请求（总是使用流式 endpoint，与官方客户端一致）
		req, err := antigravity.NewAPIRequestWithURL(ctx, baseURL, "streamGenerateContent", accessToken, requestBody)
		if err != nil {
			lastErr = err
			continue
		}

		// 调试日志：Test 请求信息
		log.Printf("[antigravity-Test] account=%s request_size=%d url=%s", account.Name, len(requestBody), req.URL.String())

		// 发送请求
		resp, err := s.httpUpstream.Do(req, proxyURL, account.ID, account.Concurrency)
		if err != nil {
			lastErr = fmt.Errorf("请求失败: %w", err)
			if shouldAntigravityFallbackToNextURL(err, 0) && urlIdx < len(availableURLs)-1 {
				log.Printf("[antigravity-Test] URL fallback: %s -> %s", baseURL, availableURLs[urlIdx+1])
				continue
			}
			return nil, lastErr
		}

		// 读取响应
		respBody, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
		_ = resp.Body.Close() // 立即关闭，避免循环内 defer 导致的资源泄漏
		if err != nil {
			return nil, fmt.Errorf("读取响应失败: %w", err)
		}

		// 检查是否需要 URL 降级
		if shouldAntigravityFallbackToNextURL(nil, resp.StatusCode) && urlIdx < len(availableURLs)-1 {
			log.Printf("[antigravity-Test] URL fallback (HTTP %d): %s -> %s", resp.StatusCode, baseURL, availableURLs[urlIdx+1])
			continue
		}

		if resp.StatusCode >= 400 {
			return nil, fmt.Errorf("API 返回 %d: %s", resp.StatusCode, string(respBody))
		}

		// 解析流式响应，提取文本
		text := extractTextFromSSEResponse(respBody)

		// 标记成功的 URL，下次优先使用
		antigravity.DefaultURLAvailability.MarkSuccess(baseURL)
		return &TestConnectionResult{
			Text:        text,
			MappedModel: mappedModel,
		}, nil
	}

	return nil, lastErr
}

// buildGeminiTestRequest 构建 Gemini 格式测试请求
// 使用最小 token 消耗：输入 "." + maxOutputTokens: 1
func (s *AntigravityGatewayService) buildGeminiTestRequest(projectID, model string) ([]byte, error) {
	payload := map[string]any{
		"contents": []map[string]any{
			{
				"role": "user",
				"parts": []map[string]any{
					{"text": "."},
				},
			},
		},
		// Antigravity 上游要求必须包含身份提示词
		"systemInstruction": map[string]any{
			"parts": []map[string]any{
				{"text": antigravity.GetDefaultIdentityPatch()},
			},
		},
		"generationConfig": map[string]any{
			"maxOutputTokens": 1,
		},
	}
	payloadBytes, _ := json.Marshal(payload)
	return s.wrapV1InternalRequest(projectID, model, payloadBytes)
}

// buildClaudeTestRequest 构建 Claude 格式测试请求并转换为 Gemini 格式
// 使用最小 token 消耗：输入 "." + MaxTokens: 1
func (s *AntigravityGatewayService) buildClaudeTestRequest(projectID, mappedModel string) ([]byte, error) {
	claudeReq := &antigravity.ClaudeRequest{
		Model: mappedModel,
		Messages: []antigravity.ClaudeMessage{
			{
				Role:    "user",
				Content: json.RawMessage(`"."`),
			},
		},
		MaxTokens: 1,
		Stream:    false,
	}
	return antigravity.TransformClaudeToGemini(claudeReq, projectID, mappedModel)
}

func (s *AntigravityGatewayService) getClaudeTransformOptions(ctx context.Context) antigravity.TransformOptions {
	opts := antigravity.DefaultTransformOptions()
	if s.settingService == nil {
		return opts
	}
	opts.EnableIdentityPatch = s.settingService.IsIdentityPatchEnabled(ctx)
	opts.IdentityPatch = s.settingService.GetIdentityPatchPrompt(ctx)

	if group, ok := ctx.Value(ctxkey.Group).(*Group); ok && group != nil {
		opts.EnableMCPXML = group.MCPXMLInject
	}
	return opts
}

// extractTextFromSSEResponse 从 SSE 流式响应中提取文本
func extractTextFromSSEResponse(respBody []byte) string {
	var texts []string
	lines := bytes.Split(respBody, []byte("\n"))

	for _, line := range lines {
		line = bytes.TrimSpace(line)
		if len(line) == 0 {
			continue
		}

		// 跳过 SSE 前缀
		if bytes.HasPrefix(line, []byte("data:")) {
			line = bytes.TrimPrefix(line, []byte("data:"))
			line = bytes.TrimSpace(line)
		}

		// 跳过非 JSON 行
		if len(line) == 0 || line[0] != '{' {
			continue
		}

		// 解析 JSON
		var data map[string]any
		if err := json.Unmarshal(line, &data); err != nil {
			continue
		}

		// 尝试从 response.candidates[0].content.parts[].text 提取
		response, ok := data["response"].(map[string]any)
		if !ok {
			// 尝试直接从 candidates 提取（某些响应格式）
			response = data
		}

		candidates, ok := response["candidates"].([]any)
		if !ok || len(candidates) == 0 {
			continue
		}

		candidate, ok := candidates[0].(map[string]any)
		if !ok {
			continue
		}

		content, ok := candidate["content"].(map[string]any)
		if !ok {
			continue
		}

		parts, ok := content["parts"].([]any)
		if !ok {
			continue
		}

		for _, part := range parts {
			if partMap, ok := part.(map[string]any); ok {
				if text, ok := partMap["text"].(string); ok && text != "" {
					texts = append(texts, text)
				}
			}
		}
	}

	return strings.Join(texts, "")
}

// injectIdentityPatchToGeminiRequest 为 Gemini 格式请求注入身份提示词
// 如果请求中已包含 "You are Antigravity" 则不重复注入
func injectIdentityPatchToGeminiRequest(body []byte) ([]byte, error) {
	var request map[string]any
	if err := json.Unmarshal(body, &request); err != nil {
		return nil, fmt.Errorf("解析 Gemini 请求失败: %w", err)
	}

	// 检查现有 systemInstruction 是否已包含身份提示词
	if sysInst, ok := request["systemInstruction"].(map[string]any); ok {
		if parts, ok := sysInst["parts"].([]any); ok {
			for _, part := range parts {
				if partMap, ok := part.(map[string]any); ok {
					if text, ok := partMap["text"].(string); ok {
						if strings.Contains(text, "You are Antigravity") {
							// 已包含身份提示词，直接返回原始请求
							return body, nil
						}
					}
				}
			}
		}
	}

	// 获取默认身份提示词
	identityPatch := antigravity.GetDefaultIdentityPatch()

	// 构建新的 systemInstruction
	newPart := map[string]any{"text": identityPatch}

	if existing, ok := request["systemInstruction"].(map[string]any); ok {
		// 已有 systemInstruction，在开头插入身份提示词
		if parts, ok := existing["parts"].([]any); ok {
			existing["parts"] = append([]any{newPart}, parts...)
		} else {
			existing["parts"] = []any{newPart}
		}
	} else {
		// 没有 systemInstruction，创建新的
		request["systemInstruction"] = map[string]any{
			"parts": []any{newPart},
		}
	}

	return json.Marshal(request)
}

// wrapV1InternalRequest 包装请求为 v1internal 格式
func (s *AntigravityGatewayService) wrapV1InternalRequest(projectID, model string, originalBody []byte) ([]byte, error) {
	var request any
	if err := json.Unmarshal(originalBody, &request); err != nil {
		return nil, fmt.Errorf("解析请求体失败: %w", err)
	}

	wrapped := map[string]any{
		"project":     projectID,
		"requestId":   "agent-" + uuid.New().String(),
		"userAgent":   "antigravity", // 固定值，与官方客户端一致
		"requestType": "agent",
		"model":       model,
		"request":     request,
	}

	return json.Marshal(wrapped)
}

// unwrapV1InternalResponse 解包 v1internal 响应
func (s *AntigravityGatewayService) unwrapV1InternalResponse(body []byte) ([]byte, error) {
	var outer map[string]any
	if err := json.Unmarshal(body, &outer); err != nil {
		return nil, err
	}

	if resp, ok := outer["response"]; ok {
		return json.Marshal(resp)
	}

	return body, nil
}

// isModelNotFoundError 检测是否为模型不存在的 404 错误
func isModelNotFoundError(statusCode int, body []byte) bool {
	if statusCode != 404 {
		return false
	}

	bodyStr := strings.ToLower(string(body))
	keywords := []string{"model not found", "unknown model", "not found"}
	for _, keyword := range keywords {
		if strings.Contains(bodyStr, keyword) {
			return true
		}
	}
	return true // 404 without specific message also treated as model not found
}

// Forward 转发 Claude 协议请求（Claude → Gemini 转换）
func (s *AntigravityGatewayService) Forward(ctx context.Context, c *gin.Context, account *Account, body []byte) (*ForwardResult, error) {
	if account != nil && account.Type == AccountTypeUpstream {
		return s.ForwardUpstream(ctx, c, account, body)
	}

	startTime := time.Now()
	sessionID := getSessionID(c)
	prefix := logPrefix(sessionID, account.Name)

	// 解析 Claude 请求
	var claudeReq antigravity.ClaudeRequest
	if err := json.Unmarshal(body, &claudeReq); err != nil {
		return nil, fmt.Errorf("parse claude request: %w", err)
	}
	if strings.TrimSpace(claudeReq.Model) == "" {
		return nil, fmt.Errorf("missing model")
	}

	originalModel := claudeReq.Model
	mappedModel := s.getMappedModel(account, claudeReq.Model)
	thinkingEnabled := claudeReq.Thinking != nil && claudeReq.Thinking.Type == "enabled"
	mappedModel = applyThinkingModelSuffix(mappedModel, thinkingEnabled)
	quotaScope, _ := resolveAntigravityQuotaScope(originalModel)
	billingModel := originalModel
	if antigravityUseMappedModelForBilling() && strings.TrimSpace(mappedModel) != "" {
		billingModel = mappedModel
	}
	afterSwitch := antigravityHasAccountSwitch(ctx)
	maxRetries := antigravityMaxRetriesForModel(originalModel, afterSwitch)

	// 获取 access_token
	if s.tokenProvider == nil {
		return nil, errors.New("antigravity token provider not configured")
	}
	accessToken, err := s.tokenProvider.GetAccessToken(ctx, account)
	if err != nil {
		return nil, fmt.Errorf("获取 access_token 失败: %w", err)
	}

	// 获取 project_id（部分账户类型可能没有）
	projectID := strings.TrimSpace(account.GetCredential("project_id"))

	// 代理 URL
	proxyURL := ""
	if account.ProxyID != nil && account.Proxy != nil {
		proxyURL = account.Proxy.URL()
	}

	// 获取转换选项
	// Antigravity 上游要求必须包含身份提示词，否则会返回 429
	transformOpts := s.getClaudeTransformOptions(ctx)
	transformOpts.EnableIdentityPatch = true // 强制启用，Antigravity 上游必需

	// 转换 Claude 请求为 Gemini 格式
	geminiBody, err := antigravity.TransformClaudeToGeminiWithOptions(&claudeReq, projectID, mappedModel, transformOpts)
	if err != nil {
		return nil, fmt.Errorf("transform request: %w", err)
	}

	// Antigravity 上游只支持流式请求，统一使用 streamGenerateContent
	// 如果客户端请求非流式，在响应处理阶段会收集完整流式响应后转换返回
	action := "streamGenerateContent"

	// 执行带重试的请求
	result, err := antigravityRetryLoop(antigravityRetryLoopParams{
		ctx:            ctx,
		prefix:         prefix,
		account:        account,
		proxyURL:       proxyURL,
		accessToken:    accessToken,
		action:         action,
		body:           geminiBody,
		quotaScope:     quotaScope,
		c:              c,
		httpUpstream:   s.httpUpstream,
		settingService: s.settingService,
		handleError:    s.handleUpstreamError,
		maxRetries:     maxRetries,
	})
	if err != nil {
		if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
			return nil, err
		}
		if strings.TrimSpace(proxyURL) != "" {
			log.Printf("%s upstream request error via proxy, triggering failover: %v", prefix, err)
			return nil, &UpstreamFailoverError{StatusCode: http.StatusBadGateway}
		}
		return nil, s.writeClaudeError(c, http.StatusBadGateway, "upstream_error", "Upstream request failed after retries")
	}
	resp := result.resp
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 2<<20))

		// 优先检测 thinking block 的 signature 相关错误（400）并重试一次：
		// Antigravity /v1internal 链路在部分场景会对 thought/thinking signature 做严格校验，
		// 当历史消息携带的 signature 不合法时会直接 400；去除 thinking 后可继续完成请求。
		if resp.StatusCode == http.StatusBadRequest && isSignatureRelatedError(respBody) {
			upstreamMsg := strings.TrimSpace(extractAntigravityErrorMessage(respBody))
			upstreamMsg = sanitizeUpstreamErrorMessage(upstreamMsg)
			logBody := s.settingService != nil && s.settingService.cfg != nil && s.settingService.cfg.Gateway.LogUpstreamErrorBody
			maxBytes := 2048
			if s.settingService != nil && s.settingService.cfg != nil && s.settingService.cfg.Gateway.LogUpstreamErrorBodyMaxBytes > 0 {
				maxBytes = s.settingService.cfg.Gateway.LogUpstreamErrorBodyMaxBytes
			}
			upstreamDetail := ""
			if logBody {
				upstreamDetail = truncateString(string(respBody), maxBytes)
			}
			appendOpsUpstreamError(c, OpsUpstreamErrorEvent{
				Platform:           account.Platform,
				AccountID:          account.ID,
				AccountName:        account.Name,
				UpstreamStatusCode: resp.StatusCode,
				UpstreamRequestID:  resp.Header.Get("x-request-id"),
				Kind:               "signature_error",
				Message:            upstreamMsg,
				Detail:             upstreamDetail,
			})

			// Conservative two-stage fallback:
			// 1) Disable top-level thinking + thinking->text
			// 2) Only if still signature-related 400: also downgrade tool_use/tool_result to text.

			retryStages := []struct {
				name  string
				strip func(*antigravity.ClaudeRequest) (bool, error)
			}{
				{name: "thinking-only", strip: stripThinkingFromClaudeRequest},
				{name: "thinking+tools", strip: stripSignatureSensitiveBlocksFromClaudeRequest},
			}

			for _, stage := range retryStages {
				retryClaudeReq := claudeReq
				retryClaudeReq.Messages = append([]antigravity.ClaudeMessage(nil), claudeReq.Messages...)

				stripped, stripErr := stage.strip(&retryClaudeReq)
				if stripErr != nil || !stripped {
					continue
				}

				log.Printf("Antigravity account %d: detected signature-related 400, retrying once (%s)", account.ID, stage.name)

				retryGeminiBody, txErr := antigravity.TransformClaudeToGeminiWithOptions(&retryClaudeReq, projectID, mappedModel, s.getClaudeTransformOptions(ctx))
				if txErr != nil {
					continue
				}
				retryResult, retryErr := antigravityRetryLoop(antigravityRetryLoopParams{
					ctx:            ctx,
					prefix:         prefix,
					account:        account,
					proxyURL:       proxyURL,
					accessToken:    accessToken,
					action:         action,
					body:           retryGeminiBody,
					quotaScope:     quotaScope,
					c:              c,
					httpUpstream:   s.httpUpstream,
					settingService: s.settingService,
					handleError:    s.handleUpstreamError,
					maxRetries:     maxRetries,
				})
				if retryErr != nil {
					appendOpsUpstreamError(c, OpsUpstreamErrorEvent{
						Platform:           account.Platform,
						AccountID:          account.ID,
						AccountName:        account.Name,
						UpstreamStatusCode: 0,
						Kind:               "signature_retry_request_error",
						Message:            sanitizeUpstreamErrorMessage(retryErr.Error()),
					})
					log.Printf("Antigravity account %d: signature retry request failed (%s): %v", account.ID, stage.name, retryErr)
					continue
				}

				retryResp := retryResult.resp
				if retryResp.StatusCode < 400 {
					_ = resp.Body.Close()
					resp = retryResp
					respBody = nil
					break
				}

				retryBody, _ := io.ReadAll(io.LimitReader(retryResp.Body, 2<<20))
				_ = retryResp.Body.Close()
				if retryResp.StatusCode == http.StatusTooManyRequests {
					retryBaseURL := ""
					if retryResp.Request != nil && retryResp.Request.URL != nil {
						retryBaseURL = retryResp.Request.URL.Scheme + "://" + retryResp.Request.URL.Host
					}
					log.Printf("%s status=429 rate_limited base_url=%s retry_stage=%s body=%s", prefix, retryBaseURL, stage.name, truncateForLog(retryBody, 200))
				}
				kind := "signature_retry"
				if strings.TrimSpace(stage.name) != "" {
					kind = "signature_retry_" + strings.ReplaceAll(stage.name, "+", "_")
				}
				retryUpstreamMsg := strings.TrimSpace(extractAntigravityErrorMessage(retryBody))
				retryUpstreamMsg = sanitizeUpstreamErrorMessage(retryUpstreamMsg)
				retryUpstreamDetail := ""
				if logBody {
					retryUpstreamDetail = truncateString(string(retryBody), maxBytes)
				}
				appendOpsUpstreamError(c, OpsUpstreamErrorEvent{
					Platform:           account.Platform,
					AccountID:          account.ID,
					AccountName:        account.Name,
					UpstreamStatusCode: retryResp.StatusCode,
					UpstreamRequestID:  retryResp.Header.Get("x-request-id"),
					Kind:               kind,
					Message:            retryUpstreamMsg,
					Detail:             retryUpstreamDetail,
				})

				// If this stage fixed the signature issue, we stop; otherwise we may try the next stage.
				if retryResp.StatusCode != http.StatusBadRequest || !isSignatureRelatedError(retryBody) {
					respBody = retryBody
					resp = &http.Response{
						StatusCode: retryResp.StatusCode,
						Header:     retryResp.Header.Clone(),
						Body:       io.NopCloser(bytes.NewReader(retryBody)),
					}
					break
				}

				// Still signature-related; capture context and allow next stage.
				respBody = retryBody
				resp = &http.Response{
					StatusCode: retryResp.StatusCode,
					Header:     retryResp.Header.Clone(),
					Body:       io.NopCloser(bytes.NewReader(retryBody)),
				}
			}
		}

		// 处理错误响应（重试后仍失败或不触发重试）
		if resp.StatusCode >= 400 {
			s.handleUpstreamError(ctx, prefix, account, resp.StatusCode, resp.Header, respBody, quotaScope)

			if s.shouldFailoverUpstreamError(resp.StatusCode) {
				upstreamMsg := strings.TrimSpace(extractAntigravityErrorMessage(respBody))
				upstreamMsg = sanitizeUpstreamErrorMessage(upstreamMsg)
				logBody := s.settingService != nil && s.settingService.cfg != nil && s.settingService.cfg.Gateway.LogUpstreamErrorBody
				maxBytes := 2048
				if s.settingService != nil && s.settingService.cfg != nil && s.settingService.cfg.Gateway.LogUpstreamErrorBodyMaxBytes > 0 {
					maxBytes = s.settingService.cfg.Gateway.LogUpstreamErrorBodyMaxBytes
				}
				upstreamDetail := ""
				if logBody {
					upstreamDetail = truncateString(string(respBody), maxBytes)
				}
				appendOpsUpstreamError(c, OpsUpstreamErrorEvent{
					Platform:           account.Platform,
					AccountID:          account.ID,
					AccountName:        account.Name,
					UpstreamStatusCode: resp.StatusCode,
					UpstreamRequestID:  resp.Header.Get("x-request-id"),
					Kind:               "failover",
					Message:            upstreamMsg,
					Detail:             upstreamDetail,
				})
				return nil, &UpstreamFailoverError{StatusCode: resp.StatusCode, ResponseBody: respBody}
			}

			return nil, s.writeMappedClaudeError(c, account, resp.StatusCode, resp.Header.Get("x-request-id"), respBody)
		}
	}

	requestID := resp.Header.Get("x-request-id")
	if requestID != "" {
		c.Header("x-request-id", requestID)
	}

	var usage *ClaudeUsage
	var firstTokenMs *int
	var clientDisconnect bool
	if claudeReq.Stream {
		// 客户端要求流式，直接透传转换
		streamRes, err := s.handleClaudeStreamingResponse(c, resp, startTime, originalModel)
		if err != nil {
			log.Printf("%s status=stream_error error=%v", prefix, err)
			return nil, err
		}
		usage = streamRes.usage
		firstTokenMs = streamRes.firstTokenMs
		clientDisconnect = streamRes.clientDisconnect
	} else {
		// 客户端要求非流式，收集流式响应后转换返回
		streamRes, err := s.handleClaudeStreamToNonStreaming(c, resp, startTime, originalModel)
		if err != nil {
			log.Printf("%s status=stream_collect_error error=%v", prefix, err)
			return nil, err
		}
		usage = streamRes.usage
		firstTokenMs = streamRes.firstTokenMs
	}

	originalModel = billingModel

	return &ForwardResult{
		RequestID:        requestID,
		Usage:            *usage,
		Model:            originalModel, // 使用原始模型用于计费和日志
		Stream:           claudeReq.Stream,
		Duration:         time.Since(startTime),
		FirstTokenMs:     firstTokenMs,
		ClientDisconnect: clientDisconnect,
	}, nil
}

func isSignatureRelatedError(respBody []byte) bool {
	msg := strings.ToLower(strings.TrimSpace(extractAntigravityErrorMessage(respBody)))
	if msg == "" {
		// Fallback: best-effort scan of the raw payload.
		msg = strings.ToLower(string(respBody))
	}

	// Keep this intentionally broad: different upstreams may use "signature" or "thought_signature".
	if strings.Contains(msg, "thought_signature") || strings.Contains(msg, "signature") {
		return true
	}

	// Also detect thinking block structural errors:
	// "Expected `thinking` or `redacted_thinking`, but found `text`"
	if strings.Contains(msg, "expected") && (strings.Contains(msg, "thinking") || strings.Contains(msg, "redacted_thinking")) {
		return true
	}

	// Detect thinking block modification errors:
	// "thinking or redacted_thinking blocks in the latest assistant message cannot be modified"
	if strings.Contains(msg, "cannot be modified") && (strings.Contains(msg, "thinking") || strings.Contains(msg, "redacted_thinking")) {
		return true
	}

	return false
}

func extractAntigravityErrorMessage(body []byte) string {
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		return ""
	}

	// Google-style: {"error": {"message": "..."}}
	if errObj, ok := payload["error"].(map[string]any); ok {
		if msg, ok := errObj["message"].(string); ok && strings.TrimSpace(msg) != "" {
			return msg
		}
	}

	// Fallback: top-level message
	if msg, ok := payload["message"].(string); ok && strings.TrimSpace(msg) != "" {
		return msg
	}

	return ""
}

// stripThinkingFromClaudeRequest converts thinking blocks to text blocks in a Claude Messages request.
// This preserves the thinking content while avoiding signature validation errors.
// Note: redacted_thinking blocks are removed because they cannot be converted to text.
// It also disables top-level `thinking` to avoid upstream structural constraints for thinking mode.
func stripThinkingFromClaudeRequest(req *antigravity.ClaudeRequest) (bool, error) {
	if req == nil {
		return false, nil
	}

	changed := false
	if req.Thinking != nil {
		req.Thinking = nil
		changed = true
	}

	for i := range req.Messages {
		raw := req.Messages[i].Content
		if len(raw) == 0 {
			continue
		}

		// If content is a string, nothing to strip.
		var str string
		if json.Unmarshal(raw, &str) == nil {
			continue
		}

		// Otherwise treat as an array of blocks and convert thinking blocks to text.
		var blocks []map[string]any
		if err := json.Unmarshal(raw, &blocks); err != nil {
			continue
		}

		filtered := make([]map[string]any, 0, len(blocks))
		modifiedAny := false
		for _, block := range blocks {
			t, _ := block["type"].(string)
			switch t {
			case "thinking":
				thinkingText, _ := block["thinking"].(string)
				if thinkingText != "" {
					filtered = append(filtered, map[string]any{
						"type": "text",
						"text": thinkingText,
					})
				}
				modifiedAny = true
			case "redacted_thinking":
				modifiedAny = true
			case "":
				if thinkingText, hasThinking := block["thinking"].(string); hasThinking {
					if thinkingText != "" {
						filtered = append(filtered, map[string]any{
							"type": "text",
							"text": thinkingText,
						})
					}
					modifiedAny = true
				} else {
					filtered = append(filtered, block)
				}
			default:
				filtered = append(filtered, block)
			}
		}

		if !modifiedAny {
			continue
		}

		if len(filtered) == 0 {
			filtered = append(filtered, map[string]any{
				"type": "text",
				"text": "(content removed)",
			})
		}

		newRaw, err := json.Marshal(filtered)
		if err != nil {
			return changed, err
		}
		req.Messages[i].Content = newRaw
		changed = true
	}

	return changed, nil
}

// stripSignatureSensitiveBlocksFromClaudeRequest is a stronger retry degradation that additionally converts
// tool blocks to plain text. Use this only after a thinking-only retry still fails with signature errors.
func stripSignatureSensitiveBlocksFromClaudeRequest(req *antigravity.ClaudeRequest) (bool, error) {
	if req == nil {
		return false, nil
	}

	changed := false
	if req.Thinking != nil {
		req.Thinking = nil
		changed = true
	}

	for i := range req.Messages {
		raw := req.Messages[i].Content
		if len(raw) == 0 {
			continue
		}

		// If content is a string, nothing to strip.
		var str string
		if json.Unmarshal(raw, &str) == nil {
			continue
		}

		// Otherwise treat as an array of blocks and convert signature-sensitive blocks to text.
		var blocks []map[string]any
		if err := json.Unmarshal(raw, &blocks); err != nil {
			continue
		}

		filtered := make([]map[string]any, 0, len(blocks))
		modifiedAny := false
		for _, block := range blocks {
			t, _ := block["type"].(string)
			switch t {
			case "thinking":
				// Convert thinking to text, skip if empty
				thinkingText, _ := block["thinking"].(string)
				if thinkingText != "" {
					filtered = append(filtered, map[string]any{
						"type": "text",
						"text": thinkingText,
					})
				}
				modifiedAny = true
			case "redacted_thinking":
				// Remove redacted_thinking (cannot convert encrypted content)
				modifiedAny = true
			case "tool_use":
				// Convert tool_use to text to avoid upstream signature/thought_signature validation errors.
				// This is a retry-only degradation path, so we prioritise request validity over tool semantics.
				name, _ := block["name"].(string)
				id, _ := block["id"].(string)
				input := block["input"]
				inputJSON, _ := json.Marshal(input)
				text := "(tool_use)"
				if name != "" {
					text += " name=" + name
				}
				if id != "" {
					text += " id=" + id
				}
				if len(inputJSON) > 0 && string(inputJSON) != "null" {
					text += " input=" + string(inputJSON)
				}
				filtered = append(filtered, map[string]any{
					"type": "text",
					"text": text,
				})
				modifiedAny = true
			case "tool_result":
				// Convert tool_result to text so it stays consistent when tool_use is downgraded.
				toolUseID, _ := block["tool_use_id"].(string)
				isError, _ := block["is_error"].(bool)
				content := block["content"]
				contentJSON, _ := json.Marshal(content)
				text := "(tool_result)"
				if toolUseID != "" {
					text += " tool_use_id=" + toolUseID
				}
				if isError {
					text += " is_error=true"
				}
				if len(contentJSON) > 0 && string(contentJSON) != "null" {
					text += "\n" + string(contentJSON)
				}
				filtered = append(filtered, map[string]any{
					"type": "text",
					"text": text,
				})
				modifiedAny = true
			case "":
				// Handle untyped block with "thinking" field
				if thinkingText, hasThinking := block["thinking"].(string); hasThinking {
					if thinkingText != "" {
						filtered = append(filtered, map[string]any{
							"type": "text",
							"text": thinkingText,
						})
					}
					modifiedAny = true
				} else {
					filtered = append(filtered, block)
				}
			default:
				filtered = append(filtered, block)
			}
		}

		if !modifiedAny {
			continue
		}

		if len(filtered) == 0 {
			// Keep request valid: upstream rejects empty content arrays.
			filtered = append(filtered, map[string]any{
				"type": "text",
				"text": "(content removed)",
			})
		}

		newRaw, err := json.Marshal(filtered)
		if err != nil {
			return changed, err
		}
		req.Messages[i].Content = newRaw
		changed = true
	}

	return changed, nil
}

// ForwardGemini 转发 Gemini 协议请求
func (s *AntigravityGatewayService) ForwardGemini(ctx context.Context, c *gin.Context, account *Account, originalModel string, action string, stream bool, body []byte) (*ForwardResult, error) {
	if account != nil && account.Type == AccountTypeUpstream {
		return s.ForwardUpstreamGemini(ctx, c, account, originalModel, action, stream, body)
	}

	startTime := time.Now()
	sessionID := getSessionID(c)
	prefix := logPrefix(sessionID, account.Name)

	if strings.TrimSpace(originalModel) == "" {
		return nil, s.writeGoogleError(c, http.StatusBadRequest, "Missing model in URL")
	}
	if strings.TrimSpace(action) == "" {
		return nil, s.writeGoogleError(c, http.StatusBadRequest, "Missing action in URL")
	}
	if len(body) == 0 {
		return nil, s.writeGoogleError(c, http.StatusBadRequest, "Request body is empty")
	}
	quotaScope, _ := resolveAntigravityQuotaScope(originalModel)

	// 解析请求以获取 image_size（用于图片计费）
	imageSize := s.extractImageSize(body)

	switch action {
	case "generateContent", "streamGenerateContent":
		// ok
	case "countTokens":
		// 直接返回空值，不透传上游
		c.JSON(http.StatusOK, map[string]any{"totalTokens": 0})
		return &ForwardResult{
			RequestID:    "",
			Usage:        ClaudeUsage{},
			Model:        originalModel,
			Stream:       false,
			Duration:     time.Since(time.Now()),
			FirstTokenMs: nil,
		}, nil
	default:
		return nil, s.writeGoogleError(c, http.StatusNotFound, "Unsupported action: "+action)
	}

	mappedModel := s.getMappedModel(account, originalModel)
	billingModel := originalModel
	if antigravityUseMappedModelForBilling() && strings.TrimSpace(mappedModel) != "" {
		billingModel = mappedModel
	}
	afterSwitch := antigravityHasAccountSwitch(ctx)
	maxRetries := antigravityMaxRetriesForModel(originalModel, afterSwitch)

	// 获取 access_token
	if s.tokenProvider == nil {
		return nil, errors.New("antigravity token provider not configured")
	}
	accessToken, err := s.tokenProvider.GetAccessToken(ctx, account)
	if err != nil {
		return nil, fmt.Errorf("获取 access_token 失败: %w", err)
	}

	// 获取 project_id（部分账户类型可能没有）
	projectID := strings.TrimSpace(account.GetCredential("project_id"))

	// 代理 URL
	proxyURL := ""
	if account.ProxyID != nil && account.Proxy != nil {
		proxyURL = account.Proxy.URL()
	}

	// 过滤掉 parts 为空的消息（Gemini API 不接受空 parts）
	filteredBody, err := filterEmptyPartsFromGeminiRequest(body)
	if err != nil {
		log.Printf("[Antigravity] Failed to filter empty parts: %v", err)
		filteredBody = body
	}

	// Antigravity 上游要求必须包含身份提示词，注入到请求中
	injectedBody, err := injectIdentityPatchToGeminiRequest(filteredBody)
	if err != nil {
		return nil, err
	}

	// 清理 Schema
	if cleanedBody, err := cleanGeminiRequest(injectedBody); err == nil {
		injectedBody = cleanedBody
		log.Printf("[Antigravity] Cleaned request schema in forwarded request for account %s", account.Name)
	} else {
		log.Printf("[Antigravity] Failed to clean schema: %v", err)
	}

	// 包装请求
	wrappedBody, err := s.wrapV1InternalRequest(projectID, mappedModel, injectedBody)
	if err != nil {
		return nil, err
	}

	// Antigravity 上游只支持流式请求，统一使用 streamGenerateContent
	// 如果客户端请求非流式，在响应处理阶段会收集完整流式响应后返回
	upstreamAction := "streamGenerateContent"

	// 执行带重试的请求
	result, err := antigravityRetryLoop(antigravityRetryLoopParams{
		ctx:            ctx,
		prefix:         prefix,
		account:        account,
		proxyURL:       proxyURL,
		accessToken:    accessToken,
		action:         upstreamAction,
		body:           wrappedBody,
		quotaScope:     quotaScope,
		c:              c,
		httpUpstream:   s.httpUpstream,
		settingService: s.settingService,
		handleError:    s.handleUpstreamError,
		maxRetries:     maxRetries,
	})
	if err != nil {
		if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
			return nil, err
		}
		if strings.TrimSpace(proxyURL) != "" {
			log.Printf("%s upstream request error via proxy, triggering failover: %v", prefix, err)
			return nil, &UpstreamFailoverError{StatusCode: http.StatusBadGateway}
		}
		return nil, s.writeGoogleError(c, http.StatusBadGateway, "Upstream request failed after retries")
	}
	resp := result.resp
	defer func() {
		if resp != nil && resp.Body != nil {
			_ = resp.Body.Close()
		}
	}()

	// 处理错误响应
	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
		// 尽早关闭原始响应体，释放连接；后续逻辑仍可能需要读取 body，因此用内存副本重新包装。
		_ = resp.Body.Close()
		resp.Body = io.NopCloser(bytes.NewReader(respBody))

		// 模型兜底：模型不存在且开启 fallback 时，自动用 fallback 模型重试一次
		if s.settingService != nil && s.settingService.IsModelFallbackEnabled(ctx) &&
			isModelNotFoundError(resp.StatusCode, respBody) {
			fallbackModel := s.settingService.GetFallbackModel(ctx, PlatformAntigravity)
			if fallbackModel != "" && fallbackModel != mappedModel {
				log.Printf("[Antigravity] Model not found (%s), retrying with fallback model %s (account: %s)", mappedModel, fallbackModel, account.Name)

				fallbackWrapped, err := s.wrapV1InternalRequest(projectID, fallbackModel, injectedBody)
				if err == nil {
					fallbackReq, err := antigravity.NewAPIRequest(ctx, upstreamAction, accessToken, fallbackWrapped)
					if err == nil {
						fallbackResp, err := s.httpUpstream.Do(fallbackReq, proxyURL, account.ID, account.Concurrency)
						if err == nil && fallbackResp.StatusCode < 400 {
							_ = resp.Body.Close()
							resp = fallbackResp
						} else if fallbackResp != nil {
							_ = fallbackResp.Body.Close()
						}
					}
				}
			}
		}

		// fallback 成功：继续按正常响应处理
		if resp.StatusCode < 400 {
			goto handleSuccess
		}

		requestID := resp.Header.Get("x-request-id")
		if requestID != "" {
			c.Header("x-request-id", requestID)
		}

		unwrapped, unwrapErr := s.unwrapV1InternalResponse(respBody)
		unwrappedForOps := unwrapped
		if unwrapErr != nil || len(unwrappedForOps) == 0 {
			unwrappedForOps = respBody
		}
		s.handleUpstreamError(ctx, prefix, account, resp.StatusCode, resp.Header, respBody, quotaScope)
		upstreamMsg := strings.TrimSpace(extractAntigravityErrorMessage(unwrappedForOps))
		upstreamMsg = sanitizeUpstreamErrorMessage(upstreamMsg)

		logBody := s.settingService != nil && s.settingService.cfg != nil && s.settingService.cfg.Gateway.LogUpstreamErrorBody
		maxBytes := 2048
		if s.settingService != nil && s.settingService.cfg != nil && s.settingService.cfg.Gateway.LogUpstreamErrorBodyMaxBytes > 0 {
			maxBytes = s.settingService.cfg.Gateway.LogUpstreamErrorBodyMaxBytes
		}
		upstreamDetail := ""
		if logBody {
			upstreamDetail = truncateString(string(unwrappedForOps), maxBytes)
		}

		// Always record upstream context for Ops error logs, even when we will failover.
		setOpsUpstreamError(c, resp.StatusCode, upstreamMsg, upstreamDetail)

		if s.shouldFailoverUpstreamError(resp.StatusCode) {
			appendOpsUpstreamError(c, OpsUpstreamErrorEvent{
				Platform:           account.Platform,
				AccountID:          account.ID,
				AccountName:        account.Name,
				UpstreamStatusCode: resp.StatusCode,
				UpstreamRequestID:  requestID,
				Kind:               "failover",
				Message:            upstreamMsg,
				Detail:             upstreamDetail,
			})
			return nil, &UpstreamFailoverError{StatusCode: resp.StatusCode, ResponseBody: unwrappedForOps}
		}

		contentType := resp.Header.Get("Content-Type")
		if contentType == "" {
			contentType = "application/json"
		}
		appendOpsUpstreamError(c, OpsUpstreamErrorEvent{
			Platform:           account.Platform,
			AccountID:          account.ID,
			AccountName:        account.Name,
			UpstreamStatusCode: resp.StatusCode,
			UpstreamRequestID:  requestID,
			Kind:               "http_error",
			Message:            upstreamMsg,
			Detail:             upstreamDetail,
		})
		log.Printf("[antigravity-Forward] upstream error status=%d body=%s", resp.StatusCode, truncateForLog(unwrappedForOps, 500))
		c.Data(resp.StatusCode, contentType, unwrappedForOps)
		return nil, fmt.Errorf("antigravity upstream error: %d", resp.StatusCode)
	}

handleSuccess:
	requestID := resp.Header.Get("x-request-id")
	if requestID != "" {
		c.Header("x-request-id", requestID)
	}

	var usage *ClaudeUsage
	var firstTokenMs *int
	var clientDisconnect bool

	if stream {
		// 客户端要求流式，直接透传
		streamRes, err := s.handleGeminiStreamingResponse(c, resp, startTime)
		if err != nil {
			log.Printf("%s status=stream_error error=%v", prefix, err)
			return nil, err
		}
		usage = streamRes.usage
		firstTokenMs = streamRes.firstTokenMs
		clientDisconnect = streamRes.clientDisconnect
	} else {
		// 客户端要求非流式，收集流式响应后返回
		streamRes, err := s.handleGeminiStreamToNonStreaming(c, resp, startTime)
		if err != nil {
			log.Printf("%s status=stream_collect_error error=%v", prefix, err)
			return nil, err
		}
		usage = streamRes.usage
		firstTokenMs = streamRes.firstTokenMs
	}

	if usage == nil {
		usage = &ClaudeUsage{}
	}

	// 判断是否为图片生成模型
	imageCount := 0
	if isImageGenerationModel(mappedModel) {
		// Gemini 图片生成 API 每次请求只生成一张图片（API 限制）
		imageCount = 1
	}

	return &ForwardResult{
		RequestID:        requestID,
		Usage:            *usage,
		Model:            billingModel,
		Stream:           stream,
		Duration:         time.Since(startTime),
		FirstTokenMs:     firstTokenMs,
		ClientDisconnect: clientDisconnect,
		ImageCount:       imageCount,
		ImageSize:        imageSize,
	}, nil
}

func (s *AntigravityGatewayService) shouldFailoverUpstreamError(statusCode int) bool {
	switch statusCode {
	case 401, 403, 429, 529:
		return true
	default:
		return statusCode >= 500
	}
}

// sleepAntigravityBackoffWithContext 带 context 取消检查的退避等待
// 返回 true 表示正常完成等待，false 表示 context 已取消
func sleepAntigravityBackoffWithContext(ctx context.Context, attempt int) bool {
	delay := antigravityRetryBaseDelay * time.Duration(1<<uint(attempt-1))
	if delay > antigravityRetryMaxDelay {
		delay = antigravityRetryMaxDelay
	}

	// +/- 20% jitter
	r := mathrand.New(mathrand.NewSource(time.Now().UnixNano()))
	jitter := time.Duration(float64(delay) * 0.2 * (r.Float64()*2 - 1))
	sleepFor := delay + jitter
	if sleepFor < 0 {
		sleepFor = 0
	}

	select {
	case <-ctx.Done():
		return false
	case <-time.After(sleepFor):
		return true
	}
}

func antigravityUseScopeRateLimit() bool {
	v := strings.ToLower(strings.TrimSpace(os.Getenv(antigravityScopeRateLimitEnv)))
	// 默认开启按配额域限流，只有明确设置为禁用值时才关闭
	if v == "0" || v == "false" || v == "no" || v == "off" {
		return false
	}
	return true
}

func antigravityUseMappedModelForBilling() bool {
	v := strings.ToLower(strings.TrimSpace(os.Getenv(antigravityBillingModelEnv)))
	return v == "1" || v == "true" || v == "yes" || v == "on"
}

func antigravityHasAccountSwitch(ctx context.Context) bool {
	if ctx == nil {
		return false
	}
	if v, ok := ctx.Value(ctxkey.AccountSwitchCount).(int); ok {
		return v > 0
	}
	return false
}

func antigravityFallbackCooldownSeconds() (time.Duration, bool) {
	raw := strings.TrimSpace(os.Getenv(antigravityFallbackSecondsEnv))
	if raw == "" {
		return 0, false
	}
	seconds, err := strconv.Atoi(raw)
	if err != nil || seconds <= 0 {
		return 0, false
	}
	return time.Duration(seconds) * time.Second, true
}

func antigravityMaxRetries() int {
	raw := strings.TrimSpace(os.Getenv(antigravityMaxRetriesEnv))
	if raw == "" {
		return antigravityDefaultMaxRetries
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return antigravityDefaultMaxRetries
	}
	return value
}

func antigravityMaxRetriesAfterSwitch() int {
	raw := strings.TrimSpace(os.Getenv(antigravityMaxRetriesAfterSwitchEnv))
	if raw == "" {
		raw = strings.TrimSpace(os.Getenv(antigravityMaxRetriesAfterSwitchAlt))
	}
	if raw == "" {
		return antigravityMaxRetries()
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return antigravityMaxRetries()
	}
	return value
}

// antigravityMaxRetriesForModel returns retry count by model class with fallback.
func antigravityMaxRetriesForModel(model string, afterSwitch bool) int {
	var envKey string
	if strings.HasPrefix(model, "claude-") {
		envKey = antigravityMaxRetriesClaudeEnv
	} else if isImageGenerationModel(model) {
		envKey = antigravityMaxRetriesGeminiImageEnv
	} else if strings.HasPrefix(model, "gemini-") {
		envKey = antigravityMaxRetriesGeminiTextEnv
	}

	if envKey != "" {
		if raw := strings.TrimSpace(os.Getenv(envKey)); raw != "" {
			if value, err := strconv.Atoi(raw); err == nil && value > 0 {
				return value
			}
		}
	}

	if afterSwitch {
		return antigravityMaxRetriesAfterSwitch()
	}
	return antigravityMaxRetries()
}

func (s *AntigravityGatewayService) handleUpstreamError(ctx context.Context, prefix string, account *Account, statusCode int, headers http.Header, body []byte, quotaScope AntigravityQuotaScope) {
	// 429 使用 Gemini 格式解析（从 body 解析重置时间）
	if statusCode == 429 {
		useScopeLimit := antigravityUseScopeRateLimit() && quotaScope != ""
		resetAt := ParseGeminiRateLimitResetTime(body)
		defaultDur := s.getDefaultRateLimitDuration()
		resetTime := s.resolveResetTime(resetAt, defaultDur)
		if useScopeLimit {
			if resetAt == nil {
				log.Printf("%s status=429 rate_limited scope=%s reset_in=%v (fallback)", prefix, quotaScope, defaultDur)
			} else {
				log.Printf("%s status=429 rate_limited scope=%s reset_at=%v reset_in=%v", prefix, quotaScope, resetTime.Format("15:04:05"), time.Until(resetTime).Truncate(time.Second))
			}
			if err := s.accountRepo.SetAntigravityQuotaScopeLimit(ctx, account.ID, quotaScope, resetTime); err != nil {
				log.Printf("%s status=429 rate_limit_set_failed scope=%s error=%v", prefix, quotaScope, err)
			}
		} else {
			if resetAt == nil {
				log.Printf("%s status=429 rate_limited account=%d reset_in=%v (fallback)", prefix, account.ID, defaultDur)
			} else {
				log.Printf("%s status=429 rate_limited account=%d reset_at=%v reset_in=%v", prefix, account.ID, resetTime.Format("15:04:05"), time.Until(resetTime).Truncate(time.Second))
			}
			if err := s.accountRepo.SetRateLimited(ctx, account.ID, resetTime); err != nil {
				log.Printf("%s status=429 rate_limit_set_failed account=%d error=%v", prefix, account.ID, err)
			}
		}
		return
	}
	// 其他错误码继续使用 rateLimitService
	if s.rateLimitService == nil {
		return
	}
	shouldDisable := s.rateLimitService.HandleUpstreamError(ctx, account, statusCode, headers, body)
	if shouldDisable {
		log.Printf("%s status=%d marked_error", prefix, statusCode)
	}
}

func (s *AntigravityGatewayService) getDefaultRateLimitDuration() time.Duration {
	fallbackSeconds := 30
	if s.settingService != nil && s.settingService.cfg != nil && s.settingService.cfg.Gateway.AntigravityFallbackCooldownMinutes > 0 {
		fallbackSeconds = s.settingService.cfg.Gateway.AntigravityFallbackCooldownMinutes * 60
	}

	defaultDur := time.Duration(fallbackSeconds) * time.Second
	if override, ok := antigravityFallbackCooldownSeconds(); ok {
		defaultDur = override
	}
	return defaultDur
}

func (s *AntigravityGatewayService) resolveResetTime(resetAt *int64, defaultDur time.Duration) time.Time {
	if resetAt != nil {
		return time.Unix(*resetAt, 0)
	}
	return time.Now().Add(defaultDur)
}

type antigravityStreamResult struct {
	usage            *ClaudeUsage
	firstTokenMs     *int
	clientDisconnect bool
}

func (s *AntigravityGatewayService) handleGeminiStreamingResponse(c *gin.Context, resp *http.Response, startTime time.Time) (*antigravityStreamResult, error) {
	c.Status(resp.StatusCode)
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "text/event-stream; charset=utf-8"
	}
	c.Header("Content-Type", contentType)

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		return nil, errors.New("streaming not supported")
	}

	// 使用 Scanner 并限制单行大小，避免 ReadString 无上限导致 OOM
	scanner := bufio.NewScanner(resp.Body)
	maxLineSize := defaultMaxLineSize
	if s.settingService.cfg != nil && s.settingService.cfg.Gateway.MaxLineSize > 0 {
		maxLineSize = s.settingService.cfg.Gateway.MaxLineSize
	}
	scanner.Buffer(make([]byte, 64*1024), maxLineSize)
	usage := &ClaudeUsage{}
	var firstTokenMs *int
	clientDisconnected := false

	type scanEvent struct {
		line string
		err  error
	}
	// 独立 goroutine 读取上游，避免读取阻塞影响超时处理
	events := make(chan scanEvent, 16)
	done := make(chan struct{})
	sendEvent := func(ev scanEvent) bool {
		select {
		case events <- ev:
			return true
		case <-done:
			return false
		}
	}
	var lastReadAt int64
	atomic.StoreInt64(&lastReadAt, time.Now().UnixNano())
	go func() {
		defer close(events)
		for scanner.Scan() {
			atomic.StoreInt64(&lastReadAt, time.Now().UnixNano())
			if !sendEvent(scanEvent{line: scanner.Text()}) {
				return
			}
		}
		if err := scanner.Err(); err != nil {
			_ = sendEvent(scanEvent{err: err})
		}
	}()
	defer close(done)

	// 上游数据间隔超时保护（防止上游挂起长期占用连接）
	streamInterval := time.Duration(0)
	if s.settingService.cfg != nil && s.settingService.cfg.Gateway.StreamDataIntervalTimeout > 0 {
		streamInterval = time.Duration(s.settingService.cfg.Gateway.StreamDataIntervalTimeout) * time.Second
	}
	var intervalTicker *time.Ticker
	if streamInterval > 0 {
		intervalTicker = time.NewTicker(streamInterval)
		defer intervalTicker.Stop()
	}
	var intervalCh <-chan time.Time
	if intervalTicker != nil {
		intervalCh = intervalTicker.C
	}

	// 仅发送一次错误事件，避免多次写入导致协议混乱
	errorEventSent := false
	sendErrorEvent := func(reason string) {
		if clientDisconnected {
			return
		}
		if errorEventSent {
			return
		}
		errorEventSent = true
		_, _ = fmt.Fprintf(c.Writer, "event: error\ndata: {\"error\":\"%s\"}\n\n", reason)
		flusher.Flush()
	}

	for {
		select {
		case ev, ok := <-events:
			if !ok {
				return &antigravityStreamResult{usage: usage, firstTokenMs: firstTokenMs, clientDisconnect: clientDisconnected}, nil
			}
			if ev.err != nil {
				if errors.Is(ev.err, context.Canceled) || errors.Is(ev.err, context.DeadlineExceeded) {
					return &antigravityStreamResult{usage: usage, firstTokenMs: firstTokenMs, clientDisconnect: true}, nil
				}
				if clientDisconnected {
					log.Printf("Upstream read error after client disconnect (antigravity): %v", ev.err)
					return &antigravityStreamResult{usage: usage, firstTokenMs: firstTokenMs, clientDisconnect: true}, nil
				}
				if errors.Is(ev.err, bufio.ErrTooLong) {
					log.Printf("SSE line too long (antigravity): max_size=%d error=%v", maxLineSize, ev.err)
					sendErrorEvent("response_too_large")
					return &antigravityStreamResult{usage: usage, firstTokenMs: firstTokenMs}, ev.err
				}
				sendErrorEvent("stream_read_error")
				return nil, ev.err
			}

			line := ev.line
			trimmed := strings.TrimRight(line, "\r\n")
			if strings.HasPrefix(trimmed, "data:") {
				payload := strings.TrimSpace(strings.TrimPrefix(trimmed, "data:"))
				if payload == "" || payload == "[DONE]" {
					if !clientDisconnected {
						if _, err := fmt.Fprintf(c.Writer, "%s\n", line); err != nil {
							clientDisconnected = true
							log.Printf("Client disconnected during antigravity stream, continuing to drain upstream for billing")
						} else {
							flusher.Flush()
						}
					}
					continue
				}

				// 解包 v1internal 响应
				inner, parseErr := s.unwrapV1InternalResponse([]byte(payload))
				if parseErr == nil && inner != nil {
					payload = string(inner)
				}

				// 解析 usage
				var parsed map[string]any
				if json.Unmarshal(inner, &parsed) == nil {
					if u := extractGeminiUsage(parsed); u != nil {
						usage = u
					}
					// Check for MALFORMED_FUNCTION_CALL
					if candidates, ok := parsed["candidates"].([]any); ok && len(candidates) > 0 {
						if cand, ok := candidates[0].(map[string]any); ok {
							if fr, ok := cand["finishReason"].(string); ok && fr == "MALFORMED_FUNCTION_CALL" {
								log.Printf("[Antigravity] MALFORMED_FUNCTION_CALL detected in forward stream")
								if content, ok := cand["content"]; ok {
									if b, err := json.Marshal(content); err == nil {
										log.Printf("[Antigravity] Malformed content: %s", string(b))
									}
								}
							}
						}
					}
				}

				if firstTokenMs == nil {
					ms := int(time.Since(startTime).Milliseconds())
					firstTokenMs = &ms
				}

				if !clientDisconnected {
					if _, err := fmt.Fprintf(c.Writer, "data: %s\n\n", payload); err != nil {
						clientDisconnected = true
						log.Printf("Client disconnected during antigravity stream, continuing to drain upstream for billing")
					} else {
						flusher.Flush()
					}
				}
				continue
			}

			if !clientDisconnected {
				if _, err := fmt.Fprintf(c.Writer, "%s\n", line); err != nil {
					clientDisconnected = true
					log.Printf("Client disconnected during antigravity stream, continuing to drain upstream for billing")
				} else {
					flusher.Flush()
				}
			}

		case <-intervalCh:
			lastRead := time.Unix(0, atomic.LoadInt64(&lastReadAt))
			if time.Since(lastRead) < streamInterval {
				continue
			}
			if clientDisconnected {
				return &antigravityStreamResult{usage: usage, firstTokenMs: firstTokenMs, clientDisconnect: true}, nil
			}
			log.Printf("Stream data interval timeout (antigravity)")
			// 注意：此函数没有 account 上下文，无法调用 HandleStreamTimeout
			sendErrorEvent("stream_timeout")
			return &antigravityStreamResult{usage: usage, firstTokenMs: firstTokenMs}, fmt.Errorf("stream data interval timeout")
		}
	}
}

// handleGeminiStreamToNonStreaming 读取上游流式响应，合并为非流式响应返回给客户端
// Gemini 流式响应是增量的，需要累积所有 chunk 的内容
func (s *AntigravityGatewayService) handleGeminiStreamToNonStreaming(c *gin.Context, resp *http.Response, startTime time.Time) (*antigravityStreamResult, error) {
	scanner := bufio.NewScanner(resp.Body)
	maxLineSize := defaultMaxLineSize
	if s.settingService.cfg != nil && s.settingService.cfg.Gateway.MaxLineSize > 0 {
		maxLineSize = s.settingService.cfg.Gateway.MaxLineSize
	}
	scanner.Buffer(make([]byte, 64*1024), maxLineSize)

	usage := &ClaudeUsage{}
	var firstTokenMs *int
	var last map[string]any
	var lastWithParts map[string]any
	var collectedImageParts []map[string]any // 收集所有包含图片的 parts
	var collectedTextParts []string          // 收集所有文本片段

	type scanEvent struct {
		line string
		err  error
	}

	// 独立 goroutine 读取上游，避免读取阻塞影响超时处理
	events := make(chan scanEvent, 16)
	done := make(chan struct{})
	sendEvent := func(ev scanEvent) bool {
		select {
		case events <- ev:
			return true
		case <-done:
			return false
		}
	}

	var lastReadAt int64
	atomic.StoreInt64(&lastReadAt, time.Now().UnixNano())
	go func() {
		defer close(events)
		for scanner.Scan() {
			atomic.StoreInt64(&lastReadAt, time.Now().UnixNano())
			if !sendEvent(scanEvent{line: scanner.Text()}) {
				return
			}
		}
		if err := scanner.Err(); err != nil {
			_ = sendEvent(scanEvent{err: err})
		}
	}()
	defer close(done)

	// 上游数据间隔超时保护（防止上游挂起长期占用连接）
	streamInterval := time.Duration(0)
	if s.settingService.cfg != nil && s.settingService.cfg.Gateway.StreamDataIntervalTimeout > 0 {
		streamInterval = time.Duration(s.settingService.cfg.Gateway.StreamDataIntervalTimeout) * time.Second
	}
	var intervalTicker *time.Ticker
	if streamInterval > 0 {
		intervalTicker = time.NewTicker(streamInterval)
		defer intervalTicker.Stop()
	}
	var intervalCh <-chan time.Time
	if intervalTicker != nil {
		intervalCh = intervalTicker.C
	}

	for {
		select {
		case ev, ok := <-events:
			if !ok {
				// 流结束，返回收集的响应
				goto returnResponse
			}
			if ev.err != nil {
				if errors.Is(ev.err, bufio.ErrTooLong) {
					log.Printf("SSE line too long (antigravity non-stream): max_size=%d error=%v", maxLineSize, ev.err)
				}
				return nil, ev.err
			}

			line := ev.line
			trimmed := strings.TrimRight(line, "\r\n")

			if !strings.HasPrefix(trimmed, "data:") {
				continue
			}

			payload := strings.TrimSpace(strings.TrimPrefix(trimmed, "data:"))
			if payload == "" || payload == "[DONE]" {
				continue
			}

			// 解包 v1internal 响应
			inner, parseErr := s.unwrapV1InternalResponse([]byte(payload))
			if parseErr != nil {
				continue
			}

			var parsed map[string]any
			if err := json.Unmarshal(inner, &parsed); err != nil {
				continue
			}

			// 记录首 token 时间
			if firstTokenMs == nil {
				ms := int(time.Since(startTime).Milliseconds())
				firstTokenMs = &ms
			}

			last = parsed

			// 提取 usage
			if u := extractGeminiUsage(parsed); u != nil {
				usage = u
			}

			// Check for MALFORMED_FUNCTION_CALL
			if candidates, ok := parsed["candidates"].([]any); ok && len(candidates) > 0 {
				if cand, ok := candidates[0].(map[string]any); ok {
					if fr, ok := cand["finishReason"].(string); ok && fr == "MALFORMED_FUNCTION_CALL" {
						log.Printf("[Antigravity] MALFORMED_FUNCTION_CALL detected in forward non-stream collect")
						if content, ok := cand["content"]; ok {
							if b, err := json.Marshal(content); err == nil {
								log.Printf("[Antigravity] Malformed content: %s", string(b))
							}
						}
					}
				}
			}

			// 保留最后一个有 parts 的响应
			if parts := extractGeminiParts(parsed); len(parts) > 0 {
				lastWithParts = parsed
				// 收集包含图片和文本的 parts
				for _, part := range parts {
					if inlineData, ok := part["inlineData"].(map[string]any); ok {
						collectedImageParts = append(collectedImageParts, part)
						_ = inlineData // 避免 unused 警告
					}
					if text, ok := part["text"].(string); ok && text != "" {
						collectedTextParts = append(collectedTextParts, text)
					}
				}
			}

		case <-intervalCh:
			lastRead := time.Unix(0, atomic.LoadInt64(&lastReadAt))
			if time.Since(lastRead) < streamInterval {
				continue
			}
			log.Printf("Stream data interval timeout (antigravity non-stream)")
			return nil, fmt.Errorf("stream data interval timeout")
		}
	}

returnResponse:
	// 选择最后一个有效响应
	finalResponse := pickGeminiCollectResult(last, lastWithParts)

	// 处理空响应情况
	if last == nil && lastWithParts == nil {
		log.Printf("[antigravity-Forward] warning: empty stream response, no valid chunks received")
	}

	// 如果收集到了图片 parts，需要合并到最终响应中
	if len(collectedImageParts) > 0 {
		finalResponse = mergeImagePartsToResponse(finalResponse, collectedImageParts)
	}

	// 如果收集到了文本，需要合并到最终响应中
	if len(collectedTextParts) > 0 {
		finalResponse = mergeTextPartsToResponse(finalResponse, collectedTextParts)
	}

	respBody, err := json.Marshal(finalResponse)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal response: %w", err)
	}
	c.Data(http.StatusOK, "application/json", respBody)

	return &antigravityStreamResult{usage: usage, firstTokenMs: firstTokenMs}, nil
}

// getOrCreateGeminiParts 获取 Gemini 响应的 parts 结构，返回深拷贝和更新回调
func getOrCreateGeminiParts(response map[string]any) (result map[string]any, existingParts []any, setParts func([]any)) {
	// 深拷贝 response
	result = make(map[string]any)
	for k, v := range response {
		result[k] = v
	}

	// 获取或创建 candidates
	candidates, ok := result["candidates"].([]any)
	if !ok || len(candidates) == 0 {
		candidates = []any{map[string]any{}}
	}

	// 获取第一个 candidate
	candidate, ok := candidates[0].(map[string]any)
	if !ok {
		candidate = make(map[string]any)
		candidates[0] = candidate
	}

	// 获取或创建 content
	content, ok := candidate["content"].(map[string]any)
	if !ok {
		content = map[string]any{"role": "model"}
		candidate["content"] = content
	}

	// 获取现有 parts
	existingParts, ok = content["parts"].([]any)
	if !ok {
		existingParts = []any{}
	}

	// 返回更新回调
	setParts = func(newParts []any) {
		content["parts"] = newParts
		result["candidates"] = candidates
	}

	return result, existingParts, setParts
}

// mergeCollectedPartsToResponse 将收集的所有 parts 合并到 Gemini 响应中
// 这个函数会合并所有类型的 parts：text、thinking、functionCall、inlineData 等
// 保持原始顺序，只合并连续的普通 text parts
func mergeCollectedPartsToResponse(response map[string]any, collectedParts []map[string]any) map[string]any {
	if len(collectedParts) == 0 {
		return response
	}

	result, _, setParts := getOrCreateGeminiParts(response)

	// 合并策略：
	// 1. 保持原始顺序
	// 2. 连续的普通 text parts 合并为一个
	// 3. thinking、functionCall、inlineData 等保持原样
	var mergedParts []any
	var textBuffer strings.Builder

	flushTextBuffer := func() {
		if textBuffer.Len() > 0 {
			mergedParts = append(mergedParts, map[string]any{
				"text": textBuffer.String(),
			})
			textBuffer.Reset()
		}
	}

	for _, part := range collectedParts {
		// 检查是否是普通 text part
		if text, ok := part["text"].(string); ok {
			// 检查是否有 thought 标记
			if thought, _ := part["thought"].(bool); thought {
				// thinking part，先刷新 text buffer，然后保留原样
				flushTextBuffer()
				mergedParts = append(mergedParts, part)
			} else {
				// 普通 text，累积到 buffer
				_, _ = textBuffer.WriteString(text)
			}
		} else {
			// 非 text part（functionCall、inlineData 等），先刷新 text buffer，然后保留原样
			flushTextBuffer()
			mergedParts = append(mergedParts, part)
		}
	}

	// 刷新剩余的 text
	flushTextBuffer()

	setParts(mergedParts)
	return result
}

// mergeImagePartsToResponse 将收集到的图片 parts 合并到 Gemini 响应中
func mergeImagePartsToResponse(response map[string]any, imageParts []map[string]any) map[string]any {
	if len(imageParts) == 0 {
		return response
	}

	result, existingParts, setParts := getOrCreateGeminiParts(response)

	// 检查现有 parts 中是否已经有图片
	for _, p := range existingParts {
		if pm, ok := p.(map[string]any); ok {
			if _, hasInline := pm["inlineData"]; hasInline {
				return result // 已有图片，不重复添加
			}
		}
	}

	// 添加收集到的图片 parts
	for _, imgPart := range imageParts {
		existingParts = append(existingParts, imgPart)
	}
	setParts(existingParts)
	return result
}

// mergeTextPartsToResponse 将收集到的文本合并到 Gemini 响应中
func mergeTextPartsToResponse(response map[string]any, textParts []string) map[string]any {
	if len(textParts) == 0 {
		return response
	}

	mergedText := strings.Join(textParts, "")
	result, existingParts, setParts := getOrCreateGeminiParts(response)

	// 查找并更新第一个 text part，或创建新的
	newParts := make([]any, 0, len(existingParts)+1)
	textUpdated := false

	for _, p := range existingParts {
		pm, ok := p.(map[string]any)
		if !ok {
			newParts = append(newParts, p)
			continue
		}
		if _, hasText := pm["text"]; hasText && !textUpdated {
			// 用累积的文本替换
			newPart := make(map[string]any)
			for k, v := range pm {
				newPart[k] = v
			}
			newPart["text"] = mergedText
			newParts = append(newParts, newPart)
			textUpdated = true
		} else {
			newParts = append(newParts, pm)
		}
	}

	if !textUpdated {
		newParts = append([]any{map[string]any{"text": mergedText}}, newParts...)
	}

	setParts(newParts)
	return result
}

func (s *AntigravityGatewayService) writeClaudeError(c *gin.Context, status int, errType, message string) error {
	c.JSON(status, gin.H{
		"type":  "error",
		"error": gin.H{"type": errType, "message": message},
	})
	return fmt.Errorf("%s", message)
}

func (s *AntigravityGatewayService) writeMappedClaudeError(c *gin.Context, account *Account, upstreamStatus int, upstreamRequestID string, body []byte) error {
	upstreamMsg := strings.TrimSpace(extractUpstreamErrorMessage(body))
	upstreamMsg = sanitizeUpstreamErrorMessage(upstreamMsg)

	logBody := s.settingService != nil && s.settingService.cfg != nil && s.settingService.cfg.Gateway.LogUpstreamErrorBody
	maxBytes := 2048
	if s.settingService != nil && s.settingService.cfg != nil && s.settingService.cfg.Gateway.LogUpstreamErrorBodyMaxBytes > 0 {
		maxBytes = s.settingService.cfg.Gateway.LogUpstreamErrorBodyMaxBytes
	}

	upstreamDetail := ""
	if logBody {
		upstreamDetail = truncateString(string(body), maxBytes)
	}
	setOpsUpstreamError(c, upstreamStatus, upstreamMsg, upstreamDetail)
	appendOpsUpstreamError(c, OpsUpstreamErrorEvent{
		Platform:           account.Platform,
		AccountID:          account.ID,
		AccountName:        account.Name,
		UpstreamStatusCode: upstreamStatus,
		UpstreamRequestID:  upstreamRequestID,
		Kind:               "http_error",
		Message:            upstreamMsg,
		Detail:             upstreamDetail,
	})

	// 记录上游错误详情便于排障（可选：由配置控制；不回显到客户端）
	if logBody {
		log.Printf("[antigravity-Forward] upstream_error status=%d body=%s", upstreamStatus, truncateForLog(body, maxBytes))
	}

	var statusCode int
	var errType, errMsg string

	switch upstreamStatus {
	case 400:
		statusCode = http.StatusBadRequest
		errType = "invalid_request_error"
		errMsg = "Invalid request"
	case 401:
		statusCode = http.StatusBadGateway
		errType = "authentication_error"
		errMsg = "Upstream authentication failed"
	case 403:
		statusCode = http.StatusBadGateway
		errType = "permission_error"
		errMsg = "Upstream access forbidden"
	case 429:
		statusCode = http.StatusTooManyRequests
		errType = "rate_limit_error"
		errMsg = "Upstream rate limit exceeded"
	case 529:
		statusCode = http.StatusServiceUnavailable
		errType = "overloaded_error"
		errMsg = "Upstream service overloaded"
	default:
		statusCode = http.StatusBadGateway
		errType = "upstream_error"
		errMsg = "Upstream request failed"
	}

	c.JSON(statusCode, gin.H{
		"type":  "error",
		"error": gin.H{"type": errType, "message": errMsg},
	})
	if upstreamMsg == "" {
		return fmt.Errorf("upstream error: %d", upstreamStatus)
	}
	return fmt.Errorf("upstream error: %d message=%s", upstreamStatus, upstreamMsg)
}

func (s *AntigravityGatewayService) writeGoogleError(c *gin.Context, status int, message string) error {
	statusStr := "UNKNOWN"
	switch status {
	case 400:
		statusStr = "INVALID_ARGUMENT"
	case 404:
		statusStr = "NOT_FOUND"
	case 429:
		statusStr = "RESOURCE_EXHAUSTED"
	case 500:
		statusStr = "INTERNAL"
	case 502, 503:
		statusStr = "UNAVAILABLE"
	}

	c.JSON(status, gin.H{
		"error": gin.H{
			"code":    status,
			"message": message,
			"status":  statusStr,
		},
	})
	return fmt.Errorf("%s", message)
}

// handleClaudeStreamToNonStreaming 收集上游流式响应，转换为 Claude 非流式格式返回
// 用于处理客户端非流式请求但上游只支持流式的情况
func (s *AntigravityGatewayService) handleClaudeStreamToNonStreaming(c *gin.Context, resp *http.Response, startTime time.Time, originalModel string) (*antigravityStreamResult, error) {
	scanner := bufio.NewScanner(resp.Body)
	maxLineSize := defaultMaxLineSize
	if s.settingService.cfg != nil && s.settingService.cfg.Gateway.MaxLineSize > 0 {
		maxLineSize = s.settingService.cfg.Gateway.MaxLineSize
	}
	scanner.Buffer(make([]byte, 64*1024), maxLineSize)

	var firstTokenMs *int
	var last map[string]any
	var lastWithParts map[string]any
	var collectedParts []map[string]any // 收集所有 parts（包括 text、thinking、functionCall、inlineData 等）

	type scanEvent struct {
		line string
		err  error
	}

	// 独立 goroutine 读取上游，避免读取阻塞影响超时处理
	events := make(chan scanEvent, 16)
	done := make(chan struct{})
	sendEvent := func(ev scanEvent) bool {
		select {
		case events <- ev:
			return true
		case <-done:
			return false
		}
	}

	var lastReadAt int64
	atomic.StoreInt64(&lastReadAt, time.Now().UnixNano())
	go func() {
		defer close(events)
		for scanner.Scan() {
			atomic.StoreInt64(&lastReadAt, time.Now().UnixNano())
			if !sendEvent(scanEvent{line: scanner.Text()}) {
				return
			}
		}
		if err := scanner.Err(); err != nil {
			_ = sendEvent(scanEvent{err: err})
		}
	}()
	defer close(done)

	// 上游数据间隔超时保护（防止上游挂起长期占用连接）
	streamInterval := time.Duration(0)
	if s.settingService.cfg != nil && s.settingService.cfg.Gateway.StreamDataIntervalTimeout > 0 {
		streamInterval = time.Duration(s.settingService.cfg.Gateway.StreamDataIntervalTimeout) * time.Second
	}
	var intervalTicker *time.Ticker
	if streamInterval > 0 {
		intervalTicker = time.NewTicker(streamInterval)
		defer intervalTicker.Stop()
	}
	var intervalCh <-chan time.Time
	if intervalTicker != nil {
		intervalCh = intervalTicker.C
	}

	for {
		select {
		case ev, ok := <-events:
			if !ok {
				// 流结束，转换并返回响应
				goto returnResponse
			}
			if ev.err != nil {
				if errors.Is(ev.err, bufio.ErrTooLong) {
					log.Printf("SSE line too long (antigravity claude non-stream): max_size=%d error=%v", maxLineSize, ev.err)
				}
				return nil, ev.err
			}

			line := ev.line
			trimmed := strings.TrimRight(line, "\r\n")

			if !strings.HasPrefix(trimmed, "data:") {
				continue
			}

			payload := strings.TrimSpace(strings.TrimPrefix(trimmed, "data:"))
			if payload == "" || payload == "[DONE]" {
				continue
			}

			// 解包 v1internal 响应
			inner, parseErr := s.unwrapV1InternalResponse([]byte(payload))
			if parseErr != nil {
				continue
			}

			var parsed map[string]any
			if err := json.Unmarshal(inner, &parsed); err != nil {
				continue
			}

			// 记录首 token 时间
			if firstTokenMs == nil {
				ms := int(time.Since(startTime).Milliseconds())
				firstTokenMs = &ms
			}

			last = parsed

			// 保留最后一个有 parts 的响应，并收集所有 parts
			if parts := extractGeminiParts(parsed); len(parts) > 0 {
				lastWithParts = parsed
				// 收集所有 parts（text、thinking、functionCall、inlineData 等）
				collectedParts = append(collectedParts, parts...)
			}

		case <-intervalCh:
			lastRead := time.Unix(0, atomic.LoadInt64(&lastReadAt))
			if time.Since(lastRead) < streamInterval {
				continue
			}
			log.Printf("Stream data interval timeout (antigravity claude non-stream)")
			return nil, fmt.Errorf("stream data interval timeout")
		}
	}

returnResponse:
	// 选择最后一个有效响应
	finalResponse := pickGeminiCollectResult(last, lastWithParts)

	// 处理空响应情况
	if last == nil && lastWithParts == nil {
		log.Printf("[antigravity-Forward] warning: empty stream response, no valid chunks received")
		return nil, s.writeClaudeError(c, http.StatusBadGateway, "upstream_error", "Empty response from upstream")
	}

	// 将收集的所有 parts 合并到最终响应中
	if len(collectedParts) > 0 {
		finalResponse = mergeCollectedPartsToResponse(finalResponse, collectedParts)
	}
	geminiPayload := finalResponse
	if _, ok := finalResponse["response"]; !ok {
		wrapped := map[string]any{
			"response": finalResponse,
		}
		if respID, ok := finalResponse["responseId"]; ok {
			wrapped["responseId"] = respID
		}
		if modelVersion, ok := finalResponse["modelVersion"]; ok {
			wrapped["modelVersion"] = modelVersion
		}
		geminiPayload = wrapped
	}

	// 序列化为 JSON（Gemini 格式）
	geminiBody, err := json.Marshal(geminiPayload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal gemini response: %w", err)
	}

	// 转换 Gemini 响应为 Claude 格式
	claudeResp, agUsage, err := antigravity.TransformGeminiToClaude(geminiBody, originalModel)
	if err != nil {
		log.Printf("[antigravity-Forward] transform_error error=%v body=%s", err, string(geminiBody))
		return nil, s.writeClaudeError(c, http.StatusBadGateway, "upstream_error", "Failed to parse upstream response")
	}

	c.Data(http.StatusOK, "application/json", claudeResp)

	// 转换为 service.ClaudeUsage
	usage := &ClaudeUsage{
		InputTokens:              agUsage.InputTokens,
		OutputTokens:             agUsage.OutputTokens,
		CacheCreationInputTokens: agUsage.CacheCreationInputTokens,
		CacheReadInputTokens:     agUsage.CacheReadInputTokens,
	}

	return &antigravityStreamResult{usage: usage, firstTokenMs: firstTokenMs}, nil
}

// handleClaudeStreamingResponse 处理 Claude 流式响应（Gemini SSE → Claude SSE 转换）
func (s *AntigravityGatewayService) handleClaudeStreamingResponse(c *gin.Context, resp *http.Response, startTime time.Time, originalModel string) (*antigravityStreamResult, error) {
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")
	c.Status(http.StatusOK)

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		return nil, errors.New("streaming not supported")
	}

	processor := antigravity.NewStreamingProcessor(originalModel)
	var firstTokenMs *int
	clientDisconnected := false
	// 使用 Scanner 并限制单行大小，避免 ReadString 无上限导致 OOM
	scanner := bufio.NewScanner(resp.Body)
	maxLineSize := defaultMaxLineSize
	if s.settingService.cfg != nil && s.settingService.cfg.Gateway.MaxLineSize > 0 {
		maxLineSize = s.settingService.cfg.Gateway.MaxLineSize
	}
	scanner.Buffer(make([]byte, 64*1024), maxLineSize)

	// 辅助函数：转换 antigravity.ClaudeUsage 到 service.ClaudeUsage
	convertUsage := func(agUsage *antigravity.ClaudeUsage) *ClaudeUsage {
		if agUsage == nil {
			return &ClaudeUsage{}
		}
		return &ClaudeUsage{
			InputTokens:              agUsage.InputTokens,
			OutputTokens:             agUsage.OutputTokens,
			CacheCreationInputTokens: agUsage.CacheCreationInputTokens,
			CacheReadInputTokens:     agUsage.CacheReadInputTokens,
		}
	}

	type scanEvent struct {
		line string
		err  error
	}
	// 独立 goroutine 读取上游，避免读取阻塞影响超时处理
	events := make(chan scanEvent, 16)
	done := make(chan struct{})
	sendEvent := func(ev scanEvent) bool {
		select {
		case events <- ev:
			return true
		case <-done:
			return false
		}
	}
	var lastReadAt int64
	atomic.StoreInt64(&lastReadAt, time.Now().UnixNano())
	go func() {
		defer close(events)
		for scanner.Scan() {
			atomic.StoreInt64(&lastReadAt, time.Now().UnixNano())
			if !sendEvent(scanEvent{line: scanner.Text()}) {
				return
			}
		}
		if err := scanner.Err(); err != nil {
			_ = sendEvent(scanEvent{err: err})
		}
	}()
	defer close(done)

	streamInterval := time.Duration(0)
	if s.settingService.cfg != nil && s.settingService.cfg.Gateway.StreamDataIntervalTimeout > 0 {
		streamInterval = time.Duration(s.settingService.cfg.Gateway.StreamDataIntervalTimeout) * time.Second
	}
	var intervalTicker *time.Ticker
	if streamInterval > 0 {
		intervalTicker = time.NewTicker(streamInterval)
		defer intervalTicker.Stop()
	}
	var intervalCh <-chan time.Time
	if intervalTicker != nil {
		intervalCh = intervalTicker.C
	}

	// 仅发送一次错误事件，避免多次写入导致协议混乱
	errorEventSent := false
	sendErrorEvent := func(reason string) {
		if clientDisconnected {
			return
		}
		if errorEventSent {
			return
		}
		errorEventSent = true
		_, _ = fmt.Fprintf(c.Writer, "event: error\ndata: {\"error\":\"%s\"}\n\n", reason)
		flusher.Flush()
	}

	for {
		select {
		case ev, ok := <-events:
			if !ok {
				// 发送结束事件
				finalEvents, agUsage := processor.Finish()
				if len(finalEvents) > 0 {
					if !clientDisconnected {
						_, _ = c.Writer.Write(finalEvents)
						flusher.Flush()
					}
				}
				return &antigravityStreamResult{usage: convertUsage(agUsage), firstTokenMs: firstTokenMs, clientDisconnect: clientDisconnected}, nil
			}
			if ev.err != nil {
				if errors.Is(ev.err, context.Canceled) || errors.Is(ev.err, context.DeadlineExceeded) {
					return &antigravityStreamResult{usage: convertUsage(nil), firstTokenMs: firstTokenMs, clientDisconnect: true}, nil
				}
				if clientDisconnected {
					log.Printf("Upstream read error after client disconnect (antigravity Claude): %v", ev.err)
					return &antigravityStreamResult{usage: convertUsage(nil), firstTokenMs: firstTokenMs, clientDisconnect: true}, nil
				}
				if errors.Is(ev.err, bufio.ErrTooLong) {
					log.Printf("SSE line too long (antigravity): max_size=%d error=%v", maxLineSize, ev.err)
					sendErrorEvent("response_too_large")
					return &antigravityStreamResult{usage: convertUsage(nil), firstTokenMs: firstTokenMs}, ev.err
				}
				sendErrorEvent("stream_read_error")
				return nil, fmt.Errorf("stream read error: %w", ev.err)
			}

			line := ev.line
			// 处理 SSE 行，转换为 Claude 格式
			claudeEvents := processor.ProcessLine(strings.TrimRight(line, "\r\n"))

			if len(claudeEvents) > 0 {
				if firstTokenMs == nil {
					ms := int(time.Since(startTime).Milliseconds())
					firstTokenMs = &ms
				}

				if !clientDisconnected {
					if _, writeErr := c.Writer.Write(claudeEvents); writeErr != nil {
						clientDisconnected = true
						log.Printf("Client disconnected during antigravity Claude stream, continuing to drain upstream for billing")
					} else {
						flusher.Flush()
					}
				}
			}

		case <-intervalCh:
			lastRead := time.Unix(0, atomic.LoadInt64(&lastReadAt))
			if time.Since(lastRead) < streamInterval {
				continue
			}
			if clientDisconnected {
				return &antigravityStreamResult{usage: convertUsage(nil), firstTokenMs: firstTokenMs, clientDisconnect: true}, nil
			}
			log.Printf("Stream data interval timeout (antigravity)")
			// 注意：此函数没有 account 上下文，无法调用 HandleStreamTimeout
			sendErrorEvent("stream_timeout")
			return &antigravityStreamResult{usage: convertUsage(nil), firstTokenMs: firstTokenMs}, fmt.Errorf("stream data interval timeout")
		}
	}

}

// extractImageSize 从 Gemini 请求中提取 image_size 参数
func (s *AntigravityGatewayService) extractImageSize(body []byte) string {
	var req antigravity.GeminiRequest
	if err := json.Unmarshal(body, &req); err != nil {
		return "2K" // 默认 2K
	}

	if req.GenerationConfig != nil && req.GenerationConfig.ImageConfig != nil {
		size := strings.ToUpper(strings.TrimSpace(req.GenerationConfig.ImageConfig.ImageSize))
		if size == "1K" || size == "2K" || size == "4K" {
			return size
		}
	}

	return "2K" // 默认 2K
}

// isImageGenerationModel 判断模型是否为图片生成模型
// 支持的模型：gemini-3-pro-image, gemini-3-pro-image-preview, gemini-2.5-flash-image 等
func isImageGenerationModel(model string) bool {
	modelLower := strings.ToLower(model)
	// 移除 models/ 前缀
	modelLower = strings.TrimPrefix(modelLower, "models/")

	// 精确匹配或前缀匹配
	return modelLower == "gemini-3-pro-image" ||
		modelLower == "gemini-3-pro-image-preview" ||
		strings.HasPrefix(modelLower, "gemini-3-pro-image-") ||
		modelLower == "gemini-2.5-flash-image" ||
		modelLower == "gemini-2.5-flash-image-preview" ||
		strings.HasPrefix(modelLower, "gemini-2.5-flash-image-")
}

// cleanGeminiRequest 清理 Gemini 请求体中的 Schema
func cleanGeminiRequest(body []byte) ([]byte, error) {
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, err
	}

	modified := false

	// 1. 清理 Tools
	if tools, ok := payload["tools"].([]any); ok && len(tools) > 0 {
		for _, t := range tools {
			toolMap, ok := t.(map[string]any)
			if !ok {
				continue
			}

			// function_declarations (snake_case) or functionDeclarations (camelCase)
			var funcs []any
			if f, ok := toolMap["functionDeclarations"].([]any); ok {
				funcs = f
			} else if f, ok := toolMap["function_declarations"].([]any); ok {
				funcs = f
			}

			if len(funcs) == 0 {
				continue
			}

			for _, f := range funcs {
				funcMap, ok := f.(map[string]any)
				if !ok {
					continue
				}

				if params, ok := funcMap["parameters"].(map[string]any); ok {
					antigravity.DeepCleanUndefined(params)
					cleaned := antigravity.CleanJSONSchema(params)
					funcMap["parameters"] = cleaned
					modified = true
				}
			}
		}
	}

	if !modified {
		return body, nil
	}

	return json.Marshal(payload)
}

// filterEmptyPartsFromGeminiRequest 过滤 Gemini 请求中 parts 为空的消息。
// Gemini API 不接受 parts 为空数组的消息，会返回 400 INVALID_ARGUMENT。
func filterEmptyPartsFromGeminiRequest(body []byte) ([]byte, error) {
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, err
	}

	contents, ok := payload["contents"].([]any)
	if !ok || len(contents) == 0 {
		return body, nil
	}

	filtered := make([]any, 0, len(contents))
	modified := false

	for _, item := range contents {
		contentMap, ok := item.(map[string]any)
		if !ok {
			filtered = append(filtered, item)
			continue
		}

		parts, hasParts := contentMap["parts"]
		if !hasParts {
			filtered = append(filtered, item)
			continue
		}

		partsSlice, ok := parts.([]any)
		if !ok {
			filtered = append(filtered, item)
			continue
		}

		if len(partsSlice) == 0 {
			modified = true
			continue
		}

		filtered = append(filtered, item)
	}

	if !modified {
		return body, nil
	}

	payload["contents"] = filtered
	return json.Marshal(payload)
}

func copyUpstreamRequestHeaders(dst http.Header, c *gin.Context) {
	if dst == nil || c == nil || c.Request == nil {
		return
	}
	for key, values := range c.Request.Header {
		if upstreamHopByHopHeaders[strings.ToLower(key)] {
			continue
		}
		for _, v := range values {
			dst.Add(key, v)
		}
	}
}

func copyUpstreamResponseHeaders(c *gin.Context, src http.Header) {
	if c == nil || c.Writer == nil || src == nil {
		return
	}
	dst := c.Writer.Header()
	for key, values := range src {
		if upstreamHopByHopHeaders[strings.ToLower(key)] {
			continue
		}
		for _, v := range values {
			dst.Add(key, v)
		}
	}
}

// testUpstreamConnection 测试 upstream 账号连接
func (s *AntigravityGatewayService) testUpstreamConnection(ctx context.Context, account *Account, modelID string) (*TestConnectionResult, error) {
	baseURL := normalizeUpstreamBaseURL(account.GetCredential("base_url"))
	if baseURL == "" {
		return nil, errors.New("upstream account missing base_url in credentials")
	}
	apiKey := strings.TrimSpace(account.GetCredential("api_key"))
	if apiKey == "" {
		return nil, errors.New("upstream account missing api_key in credentials")
	}

	mappedModel := s.getMappedModel(account, modelID)
	if strings.TrimSpace(mappedModel) == "" {
		return nil, fmt.Errorf("model %s not in whitelist", modelID)
	}

	requestBody, _ := json.Marshal(map[string]any{
		"model":      mappedModel,
		"max_tokens": 1,
		"messages": []map[string]any{
			{"role": "user", "content": "."},
		},
		"stream": false,
	})

	apiURL := baseURL + "/antigravity/v1/messages"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewReader(requestBody))
	if err != nil {
		return nil, fmt.Errorf("构建请求失败: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	proxyURL := ""
	if account.ProxyID != nil && account.Proxy != nil {
		proxyURL = account.Proxy.URL()
	}

	resp, err := s.httpUpstream.Do(req, proxyURL, account.ID, account.Concurrency)
	if err != nil {
		return nil, fmt.Errorf("请求失败: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("API 返回 %d: %s", resp.StatusCode, string(respBody))
	}

	var claudeResp struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
	}
	text := ""
	if json.Unmarshal(respBody, &claudeResp) == nil && len(claudeResp.Content) > 0 {
		text = claudeResp.Content[0].Text
	}

	return &TestConnectionResult{
		Text:        text,
		MappedModel: mappedModel,
	}, nil
}

// ForwardUpstream 转发 Claude 协议请求到 upstream（不做协议转换）
func (s *AntigravityGatewayService) ForwardUpstream(ctx context.Context, c *gin.Context, account *Account, body []byte) (*ForwardResult, error) {
	startTime := time.Now()
	sessionID := getSessionID(c)
	prefix := logPrefix(sessionID, account.Name)

	baseURL := normalizeUpstreamBaseURL(account.GetCredential("base_url"))
	if baseURL == "" {
		return nil, s.writeClaudeError(c, http.StatusBadGateway, "api_error", "Upstream account missing base_url")
	}
	apiKey := strings.TrimSpace(account.GetCredential("api_key"))
	if apiKey == "" {
		return nil, s.writeClaudeError(c, http.StatusBadGateway, "authentication_error", "Upstream account missing api_key")
	}

	var claudeReq antigravity.ClaudeRequest
	if err := json.Unmarshal(body, &claudeReq); err != nil {
		return nil, s.writeClaudeError(c, http.StatusBadRequest, "invalid_request_error", "Invalid request body")
	}
	if strings.TrimSpace(claudeReq.Model) == "" {
		return nil, s.writeClaudeError(c, http.StatusBadRequest, "invalid_request_error", "Missing model")
	}

	originalModel := strings.TrimSpace(claudeReq.Model)
	mappedModel := strings.TrimSpace(s.getMappedModel(account, originalModel))
	if mappedModel == "" {
		return nil, s.writeClaudeError(c, http.StatusForbidden, "permission_error", fmt.Sprintf("model %s not in whitelist", originalModel))
	}
	quotaScope, _ := resolveAntigravityQuotaScope(originalModel)

	upstreamBody := body
	if mappedModel != originalModel {
		claudeReq.Model = mappedModel
		rewrittenBody, err := json.Marshal(&claudeReq)
		if err != nil {
			return nil, s.writeClaudeError(c, http.StatusInternalServerError, "api_error", "Failed to rewrite upstream model")
		}
		upstreamBody = rewrittenBody
	}

	proxyURL := ""
	if account.ProxyID != nil && account.Proxy != nil {
		proxyURL = account.Proxy.URL()
	}

	afterSwitch := antigravityHasAccountSwitch(ctx)
	maxRetries := antigravityMaxRetriesForModel(originalModel, afterSwitch)
	apiURL := baseURL + "/antigravity/v1/messages"

	log.Printf("%s upstream_forward url=%s model=%s", prefix, apiURL, mappedModel)

	var resp *http.Response
	var lastErr error
	for attempt := 1; attempt <= maxRetries; attempt++ {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewReader(upstreamBody))
		if err != nil {
			return nil, s.writeClaudeError(c, http.StatusInternalServerError, "api_error", "Failed to build request")
		}
		copyUpstreamRequestHeaders(req.Header, c)
		if strings.TrimSpace(req.Header.Get("Content-Type")) == "" {
			req.Header.Set("Content-Type", "application/json")
		}
		req.Header.Set("Authorization", "Bearer "+apiKey)
		req.Header.Set("x-api-key", apiKey)
		if strings.TrimSpace(req.Header.Get("anthropic-version")) == "" {
			req.Header.Set("anthropic-version", "2023-06-01")
		}
		if c != nil && len(upstreamBody) > 0 {
			c.Set(OpsUpstreamRequestBodyKey, string(upstreamBody))
		}

		resp, err = s.httpUpstream.Do(req, proxyURL, account.ID, account.Concurrency)
		if err != nil {
			lastErr = err
			if attempt < maxRetries {
				log.Printf("%s status=request_failed retry=%d/%d error=%v", prefix, attempt, maxRetries, err)
				if !sleepAntigravityBackoffWithContext(ctx, attempt) {
					return nil, ctx.Err()
				}
				continue
			}
			return nil, s.writeClaudeError(c, http.StatusBadGateway, "upstream_error", "Upstream request failed after retries")
		}

		if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode == http.StatusServiceUnavailable {
			respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
			_ = resp.Body.Close()
			s.handleUpstreamError(ctx, prefix, account, resp.StatusCode, resp.Header, respBody, quotaScope)

			if attempt < maxRetries {
				log.Printf("%s status=%d retry=%d/%d body=%s", prefix, resp.StatusCode, attempt, maxRetries, truncateForLog(respBody, 200))
				if !sleepAntigravityBackoffWithContext(ctx, attempt) {
					return nil, ctx.Err()
				}
				continue
			}
			return nil, &UpstreamFailoverError{StatusCode: resp.StatusCode}
		}

		break
	}
	if resp == nil {
		return nil, s.writeClaudeError(c, http.StatusBadGateway, "upstream_error", fmt.Sprintf("upstream request failed: %v", lastErr))
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 2<<20))

		if resp.StatusCode == http.StatusBadRequest && isSignatureRelatedError(respBody) {
			log.Printf("%s upstream signature error, retrying with thinking stripped", prefix)
			retryClaudeReq := claudeReq
			retryClaudeReq.Messages = append([]antigravity.ClaudeMessage(nil), claudeReq.Messages...)
			if stripped, stripErr := stripThinkingFromClaudeRequest(&retryClaudeReq); stripErr == nil && stripped {
				retryBody, _ := json.Marshal(&retryClaudeReq)
				retryReq, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewReader(retryBody))
				if err == nil {
					copyUpstreamRequestHeaders(retryReq.Header, c)
					if strings.TrimSpace(retryReq.Header.Get("Content-Type")) == "" {
						retryReq.Header.Set("Content-Type", "application/json")
					}
					retryReq.Header.Set("Authorization", "Bearer "+apiKey)
					retryReq.Header.Set("x-api-key", apiKey)
					if strings.TrimSpace(retryReq.Header.Get("anthropic-version")) == "" {
						retryReq.Header.Set("anthropic-version", "2023-06-01")
					}

					retryResp, retryErr := s.httpUpstream.Do(retryReq, proxyURL, account.ID, account.Concurrency)
					if retryErr == nil && retryResp != nil && retryResp.StatusCode < 400 {
						resp = retryResp
						goto upstreamClaudeSuccess
					}
					if retryResp != nil {
						_ = retryResp.Body.Close()
					}
				}
			}
		}

		s.handleUpstreamError(ctx, prefix, account, resp.StatusCode, resp.Header, respBody, quotaScope)

		if s.shouldFailoverUpstreamError(resp.StatusCode) {
			return nil, &UpstreamFailoverError{StatusCode: resp.StatusCode, ResponseBody: respBody}
		}
		return nil, s.writeMappedClaudeError(c, account, resp.StatusCode, resp.Header.Get("x-request-id"), respBody)
	}

upstreamClaudeSuccess:
	requestID := resp.Header.Get("x-request-id")
	copyUpstreamResponseHeaders(c, resp.Header)
	if requestID != "" {
		c.Header("x-request-id", requestID)
	}
	c.Status(resp.StatusCode)
	if _, err := io.Copy(c.Writer, resp.Body); err != nil {
		log.Printf("%s status=copy_error error=%v", prefix, err)
		return nil, err
	}

	return &ForwardResult{
		RequestID: requestID,
		Usage:     ClaudeUsage{},
		Model:     originalModel,
		Stream:    claudeReq.Stream,
		Duration:  time.Since(startTime),
	}, nil
}

// ForwardUpstreamGemini 转发 Gemini 协议请求到 upstream（不做协议转换）
func (s *AntigravityGatewayService) ForwardUpstreamGemini(ctx context.Context, c *gin.Context, account *Account, originalModel string, action string, stream bool, body []byte) (*ForwardResult, error) {
	startTime := time.Now()
	sessionID := getSessionID(c)
	prefix := logPrefix(sessionID, account.Name)

	baseURL := normalizeUpstreamBaseURL(account.GetCredential("base_url"))
	if baseURL == "" {
		return nil, s.writeGoogleError(c, http.StatusBadGateway, "Upstream account missing base_url")
	}
	apiKey := strings.TrimSpace(account.GetCredential("api_key"))
	if apiKey == "" {
		return nil, s.writeGoogleError(c, http.StatusBadGateway, "Upstream account missing api_key")
	}

	if strings.TrimSpace(originalModel) == "" {
		return nil, s.writeGoogleError(c, http.StatusBadRequest, "Missing model in URL")
	}
	if strings.TrimSpace(action) == "" {
		return nil, s.writeGoogleError(c, http.StatusBadRequest, "Missing action in URL")
	}
	if len(body) == 0 {
		return nil, s.writeGoogleError(c, http.StatusBadRequest, "Request body is empty")
	}
	quotaScope, _ := resolveAntigravityQuotaScope(originalModel)
	imageSize := s.extractImageSize(body)

	switch action {
	case "generateContent", "streamGenerateContent":
	case "countTokens":
		c.JSON(http.StatusOK, map[string]any{"totalTokens": 0})
		return &ForwardResult{
			RequestID:    "",
			Usage:        ClaudeUsage{},
			Model:        originalModel,
			Stream:       false,
			Duration:     time.Since(time.Now()),
			FirstTokenMs: nil,
		}, nil
	default:
		return nil, s.writeGoogleError(c, http.StatusNotFound, "Unsupported action: "+action)
	}

	mappedModel := strings.TrimSpace(s.getMappedModel(account, originalModel))
	if mappedModel == "" {
		return nil, s.writeGoogleError(c, http.StatusForbidden, fmt.Sprintf("model %s not in whitelist", originalModel))
	}

	proxyURL := ""
	if account.ProxyID != nil && account.Proxy != nil {
		proxyURL = account.Proxy.URL()
	}

	afterSwitch := antigravityHasAccountSwitch(ctx)
	maxRetries := antigravityMaxRetriesForModel(originalModel, afterSwitch)
	upstreamAction := action
	apiURL := fmt.Sprintf("%s/antigravity/v1beta/models/%s:%s", baseURL, mappedModel, upstreamAction)
	if stream || upstreamAction == "streamGenerateContent" {
		apiURL += "?alt=sse"
	}

	log.Printf("%s upstream_forward_gemini url=%s model=%s action=%s", prefix, apiURL, mappedModel, upstreamAction)

	var resp *http.Response
	var lastErr error
	for attempt := 1; attempt <= maxRetries; attempt++ {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewReader(body))
		if err != nil {
			return nil, s.writeGoogleError(c, http.StatusInternalServerError, "Failed to build request")
		}
		copyUpstreamRequestHeaders(req.Header, c)
		if strings.TrimSpace(req.Header.Get("Content-Type")) == "" {
			req.Header.Set("Content-Type", "application/json")
		}
		req.Header.Set("Authorization", "Bearer "+apiKey)

		if c != nil && len(body) > 0 {
			c.Set(OpsUpstreamRequestBodyKey, string(body))
		}

		resp, err = s.httpUpstream.Do(req, proxyURL, account.ID, account.Concurrency)
		if err != nil {
			lastErr = err
			if attempt < maxRetries {
				log.Printf("%s status=request_failed retry=%d/%d error=%v", prefix, attempt, maxRetries, err)
				if !sleepAntigravityBackoffWithContext(ctx, attempt) {
					return nil, ctx.Err()
				}
				continue
			}
			return nil, s.writeGoogleError(c, http.StatusBadGateway, "Upstream request failed after retries")
		}

		if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode == http.StatusServiceUnavailable {
			respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
			_ = resp.Body.Close()
			s.handleUpstreamError(ctx, prefix, account, resp.StatusCode, resp.Header, respBody, quotaScope)

			if attempt < maxRetries {
				log.Printf("%s status=%d retry=%d/%d body=%s", prefix, resp.StatusCode, attempt, maxRetries, truncateForLog(respBody, 200))
				if !sleepAntigravityBackoffWithContext(ctx, attempt) {
					return nil, ctx.Err()
				}
				continue
			}
			return nil, &UpstreamFailoverError{StatusCode: resp.StatusCode}
		}

		break
	}
	if resp == nil {
		return nil, s.writeGoogleError(c, http.StatusBadGateway, fmt.Sprintf("upstream request failed: %v", lastErr))
	}
	defer func() {
		if resp != nil && resp.Body != nil {
			_ = resp.Body.Close()
		}
	}()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
		contentType := resp.Header.Get("Content-Type")
		_ = resp.Body.Close()
		resp.Body = io.NopCloser(bytes.NewReader(respBody))

		if s.settingService != nil && s.settingService.IsModelFallbackEnabled(ctx) &&
			isModelNotFoundError(resp.StatusCode, respBody) {
			fallbackModel := s.settingService.GetFallbackModel(ctx, PlatformAntigravity)
			if fallbackModel != "" && fallbackModel != mappedModel {
				log.Printf("[Antigravity-Upstream] Model not found (%s), retrying with fallback model %s (account: %s)", mappedModel, fallbackModel, account.Name)
				fallbackURL := fmt.Sprintf("%s/antigravity/v1beta/models/%s:%s", baseURL, fallbackModel, upstreamAction)
				if stream || upstreamAction == "streamGenerateContent" {
					fallbackURL += "?alt=sse"
				}
				fallbackReq, err := http.NewRequestWithContext(ctx, http.MethodPost, fallbackURL, bytes.NewReader(body))
				if err == nil {
					copyUpstreamRequestHeaders(fallbackReq.Header, c)
					if strings.TrimSpace(fallbackReq.Header.Get("Content-Type")) == "" {
						fallbackReq.Header.Set("Content-Type", "application/json")
					}
					fallbackReq.Header.Set("Authorization", "Bearer "+apiKey)
					fallbackResp, err := s.httpUpstream.Do(fallbackReq, proxyURL, account.ID, account.Concurrency)
					if err == nil && fallbackResp.StatusCode < 400 {
						_ = resp.Body.Close()
						resp = fallbackResp
					} else if fallbackResp != nil {
						_ = fallbackResp.Body.Close()
					}
				}
			}
		}

		if resp.StatusCode < 400 {
			goto upstreamGeminiSuccess
		}

		requestID := resp.Header.Get("x-request-id")
		if requestID != "" {
			c.Header("x-request-id", requestID)
		}

		s.handleUpstreamError(ctx, prefix, account, resp.StatusCode, resp.Header, respBody, quotaScope)
		upstreamMsg := strings.TrimSpace(extractAntigravityErrorMessage(respBody))
		upstreamMsg = sanitizeUpstreamErrorMessage(upstreamMsg)

		logBody := s.settingService != nil && s.settingService.cfg != nil && s.settingService.cfg.Gateway.LogUpstreamErrorBody
		maxBytes := 2048
		if s.settingService != nil && s.settingService.cfg != nil && s.settingService.cfg.Gateway.LogUpstreamErrorBodyMaxBytes > 0 {
			maxBytes = s.settingService.cfg.Gateway.LogUpstreamErrorBodyMaxBytes
		}
		upstreamDetail := ""
		if logBody {
			upstreamDetail = truncateString(string(respBody), maxBytes)
		}

		setOpsUpstreamError(c, resp.StatusCode, upstreamMsg, upstreamDetail)

		if s.shouldFailoverUpstreamError(resp.StatusCode) {
			appendOpsUpstreamError(c, OpsUpstreamErrorEvent{
				Platform:           account.Platform,
				AccountID:          account.ID,
				AccountName:        account.Name,
				UpstreamStatusCode: resp.StatusCode,
				UpstreamRequestID:  requestID,
				Kind:               "failover",
				Message:            upstreamMsg,
				Detail:             upstreamDetail,
			})
			return nil, &UpstreamFailoverError{StatusCode: resp.StatusCode, ResponseBody: respBody}
		}
		if contentType == "" {
			contentType = "application/json"
		}
		appendOpsUpstreamError(c, OpsUpstreamErrorEvent{
			Platform:           account.Platform,
			AccountID:          account.ID,
			AccountName:        account.Name,
			UpstreamStatusCode: resp.StatusCode,
			UpstreamRequestID:  requestID,
			Kind:               "http_error",
			Message:            upstreamMsg,
			Detail:             upstreamDetail,
		})
		log.Printf("[antigravity-Forward-Upstream] upstream error status=%d body=%s", resp.StatusCode, truncateForLog(respBody, 500))
		c.Data(resp.StatusCode, contentType, respBody)
		return nil, fmt.Errorf("antigravity upstream error: %d", resp.StatusCode)
	}

upstreamGeminiSuccess:
	requestID := resp.Header.Get("x-request-id")
	copyUpstreamResponseHeaders(c, resp.Header)
	if requestID != "" {
		c.Header("x-request-id", requestID)
	}
	c.Status(resp.StatusCode)
	if _, err := io.Copy(c.Writer, resp.Body); err != nil {
		log.Printf("%s status=copy_error error=%v", prefix, err)
		return nil, err
	}

	imageCount := 0
	if isImageGenerationModel(mappedModel) {
		imageCount = 1
	}

	return &ForwardResult{
		RequestID:  requestID,
		Usage:      ClaudeUsage{},
		Model:      originalModel,
		Stream:     stream,
		Duration:   time.Since(startTime),
		ImageCount: imageCount,
		ImageSize:  imageSize,
	}, nil
}
