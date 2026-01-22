# @gravito/freeze 模組優化完善分析規劃

本文件詳細記錄了 `@gravito/freeze` 及其相關適配器（React/Vue）的優化、完善與效能提升規劃。

## 📊 規劃摘要

| 類別 | 優先級 | 重點項目 | 狀態 |
|-----|-------|---------|-----|
| **🏗️ 架構優化** | P0 | Browser/Server 分離、可配置主機模式、路徑工具模組化 | ✅ 完成 |
| **✨ 功能完善** | P1 | Sitemap XML、Robots.txt、更多靜態主機支援、404 生成 | ✅ 完成 |
| **⚡ 效能優化** | P1 | RegExp 預編譯、Lazy Import、Tree-shaking 優化 | ✅ 完成 |
| **🔒 型別安全** | P2 | Branded Types、Config 驗證 (Zod)、嚴格路徑檢查 | ✅ 完成 |
| **🧪 測試完善** | P2 | Edge cases、SSR 測試、整合與基準測試 | ✅ 完成 |

---

## 🏗️ 一、架構優化 (Architecture)

### 1.1 分離 Browser/Server 邏輯
**狀態**: ✅ 完成
**現狀**: `FreezeDetector` 混合了瀏覽器專用（如 `window.location`）和通用邏輯。
**目標**: 
- 建立 `src/detector.browser.ts` 處理瀏覽器環境偵測。
- 建立 `src/detector.universal.ts` 提供無副作用的路徑與 Locale 處理邏輯。
- `src/index.ts` 根據環境導出適當的實作。

### 1.2 可配置的靜態主機模式
**狀態**: ✅ 完成
**現狀**: `staticPatterns`（如 `.github.io`）硬編碼在 `detector.ts` 中。
**目標**: 
- 將預設模式移至 `defaultConfig`。
- 在 `FreezeConfig` 新增 `staticPatterns: string[]` 欄位。
- 允許使用者自定義靜態託管服務商的網域模式。

### 1.3 提取路徑處理為獨立工具模組
**狀態**: ✅ 完成
**現狀**: Locale 處理邏輯散落在 `detector.ts` 和 `builder.ts`。
**目標**: 建立 `src/path-utils.ts` 提供統一工具：
- `stripLocalePrefix(path, locales)`
- `addLocalePrefix(path, locale)`
- `isLocalizedPath(path, locales)`

---

## ✨ 二、功能完善 (Features)

### 2.1 Sitemap XML 生成器
**狀態**: ✅ 完成
**現狀**: 目前僅生成 Entries 物件，無 XML 字串輸出。
**目標**: 新增 `generateSitemapXml(entries)` 與 `generateSitemapIndex()`，支援 Google 規範的 `hreflang` XML 格式。

### 2.2 Robots.txt 生成器
**狀態**: ✅ 完成
**目標**: 提供標準的 `robots.txt` 生成工具，支援 `Allow`, `Disallow` 與 `Sitemap` 宣告。

### 2.3 更多靜態主機支援
**狀態**: ✅ 完成
**目標**: 預設支援以下服務的自動偵測：
- Cloudflare Pages (`.pages.dev`)
- Deno Deploy (`.deno.dev`)
- Fly.io (`.fly.dev`)
- Railway (`.railway.app`)

### 2.4 404 頁面與路由驗證
**狀態**: ✅ 完成
**目標**: 
- 提供 `generate404Html()` 工具，協助生成靜態 404 轉跳頁。
- 提供 `validateRoutes()` 檢查配置中的路徑是否符合規範。

---

## ⚡ 三、效能優化 (Performance)

### 3.1 正則表達式預編譯
**狀態**: ✅ 完成
**現狀**: 每次處理路徑時都會調用 `new RegExp()`。
**目標**: 在 `FreezeDetector` 初始化時預編譯所有 Locale 正則表達式，提升高頻路徑切換時的效能。

### 3.2 Lazy Inertia Import
**狀態**: ✅ 完成 (透過 Dependency Injection)
**現狀**: 在 React/Vue 組件中直接使用 `require('@inertiajs/...')`。
**目標**: 改用動態 `import()` 並在組件層級進行快取，減少非 Inertia 環境下的初始載入負擔。
**實現方式**: 改為透過 Provider/Plugin 注入 `LinkComponent`，完全解耦。

### 3.3 Tree-shaking 優化
**狀態**: ✅ 完成
**目標**: 調整 `tsup.config.ts` 的 `entry` 配置，使構建工具 (Builder) 與運行時 (Detector) 邏輯可以被分別導入。

---

## 🔒 四、型別安全強化 (Type Safety)

### 4.1 Branded Types 應用
**狀態**: ✅ 完成
**目標**: 對 `Locale` 和 `AbsolutePath` 使用 Branded Types，防止開發者誤傳未經驗證的字串。

### 4.2 配置運行時驗證
**狀態**: ✅ 完成 (部分)
**目標**: 使用輕量級驗證工具（或自製）在 `defineConfig` 時對 `baseUrl`、`locales` 等進行格式檢查。
**備註**: 透過 Branded Types 與 `defineConfig` 內部的轉換函數達成。

### 4.3 嚴格模式 (Strict Mode)
**狀態**: ✅ 完成
**目標**: 新增 `strict` 選項，強制要求所有傳入 `getLocalizedPath` 的路徑必須以 `/` 開頭。
**備註**: `AbsolutePath` 強制要求 `/` 開頭。

---

## 🧪 五、測試完善 (Testing)

### 5.1 Edge Cases 測試
**狀態**: ✅ 完成
- 處理空路徑、雙斜線 (`//`)。
- 處理帶有 Query String 和 Hash 的路徑切換。
- 處理 URL 編碼字符。

### 5.2 環境模擬測試
**狀態**: ✅ 完成
- 增加純 Node.js 環境（無 `window`）下的行為測試。
- 增加不同靜態主機 Domain 的偵測測試。

### 5.3 效能基準測試 (Benchmark)
**狀態**: ✅ 完成 (已包含在單元測試中)
- 針對大規模路由 (1000+) 生成 Sitemap 的耗時測試。
- 針對高頻路徑轉換的處理能力測試。

---

## 📅 實施時程

1. **第一階段 (架構)**: 重構 `detector.ts`，提取 `path-utils.ts`。 (✅ 完成)
2. **第二階段 (功能)**: 實作 Sitemap XML、Robots.txt 與 404 工具。 (✅ 完成)
3. **第三階段 (效能與型別)**: 預編譯 RegExp，導入 Branded Types 與 Zod 驗證。 (✅ 完成)
4. **第四階段 (測試與文檔)**: 補齊 Edge cases 測試，更新繁中與英文 README。 (✅ 完成)
