---
title: 快速上手
description: 在 5 分鐘內開啟您的 Gravito 開發之旅。
---

# 快速上手

歡迎來到 Gravito！本指南將幫助您建立開發環境，並建構您的第一個高效能全端應用程式。本次 1.0 beta 以 Bun 原生效能為核心，並針對速度做出最佳化。

## 準備工作

Gravito 為現代開發而生。您只需要準備一樣東西：
- **[Bun](https://bun.sh/) 1.3.4 或更高版本**：極致快速的 JavaScript 執行環境。

要檢查您的版本，請執行：
```bash
bun --version
```

## 建立您的專案

`bunx gravito create my-gravito-app` 會呼叫 Gravito CLI 的 `create` 命令，該命令會：

1. 請您輸入要建立的專案名稱（預設 `my-galaxy-app`）。
2. 選擇要套用的模板，目前提供：
   - `basic`（超簡潔 Gravito server，適合從骨架開始建置）。
   - `inertia-react`（Gravito server + Inertia/React 客戶端的起始範本，內建 React 前端和 middleware 整合）。
   - `static-site`（靜態網站，支援 React 或 Vue 客戶端，適合單純靜態頁面或 Jamstack）。
3. 依照模板複製 `templates/<template>` 的結構，並針對 `static-site` 模板再詢問要保留 React 還是 Vue 的檔案、更新 `package.json`（移除不用依賴、加上對應的 Vue/React 依賴）以及調整 `vite.config.ts`、 `src/client` 內容。
4. 建立 `.env`（從 `env.example`）、將 `workspace:*` 依賴換成穩定版本，並把專案名稱格式化為合法 npm 名稱。

這些模板的對應資料夾位於專案的 `templates/` 下，大致內容如下：
- `basic`：最核心的 Gravito server structure（`controllers`、`routes`、`views`、`hooks`）與少量的 `static/` 入口。
- `inertia-react`：在 `basic` 之上加入 `src/client/app.tsx`、`components/`、`pages/` 以及 React/Inertia 專用的 `vite.config.ts`。
- `static-site`：同時提供 React 與 Vue 的 `src/client` 入口與組件，CLI 會根據您選的框架保留對應檔案、調整 `package.json` 依賴、修改 `vite.config.ts` 與環境檔案。

您也可以用 `--template` 直接指定：

```bash
bunx gravito create my-gravito-app --template inertia-react
bunx gravito create my-gravito-app --template static-site
```

接著進入專案目錄：

```bash
cd my-gravito-app
bun install
```

## 啟動開發伺服器

只需一個指令即可啟動開發引擎：

```bash
bun dev
```

您的應用程式現在執行於 **[http://localhost:3000](http://localhost:3000)**！

## 生產力 CLI 工具

Gravito 內建了「工匠級」的 CLI 工具，能為您代勞繁重的工程任務。進入專案後，即可使用 `gravito` 指令：

```bash
# 快速建構 (Scaffolding)
bun gravito make:controller UserController
bun gravito make:middleware EnsureAdmin

# 資料庫 (需要 @gravito/atlas)
bun gravito migrate
bun gravito db:seed

# 開發工具 (Development Utilities)
bun gravito route:list
bun gravito tinker # 進入互動式 REPL
```

### 剛才發生了什麼？
Gravito 同時啟動了兩個同步運作的引擎：
1. **Gravito 核心引擎**：處理您的路由、控制器與商業邏輯。
2. **Vite 前端**：驅動 React/Inertia 介面，並提供閃擊般的震動熱更新 (HMR)。

## 進行第一次修改

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

### 路徑 B：經典多頁應用 MPA (Gravito-View 樣板)
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

### 那支援 Vue 嗎？
Gravito CLI 的 `static-site` 模板內建了 React + Vue 版本的 `src/client`，建立時會依照選擇移除另外一套：
- 選 React：保留 `app.tsx`/`.tsx` 組件，移除 Vue 相關 `.vue` 檔案，並自動清掉 `@inertiajs/vue3`、Vue 的依賴。
- 選 Vue：保留 `app.vue.ts`/`.vue` 檔案，移除 React 的 `.tsx` 檔案，為 `package.json` 加上 `@inertiajs/vue3`、`vue`、`@vitejs/plugin-vue`，並調整 `vite.config.ts` 的入口與插件。

如果你要手動切換 Inertia 前端，可以在 `src/client` 裡自行替換這些檔案，Gravito 會照常支援 React / Vue / 採用 Inertia 之外的純 HTML。

## 下一步是什麼？

您剛剛邁出了進入 Gravito 世界的第一步。接下來推薦閱讀：

- **[核心概念](/zh/docs/guide/core-concepts)**：理解「行星與軌道」的設計哲學。
- **[路由系統](/zh/docs/guide/routing)**：學習如何建構優雅的 MVC 路由。
- **[Inertia 全端開發](/zh/docs/guide/inertia-react)**：掌握現代單體架構 (Modern Monolith) 的藝術。

---

> **小建議**：Gravito 是高度模組化的，您只需加載需要的東西。歡迎查看 **Kinetic Modules** 系統，掌握 SEO、國際化 (I18n) 與全端整合等核心能力！
