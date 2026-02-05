---
title: Monolith Architecture 技術架構規格書
version: 1.0.0
status: Stable
tier: C
last_updated: 2026-01-29
---

# 🌌 Monolith Architecture 技術架構規格書 (v1.0)

本文件詳述 `@gravito/monolith` 的內部架構、檔案系統 CMS 實作以及與 MVC 模式的整合。

---

## 1. 核心哲學：The Eternal Knowledge Block

Monolith 是 Gravito 的「永恆知識模塊」，旨在提供一個高效、無需資料庫的內容管理系統 (Flat-File CMS)。
- **File-Based**：將 Markdown 檔案轉換為強大的 API，適合部落格、文檔網站與靜態頁面。
- **MVC Foundation**：除了 CMS，Monolith 也提供了 `Controller` 與 `RouterHelper`，為 Gravito 奠定 MVC 開發模式的基礎。
- **Zero Database**：內容儲存於 Git 版本控制的檔案系統中，享受極致的讀取效能與版本管理便利性。

---

## 2. 模組組件分析

### 2.1 OrbitMonolith (Entrypoint)
- **職責**：Orbit 插件入口，負責初始化內容引擎。
- **位置**：`src/index.ts`
- **機制**：
  - 建立 `ContentManager` 實例。
  - 根據配置 (`collections`) 定義內容集合。
  - 註冊中介軟體，將 `content` 服務注入到 `ctx` 中。

### 2.2 ContentManager (Engine)
- **職責**：負責讀取、解析與快取檔案內容，並提供全文搜尋功能。
- **位置**：`src/ContentManager.ts`
- **技術棧**：
  - **Parsing**: `gray-matter` (YAML Frontmatter) + `marked` (Markdown to HTML)。
  - **Caching**: 簡單的記憶體快取 (`Map<string, ContentItem>`)，以 `collection:locale:slug` 為鍵。
  - **Search**: 內建輕量級全文索引 (In-Memory)，支援 `search(query)` 方法進行關鍵字檢索。
  - **Security**: 內建 `renderer` 實作了基本的 HTML 轉義與連結檢查。

### 2.3 Controller (MVC Base)
- **職責**：提供標準化的控制器基類。
- **位置**：`src/Controller.ts`
- **特性**：
  - `call(method)`: 將類別方法轉換為 Hono/Gravito 相容的 Handler。
  - **Helpers**: `json()`, `text()`, `redirect()`, `validate()`。
  - **Context Aware**: 透過 `setContext` 注入當前請求上下文。

### 2.4 RouterHelper (Routing)
- **職責**：簡化 RESTful 路由註冊。
- **位置**：`src/Router.ts`
- **功能**：`Route.resource(app, '/posts', PostController)` 自動生成 7 個標準 CRUD 路由 (`index`, `show`, `create`, `store`, `edit`, `update`, `destroy`)。

---

## 3. 技術規格與設計決策

### 3.1 檔案路徑策略
Monolith 採用結構化的檔案路徑來映射 URL：
- **格式**：`{root}/{collection}/{locale}/{slug}.md`
- **範例**：`content/blog/en/hello-world.md` -> `collection('blog').slug('hello-world')` (預設 locale 為 'en')。
- **優點**：原生支援多語言 (i18n)，且結構清晰。

### 3.2 快取機制
為了效能，`ContentManager` 會在第一次讀取後將結果快取在記憶體中。
-   **限制**：目前沒有實作快取失效 (Cache Invalidation) 或檔案變更監聽 (Watch Mode)。
-   **場景**：適合「構建一次，隨處運行」的靜態部署或容器化環境。
-   **開發模式 (v3.1)**：在 `NODE_ENV=development` 時，會自動啟動 `ContentWatcher` 監聽檔案變更並清除快取，提供即時預覽體驗。

### 3.3 安全性 (Sanitization)
Markdown 渲染預設開啟了 HTML 轉義。
- **連結檢查**：過濾 `javascript:`, `vbscript:`, `data:` 等危險協議。
- **路徑遍歷防護**：`sanitizeSegment` 檢查 slug 與 locale 是否包含 `..` 或 `/`，防止讀取任意檔案。

---

## 4. 潛在風險與效能評估

### 4.1 記憶體佔用
若內容極多 (數千篇文章)，全量快取會佔用大量 RAM。
- **建議**：對於超大型站點，應實作 LRU 快取或轉向資料庫方案 (Atlas)。

### 4.2 缺乏熱重載 (Hot Reload)
目前的實作在檔案變更後不會自動更新快取。
-   **影響**：開發體驗稍差。
-   **優化**：v3.1 已在開發模式下整合 `node:fs` watch，實現自動快取清除。

---

## 5. 後續優化建議

### 短期 (v3.2)
1.  **Dev Mode Watcher (Completed)**：在 `NODE_ENV=development` 時監聽檔案變更並清除快取。
2.  **Custom Renderer**：允許使用者注入自定義的 `marked` Renderer 或外掛 (Plugins)。

### 中期 (v3.2)
1.  **Search Index (Completed)**：在啟動時建立簡易的全文索引 (In-Memory Search)，支援 `search(query)` API。

### 長期 (v2.0)
1. **Git Backend (Research Completed)**：支援直接從 GitHub/GitLab API 讀取內容，實現無頭 CMS (Headless CMS) 架構。詳細方案請參閱 [技術研究報告](../research/monolith-git-backend.md)。

---
*Created by Gravito Architect.*


## 快速開始

> 內容補齊中...


## 架構設計

> 內容補齊中...


## API 參考

> 內容補齊中...
