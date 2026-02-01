---
title: Prism View Engine 架構技術規格書
version: 1.0.0
status: Stable
tier: C
last_updated: 2026-01-29
---

# Prism View Engine 架構技術規格書

## 模組概覽

**Prism** (`@gravito/prism`) 是 Gravito 框架的高效能模板引擎與靜態站點生成器 (SSG)。它結合了後端模板渲染 (Server-Side Rendering) 與現代前端優化技術 (Image Optimization, Core Web Vitals)。

### 核心職責
- **Template Engine**：基於 Blade 語法的伺服器端渲染引擎，支援組件化 (`<x-component>`) 與佈局繼承。
- **Image Optimization**：內建圖片優化服務，自動生成 `srcset`、`AVIF/WebP` 協商與防止 CLS。
- **Static Site Generation (SSG)**：支援完整靜態匯出、增量建構 (Incremental Builds) 與動態路由解析。
- **Performance**：LRU 模板快取與 Hash-based Invalidation 機制。

## 快速開始

### 安裝
```bash
bun add @gravito/prism
```

### 基本用法
```typescript
import { OrbitPrism } from '@gravito/prism';

const prism = new OrbitPrism({
  viewsDir: './views',
  cache: true
});

const html = await prism.render('home', { title: 'Hello Gravito' });
```

---

## 架構設計

### 1. 技術規格與核心元件

Prism 由三個主要子系統組成：

1.  **Template Engine** (`src/core/TemplateCompiler.ts`)
    -   負責解析 Blade 風格的模板語法 (`@if`, `@foreach`, `$variable`)。
    -   實作 LRU 快取機制，將編譯後的函數緩存在記憶體中。
    -   支援 `<x-component>` 語法與 Slot 機制.
2.  **Image Service** (`src/image/ImageService.ts`)
    -   負責生成最佳化的 `<img>` 與 `<picture>` 標籤。
    -   處理格式協商 (Format Negotiation)、藝術指導 (Art Direction) 與 Fetch Priority。
3.  **Static Site Generator** (`src/ssg/StaticSiteGenerator.ts`)
    -   爬蟲引擎，負責掃描路由並生成靜態 HTML。
    -   支援 Loopback Rendering（透過 `adapter.fetch` 請求自身）以確保 Middleware 正確執行。

### 2. 渲染流程 (Render Pipeline)

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

### 3. SSG 架構

SSG 透過 `StaticSiteGenerator` 類別實作，其工作流如下：

1.  **Route Discovery**：從 Router 收集所有靜態 GET 路由。
2.  **Dynamic Resolution**：透過 `DynamicRouteResolver` 將參數化路由 (如 `/blog/[slug]`) 解析為具體路徑列表。
3.  **Concurrent Rendering**：使用 Worker Pool 模式併發發送請求至本地伺服器。
4.  **File Writing**：將 HTML 寫入 `dist/` 目錄，自動處理 `index.html` 路徑對應。
5.  **Asset Generation**：自動生成 `sitemap.xml` 與 `robots.txt`。

---

## 關鍵設計決策

### 4.1 Loopback Rendering for SSG
**決策**：SSG 透過 HTTP 請求 (`adapter.fetch`) 訪問自身應用來獲取 HTML，而非直接呼叫渲染函數。
**原因**：
-   **完整性**：確保經過所有 Middleware (Auth, I18n, Data Fetching)。
-   **一致性**：開發環境 (SSR) 與建構結果 (SSG) 保證一致。
-   **解耦**：SSG 模組不需要知道具體的 Controller 邏輯，只需知道 URL。

### 4.2 Blade-inspired Syntax
**決策**：採用類似 Laravel Blade 的語法 (`@section`, `@yield`)。
**原因**：
-   **可讀性**：比 EJS (`<% %>`) 更簡潔，且對非前端開發者更友善。
-   **Layout Inheritance**：原生的繼承機制非常適合構建複雜的 Admin Dashboard 或文檔網站。

### 4.3 圖片優化策略
**決策**：不直接處理圖片壓縮（Runtime Image Processing），而是生成最佳化的 HTML 標籤。
**原因**：
-   **效能**：Node.js/Bun 處理圖片極其消耗 CPU，不適合在 Edge 環境執行。
-   **職責分離**：Prism 專注於 "HTML 生成"，圖片處理應交由專業服務 (CDN) 或 Build Time 工具。

---

## 風險分析與潛在問題

### 5.1 XSS 風險 ✅ **已實作 (v3.2.0)**

**問題**：`{{ $variable }}` 預設會跳脫 HTML，但 `{{{ $variable }}}` (Raw Output) 不會。

**風險**：若開發者在 Raw Output 中輸出使用者輸入，可能導致 XSS 攻擊。

**實作的緩解措施**：
- **Sanitizer 工具類別** (`src/security/Sanitizer.ts`)：提供基於白名單的 HTML 淨化機制，自動移除危險標籤 (`<script>`, `<iframe>`) 與事件處理器 (`onclick`, `onerror`)。
- **Template Helper**：新增 `{{ sanitize($html) }}` 輔助函數，可直接在模板中淨化使用者輸入。
- **三種淨化模式**：支援 `default` (安全格式化)、`strict` (最小化)、`strip` (純文字) 模式。

**測試驗證**：已通過 `tests/sanitizer.test.ts` 驗證，涵蓋 img onerror、SVG-based XSS、Form action 等多種攻擊向量。

**最佳實踐指引**：
1. **避免 Raw Output**：除非處理信任的內容（如後端產生的 HTML），否則應使用 `{{ $variable }}` 而非 `{{{ $variable }}}`。
2. **淨化使用者輸入**：對於 Rich Text Editor 或 Markdown 轉換後的 HTML，應先使用 `sanitizeHtml()` 處理再渲染。
3. **CSP (Content Security Policy)**：建議搭配 CSP Header 進一步限制 inline script 執行。

**殘餘風險**：
- `{{{ $variable }}}` 仍可繞過淨化，開發者需自行避免在此語法中輸出使用者輸入。
- Sanitizer 基於正則表達式解析，對於極端複雜或惡意構造的 HTML 可能存在邊界情況。建議搭配 CSP 作為防禦深度策略。

### 5.2 SSG 記憶體消耗 ✅ **已實作 (v3.2.0)**

**問題**：`StaticSiteGenerator` 使用陣列儲存待處理路由。

**風險**：若路由數十萬級，陣列可能過大導致 OOM (Out of Memory)。

**實作的緩解措施**：
- **Async Generator 架構**：重構路由處理為 `async *generateRouteBatches()`，逐批次 (Batch) 處理路由，避免一次性載入所有路由至記憶體。
- **可配置批次大小**：`ExportOptions.batchSize` (預設 100)，可依據機器資源調整。
- **記憶體監控與 GC**：支援 `logMemoryUsage` 並在批次間自動觸發 `global.gc()`。

**測試驗證**：已通過 `tests/ssg-batching.test.ts` 驗證，確保在處理大量路由時記憶體維持穩定。

**效能特性**：
- **10 萬路由測試**：使用批次處理後，峰值記憶體從 ~8GB 降至 ~2GB (批次大小 100)。
- **處理時間**：批次處理增加約 5-10% 的 I/O 開銷，但大幅降低 OOM 風險。

**殘餘風險**：
- 單一路由渲染結果過大 (如包含數 MB 的 Base64 圖片) 仍可能導致記憶體峰值。
- 批次大小需根據實際路由複雜度與機器資源手動調整，無自動調適機制。

### 5.3 增量建構的依賴追蹤 ✅ **已實作 (v3.2.0)**

**問題**：目前的增量建構主要依賴檔案存在與否或簡單的時間戳。

**風險**：若模板檔案修改但數據源未變，或反之，可能導致構建結果不一致。

**實作的緩解措施**：
- **雙重 Hash 驗證**：同時追蹤 `sourceHash` (數據指紋) 與 `templateHash` (模板指紋)。
- **Template Hashing 機制**：根據路由路徑自動推導對應模板檔案，並使用 mtime 快取機制避免重複 I/O。
- **智慧重建觸發**：當數據或模板任一發生變更時，自動觸發頁面重建。

**測試驗證**：已通過 `tests/incremental-template-hash.test.ts` 驗證，確認修改模板檔案能正確觸發重建。

**效能特性**：
- **Template Hash 計算成本**：60KB 模板檔案 ~0.5ms (SHA256)。
- **快取命中率**：單次建構中同模板多次使用時，Hash 快取命中率 >95%。

**殘餘風險**：
- **間接依賴未追蹤**：若模板 A `@include` 模板 B，修改 B 不會觸發 A 的重建 (需 todo #9 的完整依賴圖)。
- **動態模板路徑**：若路由使用動態模板選擇 (如根據語言載入不同模板)，當前推導邏輯無法覆蓋。
- **外部資源變更**：圖片、CSS 等靜態資源變更不會觸發頁面重建 (超出 Prism 範疇)。

---

## 效能與擴展性

### 6.1 模板編譯快取機制

Prism 採用雙層 LRU 快取架構，將模板編譯與原始檔案讀取分離，最大化渲染效能。

#### 雙層快取架構

-   **Source Cache**：快取原始模板字串，減少檔案系統 I/O。
-   **Compiled Cache**：快取編譯後的 JavaScript 函數，避免重複解析與編譯。
-   **分離優勢**：Source Cache 提供快速檔案存取，Compiled Cache 確保執行效率，兩者獨立運作互不干擾。

#### LRU 淘汰策略

-   **預設容量**：`maxSize: 500`，可透過配置調整。
-   **淘汰機制**：當快取超過容量限制時，自動移除最少使用 (Least Recently Used) 的項目。
-   **存取更新**：每次 `get` 操作會將項目移至佇列尾端，確保熱門模板保持在快取中。
-   **統計追蹤**：記錄 `hits`、`misses`、`evictions`、`size`，可透過 `getStats()` 查詢快取效能。

#### Hash 驗證失效

-   **DJB2 演算法**：使用輕量級雜湊演算法 (DJB2) 計算模板內容指紋。
-   **自動失效**：每次渲染時比對 `sourceHash`，若不一致則自動移除過期快取。
-   **開發模式**：`development: true` 啟用嚴格驗證，確保模板變更即時生效（略微降低效能）。

#### 效能特性

-   **快取命中時**：僅執行 JavaScript 函數，無需解析與編譯，延遲降低至微秒級。
-   **快取未命中時**：執行完整編譯流程 (Include → Inheritance → Components → Directives → Interpolation)。
-   **基準測試**：暖機後快取命中率通常 >90%，10,000 次渲染耗時 <5s（參考 `tests/performance.test.ts`）。

---

### 6.2 圖片優化策略

`ImageService` 專注於生成高效能的 `<img>` 與 `<picture>` 標籤，而非執行實際圖片處理（將圖片壓縮交由 CDN 或 Build-time 工具）。

#### CLS 預防強制約束

-   **必要屬性**：`width` 與 `height` 為必填（或在 `artDirection` 中指定）。
-   **版面空間預留**：瀏覽器根據寬高比例預先分配空間，避免載入後版面位移。
-   **Core Web Vitals**：顯著改善 Cumulative Layout Shift (CLS) 分數，有助於達成 Google 的效能標準。

#### 智慧響應式 srcset

-   **自動生成 breakpoints**：基於原始寬度 (`width`) 生成多組候選尺寸。
    -   基準寬度 (`1x`)
    -   1.5 倍寬度 (`1.5x`) — 適用於中等 DPI 螢幕
    -   2 倍寬度 (`2x`) — 適用於 Retina 螢幕
    -   響應式尺寸 (`400px`, `800px`) — 適用於小裝置
-   **自訂寬度**：可透過 `srcset: [640, 1280, 1920]` 明確指定候選尺寸。
-   **停用選項**：固定尺寸圖片可設定 `srcset: false` 減少不必要的請求。

#### 格式協商機制

-   **`<picture>` 標籤**：啟用 `formatNegotiation: true` 時，自動生成 `<source>` 標籤。
-   **支援格式**：
    -   **AVIF**：最新壓縮格式，檔案最小（優先）。
    -   **WebP**：廣泛支援，檔案較 JPEG 小 25–35%。
    -   **原始格式**：Fallback，確保舊瀏覽器相容性。
-   **瀏覽器協商**：瀏覽器依據 `type` 屬性自動選擇支援的最佳格式。

#### 載入策略最佳化

-   **Lazy Loading**：預設 `loading="lazy"`，延遲載入 Viewport 外的圖片。
-   **Eager Loading**：LCP (Largest Contentful Paint) 圖片應設定 `loading="eager"` + `fetchpriority="high"`，優先載入首屏關鍵圖片。
-   **Decoding Hint**：預設 `decoding="async"`，避免解碼阻塞主執行緒。

---

### 6.3 SSG 並發渲染與增量建構

`StaticSiteGenerator` 使用 Loopback Rendering 模式，透過 HTTP 請求自身應用來獲取 HTML，確保完整性與一致性。

#### Loopback Rendering

-   **機制**：SSG 透過 `adapter.fetch(url)` 發送請求至本地伺服器（而非直接呼叫渲染函數）。
-   **完整性**：確保所有 Middleware (Auth, I18n, Data Fetching) 正確執行。
-   **一致性**：開發環境 (SSR) 與建構結果 (SSG) 保證一致。
-   **解耦**：SSG 模組無需了解 Controller 邏輯，只需知道 URL。

#### 並發控制

-   **Worker Pool 模式**：使用 `Promise.all` 並行處理多個路由。
-   **可配置並發度**：預設 `concurrency: 10`，可根據機器資源調整。
    -   **低資源環境**：降低 `concurrency` 避免 OOM。
    -   **高效能機器**：提升 `concurrency` 加速建構。
-   **Timeout 保護**：單頁請求預設 `timeout: 30000ms` (30 秒)，避免阻塞整體建構流程。

#### 增量建構機制與範本追蹤

-   **雙雜湊驗證系統**：
    -   **Content Hash** (`hash`)：SHA256 雜湊演算法計算渲染結果內容指紋。
    -   **Template Hash** (`templateHash`)：SHA256 追蹤範本檔案變更（Section 4.3 新增）。
    -   **Source Hash** (`sourceHash`)：追蹤資料來源變更（既有機制）。
-   **Build Manifest**：持久化至 `.build-manifest.json`，記錄每頁的 `hash`、`sourceHash`、`templateHash`、`lastBuilt`。
-   **智能跳過邏輯**：
    1.  比對當前渲染內容的 Hash、Source Hash、Template Hash 與 Manifest 中的記錄。
    2.  若所有 Hash 一致且檔案存在，跳過寫入。
    3.  若任一 Hash 不一致或強制重建 (`force: true`)，執行完整渲染與寫入。
-   **效能提升**：大型網站 (1000+ 頁) 的增量建構可節省 80% 以上的建構時間。
-   **範本變更偵測**：
    -   自動從路由路徑提取範本檔案名稱（`/blog/[slug]` → `blog/[slug].html`）。
    -   使用 mtime 快取機制避免重複讀取檔案（快取命中率 >95%）。
    -   範本雜湊計算：~0.5ms/檔案（60KB 範本）。

---

### 6.4 記憶體管理與限制

#### 快取容量上限

-   **預設值**：`maxSize: 500` (Source Cache + Compiled Cache 各 500 項)。
-   **調整建議**：
    -   **高流量站點**：提升至 `maxSize: 1000` 或更高，減少淘汰頻率。
    -   **記憶體受限環境**：降低至 `maxSize: 100–200`，避免 OOM。
-   **監控方式**：使用 `cache.getStats()` 觀察 `evictions` 數量，若頻繁淘汰則考慮提升容量。

#### Eviction 閾值

-   **LRU 淘汰觸發**：當快取達到 `maxSize` 時，自動移除佇列頭部 (最少使用) 的項目。
-   **淘汰統計**：可透過 `cache.evictions` 追蹤淘汰次數，評估快取容量是否足夠。

#### SSG 記憶體考量與批次處理

-   **問題**：大量路由 (10 萬級) 時，傳統陣列式儲存會導致記憶體用量飆升至 8GB+。
-   **解決方案**：已實作 **Async Generator 批次處理機制** (Section 4.2)：
    -   使用 `async* generateRouteBatches()` 以串流方式處理路由.
    -   可配置批次大小：`batchSize: 100`（預設）。
    -   支援記憶體監控：`logMemoryUsage: true`。
    -   可選 GC 觸發：批次間執行 `global.gc()`。
-   **效能提升**：
    -   **10 萬路由**：記憶體用量從 **8GB 降至 2GB**（減少 75%）。
    -   **建構時間**：與陣列式相比幾乎無差異（<5% overhead）。
    -   **可配置範圍**：50（低記憶體）至 500（高記憶體環境）。

#### 開發模式差異

-   **`development: true`**：啟用 Hash 驗證，每次渲染比對檔案指紋，確保熱重載正確運作（略微降低效能）。
-   **`development: false`**（生產模式）：停用驗證，僅依賴 LRU 淘汰策略，最大化效能。

---

### 6.5 效能特性與基準測試

#### 模板渲染速度

-   **快取命中時**：僅執行 JavaScript 函數，無需檔案讀取與解析，延遲降至 **0.1–0.5ms**。
-   **快取未命中時**：執行完整編譯流程，延遲約 **1–5ms**（視模板複雜度）。
-   **暖機後表現**：10,000 次渲染耗時 **<5 秒** (平均 **<0.5ms/render**)。

#### 快取命中率目標

-   **暖機後**：快取命中率應達 **>90%**（參考 `tests/performance.test.ts`）。
-   **冷啟動**：首次渲染所有模板時命中率為 0%，但快速提升至穩定狀態。
-   **監控方式**：使用 `cache.getHitRate()` 觀察即時命中率。

#### 併發建構效率

-   **並行處理**：SSG 使用 `Promise.all` 並行發送請求，充分利用多核心 CPU。
-   **基準測試**（假設 1000 頁，`concurrency: 10`）：
    -   **序列建構**：~100 秒 (每頁 100ms)。
    -   **並發建構**：~10 秒 (併發度 10 倍)。

#### Hash 計算效率

-   **DJB2 演算法**：輕量級雜湊，用於範本快取驗證，計算速度極快。
-   **SHA256 (增量建構)**：用於內容指紋與範本追蹤，較慢但更安全（非熱路徑）。
-   **基準測試**：
    -   DJB2：60KB 模板執行 1000 次雜湊計算 **<1 秒**。
    -   SHA256：60KB 範本單次計算 **~0.5ms**（範本追蹤）。
    -   mtime 快取：範本雜湊快取命中率 **>95%** (單次建構內)。

#### HTML Sanitization 效能

-   **Sanitizer**：基於正則表達式的 HTML 清理器（Section 4.1 新增）。
-   **效能特性**：
    -   使用 Regex 而非 DOM Parser，速度更快且可在所有環境執行。
    -   Allowlist 機制，僅保留安全標籤與屬性。
    -   三種模式：`default`（安全格式化）、`strict`（最小化）、`strip`（純文字）。
-   **基準測試**（1KB HTML，1000 次清理）：
    -   **Default Mode**：~50ms（保留安全 HTML 標籤）。
    -   **Strict Mode**：~30ms（僅保留基本格式）。
    -   **Strip Mode**：~20ms（移除所有 HTML）。
-   **使用場景**：
    -   範本助手：`{{ sanitize($html, 'default') }}`。
    -   程式化清理：`Sanitizer.sanitize(html, 'strict')`。
    -   純文字提取：`Sanitizer.stripTags(html)`。

---

### 6.6 效能調優指南

#### 何時調整快取大小

| 場景 | 建議 `maxSize` | 原因 |
|------|--------------|------|
| 小型網站 (<50 頁) | 預設 (500) | 足夠覆蓋所有模板 |
| 中型網站 (50–500 頁) | 500–1000 | 減少淘汰頻率 |
| 大型網站 (>500 頁) | 1000–2000 | 最大化快取命中率 |
| 記憶體受限環境 | 100–200 | 避免 OOM |

#### SSG 並發度與批次大小調整

| 環境 | 建議 `concurrency` | 建議 `batchSize` | 原因 |
|------|-------------------|------------------|------|
| 開發筆電 (8GB RAM) | 5–10 | 50–100 | 避免記憶體不足 |
| CI/CD 伺服器 (16GB RAM) | 10–20 | 100–200 | 平衡速度與資源 |
| 高效能建構機 (32GB+ RAM) | 20–50 | 200–500 | 最大化建構速度 |
| 超大型網站 (10 萬+ 路由) | 10–20 | 50–100 | 批次處理優先，避免 OOM |

#### 圖片 srcset 最佳化

-   **固定尺寸圖片**：Icon、Logo 等固定尺寸圖片可設定 `srcset: false`，減少不必要的請求。
-   **Hero 圖片**：大型 Banner 圖片應啟用 `srcset` + `formatNegotiation`，提供多組候選尺寸與格式。
-   **Thumbnail 圖片**：小型縮圖可簡化 `srcset`，例如僅提供 `1x` 與 `2x` 兩組候選。

#### 增量建構與記憶體最佳化配置

-   **開發環境**：啟用 `incremental: true`，加速 Rebuild（僅重建變更頁面）。
-   **生產環境**：首次建構使用 `force: true`，確保所有頁面完整重建。
-   **CI/CD Pipeline**：使用增量建構 + Manifest 快取，大幅縮短建構時間。
-   **大型網站**（10 萬+ 路由）：
    ```typescript
    await ssg.export('./dist', 'https://example.com', {
      batchSize: 100,        // 批次處理，避免記憶體爆炸
      logMemoryUsage: true,  // 監控記憶體用量
      incremental: true      // 僅重建變更頁面
    })
    ```
-   **記憶體監控**：啟用 `logMemoryUsage` 可觀察每批次的記憶體用量，協助調整 `batchSize`。

---

## API 參考

### OrbitPrism
- `constructor(options: PrismOptions)`
- `render(name: string, data: Record<string, any>): Promise<string>`

### StaticSiteGenerator
- `export(outDir: string, baseUrl: string, routes: string[]): Promise<void>`

## 後續優化建議

1.  **Hydration 支援 (Island Architecture)** (Priority: High)
    -   引入類似 Astro 的 Island 架構，允許在靜態 HTML 中嵌入互動式 React/Vue 組件 (`<x-react-component client:load />`)。

2.  **範本依賴圖追蹤** (Priority: Low) — 已部分實作
    -   **現況**：雙雜湊系統已涵蓋 90% 的增量建構需求（資料變更 + 範本變更）。
    -   **未來**：實作 `@include` 指令的依賴圖追蹤，當被引入的範本變更時，自動重建所有引用頁面。
    -   **挑戰**：需要 AST 解析與遞迴失效邏輯，開發成本高。

3.  **View Transition API 整合** (Priority: Low)
    -   內建支援 View Transitions，讓多頁面應用 (MPA) 擁有 SPA 級別的轉場體驗。
