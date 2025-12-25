---
title: 正式環境部署
---

# 部署指南：從發射台到星軌

將應用程式發佈上線是 Gravito 開發旅程的「最後一哩路」。得益於 **Bun** 的跨平台高效能，Gravito 支援多種部署路徑 —— 無論是需要全端能動力的 Docker 容器、極速的靜態網站 (SSG)，還是無伺服器的邊緣運算。

---

## 軌道準備：環境配置

在準備部署之前，必須確保您的生產環境變數已正確配置。

### 1. 環境變數文件 (`.env.production`)
建立一個 `.env.production` 檔案，這將被 Bun 自動載入或打包進容器：

```bash
# .env.production
NODE_ENV=production
BASE_URL=https://your-domain.com
API_KEY=********
SESSION_SECRET=********
```

### 2. 生產環境優化
確保在 `package.json` 的建置指令中包含 `NODE_ENV=production`，這會觸發 Vite 與 React/Vue 的生產環境優化代碼。

---

## 路線 A：全端星軌 (Docker 容器化)

這是最推薦的部署方式，能夠確保「本地開發環境」與「雲端生產環境」的高度一致性。

### 優化的多階段建構 (Multi-stage Build)
使用此 Dockerfile 可以大幅縮減鏡像體積，並提升啟動速度：

```dockerfile
# 階段一：建構環境 (Build Stage)
FROM oven/bun:latest as builder
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
RUN bun run build # 編譯前端資產

# 階段二：執行環境 (Runtime Stage)
FROM oven/bun:slim
WORKDIR /app
COPY --from=builder /app .
EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
```

### 部署至服務商
您可以將生成的 Docker Image 推送到以下平台：
- **AWS App Runner / ECS**
- **Google Cloud Run** (推薦)
- **DigitalOcean App Platform**

---

## 路線 B：靜態冰封 (Static Site Generation)

適用於文件、部落格或無需即時後端邏輯的網站。

### 1. 執行靜態生成
```bash
bun run build:static
```

### 2. 部署目標
生成的 `dist-static/` 目錄可以部署到任何「靜態存儲」服務：
- **GitHub Pages** (免費且整合 GitHub Actions)
- **Cloudflare Pages** (極速邊緣分發)
- **Vercel**

> 💡 **開發提醒**：SSG 專案的內部導航必須使用 `StaticLink` 組件。詳細配置請參考 [靜態網站開發指南](./static-site-development.md)。

---

## 路線 C：邊緣跳躍 (Edge / Serverless)

Gravito 的核心引擎體積輕量，非常適合執行在受限的邊緣環境。

- **Cloudflare Workers**：利用 `@gravito/adapter-hono` 或專屬適配器。
- **AWS Lambda**：利用 Bun 僅需幾毫秒的冷啟動時間。

---

## CI/CD 最佳實踐：自動化星圖

一個成熟的專案應該具備自動化部署流程：

1.  **依賴鎖定**：流水線中務必使用 `bun install --frozen-lockfile`，避免版本偏移。
2.  **品質守門員**：在 `build` 前執行 `bun test` 與 `bun run typecheck`。
3.  **健康追蹤**：生產環境必須實施 `/health` 或 `/status` 路由，供負載平衡器監測。

---

## 發射後檢查：SEO 與 索引

部署完成後，請務必完成最後一項任務：**確保搜尋引擎能找到你**。

1.  **驗證 Sitemap**：檢查 `BASE_URL/sitemap.xml` 是否正常運行。
2.  **提交索引**：至 Google Search Console 提交您的 Sitemap 網址。
3.  **Meta 檢查**：使用 Luminosity 引擎驗證各頁面的 OpenGraph 資料。

有關如何配置自動化地圖生成，請參閱 [Sitemap 系統指南](./sitemap-guide.md)。

---

> **祝賀！** 您的 Gravito 專案已成功進入運行軌道。現在，您可以專注於內容創作與功能迭代，Gravito 將為您的穩定運行保駕護航。
