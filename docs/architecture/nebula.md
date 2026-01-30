---
title: Nebula Architecture 技術架構規格書
version: 1.0.0
status: Stable
tier: C
last_updated: 2026-01-29
---

# 🌌 Nebula Architecture 技術架構規格書 (v1.0)

本文件詳述 `@gravito/nebula` 的內部架構、Manager/Repository 模式實作以及安全防護機制。

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

### 3.2 串流與大檔案處理
目前的介面設計主要基於 `Blob`。
- **現狀**：`put(key, Blob | string)`。
- **限制**：對於 GB 級別的大檔案，全量讀入記憶體 (Blob) 可能導致 OOM。
- **規劃**：未來版本需引入 `ReadableStream` 支援，實現真正的串流傳輸 (S3 Multipart Upload 等)。

### 3.3 Hook 系統整合
Nebula 深度整合了 `PlanetCore` 的 Hook 系統。
- **Filter**: `storage:upload` (可修改上傳內容，如壓縮)。
- **Action**: `storage:uploaded` (上傳後觸發，如發送通知)。
- **設計決策**：Hooks 綁定在 Repository 層而非 Driver 層，確保無論使用何種後端，業務邏輯都能統一執行。

---

## 4. 潛在風險與效能評估

### 4.1 列表效能 (List Performance)
`list()` 介面返回 `AsyncIterable`。
- **風險**：對於擁有數百萬檔案的 S3 Bucket，全量遍歷極慢且昂貴。
- **建議**：應盡量避免在生產環境對大型 Bucket 呼叫無參數的 `list()`。應配合 `prefix` 使用。

### 4.2 本地儲存的擴展性
`LocalStore` 依賴單一檔案系統。
- **限制**：在 Kubernetes 等無狀態環境中，Pod 重啟會導致資料遺失 (除非掛載 PVC)。
- **建議**：在分散式環境中，應強制使用 S3 或 GCS Driver。

---

## 5. 後續優化建議

### 短期 (v1.1)
1. **Stream Support**：在 `StorageStore` 介面中新增 `putStream` 與 `getStream`。
2. **Metadata Enhancement**：支援自定義 Metadata (S3 Tags, Content-Disposition)。

### 中期 (v1.2)
1. **S3 Driver**：將 S3 Driver 從核心分離為獨立套件 `@gravito/nebula-s3`，減少核心依賴體積。
2. **Image Processing**：提供官方的 `ImageProcessor` Hook，基於 `sharp` 或 `bun-sharp`。

### 長期 (v2.0)
1. **CDN Integration**：在 `getUrl` 中支援 CDN 域名簽名與路徑重寫。

---
*Created by Gravito Architect.*
