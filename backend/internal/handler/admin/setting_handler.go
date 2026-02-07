package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/handler/dto"
	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/Wei-Shaw/sub2api/internal/service"

	"github.com/gin-gonic/gin"
)

// SettingHandler 系统设置处理器
type SettingHandler struct {
	settingService   *service.SettingService
	groupRepo        service.GroupRepository
	emailService     *service.EmailService
	turnstileService *service.TurnstileService
	opsService       *service.OpsService
}

func requireAdminJWT(c *gin.Context, purpose string) bool {
	if c == nil {
		return false
	}
	method, ok := c.Get("auth_method")
	if !ok {
		response.Forbidden(c, purpose+" requires JWT admin authentication")
		return false
	}
	m, _ := method.(string)
	if m != "jwt" {
		response.Forbidden(c, purpose+" requires JWT admin authentication")
		return false
	}
	return true
}

// NewSettingHandler 创建系统设置处理器
func NewSettingHandler(settingService *service.SettingService, groupRepo service.GroupRepository, emailService *service.EmailService, turnstileService *service.TurnstileService, opsService *service.OpsService) *SettingHandler {
	return &SettingHandler{
		settingService:   settingService,
		groupRepo:        groupRepo,
		emailService:     emailService,
		turnstileService: turnstileService,
		opsService:       opsService,
	}
}

// GetSettings 获取所有系统设置
// GET /api/v1/admin/settings
func (h *SettingHandler) GetSettings(c *gin.Context) {
	settings, err := h.settingService.GetAllSettings(c.Request.Context())
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	// Check if ops monitoring is enabled (respects config.ops.enabled)
	opsEnabled := h.opsService != nil && h.opsService.IsMonitoringEnabled(c.Request.Context())

	response.Success(c, dto.SystemSettings{
		RegistrationEnabled:                  settings.RegistrationEnabled,
		EmailVerifyEnabled:                   settings.EmailVerifyEnabled,
		PromoCodeEnabled:                     settings.PromoCodeEnabled,
		InvitationCodeEnabled:                settings.InvitationCodeEnabled,
		PasswordResetEnabled:                 settings.PasswordResetEnabled,
		TotpEnabled:                          settings.TotpEnabled,
		TotpEncryptionKeyConfigured:          h.settingService.IsTotpEncryptionKeyConfigured(),
		ReferralInviterBonus:                 settings.ReferralInviterBonus,
		ReferralInviteeBonus:                 settings.ReferralInviteeBonus,
		ReferralCommissionRate:               settings.ReferralCommissionRate,
		SMTPHost:                             settings.SMTPHost,
		SMTPPort:                             settings.SMTPPort,
		SMTPUsername:                         settings.SMTPUsername,
		SMTPPasswordConfigured:               settings.SMTPPasswordConfigured,
		SMTPFrom:                             settings.SMTPFrom,
		SMTPFromName:                         settings.SMTPFromName,
		SMTPUseTLS:                           settings.SMTPUseTLS,
		TurnstileEnabled:                     settings.TurnstileEnabled,
		TurnstileSiteKey:                     settings.TurnstileSiteKey,
		TurnstileSecretKeyConfigured:         settings.TurnstileSecretKeyConfigured,
		LinuxDoConnectEnabled:                settings.LinuxDoConnectEnabled,
		LinuxDoConnectClientID:               settings.LinuxDoConnectClientID,
		LinuxDoConnectClientSecretConfigured: settings.LinuxDoConnectClientSecretConfigured,
		LinuxDoConnectRedirectURL:            settings.LinuxDoConnectRedirectURL,
		SiteName:                             settings.SiteName,
		SiteLogo:                             settings.SiteLogo,
		SiteSubtitle:                         settings.SiteSubtitle,
		APIBaseURL:                           settings.APIBaseURL,
		ContactInfo:                          settings.ContactInfo,
		DocURL:                               settings.DocURL,
		HomeContent:                          settings.HomeContent,
		LandingPricingEnabled:                settings.LandingPricingEnabled,
		LandingPricingConfig:                 settings.LandingPricingConfig,
		SubscriptionsEnabled:                 settings.SubscriptionsEnabled,
		HideCcsImportButton:                  settings.HideCcsImportButton,
		PurchaseSubscriptionEnabled:          settings.PurchaseSubscriptionEnabled,
		PurchaseSubscriptionURL:              settings.PurchaseSubscriptionURL,
		DefaultConcurrency:                   settings.DefaultConcurrency,
		DefaultBalance:                       settings.DefaultBalance,
		EnableModelFallback:                  settings.EnableModelFallback,
		FallbackModelAnthropic:               settings.FallbackModelAnthropic,
		FallbackModelOpenAI:                  settings.FallbackModelOpenAI,
		FallbackModelGemini:                  settings.FallbackModelGemini,
		FallbackModelAntigravity:             settings.FallbackModelAntigravity,
		EnableIdentityPatch:                  settings.EnableIdentityPatch,
		IdentityPatchPrompt:                  settings.IdentityPatchPrompt,
		GatewayFixOrphanedToolResults:        settings.GatewayFixOrphanedToolResults,
		OpsMonitoringEnabled:                 opsEnabled && settings.OpsMonitoringEnabled,
		OpsRealtimeMonitoringEnabled:         settings.OpsRealtimeMonitoringEnabled,
		OpsQueryModeDefault:                  settings.OpsQueryModeDefault,
		OpsMetricsIntervalSeconds:            settings.OpsMetricsIntervalSeconds,
	})
}

// UpdateSettingsRequest 更新设置请求
type UpdateSettingsRequest struct {
	// 注册设置
	RegistrationEnabled   bool  `json:"registration_enabled"`
	EmailVerifyEnabled    bool  `json:"email_verify_enabled"`
	PromoCodeEnabled      bool  `json:"promo_code_enabled"`
	InvitationCodeEnabled *bool `json:"invitation_code_enabled"`
	PasswordResetEnabled  bool  `json:"password_reset_enabled"`
	TotpEnabled           bool  `json:"totp_enabled"` // TOTP 双因素认证

	ReferralInviterBonus   float64 `json:"referral_inviter_bonus"`
	ReferralInviteeBonus   float64 `json:"referral_invitee_bonus"`
	ReferralCommissionRate float64 `json:"referral_commission_rate"`

	// 邮件服务设置
	SMTPHost     string `json:"smtp_host"`
	SMTPPort     int    `json:"smtp_port"`
	SMTPUsername string `json:"smtp_username"`
	SMTPPassword string `json:"smtp_password"`
	SMTPFrom     string `json:"smtp_from_email"`
	SMTPFromName string `json:"smtp_from_name"`
	SMTPUseTLS   bool   `json:"smtp_use_tls"`

	// Cloudflare Turnstile 设置
	TurnstileEnabled   bool   `json:"turnstile_enabled"`
	TurnstileSiteKey   string `json:"turnstile_site_key"`
	TurnstileSecretKey string `json:"turnstile_secret_key"`

	// LinuxDo Connect OAuth 登录
	LinuxDoConnectEnabled      bool   `json:"linuxdo_connect_enabled"`
	LinuxDoConnectClientID     string `json:"linuxdo_connect_client_id"`
	LinuxDoConnectClientSecret string `json:"linuxdo_connect_client_secret"`
	LinuxDoConnectRedirectURL  string `json:"linuxdo_connect_redirect_url"`

	// OEM设置
	SiteName                    string  `json:"site_name"`
	SiteLogo                    string  `json:"site_logo"`
	SiteSubtitle                string  `json:"site_subtitle"`
	APIBaseURL                  string  `json:"api_base_url"`
	ContactInfo                 string  `json:"contact_info"`
	DocURL                      string  `json:"doc_url"`
	HomeContent                 string  `json:"home_content"`
	LandingPricingEnabled       bool    `json:"landing_pricing_enabled"`
	LandingPricingConfig        string  `json:"landing_pricing_config"`
	SubscriptionsEnabled        bool    `json:"subscriptions_enabled"`
	HideCcsImportButton         bool    `json:"hide_ccs_import_button"`
	PurchaseSubscriptionEnabled *bool   `json:"purchase_subscription_enabled"`
	PurchaseSubscriptionURL     *string `json:"purchase_subscription_url"`

	// 默认配置
	DefaultConcurrency int     `json:"default_concurrency"`
	DefaultBalance     float64 `json:"default_balance"`

	// Model fallback configuration
	EnableModelFallback      bool   `json:"enable_model_fallback"`
	FallbackModelAnthropic   string `json:"fallback_model_anthropic"`
	FallbackModelOpenAI      string `json:"fallback_model_openai"`
	FallbackModelGemini      string `json:"fallback_model_gemini"`
	FallbackModelAntigravity string `json:"fallback_model_antigravity"`

	// Identity patch configuration (Claude -> Gemini)
	EnableIdentityPatch bool   `json:"enable_identity_patch"`
	IdentityPatchPrompt string `json:"identity_patch_prompt"`

	// Gateway runtime toggles
	GatewayFixOrphanedToolResults *bool `json:"gateway_fix_orphaned_tool_results"`

	// Ops monitoring (vNext)
	OpsMonitoringEnabled         *bool   `json:"ops_monitoring_enabled"`
	OpsRealtimeMonitoringEnabled *bool   `json:"ops_realtime_monitoring_enabled"`
	OpsQueryModeDefault          *string `json:"ops_query_mode_default"`
	OpsMetricsIntervalSeconds    *int    `json:"ops_metrics_interval_seconds"`
}

// UpdateSettings 更新系统设置
// PUT /api/v1/admin/settings
func (h *SettingHandler) UpdateSettings(c *gin.Context) {
	var req UpdateSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}

	previousSettings, err := h.settingService.GetAllSettings(c.Request.Context())
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	// 验证参数
	if req.DefaultConcurrency < 1 {
		req.DefaultConcurrency = 1
	}
	if req.DefaultBalance < 0 {
		req.DefaultBalance = 0
	}
	if req.SMTPPort <= 0 {
		req.SMTPPort = 587
	}

	// Referral 参数验证
	if req.ReferralInviterBonus < 0 {
		req.ReferralInviterBonus = 0
	}
	if req.ReferralInviteeBonus < 0 {
		req.ReferralInviteeBonus = 0
	}
	if req.ReferralCommissionRate < 0 {
		req.ReferralCommissionRate = 0
	}
	if req.ReferralCommissionRate > 1 {
		req.ReferralCommissionRate = 1
	}

	// Turnstile 参数验证
	if req.TurnstileEnabled {
		// 检查必填字段
		if req.TurnstileSiteKey == "" {
			response.BadRequest(c, "Turnstile Site Key is required when enabled")
			return
		}
		// 如果未提供 secret key，使用已保存的值（留空保留当前值）
		if req.TurnstileSecretKey == "" {
			if previousSettings.TurnstileSecretKey == "" {
				response.BadRequest(c, "Turnstile Secret Key is required when enabled")
				return
			}
			req.TurnstileSecretKey = previousSettings.TurnstileSecretKey
		}

		// 当 site_key 或 secret_key 任一变化时验证（避免配置错误导致无法登录）
		siteKeyChanged := previousSettings.TurnstileSiteKey != req.TurnstileSiteKey
		secretKeyChanged := previousSettings.TurnstileSecretKey != req.TurnstileSecretKey
		if siteKeyChanged || secretKeyChanged {
			if err := h.turnstileService.ValidateSecretKey(c.Request.Context(), req.TurnstileSecretKey); err != nil {
				response.ErrorFrom(c, err)
				return
			}
		}
	}

	// TOTP 双因素认证参数验证
	// 只有手动配置了加密密钥才允许启用 TOTP 功能
	if req.TotpEnabled && !previousSettings.TotpEnabled {
		// 尝试启用 TOTP，检查加密密钥是否已手动配置
		if !h.settingService.IsTotpEncryptionKeyConfigured() {
			response.BadRequest(c, "Cannot enable TOTP: TOTP_ENCRYPTION_KEY environment variable must be configured first. Generate a key with 'openssl rand -hex 32' and set it in your environment.")
			return
		}
	}

	// Validate Landing / Pricing JSON config early to prevent saving invalid config
	// (frontend also validates, but backend validation is the source of truth).
	if err := validateLandingPricingConfig(c.Request.Context(), req.LandingPricingConfig, h.groupRepo); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	// LinuxDo Connect 参数验证
	if req.LinuxDoConnectEnabled {
		req.LinuxDoConnectClientID = strings.TrimSpace(req.LinuxDoConnectClientID)
		req.LinuxDoConnectClientSecret = strings.TrimSpace(req.LinuxDoConnectClientSecret)
		req.LinuxDoConnectRedirectURL = strings.TrimSpace(req.LinuxDoConnectRedirectURL)

		if req.LinuxDoConnectClientID == "" {
			response.BadRequest(c, "LinuxDo Client ID is required when enabled")
			return
		}
		if req.LinuxDoConnectRedirectURL == "" {
			response.BadRequest(c, "LinuxDo Redirect URL is required when enabled")
			return
		}
		if err := config.ValidateAbsoluteHTTPURL(req.LinuxDoConnectRedirectURL); err != nil {
			response.BadRequest(c, "LinuxDo Redirect URL must be an absolute http(s) URL")
			return
		}

		// 如果未提供 client_secret，则保留现有值（如有）。
		if req.LinuxDoConnectClientSecret == "" {
			if previousSettings.LinuxDoConnectClientSecret == "" {
				response.BadRequest(c, "LinuxDo Client Secret is required when enabled")
				return
			}
			req.LinuxDoConnectClientSecret = previousSettings.LinuxDoConnectClientSecret
		}
	}

	// “购买订阅”页面配置验证
	purchaseEnabled := previousSettings.PurchaseSubscriptionEnabled
	if req.PurchaseSubscriptionEnabled != nil {
		purchaseEnabled = *req.PurchaseSubscriptionEnabled
	}
	purchaseURL := previousSettings.PurchaseSubscriptionURL
	if req.PurchaseSubscriptionURL != nil {
		purchaseURL = strings.TrimSpace(*req.PurchaseSubscriptionURL)
	}

	// - 启用时要求 URL 合法且非空
	// - 禁用时允许为空；若提供了 URL 也做基本校验，避免误配置
	if purchaseEnabled {
		if purchaseURL == "" {
			response.BadRequest(c, "Purchase Subscription URL is required when enabled")
			return
		}
		if err := config.ValidateAbsoluteHTTPURL(purchaseURL); err != nil {
			response.BadRequest(c, "Purchase Subscription URL must be an absolute http(s) URL")
			return
		}
	} else if purchaseURL != "" {
		if err := config.ValidateAbsoluteHTTPURL(purchaseURL); err != nil {
			response.BadRequest(c, "Purchase Subscription URL must be an absolute http(s) URL")
			return
		}
	}

	// Ops metrics collector interval validation (seconds).
	if req.OpsMetricsIntervalSeconds != nil {
		v := *req.OpsMetricsIntervalSeconds
		if v < 60 {
			v = 60
		}
		if v > 3600 {
			v = 3600
		}
		req.OpsMetricsIntervalSeconds = &v
	}

	settings := &service.SystemSettings{
		RegistrationEnabled: req.RegistrationEnabled,
		EmailVerifyEnabled:  req.EmailVerifyEnabled,
		PromoCodeEnabled:    req.PromoCodeEnabled,
		InvitationCodeEnabled: func() bool {
			if req.InvitationCodeEnabled != nil {
				return *req.InvitationCodeEnabled
			}
			return previousSettings.InvitationCodeEnabled
		}(),
		PasswordResetEnabled:        req.PasswordResetEnabled,
		TotpEnabled:                 req.TotpEnabled,
		ReferralInviterBonus:        req.ReferralInviterBonus,
		ReferralInviteeBonus:        req.ReferralInviteeBonus,
		ReferralCommissionRate:      req.ReferralCommissionRate,
		SMTPHost:                    req.SMTPHost,
		SMTPPort:                    req.SMTPPort,
		SMTPUsername:                req.SMTPUsername,
		SMTPPassword:                req.SMTPPassword,
		SMTPFrom:                    req.SMTPFrom,
		SMTPFromName:                req.SMTPFromName,
		SMTPUseTLS:                  req.SMTPUseTLS,
		TurnstileEnabled:            req.TurnstileEnabled,
		TurnstileSiteKey:            req.TurnstileSiteKey,
		TurnstileSecretKey:          req.TurnstileSecretKey,
		LinuxDoConnectEnabled:       req.LinuxDoConnectEnabled,
		LinuxDoConnectClientID:      req.LinuxDoConnectClientID,
		LinuxDoConnectClientSecret:  req.LinuxDoConnectClientSecret,
		LinuxDoConnectRedirectURL:   req.LinuxDoConnectRedirectURL,
		SiteName:                    req.SiteName,
		SiteLogo:                    req.SiteLogo,
		SiteSubtitle:                req.SiteSubtitle,
		APIBaseURL:                  req.APIBaseURL,
		ContactInfo:                 req.ContactInfo,
		DocURL:                      req.DocURL,
		HomeContent:                 req.HomeContent,
		LandingPricingEnabled:       req.LandingPricingEnabled,
		LandingPricingConfig:        req.LandingPricingConfig,
		SubscriptionsEnabled:        req.SubscriptionsEnabled,
		HideCcsImportButton:         req.HideCcsImportButton,
		PurchaseSubscriptionEnabled: purchaseEnabled,
		PurchaseSubscriptionURL:     purchaseURL,
		DefaultConcurrency:          req.DefaultConcurrency,
		DefaultBalance:              req.DefaultBalance,
		EnableModelFallback:         req.EnableModelFallback,
		FallbackModelAnthropic:      req.FallbackModelAnthropic,
		FallbackModelOpenAI:         req.FallbackModelOpenAI,
		FallbackModelGemini:         req.FallbackModelGemini,
		FallbackModelAntigravity:    req.FallbackModelAntigravity,
		EnableIdentityPatch:         req.EnableIdentityPatch,
		IdentityPatchPrompt:         req.IdentityPatchPrompt,
		GatewayFixOrphanedToolResults: func() bool {
			if req.GatewayFixOrphanedToolResults != nil {
				return *req.GatewayFixOrphanedToolResults
			}
			return previousSettings.GatewayFixOrphanedToolResults
		}(),
		OpsMonitoringEnabled: func() bool {
			if req.OpsMonitoringEnabled != nil {
				return *req.OpsMonitoringEnabled
			}
			return previousSettings.OpsMonitoringEnabled
		}(),
		OpsRealtimeMonitoringEnabled: func() bool {
			if req.OpsRealtimeMonitoringEnabled != nil {
				return *req.OpsRealtimeMonitoringEnabled
			}
			return previousSettings.OpsRealtimeMonitoringEnabled
		}(),
		OpsQueryModeDefault: func() string {
			if req.OpsQueryModeDefault != nil {
				return *req.OpsQueryModeDefault
			}
			return previousSettings.OpsQueryModeDefault
		}(),
		OpsMetricsIntervalSeconds: func() int {
			if req.OpsMetricsIntervalSeconds != nil {
				return *req.OpsMetricsIntervalSeconds
			}
			return previousSettings.OpsMetricsIntervalSeconds
		}(),
	}

	if err := h.settingService.UpdateSettings(c.Request.Context(), settings); err != nil {
		response.ErrorFrom(c, err)
		return
	}

	h.auditSettingsUpdate(c, previousSettings, settings, req)

	// 重新获取设置返回
	updatedSettings, err := h.settingService.GetAllSettings(c.Request.Context())
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	response.Success(c, dto.SystemSettings{
		RegistrationEnabled:                  updatedSettings.RegistrationEnabled,
		EmailVerifyEnabled:                   updatedSettings.EmailVerifyEnabled,
		PromoCodeEnabled:                     updatedSettings.PromoCodeEnabled,
		InvitationCodeEnabled:                updatedSettings.InvitationCodeEnabled,
		PasswordResetEnabled:                 updatedSettings.PasswordResetEnabled,
		TotpEnabled:                          updatedSettings.TotpEnabled,
		TotpEncryptionKeyConfigured:          h.settingService.IsTotpEncryptionKeyConfigured(),
		ReferralInviterBonus:                 updatedSettings.ReferralInviterBonus,
		ReferralInviteeBonus:                 updatedSettings.ReferralInviteeBonus,
		ReferralCommissionRate:               updatedSettings.ReferralCommissionRate,
		SMTPHost:                             updatedSettings.SMTPHost,
		SMTPPort:                             updatedSettings.SMTPPort,
		SMTPUsername:                         updatedSettings.SMTPUsername,
		SMTPPasswordConfigured:               updatedSettings.SMTPPasswordConfigured,
		SMTPFrom:                             updatedSettings.SMTPFrom,
		SMTPFromName:                         updatedSettings.SMTPFromName,
		SMTPUseTLS:                           updatedSettings.SMTPUseTLS,
		TurnstileEnabled:                     updatedSettings.TurnstileEnabled,
		TurnstileSiteKey:                     updatedSettings.TurnstileSiteKey,
		TurnstileSecretKeyConfigured:         updatedSettings.TurnstileSecretKeyConfigured,
		LinuxDoConnectEnabled:                updatedSettings.LinuxDoConnectEnabled,
		LinuxDoConnectClientID:               updatedSettings.LinuxDoConnectClientID,
		LinuxDoConnectClientSecretConfigured: updatedSettings.LinuxDoConnectClientSecretConfigured,
		LinuxDoConnectRedirectURL:            updatedSettings.LinuxDoConnectRedirectURL,
		SiteName:                             updatedSettings.SiteName,
		SiteLogo:                             updatedSettings.SiteLogo,
		SiteSubtitle:                         updatedSettings.SiteSubtitle,
		APIBaseURL:                           updatedSettings.APIBaseURL,
		ContactInfo:                          updatedSettings.ContactInfo,
		DocURL:                               updatedSettings.DocURL,
		HomeContent:                          updatedSettings.HomeContent,
		LandingPricingEnabled:                updatedSettings.LandingPricingEnabled,
		LandingPricingConfig:                 updatedSettings.LandingPricingConfig,
		SubscriptionsEnabled:                 updatedSettings.SubscriptionsEnabled,
		HideCcsImportButton:                  updatedSettings.HideCcsImportButton,
		PurchaseSubscriptionEnabled:          updatedSettings.PurchaseSubscriptionEnabled,
		PurchaseSubscriptionURL:              updatedSettings.PurchaseSubscriptionURL,
		DefaultConcurrency:                   updatedSettings.DefaultConcurrency,
		DefaultBalance:                       updatedSettings.DefaultBalance,
		EnableModelFallback:                  updatedSettings.EnableModelFallback,
		FallbackModelAnthropic:               updatedSettings.FallbackModelAnthropic,
		FallbackModelOpenAI:                  updatedSettings.FallbackModelOpenAI,
		FallbackModelGemini:                  updatedSettings.FallbackModelGemini,
		FallbackModelAntigravity:             updatedSettings.FallbackModelAntigravity,
		EnableIdentityPatch:                  updatedSettings.EnableIdentityPatch,
		IdentityPatchPrompt:                  updatedSettings.IdentityPatchPrompt,
		GatewayFixOrphanedToolResults:        updatedSettings.GatewayFixOrphanedToolResults,
		OpsMonitoringEnabled:                 updatedSettings.OpsMonitoringEnabled,
		OpsRealtimeMonitoringEnabled:         updatedSettings.OpsRealtimeMonitoringEnabled,
		OpsQueryModeDefault:                  updatedSettings.OpsQueryModeDefault,
		OpsMetricsIntervalSeconds:            updatedSettings.OpsMetricsIntervalSeconds,
	})
}

func (h *SettingHandler) auditSettingsUpdate(c *gin.Context, before *service.SystemSettings, after *service.SystemSettings, req UpdateSettingsRequest) {
	if before == nil || after == nil {
		return
	}

	changed := diffSettings(before, after, req)
	if len(changed) == 0 {
		return
	}

	subject, _ := middleware.GetAuthSubjectFromContext(c)
	role, _ := middleware.GetUserRoleFromContext(c)
	log.Printf("AUDIT: settings updated at=%s user_id=%d role=%s changed=%v",
		time.Now().UTC().Format(time.RFC3339),
		subject.UserID,
		role,
		changed,
	)
}

func diffSettings(before *service.SystemSettings, after *service.SystemSettings, req UpdateSettingsRequest) []string {
	changed := make([]string, 0, 20)
	if before.RegistrationEnabled != after.RegistrationEnabled {
		changed = append(changed, "registration_enabled")
	}
	if before.EmailVerifyEnabled != after.EmailVerifyEnabled {
		changed = append(changed, "email_verify_enabled")
	}
	if before.InvitationCodeEnabled != after.InvitationCodeEnabled {
		changed = append(changed, "invitation_code_enabled")
	}
	if before.PasswordResetEnabled != after.PasswordResetEnabled {
		changed = append(changed, "password_reset_enabled")
	}
	if before.TotpEnabled != after.TotpEnabled {
		changed = append(changed, "totp_enabled")
	}
	if before.SMTPHost != after.SMTPHost {
		changed = append(changed, "smtp_host")
	}
	if before.SMTPPort != after.SMTPPort {
		changed = append(changed, "smtp_port")
	}
	if before.SMTPUsername != after.SMTPUsername {
		changed = append(changed, "smtp_username")
	}
	if req.SMTPPassword != "" {
		changed = append(changed, "smtp_password")
	}
	if before.SMTPFrom != after.SMTPFrom {
		changed = append(changed, "smtp_from_email")
	}
	if before.SMTPFromName != after.SMTPFromName {
		changed = append(changed, "smtp_from_name")
	}
	if before.SMTPUseTLS != after.SMTPUseTLS {
		changed = append(changed, "smtp_use_tls")
	}
	if before.TurnstileEnabled != after.TurnstileEnabled {
		changed = append(changed, "turnstile_enabled")
	}
	if before.TurnstileSiteKey != after.TurnstileSiteKey {
		changed = append(changed, "turnstile_site_key")
	}
	if req.TurnstileSecretKey != "" {
		changed = append(changed, "turnstile_secret_key")
	}
	if before.LinuxDoConnectEnabled != after.LinuxDoConnectEnabled {
		changed = append(changed, "linuxdo_connect_enabled")
	}
	if before.LinuxDoConnectClientID != after.LinuxDoConnectClientID {
		changed = append(changed, "linuxdo_connect_client_id")
	}
	if req.LinuxDoConnectClientSecret != "" {
		changed = append(changed, "linuxdo_connect_client_secret")
	}
	if before.LinuxDoConnectRedirectURL != after.LinuxDoConnectRedirectURL {
		changed = append(changed, "linuxdo_connect_redirect_url")
	}
	if before.SiteName != after.SiteName {
		changed = append(changed, "site_name")
	}
	if before.SiteLogo != after.SiteLogo {
		changed = append(changed, "site_logo")
	}
	if before.SiteSubtitle != after.SiteSubtitle {
		changed = append(changed, "site_subtitle")
	}
	if before.APIBaseURL != after.APIBaseURL {
		changed = append(changed, "api_base_url")
	}
	if before.ContactInfo != after.ContactInfo {
		changed = append(changed, "contact_info")
	}
	if before.DocURL != after.DocURL {
		changed = append(changed, "doc_url")
	}
	if before.HomeContent != after.HomeContent {
		changed = append(changed, "home_content")
	}
	if before.LandingPricingEnabled != after.LandingPricingEnabled {
		changed = append(changed, "landing_pricing_enabled")
	}
	if before.LandingPricingConfig != after.LandingPricingConfig {
		changed = append(changed, "landing_pricing_config")
	}
	if before.SubscriptionsEnabled != after.SubscriptionsEnabled {
		changed = append(changed, "subscriptions_enabled")
	}
	if before.HideCcsImportButton != after.HideCcsImportButton {
		changed = append(changed, "hide_ccs_import_button")
	}
	if before.DefaultConcurrency != after.DefaultConcurrency {
		changed = append(changed, "default_concurrency")
	}
	if before.DefaultBalance != after.DefaultBalance {
		changed = append(changed, "default_balance")
	}
	if before.EnableModelFallback != after.EnableModelFallback {
		changed = append(changed, "enable_model_fallback")
	}
	if before.FallbackModelAnthropic != after.FallbackModelAnthropic {
		changed = append(changed, "fallback_model_anthropic")
	}
	if before.FallbackModelOpenAI != after.FallbackModelOpenAI {
		changed = append(changed, "fallback_model_openai")
	}
	if before.FallbackModelGemini != after.FallbackModelGemini {
		changed = append(changed, "fallback_model_gemini")
	}
	if before.FallbackModelAntigravity != after.FallbackModelAntigravity {
		changed = append(changed, "fallback_model_antigravity")
	}
	if before.EnableIdentityPatch != after.EnableIdentityPatch {
		changed = append(changed, "enable_identity_patch")
	}
	if before.IdentityPatchPrompt != after.IdentityPatchPrompt {
		changed = append(changed, "identity_patch_prompt")
	}
	if before.GatewayFixOrphanedToolResults != after.GatewayFixOrphanedToolResults {
		changed = append(changed, "gateway_fix_orphaned_tool_results")
	}
	if before.OpsMonitoringEnabled != after.OpsMonitoringEnabled {
		changed = append(changed, "ops_monitoring_enabled")
	}
	if before.OpsRealtimeMonitoringEnabled != after.OpsRealtimeMonitoringEnabled {
		changed = append(changed, "ops_realtime_monitoring_enabled")
	}
	if before.OpsQueryModeDefault != after.OpsQueryModeDefault {
		changed = append(changed, "ops_query_mode_default")
	}
	if before.OpsMetricsIntervalSeconds != after.OpsMetricsIntervalSeconds {
		changed = append(changed, "ops_metrics_interval_seconds")
	}
	return changed
}

// TestSMTPRequest 测试SMTP连接请求
type TestSMTPRequest struct {
	SMTPHost     string `json:"smtp_host" binding:"required"`
	SMTPPort     int    `json:"smtp_port"`
	SMTPUsername string `json:"smtp_username"`
	SMTPPassword string `json:"smtp_password"`
	SMTPUseTLS   bool   `json:"smtp_use_tls"`
}

// TestSMTPConnection 测试SMTP连接
// POST /api/v1/admin/settings/test-smtp
func (h *SettingHandler) TestSMTPConnection(c *gin.Context) {
	var req TestSMTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}

	if req.SMTPPort <= 0 {
		req.SMTPPort = 587
	}

	// 如果未提供密码，从数据库获取已保存的密码
	password := req.SMTPPassword
	if password == "" {
		savedConfig, err := h.emailService.GetSMTPConfig(c.Request.Context())
		if err == nil && savedConfig != nil {
			password = savedConfig.Password
		}
	}

	config := &service.SMTPConfig{
		Host:     req.SMTPHost,
		Port:     req.SMTPPort,
		Username: req.SMTPUsername,
		Password: password,
		UseTLS:   req.SMTPUseTLS,
	}

	err := h.emailService.TestSMTPConnectionWithConfig(config)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	response.Success(c, gin.H{"message": "SMTP connection successful"})
}

// SendTestEmailRequest 发送测试邮件请求
type SendTestEmailRequest struct {
	Email        string `json:"email" binding:"required,email"`
	SMTPHost     string `json:"smtp_host" binding:"required"`
	SMTPPort     int    `json:"smtp_port"`
	SMTPUsername string `json:"smtp_username"`
	SMTPPassword string `json:"smtp_password"`
	SMTPFrom     string `json:"smtp_from_email"`
	SMTPFromName string `json:"smtp_from_name"`
	SMTPUseTLS   bool   `json:"smtp_use_tls"`
}

// SendTestEmail 发送测试邮件
// POST /api/v1/admin/settings/send-test-email
func (h *SettingHandler) SendTestEmail(c *gin.Context) {
	var req SendTestEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}

	if req.SMTPPort <= 0 {
		req.SMTPPort = 587
	}

	// 如果未提供密码，从数据库获取已保存的密码
	password := req.SMTPPassword
	if password == "" {
		savedConfig, err := h.emailService.GetSMTPConfig(c.Request.Context())
		if err == nil && savedConfig != nil {
			password = savedConfig.Password
		}
	}

	config := &service.SMTPConfig{
		Host:     req.SMTPHost,
		Port:     req.SMTPPort,
		Username: req.SMTPUsername,
		Password: password,
		From:     req.SMTPFrom,
		FromName: req.SMTPFromName,
		UseTLS:   req.SMTPUseTLS,
	}

	siteName := h.settingService.GetSiteName(c.Request.Context())
	subject := "[" + siteName + "] Test Email"
	body := `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 40px 30px; text-align: center; }
        .success { color: #10b981; font-size: 48px; margin-bottom: 20px; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #999; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>` + siteName + `</h1>
        </div>
        <div class="content">
            <div class="success">✓</div>
            <h2>Email Configuration Successful!</h2>
            <p>This is a test email to verify your SMTP settings are working correctly.</p>
        </div>
        <div class="footer">
            <p>This is an automated test message.</p>
        </div>
    </div>
</body>
</html>
`

	if err := h.emailService.SendEmailWithConfig(config, req.Email, subject, body); err != nil {
		response.ErrorFrom(c, err)
		return
	}

	response.Success(c, gin.H{"message": "Test email sent successfully"})
}

// GetAdminAPIKey 获取管理员 API Key 状态
// GET /api/v1/admin/settings/admin-api-key
func (h *SettingHandler) GetAdminAPIKey(c *gin.Context) {
	if !requireAdminJWT(c, "Admin API key management") {
		return
	}

	maskedKey, exists, err := h.settingService.GetAdminAPIKeyStatus(c.Request.Context())
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	response.Success(c, gin.H{
		"exists":     exists,
		"masked_key": maskedKey,
	})
}

// RegenerateAdminAPIKey 生成/重新生成管理员 API Key
// POST /api/v1/admin/settings/admin-api-key/regenerate
func (h *SettingHandler) RegenerateAdminAPIKey(c *gin.Context) {
	if !requireAdminJWT(c, "Admin API key management") {
		return
	}

	key, err := h.settingService.GenerateAdminAPIKey(c.Request.Context())
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	response.Success(c, gin.H{
		"key": key, // 完整 key 只在生成时返回一次
	})
}

// DeleteAdminAPIKey 删除管理员 API Key
// DELETE /api/v1/admin/settings/admin-api-key
func (h *SettingHandler) DeleteAdminAPIKey(c *gin.Context) {
	if !requireAdminJWT(c, "Admin API key management") {
		return
	}

	if err := h.settingService.DeleteAdminAPIKey(c.Request.Context()); err != nil {
		response.ErrorFrom(c, err)
		return
	}

	response.Success(c, gin.H{"message": "Admin API key deleted"})
}

// GetStreamTimeoutSettings 获取流超时处理配置
// GET /api/v1/admin/settings/stream-timeout
func (h *SettingHandler) GetStreamTimeoutSettings(c *gin.Context) {
	settings, err := h.settingService.GetStreamTimeoutSettings(c.Request.Context())
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	response.Success(c, dto.StreamTimeoutSettings{
		Enabled:                settings.Enabled,
		Action:                 settings.Action,
		TempUnschedMinutes:     settings.TempUnschedMinutes,
		ThresholdCount:         settings.ThresholdCount,
		ThresholdWindowMinutes: settings.ThresholdWindowMinutes,
	})
}

// UpdateStreamTimeoutSettingsRequest 更新流超时配置请求
type UpdateStreamTimeoutSettingsRequest struct {
	Enabled                bool   `json:"enabled"`
	Action                 string `json:"action"`
	TempUnschedMinutes     int    `json:"temp_unsched_minutes"`
	ThresholdCount         int    `json:"threshold_count"`
	ThresholdWindowMinutes int    `json:"threshold_window_minutes"`
}

// UpdateStreamTimeoutSettings 更新流超时处理配置
// PUT /api/v1/admin/settings/stream-timeout
func (h *SettingHandler) UpdateStreamTimeoutSettings(c *gin.Context) {
	var req UpdateStreamTimeoutSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}

	settings := &service.StreamTimeoutSettings{
		Enabled:                req.Enabled,
		Action:                 req.Action,
		TempUnschedMinutes:     req.TempUnschedMinutes,
		ThresholdCount:         req.ThresholdCount,
		ThresholdWindowMinutes: req.ThresholdWindowMinutes,
	}

	if err := h.settingService.SetStreamTimeoutSettings(c.Request.Context(), settings); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	// 重新获取设置返回
	updatedSettings, err := h.settingService.GetStreamTimeoutSettings(c.Request.Context())
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	response.Success(c, dto.StreamTimeoutSettings{
		Enabled:                updatedSettings.Enabled,
		Action:                 updatedSettings.Action,
		TempUnschedMinutes:     updatedSettings.TempUnschedMinutes,
		ThresholdCount:         updatedSettings.ThresholdCount,
		ThresholdWindowMinutes: updatedSettings.ThresholdWindowMinutes,
	})
}

func validateLandingPricingConfig(ctx context.Context, raw string, groupRepo service.GroupRepository) error {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}

	dec := json.NewDecoder(strings.NewReader(raw))
	dec.UseNumber()

	var doc any
	if err := dec.Decode(&doc); err != nil {
		return fmt.Errorf("landing_pricing_config: invalid JSON: %w", err)
	}

	root, ok := doc.(map[string]any)
	if !ok {
		return fmt.Errorf("landing_pricing_config: must be a JSON object")
	}

	version, ok := jsonInt64(root["version"])
	if !ok || version != 1 {
		return fmt.Errorf("landing_pricing_config: unsupported version")
	}

	currency, _ := root["currency"].(string)
	if currency != "CNY" {
		return fmt.Errorf("landing_pricing_config: unsupported currency")
	}

	defaultTab, _ := root["default_tab"].(string)
	if defaultTab != "subscription" && defaultTab != "payg" {
		return fmt.Errorf("landing_pricing_config: invalid default_tab")
	}

	subscription, ok := root["subscription"].(map[string]any)
	if !ok {
		return fmt.Errorf("landing_pricing_config: missing subscription section")
	}

	defaultPeriod, _ := subscription["default_period"].(string)
	if !isPricingPeriod(defaultPeriod) {
		return fmt.Errorf("landing_pricing_config: invalid subscription.default_period")
	}

	periods, ok := subscription["periods"].([]any)
	if !ok || len(periods) == 0 {
		return fmt.Errorf("landing_pricing_config: invalid subscription.periods")
	}
	for idx, item := range periods {
		period, ok := item.(map[string]any)
		if !ok {
			return fmt.Errorf("landing_pricing_config: subscription.periods[%d] must be object", idx)
		}
		key, _ := period["key"].(string)
		label, _ := period["label"].(string)
		if !isPricingPeriod(key) || strings.TrimSpace(label) == "" {
			return fmt.Errorf("landing_pricing_config: subscription.periods[%d] invalid", idx)
		}
	}

	plans, ok := subscription["plans"].([]any)
	if !ok || len(plans) == 0 {
		return fmt.Errorf("landing_pricing_config: subscription.plans must be a non-empty array")
	}
	for idx, item := range plans {
		plan, ok := item.(map[string]any)
		if !ok {
			return fmt.Errorf("landing_pricing_config: subscription.plans[%d] must be object", idx)
		}

		planID, _ := plan["id"].(string)
		planRef := fmt.Sprintf("subscription.plans[%d]", idx)
		if strings.TrimSpace(planID) != "" {
			planRef = fmt.Sprintf("subscription.plans[%s]", planID)
		}

		// Optional: bind plan to a backend subscription group
		rawGroupID, hasGroupID := plan["group_id"]
		if hasGroupID {
			groupID, ok := jsonInt64(rawGroupID)
			if !ok || groupID <= 0 {
				return fmt.Errorf("landing_pricing_config: %s.group_id must be a positive integer", planRef)
			}
			if groupRepo != nil {
				group, err := groupRepo.GetByIDLite(ctx, groupID)
				if err != nil || group == nil {
					return fmt.Errorf("landing_pricing_config: %s.group_id=%d not found", planRef, groupID)
				}
				if !group.IsActive() {
					return fmt.Errorf("landing_pricing_config: %s.group_id=%d is not active", planRef, groupID)
				}
				if !group.IsSubscriptionType() {
					return fmt.Errorf("landing_pricing_config: %s.group_id=%d is not a subscription group", planRef, groupID)
				}
			}
		}

		// Optional: show selected backend group fields
		if rawGroupFields, exists := plan["group_fields"]; exists {
			groupFields, ok := rawGroupFields.([]any)
			if !ok {
				return fmt.Errorf("landing_pricing_config: %s.group_fields must be an array", planRef)
			}
			if !hasGroupID {
				return fmt.Errorf("landing_pricing_config: %s.group_fields requires group_id", planRef)
			}
			for i, v := range groupFields {
				key, ok := v.(string)
				if !ok || !isPricingGroupFieldKey(key) {
					return fmt.Errorf("landing_pricing_config: %s.group_fields[%d] is invalid", planRef, i)
				}
			}
		}

		// Optional: subscription validity (days) per period
		if rawValidity, exists := plan["validity_days"]; exists {
			validity, ok := rawValidity.(map[string]any)
			if !ok {
				return fmt.Errorf("landing_pricing_config: %s.validity_days must be a JSON object", planRef)
			}
			for key, rawDays := range validity {
				if !isPricingPeriod(key) {
					return fmt.Errorf("landing_pricing_config: %s.validity_days.%s has invalid key", planRef, key)
				}
				days, ok := jsonInt64(rawDays)
				if !ok || days <= 0 {
					return fmt.Errorf("landing_pricing_config: %s.validity_days.%s must be a positive integer", planRef, key)
				}
			}
		}

		// Optional: plan meta widgets (typed fields, free组合)
		if rawMeta, exists := plan["meta"]; exists {
			meta, ok := rawMeta.(map[string]any)
			if !ok {
				return fmt.Errorf("landing_pricing_config: %s.meta must be a JSON object", planRef)
			}
			if rawWidgets, exists := meta["widgets"]; exists {
				widgets, ok := rawWidgets.([]any)
				if !ok {
					return fmt.Errorf("landing_pricing_config: %s.meta.widgets must be an array", planRef)
				}
				for i, rawWidget := range widgets {
					widget, ok := rawWidget.(map[string]any)
					if !ok {
						return fmt.Errorf("landing_pricing_config: %s.meta.widgets[%d] must be object", planRef, i)
					}

					typ, _ := widget["type"].(string)
					typ = strings.TrimSpace(typ)
					if typ == "" {
						return fmt.Errorf("landing_pricing_config: %s.meta.widgets[%d].type is required", planRef, i)
					}

					// Optional widget conditions
					if rawWhen, ok := widget["when"]; ok && rawWhen != nil {
						when, ok := rawWhen.(map[string]any)
						if !ok {
							return fmt.Errorf("landing_pricing_config: %s.meta.widgets[%d].when must be object", planRef, i)
						}
						if rawPeriods, ok := when["periods"]; ok && rawPeriods != nil {
							periods, ok := rawPeriods.([]any)
							if !ok || len(periods) == 0 {
								return fmt.Errorf("landing_pricing_config: %s.meta.widgets[%d].when.periods must be a non-empty array", planRef, i)
							}
							for j, rawPeriod := range periods {
								p, ok := rawPeriod.(string)
								if !ok || !isPricingPeriod(p) {
									return fmt.Errorf("landing_pricing_config: %s.meta.widgets[%d].when.periods[%d] is invalid", planRef, i, j)
								}
							}
						}
					}

					switch typ {
					case "text":
						text, _ := widget["text"].(string)
						if strings.TrimSpace(text) == "" {
							return fmt.Errorf("landing_pricing_config: %s.meta.widgets[%d].text is required", planRef, i)
						}
					case "kv":
						label, _ := widget["label"].(string)
						value, _ := widget["value"].(string)
						if strings.TrimSpace(label) == "" || strings.TrimSpace(value) == "" {
							return fmt.Errorf("landing_pricing_config: %s.meta.widgets[%d] requires label and value", planRef, i)
						}
					case "group_field":
						if !hasGroupID {
							return fmt.Errorf("landing_pricing_config: %s.meta.widgets[%d] requires group_id", planRef, i)
						}
						key, _ := widget["key"].(string)
						if !isPricingGroupFieldKey(key) {
							return fmt.Errorf("landing_pricing_config: %s.meta.widgets[%d].key is invalid", planRef, i)
						}
						if rawLabel, ok := widget["label"]; ok && rawLabel != nil {
							if _, ok := rawLabel.(string); !ok {
								return fmt.Errorf("landing_pricing_config: %s.meta.widgets[%d].label must be string", planRef, i)
							}
						}
					case "list":
						rawItems, ok := widget["items"].([]any)
						if !ok || len(rawItems) == 0 {
							return fmt.Errorf("landing_pricing_config: %s.meta.widgets[%d].items must be a non-empty array", planRef, i)
						}
						for j, rawItem := range rawItems {
							s, ok := rawItem.(string)
							if !ok || strings.TrimSpace(s) == "" {
								return fmt.Errorf("landing_pricing_config: %s.meta.widgets[%d].items[%d] must be a non-empty string", planRef, i, j)
							}
						}
						if rawTitle, ok := widget["title"]; ok && rawTitle != nil {
							if _, ok := rawTitle.(string); !ok {
								return fmt.Errorf("landing_pricing_config: %s.meta.widgets[%d].title must be string", planRef, i)
							}
						}
					case "tags":
						rawTags, ok := widget["tags"].([]any)
						if !ok || len(rawTags) == 0 {
							return fmt.Errorf("landing_pricing_config: %s.meta.widgets[%d].tags must be a non-empty array", planRef, i)
						}
						for j, rawTag := range rawTags {
							s, ok := rawTag.(string)
							if !ok || strings.TrimSpace(s) == "" {
								return fmt.Errorf("landing_pricing_config: %s.meta.widgets[%d].tags[%d] must be a non-empty string", planRef, i, j)
							}
						}
						if rawTone, ok := widget["tone"]; ok && rawTone != nil {
							tone, ok := rawTone.(string)
							if !ok || !isPricingWidgetTone(tone) {
								return fmt.Errorf("landing_pricing_config: %s.meta.widgets[%d].tone is invalid", planRef, i)
							}
						}
					case "divider":
						if rawLabel, ok := widget["label"]; ok && rawLabel != nil {
							if _, ok := rawLabel.(string); !ok {
								return fmt.Errorf("landing_pricing_config: %s.meta.widgets[%d].label must be string", planRef, i)
							}
						}
					case "metric":
						label, _ := widget["label"].(string)
						value, _ := widget["value"].(string)
						if strings.TrimSpace(label) == "" || strings.TrimSpace(value) == "" {
							return fmt.Errorf("landing_pricing_config: %s.meta.widgets[%d] requires label and value", planRef, i)
						}
						if rawHint, ok := widget["hint"]; ok && rawHint != nil {
							if _, ok := rawHint.(string); !ok {
								return fmt.Errorf("landing_pricing_config: %s.meta.widgets[%d].hint must be string", planRef, i)
							}
						}
					default:
						return fmt.Errorf("landing_pricing_config: %s.meta.widgets[%d].type is invalid", planRef, i)
					}
				}
			}
		}
	}

	payg, ok := root["payg"].(map[string]any)
	if !ok {
		return fmt.Errorf("landing_pricing_config: missing payg section")
	}
	if title, _ := payg["title"].(string); strings.TrimSpace(title) == "" {
		return fmt.Errorf("landing_pricing_config: payg.title is required")
	}
	rawFeatures, ok := payg["features"].([]any)
	if !ok {
		return fmt.Errorf("landing_pricing_config: payg.features must be an array")
	}
	for idx, f := range rawFeatures {
		if _, ok := f.(string); !ok {
			return fmt.Errorf("landing_pricing_config: payg.features[%d] must be a string", idx)
		}
	}

	return nil
}

func isPricingPeriod(v string) bool {
	return v == "week" || v == "month" || v == "custom"
}

func isPricingGroupFieldKey(v string) bool {
	switch v {
	case "daily_limit_usd", "weekly_limit_usd", "monthly_limit_usd", "user_concurrency", "rate_multiplier":
		return true
	default:
		return false
	}
}

func isPricingWidgetTone(v string) bool {
	switch strings.TrimSpace(v) {
	case "primary", "gray", "gold":
		return true
	default:
		return false
	}
}

func jsonInt64(v any) (int64, bool) {
	switch x := v.(type) {
	case json.Number:
		i, err := x.Int64()
		return i, err == nil
	case float64:
		if math.Trunc(x) != x {
			return 0, false
		}
		const maxInt64Float = float64(^uint64(0) >> 1)
		const minInt64Float = -maxInt64Float - 1
		if x > maxInt64Float || x < minInt64Float {
			return 0, false
		}
		return int64(x), true
	case int64:
		return x, true
	case int:
		return int64(x), true
	case string:
		s := strings.TrimSpace(x)
		if s == "" {
			return 0, false
		}
		i, err := strconv.ParseInt(s, 10, 64)
		return i, err == nil
	default:
		return 0, false
	}
}

type UpdateDocsPageRequest struct {
	Lang     string `json:"lang"`
	Markdown string `json:"markdown"`
}

type UpsertDocsPageMetaRequest struct {
	Key     string `json:"key"`
	TitleZh string `json:"title_zh,omitempty"`
	TitleEn string `json:"title_en,omitempty"`
	Group   string `json:"group,omitempty"`
	Order   int    `json:"order,omitempty"`
	Format  string `json:"format,omitempty"`
	Public  bool   `json:"public"`
}

// GetDocsPage returns a docs page markdown for admin editing.
// GET /api/v1/admin/docs/:key?lang=zh|en
func (h *SettingHandler) GetDocsPage(c *gin.Context) {
	docKey := c.Param("key")
	lang := pickDocsLang(c.Query("lang"), c.GetHeader("Accept-Language"))

	page, err := h.settingService.GetDocsPageForAdmin(c.Request.Context(), docKey, lang)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	response.Success(c, dto.DocsPage{
		Key:       page.Key,
		Lang:      page.Lang,
		Title:     page.Title,
		Format:    page.Format,
		Markdown:  page.Markdown,
		UpdatedAt: page.UpdatedAt,
	})
}

// ListDocsPages lists docs page metadata for admin.
// GET /api/v1/admin/docs/pages
func (h *SettingHandler) ListDocsPages(c *gin.Context) {
	pages, err := h.settingService.ListDocsPages(c.Request.Context())
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	out := make([]dto.DocsPageMeta, 0, len(pages))
	for _, p := range pages {
		out = append(out, dto.DocsPageMeta{
			Key:     p.Key,
			TitleZh: p.TitleZh,
			TitleEn: p.TitleEn,
			Group:   p.Group,
			Order:   p.Order,
			Format:  p.Format,
			Public:  p.Public,
		})
	}
	response.Success(c, out)
}

// CreateDocsPage creates or updates a docs page metadata entry (idempotent by key).
// POST /api/v1/admin/docs/pages
func (h *SettingHandler) CreateDocsPage(c *gin.Context) {
	var req UpsertDocsPageMetaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}
	if strings.TrimSpace(req.Key) == "" {
		response.BadRequest(c, "key is required")
		return
	}
	meta, err := h.settingService.UpsertDocsPageMeta(c.Request.Context(), service.DocsPageMeta{
		Key:     req.Key,
		TitleZh: req.TitleZh,
		TitleEn: req.TitleEn,
		Group:   req.Group,
		Order:   req.Order,
		Format:  req.Format,
		Public:  req.Public,
	})
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, dto.DocsPageMeta{
		Key:     meta.Key,
		TitleZh: meta.TitleZh,
		TitleEn: meta.TitleEn,
		Group:   meta.Group,
		Order:   meta.Order,
		Format:  meta.Format,
		Public:  meta.Public,
	})
}

// UpdateDocsPageMeta updates an existing docs page meta (upsert by key).
// PUT /api/v1/admin/docs/pages/:key
func (h *SettingHandler) UpdateDocsPageMeta(c *gin.Context) {
	key := c.Param("key")
	var req UpsertDocsPageMetaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}
	if strings.TrimSpace(key) == "" {
		response.BadRequest(c, "key is required")
		return
	}
	if strings.TrimSpace(req.Key) == "" {
		req.Key = key
	}
	if req.Key != key {
		response.BadRequest(c, "key in body must match path")
		return
	}
	meta, err := h.settingService.UpsertDocsPageMeta(c.Request.Context(), service.DocsPageMeta{
		Key:     req.Key,
		TitleZh: req.TitleZh,
		TitleEn: req.TitleEn,
		Group:   req.Group,
		Order:   req.Order,
		Format:  req.Format,
		Public:  req.Public,
	})
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, dto.DocsPageMeta{
		Key:     meta.Key,
		TitleZh: meta.TitleZh,
		TitleEn: meta.TitleEn,
		Group:   meta.Group,
		Order:   meta.Order,
		Format:  meta.Format,
		Public:  meta.Public,
	})
}

// DeleteDocsPage deletes a docs page (meta + content).
// DELETE /api/v1/admin/docs/pages/:key
func (h *SettingHandler) DeleteDocsPage(c *gin.Context) {
	key := c.Param("key")
	if strings.TrimSpace(key) == "" {
		response.BadRequest(c, "key is required")
		return
	}
	if err := h.settingService.DeleteDocsPage(c.Request.Context(), key); err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, gin.H{"deleted": true})
}

// UpdateDocsPage upserts a docs page markdown.
// PUT /api/v1/admin/docs/:key
func (h *SettingHandler) UpdateDocsPage(c *gin.Context) {
	const maxDocsMarkdownBytes = 200_000

	var req UpdateDocsPageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}
	if len(req.Markdown) > maxDocsMarkdownBytes {
		response.BadRequest(c, "Docs markdown is too large")
		return
	}

	docKey := c.Param("key")
	lang := pickDocsLang(req.Lang, c.GetHeader("Accept-Language"))

	if err := h.settingService.UpdateDocsPage(c.Request.Context(), docKey, lang, req.Markdown); err != nil {
		response.ErrorFrom(c, err)
		return
	}

	page, err := h.settingService.GetDocsPageForAdmin(c.Request.Context(), docKey, lang)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	response.Success(c, dto.DocsPage{
		Key:       page.Key,
		Lang:      page.Lang,
		Title:     page.Title,
		Format:    page.Format,
		Markdown:  page.Markdown,
		UpdatedAt: page.UpdatedAt,
	})
}

func pickDocsLang(raw string, acceptLanguage string) string {
	raw = strings.ToLower(strings.TrimSpace(raw))
	if raw == "" {
		al := strings.ToLower(acceptLanguage)
		if strings.HasPrefix(al, "zh") || strings.Contains(al, "zh") {
			return "zh"
		}
		return "en"
	}
	if strings.HasPrefix(raw, "zh") {
		return "zh"
	}
	if strings.HasPrefix(raw, "en") {
		return "en"
	}
	// Fallback: English.
	return "en"
}
