# 🚢 部署指南

將應用程式發佈上線是旅程的最後一步。得益於 **Bun** 的強大效能，Gravito 提供了多種方式讓您的應用觸及使用者 —— 無論您是想要建構全端動態應用、純靜態網站，還是邊緣運算函數 (Edge Function)。

## 🛠 部署前準備

在準備部署之前，請確保您已經設定好生產環境的變數。建立一個 `.env.production` 檔案：

```bash
# .env.production
NODE_ENV=production
BASE_URL=https://your-app.com
GA_MEASUREMENT_ID=G-XXXXXXXX
```

---

## 📦 選項 1：全端 Docker 部署 (推薦)

Docker 能確保您的應用在伺服器上運行的樣子，與在您的筆記型電腦上一模一樣。

### 1. 多階段構建 Dockerfile
使用這份優化的 Dockerfile，能保持生產環境鏡像的小巧與快速。

```dockerfile
# 構建階段 (Build Stage)
FROM oven/bun:latest as builder
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
RUN bun run build # 編譯 React/Vite 資產

# 執行階段 (Production Stage)
FROM oven/bun:slim
WORKDIR /app
COPY --from=builder /app .
EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
```

### 2. 構建與運行
```bash
docker build -t my-gravito-app .
docker run -p 3000:3000 --env-file .env.production my-gravito-app
```

---

## ⚡ 選項 2：靜態網站生成 (SSG)

如果您正在建構文檔網站或部落格，SSG 是最快且最經濟的選擇。它會生成純 HTML 檔案，您可以將其託管在 **GitHub Pages**、**Vercel** 或 **Netlify**。

### 1. 執行構建
```bash
bun run build:static
```

### 2. 產出結果
您的靜態檔案會生成在 `dist/` 目錄中。只需將此資料夾上傳到任何靜態託管服務商即可。

---

## ☁️ 選項 3：邊緣運算與 Serverless

由於 Gravito 基於 **Hono** 引擎建構，它天生具備「在邊緣運行」的能力。

- **Cloudflare Workers**：使用我們的 Cloudflare 適配器。
- **Vercel Functions**：使用 Vercel CLI 直接部署。
- **AWS Lambda**：受益於 Bun 的高效能，冷啟動速度極快。

## ⚙️ CI/CD 最佳實踐

1. **鎖定依賴 (Frozen Lockfile)**：在流水線中務必使用 `bun install --frozen-lockfile` 以防止版本偏移。
2. **構建驗證**：在構建前執行 `bun test`，確保程式碼零回歸。
3. **健康檢查**：建立 `/health` 路由，以便負載平衡器對應用進行監控。

---

> **恭喜您！** 您已經完成了 Gravito 的「保姆級」開發指南。現在，您已經準備好構建高性能、AI 友善且具備無限擴展能力的應用程式了。 ☄️
