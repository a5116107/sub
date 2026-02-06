package dto

import "time"

type DocsPage struct {
	Key       string     `json:"key"`
	Lang      string     `json:"lang"`
	Title     string     `json:"title,omitempty"`
	Format    string     `json:"format,omitempty"`
	Markdown  string     `json:"markdown"`
	UpdatedAt *time.Time `json:"updated_at,omitempty"`
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

// DocsNavItem is a public docs page item for navigation.
type DocsNavItem struct {
	Key    string `json:"key"`
	Title  string `json:"title"`
	Group  string `json:"group,omitempty"`
	Order  int    `json:"order,omitempty"`
	Format string `json:"format,omitempty"`
}
