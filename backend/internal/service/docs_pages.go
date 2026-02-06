package service

import (
	"context"
	"encoding/json"
	"errors"
	"regexp"
	"sort"
	"strings"
	"time"

	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
)

const (
	docsIndexVersionV1 = 1

	docsFormatMarkdown = "markdown"
	docsFormatHTML     = "html"
	docsFormatText     = "text"
)

var docsSlugRe = regexp.MustCompile(`^[a-z0-9][a-z0-9-]{0,63}$`)

type DocsPage struct {
	Key       string
	Lang      string
	Title     string
	Format    string
	Markdown  string
	UpdatedAt *time.Time
}

type DocsPageMeta struct {
	Key     string `json:"key"`
	TitleZh string `json:"title_zh,omitempty"`
	TitleEn string `json:"title_en,omitempty"`
	Group   string `json:"group,omitempty"`
	Order   int    `json:"order,omitempty"`
	Format  string `json:"format,omitempty"`
	Public  bool   `json:"public"`
}

type docsIndexV1 struct {
	Version int           `json:"version"`
	Pages   []DocsPageMeta `json:"pages"`
}

func defaultDocsIndex() *docsIndexV1 {
	return &docsIndexV1{
		Version: docsIndexVersionV1,
		Pages: []DocsPageMeta{
			{Key: "overview", TitleZh: "概览", TitleEn: "Overview", Group: "Docs", Order: 10, Format: docsFormatMarkdown, Public: true},
			{Key: "quickstart", TitleZh: "快速开始", TitleEn: "Quickstart", Group: "Docs", Order: 20, Format: docsFormatMarkdown, Public: true},
			{Key: "providers", TitleZh: "按渠道调用", TitleEn: "Providers", Group: "Docs", Order: 25, Format: docsFormatMarkdown, Public: true},
			{Key: "compatibility", TitleZh: "兼容性", TitleEn: "Compatibility", Group: "Docs", Order: 30, Format: docsFormatMarkdown, Public: true},
			{Key: "faq", TitleZh: "FAQ", TitleEn: "FAQ", Group: "Docs", Order: 40, Format: docsFormatMarkdown, Public: true},
		},
	}
}

func normalizeDocsLang(lang string) string {
	l := strings.ToLower(strings.TrimSpace(lang))
	if l == "" {
		return ""
	}
	if strings.HasPrefix(l, "zh") {
		return "zh"
	}
	if strings.HasPrefix(l, "en") {
		return "en"
	}
	return ""
}

func normalizeDocsSlug(slug string) string {
	return strings.ToLower(strings.TrimSpace(slug))
}

func isValidDocsSlug(slug string) bool {
	return docsSlugRe.MatchString(slug)
}

func normalizeDocsFormat(format string) string {
	f := strings.ToLower(strings.TrimSpace(format))
	switch f {
	case "", docsFormatMarkdown:
		return docsFormatMarkdown
	case docsFormatHTML:
		return docsFormatHTML
	case docsFormatText:
		return docsFormatText
	default:
		return docsFormatMarkdown
	}
}

func docsContentSettingKey(slug, lang string) (string, bool) {
	// Backward compatible keys for the built-in docs pages.
	switch slug {
	case "overview":
		if lang == "zh" {
			return SettingKeyDocsOverviewZh, true
		}
		return SettingKeyDocsOverviewEn, true
	case "quickstart":
		if lang == "zh" {
			return SettingKeyDocsQuickstartZh, true
		}
		return SettingKeyDocsQuickstartEn, true
	case "compatibility":
		if lang == "zh" {
			return SettingKeyDocsCompatibilityZh, true
		}
		return SettingKeyDocsCompatibilityEn, true
	case "faq":
		if lang == "zh" {
			return SettingKeyDocsFAQZh, true
		}
		return SettingKeyDocsFAQEn, true
	}

	if !isValidDocsSlug(slug) {
		return "", false
	}
	if lang != "zh" && lang != "en" {
		return "", false
	}
	return "docs_page_" + slug + "_" + lang, true
}

func titleForLang(meta DocsPageMeta, lang string) string {
	if lang == "zh" {
		if strings.TrimSpace(meta.TitleZh) != "" {
			return meta.TitleZh
		}
		if strings.TrimSpace(meta.TitleEn) != "" {
			return meta.TitleEn
		}
		return meta.Key
	}
	if strings.TrimSpace(meta.TitleEn) != "" {
		return meta.TitleEn
	}
	if strings.TrimSpace(meta.TitleZh) != "" {
		return meta.TitleZh
	}
	return meta.Key
}

func validateDocsMeta(meta DocsPageMeta) error {
	slug := normalizeDocsSlug(meta.Key)
	if slug == "" || !isValidDocsSlug(slug) {
		return infraerrors.BadRequest("INVALID_DOCS_SLUG", "invalid docs slug")
	}
	format := normalizeDocsFormat(meta.Format)
	if format != docsFormatMarkdown && format != docsFormatHTML && format != docsFormatText {
		return infraerrors.BadRequest("INVALID_DOCS_FORMAT", "invalid docs format")
	}
	if strings.TrimSpace(meta.TitleZh) == "" && strings.TrimSpace(meta.TitleEn) == "" {
		return infraerrors.BadRequest("INVALID_DOCS_TITLE", "docs title is required")
	}
	return nil
}

func (s *SettingService) getDocsIndex(ctx context.Context) (*docsIndexV1, error) {
	if s == nil || s.settingRepo == nil {
		return nil, infraerrors.InternalServer("DOCS_SERVICE_UNAVAILABLE", "docs service unavailable")
	}

	raw, err := s.settingRepo.GetValue(ctx, SettingKeyDocsIndexV1)
	if err != nil {
		if errors.Is(err, ErrSettingNotFound) {
			idx := defaultDocsIndex()
			_ = s.saveDocsIndex(ctx, idx) // best-effort; keep docs readable even if save fails
			return idx, nil
		}
		return nil, err
	}

	if strings.TrimSpace(raw) == "" {
		idx := defaultDocsIndex()
		_ = s.saveDocsIndex(ctx, idx)
		return idx, nil
	}

	var idx docsIndexV1
	if err := json.Unmarshal([]byte(raw), &idx); err != nil {
		return nil, infraerrors.InternalServer("DOCS_INDEX_INVALID", "docs index is invalid").WithCause(err)
	}
	if idx.Version != docsIndexVersionV1 {
		return nil, infraerrors.InternalServer("DOCS_INDEX_INVALID", "docs index version unsupported")
	}
	if idx.Pages == nil {
		idx.Pages = []DocsPageMeta{}
	}

	// Normalize and validate entries. Drop invalid entries rather than breaking all docs.
	normalized := make([]DocsPageMeta, 0, len(idx.Pages))
	seen := make(map[string]struct{}, len(idx.Pages))
	for _, p := range idx.Pages {
		p.Key = normalizeDocsSlug(p.Key)
		p.Format = normalizeDocsFormat(p.Format)
		if p.Key == "" || !isValidDocsSlug(p.Key) {
			continue
		}
		if strings.TrimSpace(p.TitleZh) == "" && strings.TrimSpace(p.TitleEn) == "" {
			continue
		}
		if _, ok := seen[p.Key]; ok {
			continue
		}
		seen[p.Key] = struct{}{}
		normalized = append(normalized, p)
	}
	idx.Pages = normalized

	// Ensure built-in pages exist (so UI always has a minimal docs set).
	for _, builtin := range defaultDocsIndex().Pages {
		if _, ok := seen[builtin.Key]; ok {
			continue
		}
		idx.Pages = append(idx.Pages, builtin)
	}

	// Best-effort persist normalization so future reads are stable.
	_ = s.saveDocsIndex(ctx, &idx)

	return &idx, nil
}

func (s *SettingService) saveDocsIndex(ctx context.Context, idx *docsIndexV1) error {
	if idx == nil {
		return infraerrors.BadRequest("DOCS_INDEX_INVALID", "docs index is nil")
	}
	idx.Version = docsIndexVersionV1
	b, err := json.Marshal(idx)
	if err != nil {
		return infraerrors.InternalServer("DOCS_INDEX_INVALID", "failed to encode docs index").WithCause(err)
	}
	return s.settingRepo.Set(ctx, SettingKeyDocsIndexV1, string(b))
}

func sortDocsPages(pages []DocsPageMeta) {
	sort.Slice(pages, func(i, j int) bool {
		if pages[i].Order != pages[j].Order {
			return pages[i].Order < pages[j].Order
		}
		return pages[i].Key < pages[j].Key
	})
}

func (s *SettingService) ListDocsPages(ctx context.Context) ([]DocsPageMeta, error) {
	idx, err := s.getDocsIndex(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]DocsPageMeta, 0, len(idx.Pages))
	out = append(out, idx.Pages...)
	sortDocsPages(out)
	return out, nil
}

func (s *SettingService) ListPublicDocsPages(ctx context.Context) ([]DocsPageMeta, error) {
	pages, err := s.ListDocsPages(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]DocsPageMeta, 0, len(pages))
	for _, p := range pages {
		if p.Public {
			out = append(out, p)
		}
	}
	sortDocsPages(out)
	return out, nil
}

func (s *SettingService) UpsertDocsPageMeta(ctx context.Context, meta DocsPageMeta) (*DocsPageMeta, error) {
	meta.Key = normalizeDocsSlug(meta.Key)
	meta.Format = normalizeDocsFormat(meta.Format)
	if strings.TrimSpace(meta.Group) != "" {
		meta.Group = strings.TrimSpace(meta.Group)
	}

	if err := validateDocsMeta(meta); err != nil {
		return nil, err
	}

	idx, err := s.getDocsIndex(ctx)
	if err != nil {
		return nil, err
	}

	updated := false
	for i := range idx.Pages {
		if idx.Pages[i].Key == meta.Key {
			idx.Pages[i].TitleZh = meta.TitleZh
			idx.Pages[i].TitleEn = meta.TitleEn
			idx.Pages[i].Group = meta.Group
			idx.Pages[i].Order = meta.Order
			idx.Pages[i].Format = meta.Format
			idx.Pages[i].Public = meta.Public
			updated = true
			meta = idx.Pages[i]
			break
		}
	}
	if !updated {
		idx.Pages = append(idx.Pages, meta)
	}

	if err := s.saveDocsIndex(ctx, idx); err != nil {
		return nil, err
	}
	if s.onUpdate != nil {
		s.onUpdate()
	}
	return &meta, nil
}

func (s *SettingService) DeleteDocsPage(ctx context.Context, slug string) error {
	slug = normalizeDocsSlug(slug)
	if slug == "" || !isValidDocsSlug(slug) {
		return infraerrors.BadRequest("INVALID_DOCS_SLUG", "invalid docs slug")
	}

	idx, err := s.getDocsIndex(ctx)
	if err != nil {
		return err
	}

	out := make([]DocsPageMeta, 0, len(idx.Pages))
	removed := false
	for _, p := range idx.Pages {
		if p.Key == slug {
			removed = true
			continue
		}
		out = append(out, p)
	}
	if !removed {
		return nil
	}
	if len(out) == 0 {
		return infraerrors.BadRequest("DOCS_INDEX_INVALID", "at least one docs page must exist")
	}
	idx.Pages = out

	// Delete content for both languages (ignore missing).
	for _, lang := range []string{"zh", "en"} {
		if k, ok := docsContentSettingKey(slug, lang); ok {
			_ = s.settingRepo.Delete(ctx, k)
		}
	}

	if err := s.saveDocsIndex(ctx, idx); err != nil {
		return err
	}
	if s.onUpdate != nil {
		s.onUpdate()
	}
	return nil
}

func (s *SettingService) findDocsMeta(ctx context.Context, slug string) (*DocsPageMeta, error) {
	idx, err := s.getDocsIndex(ctx)
	if err != nil {
		return nil, err
	}
	for _, p := range idx.Pages {
		if p.Key == slug {
			cp := p
			return &cp, nil
		}
	}
	return nil, infraerrors.NotFound("DOCS_PAGE_NOT_FOUND", "docs page not found")
}

// GetDocsPage returns a docs page markdown by key/lang.
//
// Storage: DB-backed settings table.
// - If missing, returns a safe built-in default (no error).
func (s *SettingService) GetDocsPage(ctx context.Context, docKey, lang string) (*DocsPage, error) {
	slug := normalizeDocsSlug(docKey)
	lang = normalizeDocsLang(lang)
	if slug == "" || lang == "" || !isValidDocsSlug(slug) {
		return nil, infraerrors.BadRequest("INVALID_DOCS_REQUEST", "invalid docs key or lang")
	}

	meta, err := s.findDocsMeta(ctx, slug)
	if err != nil {
		return nil, err
	}
	if !meta.Public {
		return nil, infraerrors.NotFound("DOCS_PAGE_NOT_FOUND", "docs page not found")
	}

	settingKey, ok := docsContentSettingKey(slug, lang)
	if !ok {
		return nil, infraerrors.BadRequest("INVALID_DOCS_REQUEST", "invalid docs key or lang")
	}

	st, err := s.settingRepo.Get(ctx, settingKey)
	if err != nil {
		if errors.Is(err, ErrSettingNotFound) {
			return &DocsPage{
				Key:     slug,
				Lang:    lang,
				Title:   titleForLang(*meta, lang),
				Format:  normalizeDocsFormat(meta.Format),
				Markdown: defaultDocsMarkdown(slug, lang),
			}, nil
		}
		return nil, err
	}

	updatedAt := st.UpdatedAt
	return &DocsPage{
		Key:       slug,
		Lang:      lang,
		Title:     titleForLang(*meta, lang),
		Format:    normalizeDocsFormat(meta.Format),
		Markdown:  st.Value,
		UpdatedAt: &updatedAt,
	}, nil
}

// GetDocsPageForAdmin returns a docs page for admin editing (includes private pages).
func (s *SettingService) GetDocsPageForAdmin(ctx context.Context, docKey, lang string) (*DocsPage, error) {
	slug := normalizeDocsSlug(docKey)
	lang = normalizeDocsLang(lang)
	if slug == "" || lang == "" || !isValidDocsSlug(slug) {
		return nil, infraerrors.BadRequest("INVALID_DOCS_REQUEST", "invalid docs key or lang")
	}

	meta, err := s.findDocsMeta(ctx, slug)
	if err != nil {
		return nil, err
	}

	settingKey, ok := docsContentSettingKey(slug, lang)
	if !ok {
		return nil, infraerrors.BadRequest("INVALID_DOCS_REQUEST", "invalid docs key or lang")
	}

	st, err := s.settingRepo.Get(ctx, settingKey)
	if err != nil {
		if errors.Is(err, ErrSettingNotFound) {
			return &DocsPage{
				Key:     slug,
				Lang:    lang,
				Title:   titleForLang(*meta, lang),
				Format:  normalizeDocsFormat(meta.Format),
				Markdown: defaultDocsMarkdown(slug, lang),
			}, nil
		}
		return nil, err
	}

	updatedAt := st.UpdatedAt
	return &DocsPage{
		Key:       slug,
		Lang:      lang,
		Title:     titleForLang(*meta, lang),
		Format:    normalizeDocsFormat(meta.Format),
		Markdown:  st.Value,
		UpdatedAt: &updatedAt,
	}, nil
}

// UpdateDocsPage updates a docs page markdown by key/lang.
// Admin auth is enforced at the HTTP layer (admin routes).
func (s *SettingService) UpdateDocsPage(ctx context.Context, docKey, lang, markdown string) error {
	slug := normalizeDocsSlug(docKey)
	lang = normalizeDocsLang(lang)
	if slug == "" || lang == "" || !isValidDocsSlug(slug) {
		return infraerrors.BadRequest("INVALID_DOCS_REQUEST", "invalid docs key or lang")
	}

	// Ensure page exists in index.
	if _, err := s.findDocsMeta(ctx, slug); err != nil {
		return err
	}

	settingKey, ok := docsContentSettingKey(slug, lang)
	if !ok {
		return infraerrors.BadRequest("INVALID_DOCS_REQUEST", "invalid docs key or lang")
	}

	if err := s.settingRepo.Set(ctx, settingKey, markdown); err != nil {
		return err
	}
	if s.onUpdate != nil {
		s.onUpdate()
	}
	return nil
}

func defaultDocsMarkdown(docKey, lang string) string {
	if markdown, ok := loadEmbeddedDocsMarkdown(docKey, lang); ok {
		return markdown
	}
	// Keep defaults intentionally generic (no upstream secrets / internal linkages).
	switch docKey {
	case "overview":
		if lang == "zh" {
			return "# 概览\n\nSub2API 是一个自托管的 AI API Gateway，用于把多个上游能力收敛成统一的 API 入口，并提供 API Key、配额、计费与风控能力。\n"
		}
		return "# Overview\n\nSub2API is a self-hosted AI API Gateway that unifies multiple upstreams behind one API surface, with API keys, quota/billing, and risk controls.\n"
	case "quickstart":
		if lang == "zh" {
			return "# 快速开始\n\n1. 完成初始化 / 创建管理员\n2. 管理端添加上游账号\n3. 创建下游 API Key 并开始调用\n\n> 管理端可把 `doc_url` 设置为 `/docs` 来显示站内文档入口。\n"
		}
		return "# Quickstart\n\n1. Finish setup / create admin\n2. Add upstream accounts in Admin\n3. Create API keys and start calling\n\n> You can set `doc_url` to `/docs` to expose in-site docs entry.\n"
	case "compatibility":
		if lang == "zh" {
			return "# 兼容性\n\nSub2API 提供 OpenAI 兼容接口与部分扩展接口。不同上游的模型/能力存在差异，请以你当前实例的可用模型与实际响应为准。\n"
		}
		return "# Compatibility\n\nSub2API provides OpenAI-compatible APIs and some extensions. Model/features differ across upstreams; always rely on the models available in your instance.\n"
	case "faq":
		if lang == "zh" {
			return "# FAQ\n\n## 为什么看不到文档入口？\n- 请在管理端系统设置中设置 `doc_url` 为 `/docs`，或直接访问 `/docs/overview`。\n"
		}
		return "# FAQ\n\n## Why don't I see the docs entry?\n- Set `doc_url` to `/docs` in Admin Settings, or visit `/docs/overview` directly.\n"
	default:
		if lang == "zh" {
			return "# 文档\n\n（暂无内容）\n"
		}
		return "# Docs\n\n(No content)\n"
	}
}
