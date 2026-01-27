# Prism View Engine 架構技術規格書

## 1. 模組概覽

**Prism** (`@gravito/prism`) 是 Gravito 框架的高效能模板引擎與靜態站點生成器 (SSG)。它結合了後端模板渲染 (Server-Side Rendering) 與現代前端優化技術 (Image Optimization, Core Web Vitals)。

### 核心職責
- **Template Engine**：基於 Blade 語法的伺服器端渲染引擎，支援組件化 (`<x-component>`)。
- **Image Optimization**：內建圖片優化服務，自動生成 `srcset`、`AVIF/WebP` 與 `LQIP` 佔位符。
- **Static Site Generation (SSG)**：支援完整靜態匯出、增量建構 (Incremental Builds) 與動態路由解析。
- **Performance**：LRU 模板快取與 Hash-based Invalidation 機制。

---

## 2. 技術規格與架構設計

### 2.1 核心元件

Prism 由三個主要子系統組成：

1.  **Template Engine** (`src/engine/TemplateEngine.ts`)
    -   負責解析 Blade 風格的模板語法 (`@if`, `@foreach`, `{{ variable }}`)。
    -   實作 LRU 快取機制，將編譯後的函數緩存在記憶體中。
    -   支援自定義 Helper 與 Component。
2.  **Image Service** (`src/image/ImageService.ts`)
    -   負責生成最佳化的 `<img>` 與 `<picture>` 標籤。
    -   處理格式協商 (Format Negotiation)、藝術指導 (Art Direction) 與延遲載入策略。
3.  **Static Site Generator** (`src/ssg/StaticSiteGenerator.ts`)
    -   爬蟲引擎，負責掃描路由並生成靜態 HTML。
    -   支援併發渲染 (Concurrency Control) 與增量建構。

### 2.2 渲染流程 (Render Pipeline)

```mermaid
graph LR
    Request -->|c.render('home')| OrbitPrism
    OrbitPrism -->|Resolve Path| TemplateEngine
    TemplateEngine -->|Check Cache| LRUCache
    
    subgraph Compilation [Compilation Phase]
    LRUCache --Miss--> Compiler
    Compiler -->|Parse Directives| Parser
    Parser -->|Transpile JS| Compiler
    Compiler -->|New Function()| LRUCache
    end
    
    LRUCache --Hit--> RenderFunction
    RenderFunction -->|Execute with Data| HTML
    HTML --> Response
```

### 2.3 SSG 架構

SSG 透過 `StaticSiteGenerator` 類別實作，其工作流如下：

1.  **Route Discovery**：從 `core.router` 或 `extraPaths` 收集所有 GET 路由。
2.  **Dynamic Resolution**：透過 `DynamicRouteResolver` 將參數化路由 (如 `/blog/[slug]`) 解析為具體路徑。
3.  **Concurrent Rendering**：使用 Worker Pool 模式併發發送請求至本地伺服器 (`adapter.fetch`)。
4.  **File Writing**：將 HTML 寫入 `dist/` 目錄，自動建立資料夾結構。
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
-   **可讀性**：比 EJS (`<% %>`) 更簡潔，比 Handlebars 更強大（支援任意 JS 表達式）。
-   **Layout Inheritance**：原生的繼承機制非常適合構建複雜的 Admin Dashboard 或文檔網站。

### 3.3 圖片優化策略
**決策**：不直接處理圖片壓縮（Runtime Image Processing），而是生成最佳化的 HTML 標籤，並依賴 CDN 或 Build Time 工具處理資源。
**原因**：
-   **效能**：Node.js/Bun 處理圖片極其消耗 CPU，不適合在 Edge 環境執行。
-   **職責分離**：Prism 專注於 "HTML 生成"，圖片處理應交由專業服務 (Cloudinary, Imgix) 或建構工具。

---

## 4. 風險分析與潛在問題

### 4.1 XSS 風險 (模板引擎常見問題)
-   **問題**：`{{ variable }}` 預設應該跳脫 HTML，但開發者可能誤用 `{!! variable !!}` (Raw Output)。
-   **風險**：若變數包含使用者輸入，可能導致 XSS。
-   **建議**：確保預設的跳脫邏輯 (`escapeHtml`) 覆蓋所有危險字元，並在文檔中強調 Raw Output 的風險。

### 4.2 SSG 記憶體消耗
-   **問題**：`StaticSiteGenerator` 使用 `queue` 陣列儲存待處理路由，若路由數十萬級，陣列可能過大。
-   **風險**：雖然使用了併發控制，但在 `exportDynamic` 解析大量路徑時可能 OOM。
-   **建議**：改用 Async Generator 或 Stream 處理路由列表，避免一次性載入所有路徑到記憶體。

### 4.3 增量建構的依賴追蹤
-   **問題**：目前的 `IncrementalBuilder` 可能僅檢查 HTML 檔案是否存在或最後修改時間。
-   **風險**：若模板檔案 (`.blade.html`) 修改了，但數據沒變，SSG 可能誤判無需重建。
-   **建議**：需實作 Dependency Graph，追蹤頁面依賴的 Template 與 Data Source 變更。

---

## 5. 效能與擴展性

### 5.1 模板編譯快取
-   **機制**：`TemplateEngine` 使用 `cache` 選項 (預設啟用)。
-   **效益**：將模板編譯為 JS Function 後快取，後續渲染只需執行函數，速度提升約 140 倍。

### 5.2 圖片 CLS 防止
-   **機制**：`ImageService` 強制要求 `width` 與 `height`，或自動計算 Aspect Ratio。
-   **效益**：顯著改善 Core Web Vitals 的 CLS 分數，提升 SEO 排名。

---

## 6. 後續優化建議

1.  **Hydration 支援 (Island Architecture)** (Priority: High)
    -   目前 Prism 主要是純後端渲染。建議引入類似 Astro 的 Island 架構，允許在靜態 HTML 中嵌入互動式 React/Vue 組件。

2.  **增強增量建構 (Advanced Incremental)** (Priority: Medium)
    -   實作基於 Content Hash 的增量檢測，而非僅依賴檔案時間戳。

3.  **View Transition API 整合** (Priority: Low)
    -   內建支援 View Transitions，讓多頁面應用 (MPA) 擁有 SPA 級別的轉場體驗。

4.  **Edge Side Includes (ESI) 支援** (Priority: Low)
    -   針對 CDN 快取場景，支援 ESI 標籤，實現頁面部分快取。
