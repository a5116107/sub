package service

import (
	"embed"
	"fmt"
	"strings"
)

//go:embed docs_defaults/*.md
var docsDefaultsFS embed.FS

func loadEmbeddedDocsMarkdown(docKey, lang string) (string, bool) {
	slug := normalizeDocsSlug(docKey)
	lang = normalizeDocsLang(lang)
	if slug == "" || lang == "" || !isValidDocsSlug(slug) {
		return "", false
	}

	path := fmt.Sprintf("docs_defaults/%s.%s.md", slug, lang)
	raw, err := docsDefaultsFS.ReadFile(path)
	if err != nil {
		return "", false
	}
	text := string(raw)
	if strings.TrimSpace(text) == "" {
		return "", false
	}
	return text, true
}

