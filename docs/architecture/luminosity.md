---
title: Luminosity SEO Engine 架構技術規格書
version: 1.0.0
status: Stable
tier: C
last_updated: 2026-01-29
---

# Luminosity SEO Engine 架構技術規格書

## 模組概覽

**Luminosity** (`@gravito/luminosity`) 是 Gravito 框架中的智能 SEO 引擎，負責網站地圖 (Sitemap) 生成、Robots.txt 管理與 Meta Tag 優化。其設計核心是 **"Tri-Mode Architecture"**，旨在同時滿足小型動態網站與百萬級頁面的超大型網站需求。

### 核心職責
- **High-Performance Sitemaps**：基於串流 (Streaming) 的 XML 生成，支援 Gzip 壓縮與自動分頁 (Sharding)。
- **SEO Orchestration**：`SeoEngine` 協調路由掃描、策略選擇與內容渲染。
- **Metadata Management**：統一管理 OpenGraph, Twitter Cards, JSON-LD 與 Analytics 腳本。
- **Incremental Engine**：針對大型網站的增量更新機制 (LSM-Tree concept)。

## 快速開始

### 1. 安裝
```bash
bun add @gravito/luminosity
```

### 2. 基本用法
```typescript
import { Luminosity } from '@gravito/luminosity';

const lux = new Luminosity({
  baseUrl: 'https://example.com'
});

await lux.generateSitemap();
```

---

## 架構設計

### 1. 三模態架構 (Tri-Mode Architecture)

Luminosity 提供三種運作模式，透過 `SeoEngine` 進行切換：

1.  **Dynamic Mode** (`DynamicStrategy`)
    -   **適用場景**：小型網站 (< 10k 頁面)，內容變動頻繁。
    -   **機制**：每次請求時即時掃描路由並生成 XML。
    -   **優點**：架構簡單，無需快取管理。
2.  **Cached Mode** (`CachedStrategy`)
    -   **適用場景**：中型網站 (10k - 50k 頁面)。
    -   **機制**：基於 `Dynamic`，但在記憶體或 Redis 中快取生成結果。
    -   **併發控制**：使用 Mutex 防止 Cache Stampede（緩存擊穿）。
3.  **Incremental Mode** (`IncrementalStrategy`)
    -   **適用場景**：大型電商/新聞網站 (> 100k 頁面)。
    -   **機制**：
        -   **Write-Ahead Log (WAL)**：URL 變更寫入 Append-only Log。
        -   **LSM-Tree**：背景 `Compactor` 定期合併 Log 並更新靜態 Sitemap 檔案。
    -   **優點**：讀取效能極致 (Static File Serving)，寫入不阻塞。

### 2. 串流生成引擎 (Streaming Generation)

核心生成邏輯位於 `Luminosity` 類別 (`src/Luminosity.ts`)：

-   **Backpressure Handling**：使用 Node.js Stream API，配合 `createWriteStream` 寫入磁碟。
-   **Auto-Sharding**：計數器監控單檔 URL 數量，達到 `maxEntriesPerFile` (預設 50,000) 自動切割檔案。
-   **Stream Gzip**：直接將 XML 串流 Pipe 到 `createGzip()`，再寫入磁碟，CPU 與 I/O 平行處理。

### 3. Metadata 構建器

`SeoMetadata` (`src/meta/SeoMetadata.ts`) 採用 Builder 模式整合多種 SEO 標籤：

-   **Fallback Logic**：若未設定 OG Title，自動使用 Meta Title；若未設定 Twitter Description，自動使用 OG Description。
-   **Modular Builders**：`OpenGraphBuilder`, `TwitterCardBuilder`, `JsonLdBuilder` 獨立負責各規範的生成。

---

## 關鍵設計決策

### 4.1 採用 XML Stream 而非 DOM
**決策**：不建構完整的 XML DOM 樹，而是直接拼接字串串流。
**原因**：
-   **記憶體效率**：百萬級 URL 若轉為 DOM 物件會瞬間耗盡記憶體。
-   **效能**：字串拼接比 DOM 序列化快數倍。

### 4.2 增量更新策略 (LSM-Tree 啟發)
**決策**：在 Incremental Mode 下，不直接修改 XML 檔案。
**原因**：XML 檔案不支援隨機寫入（Random Write）。
**解決方案**：所有變更 (Add/Update/Delete) 視為 Log Entry，由 Compactor 在背景執行 Merge Sort 並重寫 XML。

### 4.3 儲存抽象層
**決策**：定義 `StorageAdapter` 介面。
**原因**：支援 Serverless 環境 (AWS Lambda + S3) 與本地開發 (FileSystem) 的無縫切換。

---

## API 參考

### Luminosity
- `constructor(config: LuminosityConfig)`
- `generateSitemap(options?: GenerateOptions): Promise<void>`
- `addUrl(url: string | SitemapUrl): void`

### SeoEngine
- `setStrategy(strategy: SeoStrategy): void`
- `render(): Promise<string>`

---

## 風險分析與潛在問題

### 5.1 增量模式的 Log 膨脹
-   **問題**：若 `Compactor` 執行失敗或頻率過低， WAL Log 會無限增長。
-   **風險**：導致磁碟空間耗盡，且重啟時重放 Log (Replay) 時間過長。
-   **建議**：實作 Log Rotation 與強制 Compact 閾值。

### 5.2 記憶體內的 Mutex 鎖
-   **問題**：`CachedStrategy` 目前可能使用 Process 內的 Mutex。
-   **風險**：在多實例 (Cluster/PM2) 環境下，Mutex 無法跨 Process 同步，導致重複計算。
-   **建議**：需支援 Distributed Lock (如 Redis Lock)。

### 5.3 檔案系統權限
-   **問題**：Luminosity 預設寫入 `./public`。
-   **風險**：在唯讀容器 (Read-only Container) 下會報錯。
-   **建議**：引導使用者在容器環境下使用 `S3Adapter` 或掛載 Volume。

---

## 效能與擴展性

### 6.1 Gzip 串流壓縮
-   **機制**：使用 Node.js `zlib` 模組進行串流壓縮。
-   **效益**：XML 文本壓縮率極高 (90%+)，大幅減少磁碟 I/O 與網路傳輸時間。

### 6.2 Sitemap Index 自動分頁
-   **機制**：當 URL 超過 50,000 筆或檔案大小超過 50MB，自動建立 `sitemap-index.xml` 並指向分頁檔。
-   **擴展性**：理論上支援無限數量的 URL。

---

## 後續優化建議

1.  **分佈式鎖定機制** (Priority: High)
    -   為 `CachedStrategy` 增加 Redis Lock 支援。

2.  **增強 CLI 工具** (Priority: Medium)
    -   完善 `lux repair` 功能，修復損壞的 Log。
    -   增加 `lux analyze` 分析 Sitemap 覆蓋率。

3.  **主動式提交** (Priority: Low)
    -   整合 Google/Bing API，生成後自動提交 Ping 通知。
