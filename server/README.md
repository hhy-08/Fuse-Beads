# Fuse PDF API（Cloudflare Workers）

默认 **Worker-only**（**不需要 Docker**）：合并 / 拆分 / 旋转 / 水印 / JPG·PNG→PDF。

完整版（Word↔PDF、PDF 加密）需要 Docker，见下方 `deploy:full`。

## 本地开发（无 Docker）

```bash
cd server
npm install --legacy-peer-deps
npx wrangler login
npm run dev
```

地址：`http://127.0.0.1:8787`

## 部署到 Cloudflare（无 Docker）

```bash
cd server
npm install --legacy-peer-deps
npx wrangler login
npm run deploy
```

得到：`https://fuse-pdf-api.<subdomain>.workers.dev`  
健康检查：`/api/health`（`mode` 应为 `worker-only`）

然后到 Pages 项目 `fuse-beads` → 设置 → 环境变量：

`VITE_API_BASE_URL` = 上面的 workers.dev 地址  

并重新部署前端。

`ALLOWED_ORIGINS` 已包含 `https://fuse-beads.pages.dev`。

## 完整版（需要 Docker）

```bash
# Docker Desktop 需运行
npm run deploy:full
```

会启用 LibreOffice Containers，Word↔PDF / 加密可用；`/api/health` 的 `mode` 变为 `containers`。

## 接口一览

| 方法 | 路径 | Worker-only | 完整版 |
|------|------|-------------|--------|
| GET | `/api/health` | ✅ | ✅ |
| POST | `/api/pdf/merge` | ✅ | ✅ |
| POST | `/api/pdf/split` | ✅ | ✅ |
| POST | `/api/pdf/rotate` | ✅ | ✅ |
| POST | `/api/pdf/watermark` | ✅ | ✅ |
| POST | `/api/pdf/images-to-pdf` | ✅ | ✅ |
| POST | `/api/pdf/protect` | ❌ | ✅ |
| POST | `/api/convert/docx-to-pdf` | ❌ | ✅ |
| POST | `/api/convert/pdf-to-docx` | ❌ | ✅ |

上传字段：`file` 或 `files`（multipart）。
