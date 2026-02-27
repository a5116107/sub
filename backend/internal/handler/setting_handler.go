package handler

import (
	"encoding/json"
	"sort"
	"strings"

	"github.com/Wei-Shaw/sub2api/internal/handler/dto"
	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/service"

	"github.com/gin-gonic/gin"
)

// SettingHandler 公开设置处理器（无需认证）
type SettingHandler struct {
	settingService *service.SettingService
	groupRepo      service.GroupRepository
	version        string
}

// NewSettingHandler 创建公开设置处理器
func NewSettingHandler(settingService *service.SettingService, groupRepo service.GroupRepository, version string) *SettingHandler {
	return &SettingHandler{
		settingService: settingService,
		groupRepo:      groupRepo,
		version:        version,
	}
}

// GetPublicSettings 获取公开设置
// GET /api/v1/settings/public
func (h *SettingHandler) GetPublicSettings(c *gin.Context) {
	settings, err := h.settingService.GetPublicSettings(c.Request.Context())
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	landingPricingGroups := make([]dto.Group, 0)
	if settings.LandingPricingEnabled && settings.LandingPricingConfig != "" && h.groupRepo != nil {
		groupIDs := extractLandingPricingGroupIDs(settings.LandingPricingConfig)
		for _, groupID := range groupIDs {
			g, err := h.groupRepo.GetByIDLite(c.Request.Context(), groupID)
			if err != nil || g == nil {
				continue
			}
			if !g.IsActive() {
				continue
			}
			if !g.IsSubscriptionType() {
				continue
			}
			landingPricingGroups = append(landingPricingGroups, *dto.GroupFromServiceShallow(g))
		}
	}

	response.Success(c, dto.PublicSettings{
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
		LandingPricingGroups:        landingPricingGroups,
		SubscriptionsEnabled:        settings.SubscriptionsEnabled,
		HideCcsImportButton:         settings.HideCcsImportButton,
		PurchaseSubscriptionEnabled: settings.PurchaseSubscriptionEnabled,
		PurchaseSubscriptionURL:     settings.PurchaseSubscriptionURL,
		LinuxDoOAuthEnabled:         settings.LinuxDoOAuthEnabled,
		Version:                     h.version,
	})
}

// GetDocsPage returns a public docs page markdown.
// GET /api/v1/docs/:key?lang=zh|en
func (h *SettingHandler) GetDocsPage(c *gin.Context) {
	docKey := c.Param("key")
	lang := pickDocsLang(c.Query("lang"), c.GetHeader("Accept-Language"))

	page, err := h.settingService.GetDocsPage(c.Request.Context(), docKey, lang)
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

// ListDocsPages returns public docs navigation items.
// GET /api/v1/docs/pages?lang=zh|en
func (h *SettingHandler) ListDocsPages(c *gin.Context) {
	lang := pickDocsLang(c.Query("lang"), c.GetHeader("Accept-Language"))
	pages, err := h.settingService.ListPublicDocsPages(c.Request.Context())
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}

	items := make([]dto.DocsNavItem, 0, len(pages))
	for _, p := range pages {
		title := p.Key
		if strings.HasPrefix(strings.ToLower(lang), "zh") {
			if strings.TrimSpace(p.TitleZh) != "" {
				title = p.TitleZh
			} else if strings.TrimSpace(p.TitleEn) != "" {
				title = p.TitleEn
			}
		} else {
			if strings.TrimSpace(p.TitleEn) != "" {
				title = p.TitleEn
			} else if strings.TrimSpace(p.TitleZh) != "" {
				title = p.TitleZh
			}
		}

		items = append(items, dto.DocsNavItem{
			Key:    p.Key,
			Title:  title,
			Group:  p.Group,
			Order:  p.Order,
			Format: p.Format,
		})
	}

	response.Success(c, items)
}

func extractLandingPricingGroupIDs(raw string) []int64 {
	type plan struct {
		GroupID *int64 `json:"group_id"`
	}
	type subscription struct {
		Plans []plan `json:"plans"`
	}
	type cfg struct {
		Version      int          `json:"version"`
		Subscription subscription `json:"subscription"`
	}

	var parsed cfg
	if err := json.Unmarshal([]byte(raw), &parsed); err != nil {
		return nil
	}
	if parsed.Version != 1 {
		return nil
	}
	if len(parsed.Subscription.Plans) == 0 {
		return nil
	}

	seen := make(map[int64]struct{})
	for _, p := range parsed.Subscription.Plans {
		if p.GroupID == nil || *p.GroupID <= 0 {
			continue
		}
		seen[*p.GroupID] = struct{}{}
	}

	if len(seen) == 0 {
		return nil
	}

	out := make([]int64, 0, len(seen))
	for id := range seen {
		out = append(out, id)
	}
	sort.Slice(out, func(i, j int) bool { return out[i] < out[j] })
	return out
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
