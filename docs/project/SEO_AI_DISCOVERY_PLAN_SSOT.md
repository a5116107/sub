# SEO & AI 搜索命中方案 SSOT（同域 Docs / Sitemap / Indexing）

最后更新：2026-02-01  
适用范围：Sub2API 官网/站内文档（SPA）+ 后端索引控制  
目标：提升自然搜索与“AI 搜索/AI 引擎抓取”命中概率（在不暴露私密后台与上游信息的前提下）

---

## 1) 你问的“文档可用同域”是什么意思？

**同域** = 文档直接挂在你主站域名下（例如 `https://example.com/docs/...`），而不是单独开一个 `docs.example.com` 或外部博客。

同域的直接收益：

- **SEO 资产集中**：主站与文档共享域名权重与外链收益；内部链接更自然。
- **减少“跨域配置”成本**：CORS、Cookie、登录态、埋点、CDN 规则更简单。
- **更符合 AI 抓取习惯**：很多抓取器会优先遍历主域的 sitemap/内部链接。

注意：同域 ≠ 必然可被索引。是否被索引由 **robots/sitemap/headers** 决定（见下文）。

---

## 2) 当前已落地能力（现状）

### 2.1 站内 Docs“博客化 / 模板化”

- 路由：`/docs/:slug` 动态承载无限扩展页面
- 导航：基于后端返回的页面索引动态生成，并支持 `group` 分组
- 内容格式：支持 `markdown` / `html` / `text`
- 权限：支持 `public=true/false`（私有页面不对外展示/不进公开导航）
- 管理端：`/admin/docs` 提供页面创建/分组/排序/格式/公开性管理与内容编辑（中英双语）

### 2.2 Indexing（默认安全、可显式开启公开索引）

后端新增索引控制（默认**不允许**搜索引擎索引，避免把后台/接口暴露出去）：

- `robots.txt`
- `sitemap.xml`（自动列出所有 `public` 的 docs 页面）
- `X-Robots-Tag: noindex, nofollow`（对不应被索引的路径下发）

启用公开索引需 **配置文件/环境变量** 显式开启（见第 3 节）。

### 2.3 基础 SEO 元信息

前端已包含基础的 `description`、OG/Twitter meta、以及简单的 JSON-LD（应用类型）。

---

## 3) 上线前必须做的配置（P0）

### 3.1 域名 / BaseURL

为了让 `robots.txt` 里能写出正确的 `Sitemap:`，以及让 `sitemap.xml` 输出正确的 `<loc>`，需要配置：

- `server.frontend_base_url = "https://你的域名"`

### 3.2 是否允许被索引（强烈建议默认 private）

默认建议保持 **private**，只在“公开运营”的域名上开启：

- `security.indexing.mode = "public"` 才会开放抓取（robots allow + sitemap 200）
- `security.indexing.mode = "private"` 为默认安全模式（robots 全站 disallow + sitemap 404）

### 3.3 Docs 入口

管理端 → 系统设置（Site）：

- `doc_url` 建议设置为 `/docs`（站内入口）

---

## 4) 内容策略（P0/P1）：决定“能不能被搜到”的关键

技术手段只能让爬虫“看得到”，**内容决定“搜得到”**。

P0（立即）：
- 为每个核心主题建独立页面（建议 8–15 篇起步）：`pricing / api / auth / rate-limit / security / faq / changelog / providers`
- 每页必须有清晰的 H1/H2 结构、关键词与代码示例（避免空泛）
- 页面之间做强内链（Docs 导航 + 文末“相关阅读”）

P1（增强）：
- 增加“面向 AI 的摘要段落”（每页开头 5–8 行，概括用途、接口、参数、示例）
- 增加“对比型页面”（例如 OpenAI 兼容、差异点、迁移指南）更易被检索

---

## 5) 技术增强路线图（按 ROI 排序）

### Phase 1（已完成/进行中）：让爬虫可发现

- sitemap/robots/noindex 策略
- 站内 docs 路由与动态导航

### Phase 2（P1）：让每个 docs 页面更像“独立页面”

SPA 的天然短板：部分爬虫/AI 抓取器 **不执行 JS** 或执行能力有限。为提升命中率，建议补充：

- 按页面动态设置 `document.title` 与 meta description（基于 docs title/内容摘要）
- 增加 `hreflang`（zh/en）与 canonical（按当前路由）
- 为 docs 页输出 `Article`/`TechArticle` JSON-LD（标题、更新时间、路径）

### Phase 3（P2）：让 Docs 变成“可直接抓取的静态 HTML”

这是 SEO/AI 抓取命中提升最大的技术项（但成本也更高）：

方案 A：Docs 走 SSG（构建期生成静态 HTML）  
方案 B：后端对 `/docs/:slug` 提供“服务端渲染 HTML”（可与 SPA 共存）  

推荐先做 B（改动更可控，且不依赖构建/发布链路）。

---

## 6) 安全红线（与防逆向联动）

为避免 SEO/公开文档变成“信息泄露渠道”，必须遵守：

- public docs 禁止写入任何上游 secrets、账号池结构、内部域名与链路细节
- `security.indexing.mode=public` 只能用于公开站点；管理后台与 API 必须保持 noindex
- 私有 docs（`public=false`）不出现在 `/api/v1/docs/pages` 与 `sitemap.xml`

