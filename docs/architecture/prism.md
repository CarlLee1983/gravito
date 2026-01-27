# Prism View Engine 架構技術規格書

## 1. 模組概覽

**Prism** (`@gravito/prism`) 是 Gravito 框架的高效能模板引擎與靜態站點生成器 (SSG)。它結合了後端模板渲染 (Server-Side Rendering) 與現代前端優化技術 (Image Optimization, Core Web Vitals)。

### 核心職責
- **Template Engine**：基於 Blade 語法的伺服器端渲染引擎，支援組件化 (`<x-component>`) 與佈局繼承。
- **Image Optimization**：內建圖片優化服務，自動生成 `srcset`、`AVIF/WebP` 協商與防止 CLS。
- **Static Site Generation (SSG)**：支援完整靜態匯出、增量建構 (Incremental Builds) 與動態路由解析。
- **Performance**：LRU 模板快取與 Hash-based Invalidation 機制。

---

## 2. 技術規格與架構設計

### 2.1 核心元件

Prism 由三個主要子系統組成：

1.  **Template Engine** (`src/core/TemplateCompiler.ts`)
    -   負責解析 Blade 風格的模板語法 (`@if`, `@foreach`, `{{ variable }}`)。
    -   實作 LRU 快取機制，將編譯後的函數緩存在記憶體中。
    -   支援 `<x-component>` 語法與 Slot 機制。
2.  **Image Service** (`src/image/ImageService.ts`)
    -   負責生成最佳化的 `<img>` 與 `<picture>` 標籤。
    -   處理格式協商 (Format Negotiation)、藝術指導 (Art Direction) 與 Fetch Priority。
3.  **Static Site Generator** (`src/ssg/StaticSiteGenerator.ts`)
    -   爬蟲引擎，負責掃描路由並生成靜態 HTML。
    -   支援 Loopback Rendering（透過 `adapter.fetch` 請求自身）以確保 Middleware 正確執行。

### 2.2 渲染流程 (Render Pipeline)

```mermaid
graph LR
    Request -->|c.render('home')| OrbitPrism
    OrbitPrism -->|Resolve Path| TemplateEngine
    TemplateEngine -->|Check Cache| LRUCache
    
    subgraph Compilation [Compilation Phase]
    LRUCache --Miss--> Compiler
    Compiler -->|Parse Directives| Parser
    Parser -->|Expand Components| Compiler
    Compiler -->|Compiled String| LRUCache
    end
    
    LRUCache --Hit--> RenderFunction
    RenderFunction -->|Execute with Data| HTML
    HTML --> Response
```

### 2.3 SSG 架構

SSG 透過 `StaticSiteGenerator` 類別實作，其工作流如下：

1.  **Route Discovery**：從 Router 收集所有靜態 GET 路由。
2.  **Dynamic Resolution**：透過 `DynamicRouteResolver` 將參數化路由 (如 `/blog/[slug]`) 解析為具體路徑列表。
3.  **Concurrent Rendering**：使用 Worker Pool 模式併發發送請求至本地伺服器。
4.  **File Writing**：將 HTML 寫入 `dist/` 目錄，自動處理 `index.html` 路徑對應。
5.  **Asset Generation**：自動生成 `sitemap.xml` 與 `robots.txt`。

---

## 3. 關鍵設計決策

### 3.1 Loopback Rendering for SSG
**決策**：SSG 透過 HTTP 請求 (`adapter.fetch`) 訪問自身應用來獲取 HTML，而非直接呼叫渲染函數。
**原因**：
-   **完整性**：確保經過所有 Middleware (Auth, I18n, Data Fetching)。
-   **一致性**：開發環境 (SSR) 與建構結果 (SSG) 保證一致。
-   **解耦**：SSG 模組不需要知道具體的 Controller 邏輯，只需知道 URL。

### 3.2 Blade-inspired Syntax
**決策**：採用類似 Laravel Blade 的語法 (`@section`, `@yield`)。
**原因**：
-   **可讀性**：比 EJS (`<% %>`) 更簡潔，且對非前端開發者更友善。
-   **Layout Inheritance**：原生的繼承機制非常適合構建複雜的 Admin Dashboard 或文檔網站。

### 3.3 圖片優化策略
**決策**：不直接處理圖片壓縮（Runtime Image Processing），而是生成最佳化的 HTML 標籤。
**原因**：
-   **效能**：Node.js/Bun 處理圖片極其消耗 CPU，不適合在 Edge 環境執行。
-   **職責分離**：Prism 專注於 "HTML 生成"，圖片處理應交由專業服務 (CDN) 或 Build Time 工具。

---

## 4. 風險分析與潛在問題

### 4.1 XSS 風險
-   **問題**：`{{ variable }}` 預設會跳脫 HTML，但 `{!! variable !!}` (Raw Output) 不會。
-   **風險**：若開發者在 Raw Output 中輸出使用者輸入，可能導致 XSS。
-   **建議**：在文檔中強烈警示 Raw Output 的使用場景，並提供 `Sanitizer` Helper。

### 4.2 SSG 記憶體消耗
-   **問題**：`StaticSiteGenerator` 使用陣列儲存待處理路由。
-   **風險**：若路由數十萬級，陣列可能過大導致 OOM。
-   **建議**：改用 Async Generator 或 Stream 處理路由列表，並實作 Batched Processing。

### 4.3 增量建構的依賴追蹤
-   **問題**：目前的增量建構主要依賴檔案存在與否或簡單的時間戳。
-   **風險**：若模板檔案修改但數據源未變，或反之，可能導致構建結果不一致。
-   **建議**：引入 Content Hash 機制，對渲染結果進行雜湊比對。

---

## 5. 效能與擴展性

### 5.1 模板編譯快取
-   **機制**：`TemplateCompiler` 實作了記憶體快取。
-   **效益**：將模板編譯為 JS Function 後快取，後續渲染只需執行函數，大幅提升 TPS。

### 5.2 圖片 CLS 防止
-   **機制**：`ImageService` 強制要求 `width` 與 `height`，或在 `ArtDirection` 中指定。
-   **效益**：確保瀏覽器能預留版面空間，顯著改善 Core Web Vitals 的 CLS 分數。

---

## 6. 後續優化建議

1.  **Hydration 支援 (Island Architecture)** (Priority: High)
    -   引入類似 Astro 的 Island 架構，允許在靜態 HTML 中嵌入互動式 React/Vue 組件 (`<x-react-component client:load />`)。

2.  **增強增量建構** (Priority: Medium)
    -   實作基於 Content Hash 的增量檢測，建立 `.gravito-cache` 檔案以追蹤依賴關係。

3.  **View Transition API 整合** (Priority: Low)
    -   內建支援 View Transitions，讓多頁面應用 (MPA) 擁有 SPA 級別的轉場體驗。
