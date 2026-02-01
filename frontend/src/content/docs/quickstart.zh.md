# 快速开始（Quickstart）

> 目标：5 分钟内跑通一次 “创建用户 Key → 发起一次请求” 的闭环。

## 1) 部署并打开后台

- 使用 Docker / 二进制 / 安装脚本部署后，打开管理后台（默认端口通常是 `8080`）。
- 首次启动请完成 Setup Wizard（数据库、Redis、管理员账号）。

## 2) 添加上游账号（Admin）

在管理端创建/导入上游账号（OAuth 或 API Key）。

> 注意：上游凭据属于敏感信息，建议只给内部管理员维护，不要交给外部运营。

## 3) 生成用户 API Key（User）

登录普通用户账号后，在 “API Keys” 页面创建一个 Key。

## 4) 发起一次请求（示例）

以下示例以 Anthropic-compatible 的 `/v1/messages` 为例：

```bash
export SUB2API_BASE="http://YOUR_DOMAIN:8080"
export SUB2API_KEY="sk-xxxxx"

curl -X POST "$SUB2API_BASE/v1/messages" \
  -H "Authorization: Bearer $SUB2API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-3-5-haiku-latest","messages":[{"role":"user","content":"Hello!"}]}'
```

## 5) 把文档集成到本站（你现在要做的）

- 管理端 → 系统设置 → Site → `doc_url` 填写：`/docs`
- 文档内容在仓库里维护：`frontend/src/content/docs/*.md`

