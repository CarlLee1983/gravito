# 🏗️ 官方網站架構解析

Gravito 官方網站不僅僅是一個行銷頁面，它是 Gravito "Singularity" 架構的**旗艦參考實作**。它展示了如何使用**微單體 (Micro-Monolith)** 方法構建一個內容密集且高性能的網站。

---

## 🛰️ 架構概覽

該站點遵循 Gravito Galaxy 模式，整合了多個動力模組 (Orbits) 來處理不同的需求：

- **核心 (Core)**：`@gravito/core` (PlanetCore) 管理應用程式生命週期。
- **引擎 (Engine)**：`@gravito/photon` 提供高速 I/O 支持。
- **UI 橋接**：`@gravito/ion` (Inertia.js) 將 React 前端與後端無縫連接。
- **視圖引擎**：`@gravito/prism` 處理伺服器端模板渲染與 SSG 導出。
- **SEO 引擎**：`@gravito/luminosity` 管理 Sitemap 與 Meta 數據。

---

## 📝 Markdown 處理管道

文件系統完全由數據驅動，直接從 monorepo 根目錄的 `docs/` 文件夾獲取 Markdown 文件。這一切由 `DocsService` 處理。

### 1. 文件定位與回退機制
服務將 URL 映射到檔案系統。如果請求的文件在目標語系（如 `zh-TW`）中缺失，它會自動回退到英文版本，確保未翻譯內容不會出現 404 錯誤。

### 2. 語法高亮 (Shiki)
我們使用 **Shiki** 代替傳統的用戶端高亮工具（如 Prism.js 或 Highlight.js）。
- **零客戶端運行時**：代碼高亮在伺服器端（構建或請求階段）執行。
- **主題一致性**：使用 `rose-pine-moon` 主題，營造高級的開發者視覺體驗。

### 3. 自動化圖片優化
這是官網的一大特色。`DocsService` 攔截了 Markdown 解析器的圖片渲染器：

```typescript
renderer.image = ({ href, text }) => {
  // 如果是本地路徑，使用 ImageService
  return imageService.generateImageTag({
    src: href,
    alt: text,
    usePicture: true,
    formatNegotiation: true,
  });
}
```

每個標準的 Markdown 圖片語法 `![alt](path)` 都會自動轉換為高性能的 `<picture>` 標籤，具備 **WebP/AVIF** 支援與 **CLS（佈局抖動）預防**。

### 4. 動態架構圖
文件中的架構圖使用 **Mermaid** 語法撰寫。處理管道會檢測這些區塊，並使用 `Mermaid.ink` 配合自定義的 Gravito 色彩規範進行渲染。

---

## 🔗 SPA 連結轉換

為了維持流暢的 SPA 體驗，`DocsService` 會將相對的 Markdown 連結（例如 `[路由](./routing.md)`）轉換為正確的在地化 SPA 路由（例如 `/zh/docs/guide/routing`）。這確保了點擊文件中的連結時不會觸發整頁重新載入。

---

## 📊 目錄 (TOC) 自動生成

處理管道會自動：
1.  提取所有 `H2` 和 `H3` 標題。
2.  生成唯一的、對 URL 友好的 ID (Slugify)。
3.  注入 `scroll-mt-24` 類別，確保點擊側邊欄跳轉時有正確的頂部偏移量。
4.  將結構化的 `toc` 陣列返回給前端，用於渲染右側目錄欄。

---

## 🚀 SSG 導出邏輯

在執行 `bun run build:static` 時，`build-static.ts` 腳本會：
1.  掃描 `docs/` 目錄下所有的 `.md` 文件。
2.  生成所有在地化路徑的矩陣。
3.  將其輸入 `ssg.exportIncremental()`。
4.  產出是一系列經過極致優化的 HTML 文件，隨時可以部署到邊緣網絡。
