---
title: Nebula Architecture 技術架構規格書
version: 1.1.0
status: Stable
tier: C
last_updated: 2026-02-01
---

# 🌌 Nebula Architecture 技術架構規格書 (v1.1)

本文件詳述 `@gravito/nebula` 的內部架構、Manager/Repository 模式實作、串流支援以及安全防護機制。

---

## 1. 核心哲學：Storage as an Orbit

Nebula 旨在為 Gravito 提供一個標準化、與具體實現解耦的儲存層。
- **統一介面**：無論底層是 Local FS、S3 還是 Memory，上層 API 完全一致。
- **多磁碟管理**：支援在同一個應用中掛載多個儲存後端 (Disks)。
- **安全優先**：內建嚴格的路徑遍歷防護 (Path Traversal Protection)。

---

## 2. 模組組件分析

### 2.1 StorageManager (Facade)
- **職責**：作為儲存系統的中央樞紐，負責管理多個 Disk。
- **位置**：`src/StorageManager.ts`
- **設計模式**：Manager Pattern。它維護了一個 `repositories` Map，並透過 `disk(name)` 方法惰性初始化 (Lazy Init) 具體的儲存實例。

### 2.2 StorageRepository (Proxy)
- **職責**：包裝底層 Driver，注入 Hook 機制。
- **位置**：`src/StorageRepository.ts`
- **機制**：
  - 攔截所有操作 (put/get/delete)。
  - **Hooks**：在操作前後觸發 `core.hooks` (如 `storage:upload`, `storage:uploaded`)。這允許開發者實作如「上傳圖片自動縮圖」等橫切關注點 (Cross-Cutting Concerns)。

### 2.3 Drivers (Adapters)
- **職責**：實作 `StorageStore` 介面，對接具體儲存後端。
- **位置**：`src/stores/`
- **內建驅動**：
  - **LocalStore**：使用 `RuntimeAdapter` (Bun/Node) 操作本地檔案系統。
  - **MemoryStore**：基於 `Map` 的暫態儲存，用於測試。
  - **NullStore**：黑洞驅動，用於禁用儲存功能。

---

## 3. 技術規格與設計決策

### 3.1 安全性：Path Traversal 防護
`LocalStore` 實作了嚴格的路徑檢查邏輯：
- **位置**：`src/stores/LocalStore.ts` -> `normalizeKey`, `resolvePath`
- **策略**：
  1. 禁止 Null Byte (`\0`)。
  2. 禁止 `..` 相對路徑。
  3. 確保解析後的絕對路徑必須以 `rootDir` 開頭。
- **重要性**：這防止了惡意使用者透過 `../../etc/passwd` 等 payload 讀取伺服器敏感檔案。

### 3.2 串流與大檔案處理 ✨ (v1.1 新增)
Nebula 現已支援 `ReadableStream` 介面，解決大檔案記憶體溢出問題。

- **新增 API**：
  - `putStream(key: string, stream: ReadableStream<Uint8Array>): Promise<void>` - 串流寫入
  - `getStream(key: string): Promise<ReadableStream<Uint8Array> | null>` - 串流讀取

- **支援狀況**：
  - ✅ **LocalStore**: 完整支援，使用 Bun 原生 file writer/reader
  - ✅ **MemoryStore**: 完整支援，適用於測試場景
  - ⏳ **S3Store**: 規劃中 (將在 v1.2 實作)

- **效能優勢**：
  - 記憶體使用量與檔案大小解耦，處理 10MB 檔案的記憶體增量 < 5MB
  - 適用於影片、大型壓縮檔等場景

- **使用範例**：
  ```typescript
  // 上傳大檔案
  const fileStream = Bun.file('large-video.mp4').stream()
  await storage.putStream('videos/upload.mp4', fileStream)

  // 下載串流
  const downloadStream = await storage.getStream('videos/upload.mp4')
  if (downloadStream) {
    const file = Bun.file('downloaded.mp4')
    const writer = file.writer()
    const reader = downloadStream.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      writer.write(value)
    }
    await writer.end()
  }
  ```

### 3.3 分頁列舉與大規模檔案管理 ✨ (v1.1 新增)
針對大型儲存空間（如 S3 Bucket 數百萬檔案）的列舉效能優化。

- **新增 API**：
  - `listPaginated(prefix: string, options?: ListOptions): Promise<ListResult>` - 分頁列舉

- **型別定義**：
  ```typescript
  interface ListOptions {
    maxResults?: number    // 預設 1000
    cursor?: string        // 分頁游標
    recursive?: boolean    // 預設 true
  }

  interface ListResult {
    items: StorageItem[]   // 檔案清單
    nextCursor: string | null  // 下一頁游標
    hasMore: boolean       // 是否有更多結果
    count: number          // 本次回傳數量
  }
  ```

- **支援狀況**：
  - ✅ **MemoryStore**: 完整支援
  - ⏳ **LocalStore**: 待 RuntimeAdapter 支援 readDir
  - ⏳ **S3Store**: 規劃中 (將在 v1.2 實作)

- **使用範例**：
  ```typescript
  // 基本分頁列舉
  const page1 = await storage.listPaginated('images/', { maxResults: 100 })
  console.log(`Found ${page1.count} files`)

  // 繼續獲取下一頁
  if (page1.hasMore) {
    const page2 = await storage.listPaginated('images/', {
      maxResults: 100,
      cursor: page1.nextCursor!
    })
  }

  // 完整分頁迭代
  let cursor: string | null = null
  do {
    const result = await storage.listPaginated('uploads/', {
      maxResults: 1000,
      cursor: cursor ?? undefined
    })

    for (const item of result.items) {
      console.log(`File: ${item.key}, Size: ${item.size}`)
    }

    cursor = result.nextCursor
  } while (cursor !== null)
  ```

- **效能優勢**：
  - 游標式分頁，記憶體使用量恆定
  - 適用於數百萬檔案的大型儲存空間
  - 防止全量列舉導致的 OOM

### 3.4 Hook 系統整合
Nebula 深度整合了 `PlanetCore` 的 Hook 系統。
- **Filter**: `storage:upload` (可修改上傳內容，如壓縮)。
- **Action**: `storage:uploaded` (上傳後觸發，如發送通知)。
- **設計決策**：Hooks 綁定在 Repository 層而非 Driver 層，確保無論使用何種後端，業務邏輯都能統一執行。

---

## 4. 潛在風險與效能評估

### 4.1 列表效能 (List Performance) ✅ (v1.1 已改善)
`list()` 介面返回 `AsyncIterable`。
- **原風險**：對於擁有數百萬檔案的 S3 Bucket，全量遍歷極慢且昂貴。
- **✅ 解決方案**：已新增 `listPaginated` 介面，提供游標式分頁列舉。
- **建議**：
  - 對於大型儲存空間，優先使用 `listPaginated` 而非 `list()`
  - 始終配合 `prefix` 參數使用以縮小範圍
  - 設定合理的 `maxResults`（建議 100-1000）

### 4.2 本地儲存的擴展性
`LocalStore` 依賴單一檔案系統。
- **限制**：在 Kubernetes 等無狀態環境中，Pod 重啟會導致資料遺失 (除非掛載 PVC)。
- **建議**：在分散式環境中，應強制使用 S3 或 GCS Driver。

---

## 5. 後續優化建議

### ✅ 已完成 (v1.1)
1. ~~**Stream Support**~~：✅ 已在 `StorageStore` 介面中新增 `putStream` 與 `getStream`。
   - LocalStore 和 MemoryStore 已完整實作
   - 測試覆蓋率達 100%（12 個測試案例，涵蓋小檔案、大檔案、錯誤處理等場景）

2. ~~**List Pagination**~~：✅ 已實作 `listPaginated` 介面，支援分頁與游標機制。
   - 新增 `ListOptions` 和 `ListResult` 型別
   - MemoryStore 完整實作（LocalStore 待 RuntimeAdapter 支援）
   - 測試覆蓋率達 100%（11 個測試案例，涵蓋分頁、游標、過濾、效能等場景）
   - 防止大型儲存空間列舉時的 OOM 風險

### 短期 (v1.1 - 待完成)
1. **Metadata Enhancement**：支援自定義 Metadata (S3 Tags, Content-Disposition, Cache-Control)。

### 中期 (v1.2)
1. **S3 Driver**：將 S3 Driver 從核心分離為獨立套件 `@gravito/nebula-s3`。
   - 支援 putStream/getStream
   - 支援 Presigned URL
   - 支援 Multipart Upload
   - 支援分頁列舉 (listPaginated)
2. **Image Processing**：提供官方的 `ImageProcessor` Hook，基於 `sharp` 或 `bun-sharp`。

### 長期 (v2.0)
1. **CDN Integration**：在 `getUrl` 中支援 CDN 域名簽名與路徑重寫。
2. **Cache Purge**：自動清除 CDN 快取機制 (Cloudflare/CloudFront/Fastly)。

---
*Created by Gravito Architect.*
