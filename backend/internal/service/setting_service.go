package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/Wei-Shaw/sub2api/internal/config"
	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
)

var (
	ErrRegistrationDisabled  = infraerrors.Forbidden("REGISTRATION_DISABLED", "registration is currently disabled")
	ErrSubscriptionsDisabled = infraerrors.Forbidden("SUBSCRIPTIONS_DISABLED", "subscriptions are currently disabled")
	ErrSettingNotFound       = infraerrors.NotFound("SETTING_NOT_FOUND", "setting not found")
)

const defaultLandingPricingConfigV1 = `{
  "version": 1,
  "currency": "CNY",
  "default_tab": "subscription",
  "subscription": {
    "title": "订阅套餐",
    "subtitle": "周付 / 月付，适配不同团队节奏。企业版支持定制与 SLA。",
    "default_period": "month",
    "periods": [
      { "key": "week", "label": "周付" },
      { "key": "month", "label": "月付" },
      { "key": "custom", "label": "自定义" }
    ],
    "plans": [
      {
        "id": "trial",
        "name": "体验版",
        "badge": "Free",
        "description": "快速验证与 PoC",
        "price": { "week": 0, "month": 0 },
        "features": ["共享基础算力池", "标准路由与日志", "社区支持"]
      },
      {
        "id": "starter",
        "name": "入门版",
        "badge": "Starter",
        "description": "个人/小项目稳定起步",
        "price": { "week": 29, "month": 79 },
        "features": ["更高并发与速率", "基础监控面板", "邮件工单支持"]
      },
      {
        "id": "standard",
        "name": "标准版",
        "badge": "Standard",
        "description": "小团队协作与权限",
        "price": { "week": 49, "month": 129 },
        "features": ["多 API Key 管理", "分组/配额策略", "更丰富的审计日志"]
      },
      {
        "id": "pro",
        "name": "专业版",
        "badge": "Recommended",
        "description": "生产环境优先保障",
        "highlighted": true,
        "price": { "week": 79, "month": 199 },
        "features": ["优先路由与稳定性策略", "更细粒度用量分析", "专属支持通道"]
      },
      {
        "id": "team",
        "name": "团队版",
        "badge": "Team",
        "description": "更强的管理与协同",
        "price": { "week": 129, "month": 329 },
        "features": ["团队成员与角色权限", "多环境配置/隔离", "更高并发与限流配额"]
      },
      {
        "id": "enterprise",
        "name": "企业版",
        "badge": "Enterprise",
        "description": "安全合规与定制化",
        "price": { "custom": "联系销售" },
        "features": ["SLA / 专属支持", "专属实例 / 私有部署", "SSO/审计/合规支持", "定制接入与迁移服务"]
      }
    ]
  },
  "payg": {
    "title": "按量计费",
    "subtitle": "按使用量扣费，适合弹性负载与不确定需求。",
    "cta_label": "充值 / 兑换码",
    "features": ["按实际用量扣费，随用随充", "支持兑换码与管理员充值", "可与订阅模式并存（按后台规则）"],
    "note": "此处为展示示例，价格与口径以后台配置与实际扣费规则为准。"
  },
  "note": "示例套餐可在后台“系统设置 → Landing / Pricing”中修改。"
}`

type SettingRepository interface {
	Get(ctx context.Context, key string) (*Setting, error)
	GetValue(ctx context.Context, key string) (string, error)
	Set(ctx context.Context, key, value string) error
	GetMultiple(ctx context.Context, keys []string) (map[string]string, error)
	SetMultiple(ctx context.Context, settings map[string]string) error
	GetAll(ctx context.Context) (map[string]string, error)
	Delete(ctx context.Context, key string) error
}

// SettingService 系统设置服务
type SettingService struct {
	settingRepo SettingRepository
	cfg         *config.Config
	onUpdate    func() // Callback when settings are updated (for cache invalidation)
	version     string // Application version
}

// NewSettingService 创建系统设置服务实例
func NewSettingService(settingRepo SettingRepository, cfg *config.Config) *SettingService {
	return &SettingService{
		settingRepo: settingRepo,
		cfg:         cfg,
	}
}

// GetAllSettings 获取所有系统设置
func (s *SettingService) GetAllSettings(ctx context.Context) (*SystemSettings, error) {
	settings, err := s.settingRepo.GetAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("get all settings: %w", err)
	}

	return s.parseSettings(settings), nil
}

// GetPublicSettings 获取公开设置（无需登录）
func (s *SettingService) GetPublicSettings(ctx context.Context) (*PublicSettings, error) {
	keys := []string{
		SettingKeyRegistrationEnabled,
		SettingKeyEmailVerifyEnabled,
		SettingKeyPromoCodeEnabled,
		SettingKeyPasswordResetEnabled,
		SettingKeyTotpEnabled,
		SettingKeyTurnstileEnabled,
		SettingKeyTurnstileSiteKey,
		SettingKeySiteName,
		SettingKeySiteLogo,
		SettingKeySiteSubtitle,
		SettingKeyAPIBaseURL,
		SettingKeyContactInfo,
		SettingKeyDocURL,
		SettingKeyHomeContent,
		SettingKeyLandingPricingEnabled,
		SettingKeyLandingPricingConfig,
		SettingKeySubscriptionsEnabled,
		SettingKeyHideCcsImportButton,
		SettingKeyPurchaseSubscriptionEnabled,
		SettingKeyPurchaseSubscriptionURL,
		SettingKeyLinuxDoConnectEnabled,
	}

	settings, err := s.settingRepo.GetMultiple(ctx, keys)
	if err != nil {
		return nil, fmt.Errorf("get public settings: %w", err)
	}

	linuxDoEnabled := false
	if raw, ok := settings[SettingKeyLinuxDoConnectEnabled]; ok {
		linuxDoEnabled = raw == "true"
	} else {
		linuxDoEnabled = s.cfg != nil && s.cfg.LinuxDo.Enabled
	}

	// Password reset requires email verification to be enabled
	emailVerifyEnabled := settings[SettingKeyEmailVerifyEnabled] == "true"
	passwordResetEnabled := emailVerifyEnabled && settings[SettingKeyPasswordResetEnabled] == "true"

	landingPricingEnabled := !isFalseSettingValue(settings[SettingKeyLandingPricingEnabled])
	subscriptionsEnabled := !isFalseSettingValue(settings[SettingKeySubscriptionsEnabled])

	landingPricingConfig := s.getStringOrDefault(settings, SettingKeyLandingPricingConfig, defaultLandingPricingConfigV1)
	if !landingPricingEnabled {
		landingPricingConfig = ""
	}

	return &PublicSettings{
		RegistrationEnabled:         settings[SettingKeyRegistrationEnabled] == "true",
		EmailVerifyEnabled:          emailVerifyEnabled,
		PromoCodeEnabled:            settings[SettingKeyPromoCodeEnabled] != "false", // 默认启用
		PasswordResetEnabled:        passwordResetEnabled,
		TotpEnabled:                 settings[SettingKeyTotpEnabled] == "true",
		TurnstileEnabled:            settings[SettingKeyTurnstileEnabled] == "true",
		TurnstileSiteKey:            settings[SettingKeyTurnstileSiteKey],
		SiteName:                    s.getStringOrDefault(settings, SettingKeySiteName, "Sub2API"),
		SiteLogo:                    settings[SettingKeySiteLogo],
		SiteSubtitle:                s.getStringOrDefault(settings, SettingKeySiteSubtitle, "Subscription to API Conversion Platform"),
		APIBaseURL:                  settings[SettingKeyAPIBaseURL],
		ContactInfo:                 settings[SettingKeyContactInfo],
		DocURL:                      settings[SettingKeyDocURL],
		HomeContent:                 settings[SettingKeyHomeContent],
		LandingPricingEnabled:       landingPricingEnabled,
		LandingPricingConfig:        landingPricingConfig,
		SubscriptionsEnabled:        subscriptionsEnabled,
		HideCcsImportButton:         settings[SettingKeyHideCcsImportButton] == "true",
		PurchaseSubscriptionEnabled: settings[SettingKeyPurchaseSubscriptionEnabled] == "true",
		PurchaseSubscriptionURL:     strings.TrimSpace(settings[SettingKeyPurchaseSubscriptionURL]),
		LinuxDoOAuthEnabled:         linuxDoEnabled,
	}, nil
}

// SetOnUpdateCallback sets a callback function to be called when settings are updated
// This is used for cache invalidation (e.g., HTML cache in frontend server)
func (s *SettingService) SetOnUpdateCallback(callback func()) {
	s.onUpdate = callback
}

// SetVersion sets the application version for injection into public settings
func (s *SettingService) SetVersion(version string) {
	s.version = version
}

// GetPublicSettingsForInjection returns public settings in a format suitable for HTML injection
// This implements the web.PublicSettingsProvider interface
func (s *SettingService) GetPublicSettingsForInjection(ctx context.Context) (any, error) {
	settings, err := s.GetPublicSettings(ctx)
	if err != nil {
		return nil, err
	}

	// Return a struct that matches the frontend's expected format
	return &struct {
		RegistrationEnabled         bool   `json:"registration_enabled"`
		EmailVerifyEnabled          bool   `json:"email_verify_enabled"`
		PromoCodeEnabled            bool   `json:"promo_code_enabled"`
		PasswordResetEnabled        bool   `json:"password_reset_enabled"`
		TotpEnabled                 bool   `json:"totp_enabled"`
		TurnstileEnabled            bool   `json:"turnstile_enabled"`
		TurnstileSiteKey            string `json:"turnstile_site_key,omitempty"`
		SiteName                    string `json:"site_name"`
		SiteLogo                    string `json:"site_logo,omitempty"`
		SiteSubtitle                string `json:"site_subtitle,omitempty"`
		APIBaseURL                  string `json:"api_base_url,omitempty"`
		ContactInfo                 string `json:"contact_info,omitempty"`
		DocURL                      string `json:"doc_url,omitempty"`
		HomeContent                 string `json:"home_content,omitempty"`
		LandingPricingEnabled       bool   `json:"landing_pricing_enabled"`
		LandingPricingConfig        string `json:"landing_pricing_config,omitempty"`
		SubscriptionsEnabled        bool   `json:"subscriptions_enabled"`
		HideCcsImportButton         bool   `json:"hide_ccs_import_button"`
		PurchaseSubscriptionEnabled bool   `json:"purchase_subscription_enabled"`
		PurchaseSubscriptionURL     string `json:"purchase_subscription_url,omitempty"`
		LinuxDoOAuthEnabled         bool   `json:"linuxdo_oauth_enabled"`
		Version                     string `json:"version,omitempty"`
	}{
		RegistrationEnabled:         settings.RegistrationEnabled,
		EmailVerifyEnabled:          settings.EmailVerifyEnabled,
		PromoCodeEnabled:            settings.PromoCodeEnabled,
		PasswordResetEnabled:        settings.PasswordResetEnabled,
		TotpEnabled:                 settings.TotpEnabled,
		TurnstileEnabled:            settings.TurnstileEnabled,
		TurnstileSiteKey:            settings.TurnstileSiteKey,
		SiteName:                    settings.SiteName,
		SiteLogo:                    settings.SiteLogo,
		SiteSubtitle:                settings.SiteSubtitle,
		APIBaseURL:                  settings.APIBaseURL,
		ContactInfo:                 settings.ContactInfo,
		DocURL:                      settings.DocURL,
		HomeContent:                 settings.HomeContent,
		LandingPricingEnabled:       settings.LandingPricingEnabled,
		LandingPricingConfig:        settings.LandingPricingConfig,
		SubscriptionsEnabled:        settings.SubscriptionsEnabled,
		HideCcsImportButton:         settings.HideCcsImportButton,
		PurchaseSubscriptionEnabled: settings.PurchaseSubscriptionEnabled,
		PurchaseSubscriptionURL:     settings.PurchaseSubscriptionURL,
		LinuxDoOAuthEnabled:         settings.LinuxDoOAuthEnabled,
		Version:                     s.version,
	}, nil
}

// UpdateSettings 更新系统设置
func (s *SettingService) UpdateSettings(ctx context.Context, settings *SystemSettings) error {
	updates := make(map[string]string)

	// 注册设置
	updates[SettingKeyRegistrationEnabled] = strconv.FormatBool(settings.RegistrationEnabled)
	updates[SettingKeyEmailVerifyEnabled] = strconv.FormatBool(settings.EmailVerifyEnabled)
	updates[SettingKeyPromoCodeEnabled] = strconv.FormatBool(settings.PromoCodeEnabled)
	updates[SettingKeyPasswordResetEnabled] = strconv.FormatBool(settings.PasswordResetEnabled)
	updates[SettingKeyTotpEnabled] = strconv.FormatBool(settings.TotpEnabled)

	// Referral settings
	updates[SettingKeyReferralInviterBonus] = strconv.FormatFloat(settings.ReferralInviterBonus, 'f', 8, 64)
	updates[SettingKeyReferralInviteeBonus] = strconv.FormatFloat(settings.ReferralInviteeBonus, 'f', 8, 64)
	updates[SettingKeyReferralCommissionRate] = strconv.FormatFloat(settings.ReferralCommissionRate, 'f', 8, 64)

	// 邮件服务设置（只有非空才更新密码）
	updates[SettingKeySMTPHost] = settings.SMTPHost
	updates[SettingKeySMTPPort] = strconv.Itoa(settings.SMTPPort)
	updates[SettingKeySMTPUsername] = settings.SMTPUsername
	if settings.SMTPPassword != "" {
		updates[SettingKeySMTPPassword] = settings.SMTPPassword
	}
	updates[SettingKeySMTPFrom] = settings.SMTPFrom
	updates[SettingKeySMTPFromName] = settings.SMTPFromName
	updates[SettingKeySMTPUseTLS] = strconv.FormatBool(settings.SMTPUseTLS)

	// Cloudflare Turnstile 设置（只有非空才更新密钥）
	updates[SettingKeyTurnstileEnabled] = strconv.FormatBool(settings.TurnstileEnabled)
	updates[SettingKeyTurnstileSiteKey] = settings.TurnstileSiteKey
	if settings.TurnstileSecretKey != "" {
		updates[SettingKeyTurnstileSecretKey] = settings.TurnstileSecretKey
	}

	// LinuxDo Connect OAuth 登录
	updates[SettingKeyLinuxDoConnectEnabled] = strconv.FormatBool(settings.LinuxDoConnectEnabled)
	updates[SettingKeyLinuxDoConnectClientID] = settings.LinuxDoConnectClientID
	updates[SettingKeyLinuxDoConnectRedirectURL] = settings.LinuxDoConnectRedirectURL
	if settings.LinuxDoConnectClientSecret != "" {
		updates[SettingKeyLinuxDoConnectClientSecret] = settings.LinuxDoConnectClientSecret
	}

	// OEM设置
	updates[SettingKeySiteName] = settings.SiteName
	updates[SettingKeySiteLogo] = settings.SiteLogo
	updates[SettingKeySiteSubtitle] = settings.SiteSubtitle
	updates[SettingKeyAPIBaseURL] = settings.APIBaseURL
	updates[SettingKeyContactInfo] = settings.ContactInfo
	updates[SettingKeyDocURL] = settings.DocURL
	updates[SettingKeyHomeContent] = settings.HomeContent
	updates[SettingKeyLandingPricingEnabled] = strconv.FormatBool(settings.LandingPricingEnabled)
	updates[SettingKeyLandingPricingConfig] = settings.LandingPricingConfig
	updates[SettingKeySubscriptionsEnabled] = strconv.FormatBool(settings.SubscriptionsEnabled)
	updates[SettingKeyHideCcsImportButton] = strconv.FormatBool(settings.HideCcsImportButton)
	updates[SettingKeyPurchaseSubscriptionEnabled] = strconv.FormatBool(settings.PurchaseSubscriptionEnabled)
	updates[SettingKeyPurchaseSubscriptionURL] = strings.TrimSpace(settings.PurchaseSubscriptionURL)

	// 默认配置
	updates[SettingKeyDefaultConcurrency] = strconv.Itoa(settings.DefaultConcurrency)
	updates[SettingKeyDefaultBalance] = strconv.FormatFloat(settings.DefaultBalance, 'f', 8, 64)

	// Model fallback configuration
	updates[SettingKeyEnableModelFallback] = strconv.FormatBool(settings.EnableModelFallback)
	updates[SettingKeyFallbackModelAnthropic] = settings.FallbackModelAnthropic
	updates[SettingKeyFallbackModelOpenAI] = settings.FallbackModelOpenAI
	updates[SettingKeyFallbackModelGemini] = settings.FallbackModelGemini
	updates[SettingKeyFallbackModelAntigravity] = settings.FallbackModelAntigravity

	// Identity patch configuration (Claude -> Gemini)
	updates[SettingKeyEnableIdentityPatch] = strconv.FormatBool(settings.EnableIdentityPatch)
	updates[SettingKeyIdentityPatchPrompt] = settings.IdentityPatchPrompt

	// Gateway runtime toggles
	updates[SettingKeyGatewayFixOrphanedToolResults] = strconv.FormatBool(settings.GatewayFixOrphanedToolResults)

	// Ops monitoring (vNext)
	updates[SettingKeyOpsMonitoringEnabled] = strconv.FormatBool(settings.OpsMonitoringEnabled)
	updates[SettingKeyOpsRealtimeMonitoringEnabled] = strconv.FormatBool(settings.OpsRealtimeMonitoringEnabled)
	updates[SettingKeyOpsQueryModeDefault] = string(ParseOpsQueryMode(settings.OpsQueryModeDefault))
	if settings.OpsMetricsIntervalSeconds > 0 {
		updates[SettingKeyOpsMetricsIntervalSeconds] = strconv.Itoa(settings.OpsMetricsIntervalSeconds)
	}

	err := s.settingRepo.SetMultiple(ctx, updates)
	if err == nil && s.onUpdate != nil {
		s.onUpdate() // Invalidate cache after settings update
	}
	return err
}

// IsRegistrationEnabled 检查是否开放注册
func (s *SettingService) IsRegistrationEnabled(ctx context.Context) bool {
	value, err := s.settingRepo.GetValue(ctx, SettingKeyRegistrationEnabled)
	if err != nil {
		// 安全默认：如果设置不存在或查询出错，默认关闭注册
		return false
	}
	return value == "true"
}

// IsEmailVerifyEnabled 检查是否开启邮件验证
func (s *SettingService) IsEmailVerifyEnabled(ctx context.Context) bool {
	value, err := s.settingRepo.GetValue(ctx, SettingKeyEmailVerifyEnabled)
	if err != nil {
		return false
	}
	return value == "true"
}

// IsPromoCodeEnabled 检查是否启用优惠码功能
func (s *SettingService) IsPromoCodeEnabled(ctx context.Context) bool {
	value, err := s.settingRepo.GetValue(ctx, SettingKeyPromoCodeEnabled)
	if err != nil {
		return true // 默认启用
	}
	return value != "false"
}

// IsPasswordResetEnabled 检查是否启用密码重置功能
// 要求：必须同时开启邮件验证
func (s *SettingService) IsPasswordResetEnabled(ctx context.Context) bool {
	// Password reset requires email verification to be enabled
	if !s.IsEmailVerifyEnabled(ctx) {
		return false
	}
	value, err := s.settingRepo.GetValue(ctx, SettingKeyPasswordResetEnabled)
	if err != nil {
		return false // 默认关闭
	}
	return value == "true"
}

// IsTotpEnabled 检查是否启用 TOTP 双因素认证功能
func (s *SettingService) IsTotpEnabled(ctx context.Context) bool {
	value, err := s.settingRepo.GetValue(ctx, SettingKeyTotpEnabled)
	if err != nil {
		return false // 默认关闭
	}
	return value == "true"
}

// IsTotpEncryptionKeyConfigured 检查 TOTP 加密密钥是否已手动配置
// 只有手动配置了密钥才允许在管理后台启用 TOTP 功能
func (s *SettingService) IsTotpEncryptionKeyConfigured() bool {
	return s.cfg.Totp.EncryptionKeyConfigured
}

// GetSiteName 获取网站名称
func (s *SettingService) GetSiteName(ctx context.Context) string {
	value, err := s.settingRepo.GetValue(ctx, SettingKeySiteName)
	if err != nil || value == "" {
		return "Sub2API"
	}
	return value
}

// GetDefaultConcurrency 获取默认并发量
func (s *SettingService) GetDefaultConcurrency(ctx context.Context) int {
	value, err := s.settingRepo.GetValue(ctx, SettingKeyDefaultConcurrency)
	if err != nil {
		return s.cfg.Default.UserConcurrency
	}
	if v, err := strconv.Atoi(value); err == nil && v > 0 {
		return v
	}
	return s.cfg.Default.UserConcurrency
}

// GetDefaultBalance 获取默认余额
func (s *SettingService) GetDefaultBalance(ctx context.Context) float64 {
	value, err := s.settingRepo.GetValue(ctx, SettingKeyDefaultBalance)
	if err != nil {
		return s.cfg.Default.UserBalance
	}
	if v, err := strconv.ParseFloat(value, 64); err == nil && v >= 0 {
		return v
	}
	return s.cfg.Default.UserBalance
}

// GetReferralInviterBonus returns the inviter signup bonus balance amount.
// Default: 0 (disabled).
func (s *SettingService) GetReferralInviterBonus(ctx context.Context) float64 {
	value, err := s.settingRepo.GetValue(ctx, SettingKeyReferralInviterBonus)
	if err != nil {
		return 0
	}
	if v, err := strconv.ParseFloat(strings.TrimSpace(value), 64); err == nil && v >= 0 {
		return v
	}
	return 0
}

// GetReferralInviteeBonus returns the invitee signup bonus balance amount.
// Default: 0 (disabled).
func (s *SettingService) GetReferralInviteeBonus(ctx context.Context) float64 {
	value, err := s.settingRepo.GetValue(ctx, SettingKeyReferralInviteeBonus)
	if err != nil {
		return 0
	}
	if v, err := strconv.ParseFloat(strings.TrimSpace(value), 64); err == nil && v >= 0 {
		return v
	}
	return 0
}

// GetReferralCommissionRate returns the inviter rebate rate for invitee usage.
// Expected range: 0-1. Default: 0 (disabled).
func (s *SettingService) GetReferralCommissionRate(ctx context.Context) float64 {
	value, err := s.settingRepo.GetValue(ctx, SettingKeyReferralCommissionRate)
	if err != nil {
		return 0
	}
	v, err := strconv.ParseFloat(strings.TrimSpace(value), 64)
	if err != nil {
		return 0
	}
	if v < 0 {
		return 0
	}
	if v > 1 {
		return 1
	}
	return v
}

// InitializeDefaultSettings 初始化默认设置
func (s *SettingService) InitializeDefaultSettings(ctx context.Context) error {
	// 检查是否已有设置
	_, err := s.settingRepo.GetValue(ctx, SettingKeyRegistrationEnabled)
	if err == nil {
		// 已有设置，不需要初始化
		return nil
	}
	if !errors.Is(err, ErrSettingNotFound) {
		return fmt.Errorf("check existing settings: %w", err)
	}

	// 初始化默认设置
	defaults := map[string]string{
		SettingKeyRegistrationEnabled:         "true",
		SettingKeyEmailVerifyEnabled:          "false",
		SettingKeyPromoCodeEnabled:            "true", // 默认启用优惠码功能
		SettingKeySiteName:                    "Sub2API",
		SettingKeySiteLogo:                    "",
		SettingKeyDocURL:                      "/docs",
		SettingKeyReferralInviterBonus:        "0",
		SettingKeyReferralInviteeBonus:        "0",
		SettingKeyReferralCommissionRate:      "0",
		SettingKeyPurchaseSubscriptionEnabled: "false",
		SettingKeyPurchaseSubscriptionURL:     "",
		SettingKeyDefaultConcurrency:          strconv.Itoa(s.cfg.Default.UserConcurrency),
		SettingKeyDefaultBalance:              strconv.FormatFloat(s.cfg.Default.UserBalance, 'f', 8, 64),
		SettingKeySMTPPort:                    "587",
		SettingKeySMTPUseTLS:                  "false",
		// Model fallback defaults
		SettingKeyEnableModelFallback:      "false",
		SettingKeyFallbackModelAnthropic:   "claude-3-5-sonnet-20241022",
		SettingKeyFallbackModelOpenAI:      "gpt-4o",
		SettingKeyFallbackModelGemini:      "gemini-2.5-pro",
		SettingKeyFallbackModelAntigravity: "gemini-2.5-pro",
		// Identity patch defaults
		SettingKeyEnableIdentityPatch: "true",
		SettingKeyIdentityPatchPrompt: "",

		// Gateway runtime toggles
		SettingKeyGatewayFixOrphanedToolResults: strconv.FormatBool(s.cfg.Gateway.FixOrphanedToolResults),

		// Ops monitoring defaults (vNext)
		SettingKeyOpsMonitoringEnabled:         "true",
		SettingKeyOpsRealtimeMonitoringEnabled: "true",
		SettingKeyOpsQueryModeDefault:          "auto",
		SettingKeyOpsMetricsIntervalSeconds:    "60",

		// Landing pricing defaults (JSON)
		SettingKeyLandingPricingEnabled: "true",
		SettingKeyLandingPricingConfig:  defaultLandingPricingConfigV1,
		SettingKeySubscriptionsEnabled:  "true",
	}

	return s.settingRepo.SetMultiple(ctx, defaults)
}

// parseSettings 解析设置到结构体
func (s *SettingService) parseSettings(settings map[string]string) *SystemSettings {
	emailVerifyEnabled := settings[SettingKeyEmailVerifyEnabled] == "true"
	result := &SystemSettings{
		RegistrationEnabled:          settings[SettingKeyRegistrationEnabled] == "true",
		EmailVerifyEnabled:           emailVerifyEnabled,
		PromoCodeEnabled:             settings[SettingKeyPromoCodeEnabled] != "false", // 默认启用
		PasswordResetEnabled:         emailVerifyEnabled && settings[SettingKeyPasswordResetEnabled] == "true",
		TotpEnabled:                  settings[SettingKeyTotpEnabled] == "true",
		SMTPHost:                     settings[SettingKeySMTPHost],
		SMTPUsername:                 settings[SettingKeySMTPUsername],
		SMTPFrom:                     settings[SettingKeySMTPFrom],
		SMTPFromName:                 settings[SettingKeySMTPFromName],
		SMTPUseTLS:                   settings[SettingKeySMTPUseTLS] == "true",
		SMTPPasswordConfigured:       settings[SettingKeySMTPPassword] != "",
		TurnstileEnabled:             settings[SettingKeyTurnstileEnabled] == "true",
		TurnstileSiteKey:             settings[SettingKeyTurnstileSiteKey],
		TurnstileSecretKeyConfigured: settings[SettingKeyTurnstileSecretKey] != "",
		SiteName:                     s.getStringOrDefault(settings, SettingKeySiteName, "Sub2API"),
		SiteLogo:                     settings[SettingKeySiteLogo],
		SiteSubtitle:                 s.getStringOrDefault(settings, SettingKeySiteSubtitle, "Subscription to API Conversion Platform"),
		APIBaseURL:                   settings[SettingKeyAPIBaseURL],
		ContactInfo:                  settings[SettingKeyContactInfo],
		DocURL:                       settings[SettingKeyDocURL],
		HomeContent:                  settings[SettingKeyHomeContent],
		LandingPricingConfig:         s.getStringOrDefault(settings, SettingKeyLandingPricingConfig, defaultLandingPricingConfigV1),
		LandingPricingEnabled:        !isFalseSettingValue(settings[SettingKeyLandingPricingEnabled]),
		SubscriptionsEnabled:         !isFalseSettingValue(settings[SettingKeySubscriptionsEnabled]),
		HideCcsImportButton:          settings[SettingKeyHideCcsImportButton] == "true",
		PurchaseSubscriptionEnabled:  settings[SettingKeyPurchaseSubscriptionEnabled] == "true",
		PurchaseSubscriptionURL:      strings.TrimSpace(settings[SettingKeyPurchaseSubscriptionURL]),
	}

	// 解析整数类型
	if port, err := strconv.Atoi(settings[SettingKeySMTPPort]); err == nil {
		result.SMTPPort = port
	} else {
		result.SMTPPort = 587
	}

	if concurrency, err := strconv.Atoi(settings[SettingKeyDefaultConcurrency]); err == nil {
		result.DefaultConcurrency = concurrency
	} else {
		result.DefaultConcurrency = s.cfg.Default.UserConcurrency
	}

	// 解析浮点数类型
	if balance, err := strconv.ParseFloat(settings[SettingKeyDefaultBalance], 64); err == nil {
		result.DefaultBalance = balance
	} else {
		result.DefaultBalance = s.cfg.Default.UserBalance
	}

	// 敏感信息直接返回，方便测试连接时使用
	// Referral settings (defaults: 0 / disabled).
	if raw := strings.TrimSpace(settings[SettingKeyReferralInviterBonus]); raw != "" {
		if v, err := strconv.ParseFloat(raw, 64); err == nil && v >= 0 {
			result.ReferralInviterBonus = v
		}
	}
	if raw := strings.TrimSpace(settings[SettingKeyReferralInviteeBonus]); raw != "" {
		if v, err := strconv.ParseFloat(raw, 64); err == nil && v >= 0 {
			result.ReferralInviteeBonus = v
		}
	}
	if raw := strings.TrimSpace(settings[SettingKeyReferralCommissionRate]); raw != "" {
		if v, err := strconv.ParseFloat(raw, 64); err == nil {
			if v < 0 {
				v = 0
			}
			if v > 1 {
				v = 1
			}
			result.ReferralCommissionRate = v
		}
	}

	result.SMTPPassword = settings[SettingKeySMTPPassword]
	result.TurnstileSecretKey = settings[SettingKeyTurnstileSecretKey]

	// LinuxDo Connect 设置：
	// - 兼容 config.yaml/env（避免老部署因为未迁移到数据库设置而被意外关闭）
	// - 支持在后台“系统设置”中覆盖并持久化（存储于 DB）
	linuxDoBase := config.LinuxDoConnectConfig{}
	if s.cfg != nil {
		linuxDoBase = s.cfg.LinuxDo
	}

	if raw, ok := settings[SettingKeyLinuxDoConnectEnabled]; ok {
		result.LinuxDoConnectEnabled = raw == "true"
	} else {
		result.LinuxDoConnectEnabled = linuxDoBase.Enabled
	}

	if v, ok := settings[SettingKeyLinuxDoConnectClientID]; ok && strings.TrimSpace(v) != "" {
		result.LinuxDoConnectClientID = strings.TrimSpace(v)
	} else {
		result.LinuxDoConnectClientID = linuxDoBase.ClientID
	}

	if v, ok := settings[SettingKeyLinuxDoConnectRedirectURL]; ok && strings.TrimSpace(v) != "" {
		result.LinuxDoConnectRedirectURL = strings.TrimSpace(v)
	} else {
		result.LinuxDoConnectRedirectURL = linuxDoBase.RedirectURL
	}

	result.LinuxDoConnectClientSecret = strings.TrimSpace(settings[SettingKeyLinuxDoConnectClientSecret])
	if result.LinuxDoConnectClientSecret == "" {
		result.LinuxDoConnectClientSecret = strings.TrimSpace(linuxDoBase.ClientSecret)
	}
	result.LinuxDoConnectClientSecretConfigured = result.LinuxDoConnectClientSecret != ""

	// Model fallback settings
	result.EnableModelFallback = settings[SettingKeyEnableModelFallback] == "true"
	result.FallbackModelAnthropic = s.getStringOrDefault(settings, SettingKeyFallbackModelAnthropic, "claude-3-5-sonnet-20241022")
	result.FallbackModelOpenAI = s.getStringOrDefault(settings, SettingKeyFallbackModelOpenAI, "gpt-4o")
	result.FallbackModelGemini = s.getStringOrDefault(settings, SettingKeyFallbackModelGemini, "gemini-2.5-pro")
	result.FallbackModelAntigravity = s.getStringOrDefault(settings, SettingKeyFallbackModelAntigravity, "gemini-2.5-pro")

	// Identity patch settings (default: enabled, to preserve existing behavior)
	if v, ok := settings[SettingKeyEnableIdentityPatch]; ok && v != "" {
		result.EnableIdentityPatch = v == "true"
	} else {
		result.EnableIdentityPatch = true
	}
	result.IdentityPatchPrompt = settings[SettingKeyIdentityPatchPrompt]

	// Gateway runtime toggles (default: enabled / fail-open)
	if v, ok := settings[SettingKeyGatewayFixOrphanedToolResults]; ok && strings.TrimSpace(v) != "" {
		result.GatewayFixOrphanedToolResults = v == "true"
	} else if s.cfg != nil {
		result.GatewayFixOrphanedToolResults = s.cfg.Gateway.FixOrphanedToolResults
	} else {
		result.GatewayFixOrphanedToolResults = true
	}

	// Ops monitoring settings (default: enabled, fail-open)
	result.OpsMonitoringEnabled = !isFalseSettingValue(settings[SettingKeyOpsMonitoringEnabled])
	result.OpsRealtimeMonitoringEnabled = !isFalseSettingValue(settings[SettingKeyOpsRealtimeMonitoringEnabled])
	result.OpsQueryModeDefault = string(ParseOpsQueryMode(settings[SettingKeyOpsQueryModeDefault]))
	result.OpsMetricsIntervalSeconds = 60
	if raw := strings.TrimSpace(settings[SettingKeyOpsMetricsIntervalSeconds]); raw != "" {
		if v, err := strconv.Atoi(raw); err == nil {
			if v < 60 {
				v = 60
			}
			if v > 3600 {
				v = 3600
			}
			result.OpsMetricsIntervalSeconds = v
		}
	}

	return result
}

func isFalseSettingValue(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "false", "0", "off", "disabled":
		return true
	default:
		return false
	}
}

// getStringOrDefault 获取字符串值或默认值
func (s *SettingService) getStringOrDefault(settings map[string]string, key, defaultValue string) string {
	if value, ok := settings[key]; ok && value != "" {
		return value
	}
	return defaultValue
}

// IsTurnstileEnabled 检查是否启用 Turnstile 验证
func (s *SettingService) IsTurnstileEnabled(ctx context.Context) bool {
	value, err := s.settingRepo.GetValue(ctx, SettingKeyTurnstileEnabled)
	if err != nil {
		return false
	}
	return value == "true"
}

// GetTurnstileSecretKey 获取 Turnstile Secret Key
func (s *SettingService) GetTurnstileSecretKey(ctx context.Context) string {
	value, err := s.settingRepo.GetValue(ctx, SettingKeyTurnstileSecretKey)
	if err != nil {
		return ""
	}
	return value
}

// IsIdentityPatchEnabled 检查是否启用身份补丁（Claude -> Gemini systemInstruction 注入）
func (s *SettingService) IsIdentityPatchEnabled(ctx context.Context) bool {
	value, err := s.settingRepo.GetValue(ctx, SettingKeyEnableIdentityPatch)
	if err != nil {
		// 默认开启，保持兼容
		return true
	}
	return value == "true"
}

// IsGatewayFixOrphanedToolResultsEnabled controls whether the gateway should proactively remove orphaned tool_result
// blocks (tool_result.tool_use_id references a missing tool_use.id) before forwarding.
//
// Default: enabled (fail-open).
func (s *SettingService) IsGatewayFixOrphanedToolResultsEnabled(ctx context.Context) bool {
	value, err := s.settingRepo.GetValue(ctx, SettingKeyGatewayFixOrphanedToolResults)
	if err != nil {
		// Fallback to config (if present) and fail-open.
		if s != nil && s.cfg != nil {
			return s.cfg.Gateway.FixOrphanedToolResults
		}
		return true
	}
	return value == "true"
}

// GetIdentityPatchPrompt 获取自定义身份补丁提示词（为空表示使用内置默认模板）
func (s *SettingService) GetIdentityPatchPrompt(ctx context.Context) string {
	value, err := s.settingRepo.GetValue(ctx, SettingKeyIdentityPatchPrompt)
	if err != nil {
		return ""
	}
	return value
}

// GenerateAdminAPIKey 生成新的管理员 API Key
func (s *SettingService) GenerateAdminAPIKey(ctx context.Context) (string, error) {
	// 生成 32 字节随机数 = 64 位十六进制字符
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("generate random bytes: %w", err)
	}

	key := AdminAPIKeyPrefix + hex.EncodeToString(bytes)

	// 存储到 settings 表
	if err := s.settingRepo.Set(ctx, SettingKeyAdminAPIKey, key); err != nil {
		return "", fmt.Errorf("save admin api key: %w", err)
	}

	return key, nil
}

// GetAdminAPIKeyStatus 获取管理员 API Key 状态
// 返回脱敏的 key、是否存在、错误
func (s *SettingService) GetAdminAPIKeyStatus(ctx context.Context) (maskedKey string, exists bool, err error) {
	key, err := s.settingRepo.GetValue(ctx, SettingKeyAdminAPIKey)
	if err != nil {
		if errors.Is(err, ErrSettingNotFound) {
			return "", false, nil
		}
		return "", false, err
	}
	if key == "" {
		return "", false, nil
	}

	// 脱敏：显示前 10 位和后 4 位
	if len(key) > 14 {
		maskedKey = key[:10] + "..." + key[len(key)-4:]
	} else {
		maskedKey = key
	}

	return maskedKey, true, nil
}

// GetAdminAPIKey 获取完整的管理员 API Key（仅供内部验证使用）
// 如果未配置返回空字符串和 nil 错误，只有数据库错误时才返回 error
func (s *SettingService) GetAdminAPIKey(ctx context.Context) (string, error) {
	key, err := s.settingRepo.GetValue(ctx, SettingKeyAdminAPIKey)
	if err != nil {
		if errors.Is(err, ErrSettingNotFound) {
			return "", nil // 未配置，返回空字符串
		}
		return "", err // 数据库错误
	}
	return key, nil
}

// DeleteAdminAPIKey 删除管理员 API Key
func (s *SettingService) DeleteAdminAPIKey(ctx context.Context) error {
	return s.settingRepo.Delete(ctx, SettingKeyAdminAPIKey)
}

// IsModelFallbackEnabled 检查是否启用模型兜底机制
func (s *SettingService) IsModelFallbackEnabled(ctx context.Context) bool {
	value, err := s.settingRepo.GetValue(ctx, SettingKeyEnableModelFallback)
	if err != nil {
		return false // Default: disabled
	}
	return value == "true"
}

// GetFallbackModel 获取指定平台的兜底模型
func (s *SettingService) GetFallbackModel(ctx context.Context, platform string) string {
	var key string
	var defaultModel string

	switch platform {
	case PlatformAnthropic:
		key = SettingKeyFallbackModelAnthropic
		defaultModel = "claude-3-5-sonnet-20241022"
	case PlatformOpenAI:
		key = SettingKeyFallbackModelOpenAI
		defaultModel = "gpt-4o"
	case PlatformGemini:
		key = SettingKeyFallbackModelGemini
		defaultModel = "gemini-2.5-pro"
	case PlatformAntigravity:
		key = SettingKeyFallbackModelAntigravity
		defaultModel = "gemini-2.5-pro"
	default:
		return ""
	}

	value, err := s.settingRepo.GetValue(ctx, key)
	if err != nil || value == "" {
		return defaultModel
	}
	return value
}

// GetLinuxDoConnectOAuthConfig 返回用于登录的"最终生效" LinuxDo Connect 配置。
//
// 优先级：
// - 若对应系统设置键存在，则覆盖 config.yaml/env 的值
// - 否则回退到 config.yaml/env 的值
func (s *SettingService) GetLinuxDoConnectOAuthConfig(ctx context.Context) (config.LinuxDoConnectConfig, error) {
	if s == nil || s.cfg == nil {
		return config.LinuxDoConnectConfig{}, infraerrors.ServiceUnavailable("CONFIG_NOT_READY", "config not loaded")
	}

	effective := s.cfg.LinuxDo

	keys := []string{
		SettingKeyLinuxDoConnectEnabled,
		SettingKeyLinuxDoConnectClientID,
		SettingKeyLinuxDoConnectClientSecret,
		SettingKeyLinuxDoConnectRedirectURL,
	}
	settings, err := s.settingRepo.GetMultiple(ctx, keys)
	if err != nil {
		return config.LinuxDoConnectConfig{}, fmt.Errorf("get linuxdo connect settings: %w", err)
	}

	if raw, ok := settings[SettingKeyLinuxDoConnectEnabled]; ok {
		effective.Enabled = raw == "true"
	}
	if v, ok := settings[SettingKeyLinuxDoConnectClientID]; ok && strings.TrimSpace(v) != "" {
		effective.ClientID = strings.TrimSpace(v)
	}
	if v, ok := settings[SettingKeyLinuxDoConnectClientSecret]; ok && strings.TrimSpace(v) != "" {
		effective.ClientSecret = strings.TrimSpace(v)
	}
	if v, ok := settings[SettingKeyLinuxDoConnectRedirectURL]; ok && strings.TrimSpace(v) != "" {
		effective.RedirectURL = strings.TrimSpace(v)
	}

	if !effective.Enabled {
		return config.LinuxDoConnectConfig{}, infraerrors.NotFound("OAUTH_DISABLED", "oauth login is disabled")
	}

	// 基础健壮性校验（避免把用户重定向到一个必然失败或不安全的 OAuth 流程里）。
	if strings.TrimSpace(effective.ClientID) == "" {
		return config.LinuxDoConnectConfig{}, infraerrors.InternalServer("OAUTH_CONFIG_INVALID", "oauth client id not configured")
	}
	if strings.TrimSpace(effective.AuthorizeURL) == "" {
		return config.LinuxDoConnectConfig{}, infraerrors.InternalServer("OAUTH_CONFIG_INVALID", "oauth authorize url not configured")
	}
	if strings.TrimSpace(effective.TokenURL) == "" {
		return config.LinuxDoConnectConfig{}, infraerrors.InternalServer("OAUTH_CONFIG_INVALID", "oauth token url not configured")
	}
	if strings.TrimSpace(effective.UserInfoURL) == "" {
		return config.LinuxDoConnectConfig{}, infraerrors.InternalServer("OAUTH_CONFIG_INVALID", "oauth userinfo url not configured")
	}
	if strings.TrimSpace(effective.RedirectURL) == "" {
		return config.LinuxDoConnectConfig{}, infraerrors.InternalServer("OAUTH_CONFIG_INVALID", "oauth redirect url not configured")
	}
	if strings.TrimSpace(effective.FrontendRedirectURL) == "" {
		return config.LinuxDoConnectConfig{}, infraerrors.InternalServer("OAUTH_CONFIG_INVALID", "oauth frontend redirect url not configured")
	}

	if err := config.ValidateAbsoluteHTTPURL(effective.AuthorizeURL); err != nil {
		return config.LinuxDoConnectConfig{}, infraerrors.InternalServer("OAUTH_CONFIG_INVALID", "oauth authorize url invalid")
	}
	if err := config.ValidateAbsoluteHTTPURL(effective.TokenURL); err != nil {
		return config.LinuxDoConnectConfig{}, infraerrors.InternalServer("OAUTH_CONFIG_INVALID", "oauth token url invalid")
	}
	if err := config.ValidateAbsoluteHTTPURL(effective.UserInfoURL); err != nil {
		return config.LinuxDoConnectConfig{}, infraerrors.InternalServer("OAUTH_CONFIG_INVALID", "oauth userinfo url invalid")
	}
	if err := config.ValidateAbsoluteHTTPURL(effective.RedirectURL); err != nil {
		return config.LinuxDoConnectConfig{}, infraerrors.InternalServer("OAUTH_CONFIG_INVALID", "oauth redirect url invalid")
	}
	if err := config.ValidateFrontendRedirectURL(effective.FrontendRedirectURL); err != nil {
		return config.LinuxDoConnectConfig{}, infraerrors.InternalServer("OAUTH_CONFIG_INVALID", "oauth frontend redirect url invalid")
	}

	method := strings.ToLower(strings.TrimSpace(effective.TokenAuthMethod))
	switch method {
	case "", "client_secret_post", "client_secret_basic":
		if strings.TrimSpace(effective.ClientSecret) == "" {
			return config.LinuxDoConnectConfig{}, infraerrors.InternalServer("OAUTH_CONFIG_INVALID", "oauth client secret not configured")
		}
	case "none":
		if !effective.UsePKCE {
			return config.LinuxDoConnectConfig{}, infraerrors.InternalServer("OAUTH_CONFIG_INVALID", "oauth pkce must be enabled when token_auth_method=none")
		}
	default:
		return config.LinuxDoConnectConfig{}, infraerrors.InternalServer("OAUTH_CONFIG_INVALID", "oauth token_auth_method invalid")
	}

	return effective, nil
}

// GetStreamTimeoutSettings 获取流超时处理配置
func (s *SettingService) GetStreamTimeoutSettings(ctx context.Context) (*StreamTimeoutSettings, error) {
	value, err := s.settingRepo.GetValue(ctx, SettingKeyStreamTimeoutSettings)
	if err != nil {
		if errors.Is(err, ErrSettingNotFound) {
			return DefaultStreamTimeoutSettings(), nil
		}
		return nil, fmt.Errorf("get stream timeout settings: %w", err)
	}
	if value == "" {
		return DefaultStreamTimeoutSettings(), nil
	}

	var settings StreamTimeoutSettings
	if err := json.Unmarshal([]byte(value), &settings); err != nil {
		return DefaultStreamTimeoutSettings(), nil
	}

	// 验证并修正配置值
	if settings.TempUnschedMinutes < 1 {
		settings.TempUnschedMinutes = 1
	}
	if settings.TempUnschedMinutes > 60 {
		settings.TempUnschedMinutes = 60
	}
	if settings.ThresholdCount < 1 {
		settings.ThresholdCount = 1
	}
	if settings.ThresholdCount > 10 {
		settings.ThresholdCount = 10
	}
	if settings.ThresholdWindowMinutes < 1 {
		settings.ThresholdWindowMinutes = 1
	}
	if settings.ThresholdWindowMinutes > 60 {
		settings.ThresholdWindowMinutes = 60
	}

	// 验证 action
	switch settings.Action {
	case StreamTimeoutActionTempUnsched, StreamTimeoutActionError, StreamTimeoutActionNone:
		// valid
	default:
		settings.Action = StreamTimeoutActionTempUnsched
	}

	return &settings, nil
}

// SetStreamTimeoutSettings 设置流超时处理配置
func (s *SettingService) SetStreamTimeoutSettings(ctx context.Context, settings *StreamTimeoutSettings) error {
	if settings == nil {
		return fmt.Errorf("settings cannot be nil")
	}

	// 验证配置值
	if settings.TempUnschedMinutes < 1 || settings.TempUnschedMinutes > 60 {
		return fmt.Errorf("temp_unsched_minutes must be between 1-60")
	}
	if settings.ThresholdCount < 1 || settings.ThresholdCount > 10 {
		return fmt.Errorf("threshold_count must be between 1-10")
	}
	if settings.ThresholdWindowMinutes < 1 || settings.ThresholdWindowMinutes > 60 {
		return fmt.Errorf("threshold_window_minutes must be between 1-60")
	}

	switch settings.Action {
	case StreamTimeoutActionTempUnsched, StreamTimeoutActionError, StreamTimeoutActionNone:
		// valid
	default:
		return fmt.Errorf("invalid action: %s", settings.Action)
	}

	data, err := json.Marshal(settings)
	if err != nil {
		return fmt.Errorf("marshal stream timeout settings: %w", err)
	}

	return s.settingRepo.Set(ctx, SettingKeyStreamTimeoutSettings, string(data))
}

// IsSubscriptionsEnabled checks whether subscription-related features and APIs are enabled.
// Default: enabled (for backwards compatibility).
func (s *SettingService) IsSubscriptionsEnabled(ctx context.Context) bool {
	value, err := s.settingRepo.GetValue(ctx, SettingKeySubscriptionsEnabled)
	if err != nil {
		return true
	}
	return !isFalseSettingValue(value)
}

// IsLandingPricingEnabled checks whether Landing / Pricing (subscription plans display) is enabled.
// Default: enabled (for backwards compatibility).
func (s *SettingService) IsLandingPricingEnabled(ctx context.Context) bool {
	value, err := s.settingRepo.GetValue(ctx, SettingKeyLandingPricingEnabled)
	if err != nil {
		return true
	}
	return !isFalseSettingValue(value)
}
