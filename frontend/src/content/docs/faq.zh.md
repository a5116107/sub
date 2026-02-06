# FAQ

## 为什么自建默认不建议被搜索引擎收录？

自建实例通常包含登录入口、管理端路径、以及可能被误解为“公共服务”的 URL。被收录会带来：

- 暴露面变大（扫描/撞库/爬虫噪声更多）
- AI 搜索把“自建实例”当作官方站点引用（混淆品牌与安全边界）

因此 Sub2API 默认采用 **private noindex**：通过 `X-Robots-Tag` 与 `robots.txt` 明确提示爬虫不要收录。

## 我们什么时候应该开启 public（SEO）模式？

当你们确定了 **官方域名**，并且准备对外提供公开入口（Landing + Docs）时：

1) 设置 `server.frontend_base_url=https://你的官方域名`
2) 把 `security.indexing.mode` 从 `private` 切到 `public`

此时会生成 `robots.txt`（允许抓取公开页）和 `sitemap.xml`（供搜索引擎提交）。

## 文档怎么编辑？在哪里添加新页面？

- 文档内容文件：`frontend/src/content/docs/*.md`
- 文档页面入口：`/docs/*`（Vue Router）
- 添加新页面：新增一个 `.md` 文件 → 在 `frontend/src/router/index.ts` 增加路由 → 在 `frontend/src/views/docs/DocsView.vue` 增加导航与内容映射

## 文档会不会泄露上游信息/链路？

只要你们遵守内容红线（不写上游 token/cookie/proxy/内部映射、不过度公开风控阈值细节），文档不会成为泄露点。

