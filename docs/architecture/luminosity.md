# Luminosity SEO Engine 架構技術規格書

## 1. 模組概覽

**Luminosity** (`@gravito/luminosity`) 是 Gravito 框架中的智能 SEO 引擎，負責網站地圖 (Sitemap) 生成、Robots.txt 管理與 Meta Tag 優化。其設計核心是 **"Tri-Mode Architecture"**，旨在同時滿足小型動態網站與百萬級頁面的超大型網站需求。

### 核心職責
- **High-Performance Sitemaps**：基於串流 (Streaming) 的 XML 生成，支援 Gzip 壓縮與自動分頁。
- **SEO Orchestration**：`SeoEngine` 協調路由掃描、策略選擇與內容渲染。
- **Incremental Engine**：針對大型網站的增量更新機制 (LSM-Tree concept)。
- **Cloud Native**：統一的 `StorageAdapter` 介面，支援本地與 S3 存儲。

---

## 2. 技術規格與架構設計

### 2.1 三模態架構 (Tri-Mode Architecture)

Luminosity 提供三種運作模式，透過 `SeoEngine` (`src/engine/SeoEngine.ts`) 進行切換：

1.  **Dynamic Mode** (`DynamicStrategy`)
    -   **適用場景**：小型網站 (< 10k 頁面)，內容變動頻繁。
    -   **機制**：每次請求時即時掃描路由並生成 XML。
    -   **優點**：架構簡單，無需快取管理。
    -   **缺點**：高流量下可能影響伺服器效能。

2.  **Cached Mode** (`CachedStrategy`)
    -   **適用場景**：中型網站 (10k - 50k 頁面)。
    -   **機制**：基於 `Dynamic`，但在記憶體或 Redis 中快取生成結果。
    -   **併發控制**：使用 Mutex 防止 Cache Stampede（緩存擊穿）。

3.  **Incremental Mode** (`IncrementalStrategy`)
    -   **適用場景**：大型電商/新聞網站 (> 100k 頁面)。
    -   **機制**：
        -   **Write-Ahead Log (WAL)**：URL 變更寫入 Append-only Log (`JsonlLogger`)。
        -   **LSM-Tree**：背景 `Compactor` 定期合併 Log 並更新靜態 Sitemap 檔案。
    -   **優點**：讀取效能極致 (Static File Serving)，寫入不阻塞。

### 2.2 串流生成引擎 (Streaming Generation)

核心生成邏輯位於 `Luminosity` 類別 (`src/Luminosity.ts`)：

-   **Backpressure Handling**：使用 `createWriteStream` 與 `write()` 配合，當緩衝區滿時暫停寫入，防止 OOM。
-   **Auto-Sharding**：計數器 `count` 監控單檔 URL 數量，達到 `maxEntriesPerFile` (預設 50,000) 自動切割檔案 (`sitemap-1.xml`, `sitemap-2.xml`)。
-   **Stream Gzip**：直接將 XML 串流 Pipe 到 `createGzip()`，再寫入磁碟，CPU 與 I/O 平行處理。

```typescript
// 串流處理示意圖
iterator -> XmlStreamBuilder -> Gzip -> FileSystem
```

### 2.3 儲存抽象層

`StorageAdapter` (`src/storage/adapter.ts`) 定義了統一介面：
-   `put(key, content)`
-   `get(key)`
-   `exists(key)`
-   `delete(key)`

這使得 Luminosity 可以無縫切換 `FileSystemAdapter` 或 `S3Adapter`，實現 Serverless 友善。

---

## 3. 關鍵設計決策

### 3.1 採用 XML Stream 而非 DOM/Object
**決策**：不建構完整的 XML DOM 樹，而是直接拼接字串串流。
**原因**：
-   **記憶體效率**：百萬級 URL 若轉為 DOM 物件會瞬間耗盡記憶體。
-   **效能**：字串拼接比 DOM 序列化快數倍。

### 3.2 增量更新策略 (LSM-Tree 啟發)
**決策**：在 Incremental Mode 下，不直接修改 XML 檔案。
**原因**：
-   XML 檔案不支援隨機寫入（Random Write）。
-   解析巨型 XML 並修改的成本太高。
-   **解決方案**：所有變更 (Add/Update/Delete) 視為 Log Entry，由 Compactor 在背景執行 Merge Sort 並重寫 XML。

### 3.3 路由掃描適配器 (Scanner Adapters)
**決策**：定義 `RouteScanner` 介面，針對不同框架實作 Adapter。
**原因**：
-   Gravito 雖然有自己的 Router，但 Luminosity 定位為通用工具。
-   支援 Next.js, Nuxt 等框架的檔案系統路由 (File-system Routing) 解析。

---

## 4. 風險分析與潛在問題

### 4.1 增量模式的 Log 膨脹
-   **問題**：若 `Compactor` 執行失敗或頻率過低，WAL Log 會無限增長。
-   **風險**：導致磁碟空間耗盡，且重啟時重放 Log (Replay) 時間過長。
-   **建議**：實作 Log Rotation 與強制 Compact 閾值。

### 4.2 記憶體內的 Mutex 鎖
-   **問題**：`CachedStrategy` 目前可能使用 Process 內的 Mutex。
-   **風險**：在多實例 (Cluster/PM2) 或 Serverless 環境下，Mutex 無法跨 Process 同步，導致重複計算。
-   **建議**：需支援 Distributed Lock (如 Redis Lock)。

### 4.3 檔案系統權限
-   **問題**：Luminosity 預設寫入 `./public`。
-   **風險**：在唯讀容器 (Read-only Container) 或權限受限環境下會報錯。
-   **建議**：引導使用者在容器環境下使用 `S3Adapter` 或掛載 Volume。

---

## 5. 效能與擴展性

### 5.1 Gzip 串流壓縮
-   **機制**：Node.js `zlib.createGzip()`。
-   **效益**：XML 文本壓縮率極高 (90%+)，大幅減少磁碟 I/O 與網路傳輸時間。

### 5.2 Sitemap Index 自動分頁
-   **機制**：當 URL 超過 50,000 筆或檔案大小超過 50MB (Google 規範)，自動建立 `sitemap-index.xml` 並指向分頁檔。
-   **擴展性**：理論上支援無限數量的 URL，僅受限於儲存空間。

---

## 6. 後續優化建議

1.  **分佈式鎖定機制** (Priority: High)
    -   為 `CachedStrategy` 增加 Redis Lock 支援，確保多實例環境下的快取一致性。

2.  **增強 CLI 工具** (Priority: Medium)
    -   完善 `lux repair` 功能，增加對損壞 Log 的自動修復與略過能力。
    -   增加 `lux analyze` 分析 Sitemap 結構與覆蓋率。

3.  **主動式提交 (Active Submission)** (Priority: Low)
    -   整合 Google Search Console API 與 Bing Webmaster Tools API，生成後自動提交 Ping。

4.  **圖片與影片 Sitemap 擴展** (Priority: Medium)
    -   目前基礎架構已支援，但可增加更多針對 Video Object 的 metadata 欄位支援 (如 duration, rating)。
