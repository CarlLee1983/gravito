---
title: 快速上手
description: 在 5 分鐘內開啟您的 Gravito 開發之旅。
---

# 🚀 快速上手

歡迎來到 Gravito！本指南將幫助您建立開發環境，並構建您的第一個高性能全端應用程式。

## 🛠 準備工作

Gravito 為現代開發而生。您只需要準備一樣東西：
- **[Bun](https://bun.sh/) 1.1.0 或更高版本**：極致快速的 JavaScript 運行時。

要檢查您的版本，請執行：
```bash
bun --version
```

## 📦 建立您的專案

開始最快的方法是使用我們的官方 CLI。在終端機中執行以下指令：

```bash
# 初始化新的 Gravito 專案
bunx create-gravito-app@latest my-gravito-app
```

然後進入專案目錄：
```bash
cd my-gravito-app
bun install
```

## ⚡️ 啟動開發伺服器

只需一個指令即可啟動開發引擎：

```bash
bun dev
```

您的應用程式現在運行在 **[http://localhost:3000](http://localhost:3000)**！ 🚀

### 剛才發生了什麼？
Gravito 同時啟動了兩個同步運作的引擎：
1. **Hono 後端**：處理您的路由、控制器與商業邏輯。
2. **Vite 前端**：驅動 React/Inertia 介面，並提供閃擊般的震動熱更新 (HMR)。

## 🎨 進行第一次修改

Gravito 的核心是 **「引擎不可知 (Engine Agnostic)」** 的。您可以根據專案需求，選擇最適合的 UI 建構方式。請打開 `src/controllers/HomeController.ts` 並嘗試這三種路徑：

### 路徑 A：現代全端 SPA (Inertia + React)
這是 Gravito 官方網站的預設方式。它能提供如絲綢般順滑的單頁應用程式體驗，且無需處理 API 層。

```typescript
// src/controllers/HomeController.ts
export class HomeController {
  index(c: Context) {
    const inertia = c.get('inertia')
    return inertia.render('Home', { greeting: '哈囉！來自 React 的問候' })
  }
}
```

### 路徑 B：經典多頁應用 MPA (Orbit-View 樣板)
如果您偏好 Laravel 風格的後端渲染，這絕對是首選。使用 Handlebars/Mustache 風格的樣板，獲得極致的 SEO 表現與開發簡潔度。

```typescript
// src/controllers/HomeController.ts
export class HomeController {
  index(c: Context) {
    const view = c.get('view')
    return view.render('welcome', { greeting: '哈囉！來自樣板引擎的問候' })
  }
}
```

### 路徑 C：極致極簡 (Pure HTML)
當您只需要快速輸出一個簡單的 HTML 或靜態頁面時，完全不帶任何負擔。

```typescript
// src/controllers/HomeController.ts
export class HomeController {
  index(c: Context) {
    return c.html('<h1>哈囉！來自純粹 HTML 的問候</h1>')
  }
}
```

### 🖖 那支援 Vue 嗎？
當然！Gravito 完美支援 **Inertia-Vue**。您只需要在設定中將 `@gravito/orbit-inertia` 的組件目標從 React 換成 Vue，其他開發邏輯完全一致。

## 🗺 下一步是什麼？

您剛剛邁出了進入 Gravito 世界的第一步。接下來推薦閱讀：

- **[核心概念](/zh/docs/guide/core-concepts)**：理解「行星與軌道」的設計哲學。
- **[路由系統](/zh/docs/guide/routing)**：學習如何構建優雅的 MVC 路由。
- **[Inertia 全端開發](/zh/docs/guide/inertia-react)**：掌握現代單體架構 (Modern Monolith) 的藝術。

---

> **小建議**：Gravito 是高度模組化的，您只需加載需要的東西。歡迎查看 **Orbits** 系統，掌握 SEO、國際化 (I18n) 與全端整合等核心能力！
