---
title: Forge Architecture 技術架構規格書
version: 1.1.0
status: Stable
tier: C
last_updated: 2026-02-02
---

# 🌌 Forge Architecture 技術架構規格書 (v1.0)

本文件詳述 `@gravito/forge` 的內部架構、Fluent Pipeline API 設計以及即時進度追蹤機制。

---

## 1. 核心哲學：Media Processing Orbit

Forge 旨在為 Gravito 提供高效能的媒體處理能力，支援影片轉碼、圖片處理與即時進度反饋。
- **Fluent Pipeline**：類似 Query Builder 的鏈式調用 API (`resize().format().save()`)，簡化複雜的轉碼參數。
- **Real-time Feedback**：內建 SSE (Server-Sent Events) 支援，讓前端能即時顯示「處理中 45%」的進度條，無需輪詢。
- **Dual Mode**：支援同步 (Synchronous) 處理小檔案，以及非同步 (Asynchronous) 背景處理大檔案。

---

## 2. 模組組件分析

### 2.1 ForgeService (Facade)
- **職責**：統一入口，協調處理器 (Processors)、儲存 (Storage) 與狀態 (Status)。
- **位置**：`src/ForgeService.ts`
- **機制**：
  - `process()`: 用於同步處理。
  - `processAsync()`: 用於異步處理，生成 Job ID 並初始化狀態，實際執行交由 `ProcessFileJob`。
  - **MIME Detection**：自動偵測檔案類型並選擇合適的 Processor。

### 2.2 Pipelines (Fluent API)
- **職責**：構建處理指令鏈。
- **位置**：`src/pipelines/`
- **實作**：
  - `VideoPipeline`: 提供 `resize`, `rotate`, `transcode`, `fps` 等方法。
  - `ImagePipeline`: 提供 `resize`, `crop`, `format`, `quality` 等方法。
  - **Lazy Execution**：Pipeline 僅記錄操作，直到呼叫 `execute()` 才真正執行。

### 2.3 Processors & Adapters (Engine)
- **職責**：執行底層命令 (FFmpeg/ImageMagick)。
- **位置**：`src/processors/` 與 `src/adapters/`
- **實作**：
  - `VideoProcessor` -> `FFmpegAdapter`: 封裝 `ffmpeg` CLI。
  - `ImageProcessor` -> `ImageMagickAdapter`: 封裝 `magick` CLI。
  - **Progress Parsing**: Adapter 負責解析 CLI 的 stderr 輸出 (如 `time=00:00:05.00`) 並轉換為百分比。

### 2.4 Status Tracking (SSE)
- **職責**：管理任務狀態與即時推送。
- **位置**：`src/status/`
- **組件**：
  - `StatusStore`: 儲存 Job 狀態 (Memory/Redis)。
  - `SSEHandler`: 處理 SSE 連線，當狀態變更時推送事件。
  - `ProcessingStatusManager`: 狀態工廠，生成標準化的 Status 物件。

---

## 3. 技術規格與設計決策

### 3.1 異步處理架構
對於影片轉碼等耗時任務，Forge 採用「Job + SSE」模式。
1. **Frontend**: 上傳檔案 -> 獲得 `jobId` -> 訂閱 SSE `/forge/status/:jobId/stream`。
2. **Backend**:
   - `ForgeService.processAsync` 建立初始狀態。
   - `ProcessFileJob` 被推送到 Queue (Stream)。
   - Worker 取出 Job，開始處理。
   - Worker 透過 `onProgress` callback 定期更新 `StatusStore`。
3. **SSE**: `SSEHandler` 監聽 `StatusStore` 的變更 (或輪詢)，將新狀態推送到前端。

### 3.2 串流與暫存 (Streaming & Temp Files)
FFmpeg 與 ImageMagick 通常需要檔案路徑而非 Buffer。
- **流程**：
  1. 將輸入 `Blob` 寫入臨時目錄 (`tempDir`)。
  2. 執行 CLI 命令，輸出到臨時檔。
  3. 處理完成後，將輸出檔上傳至 `StorageProvider` (Nebula)。
  4. 清理臨時檔。
- **優化**：未來可探索 FFmpeg 的 `pipe:` 協議以支援純串流處理，減少磁碟 I/O。

### 3.3 轉碼進度計算
FFmpeg 的進度輸出是「當前時間」，而非百分比。
- **演算法**：
  1. 解析 `Duration: HH:MM:SS` 獲取總時長。
  2. 解析 `time=HH:MM:SS` 獲取當前進度。
  3. `Progress = (Current / Total) * 100`。

---

## 4. 潛在風險與效能評估

### 4.1 磁碟空間耗盡
並發處理大量影片時，臨時目錄可能迅速佔滿磁碟。
- [ ] **防護**：應實作 `DiskSpaceGuard`，在空間不足時拒絕新任務。
- [x] **清理**：確保 `finally` 區塊中總是執行 `deleteFile`，防止殭屍檔案。(Implemented in v1.1)

### 4.2 CPU 資源競爭
轉碼是 CPU 密集型任務。
- [ ] **風險**：若不限制並發度，可能導致伺服器卡死。
- [ ] **建議**：在 `@gravito/stream` 中為 Forge 任務配置獨立的 Queue 與 Concurrency Limit (如 `concurrency: 2`)。

---

## 5. 後續優化建議

### 短期 (v1.1)
- [x] **Metadata Extraction**：新增 `getMetadata()` API，獲取影片時長、解析度、編碼等資訊。(Done)
- [ ] **Watermarking**：在 Pipeline 中支援浮水印 (Overlay) 功能。

### 中期 (v1.2)
- [ ] **GPU Acceleration**：支援 FFmpeg 的 NVENC/VAAPI 硬體加速參數。
- [ ] **HLS/DASH**：支援生成串流媒體切片 (m3u8)。

### 長期 (v2.0)
- [ ] **WASM Mode**：探索 `ffmpeg.wasm`，在不依賴系統二進制的情況下運行 (適用於 Serverless 環境)。

---
*Created by Gravito Architect.*
