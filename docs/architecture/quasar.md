---
title: Quasar Architecture 技術架構規格書
version: 1.0.0
status: Stable
tier: C
last_updated: 2026-01-29
---

# 🌌 Quasar Architecture 技術架構規格書 (v1.0)

本文件詳述 `@gravito/quasar` 的內部架構、Sidecar 模式實作以及與 Zenith 的通訊協議。

---

## 1. 核心哲學：Universal Telemetry Agent

Quasar 是 Gravito Galaxy Architecture 中的「觀測者」模組。它的設計理念是：
- **Sidecar Pattern**：作為獨立的 Agent 運行，對主應用邏輯零侵入 (Zero Intrusion)。
- **Polyglot Queue Support**：原生支援 BullMQ, Bee-Queue, Laravel Horizon 等多種隊列系統。
- **Real-Time Control**：不僅是「讀取」狀態，還能「控制」隊列 (Retry, Pause, Resume)。

---

## 2. 模組組件分析

### 2.1 QuasarAgent (Core)
- **職責**：Agent 的生命週期管理器。
- **位置**：`src/QuasarAgent.ts`
- **關鍵組件**：
  - `transportManager`: 負責將數據推送至 Zenith (Redis)。
  - `monitorManager`: 負責監控本地隊列狀態 (Redis)。
  - `heartbeat`: 自適應心跳機制，定期回報 Agent 存活狀態與系統指標。
  - `bridges`: 攔截並轉發 Job 事件的適配器。

### 2.2 Probes (Pull Model)
- **職責**：定期「拉取」系統狀態與隊列統計資訊。
- **位置**：`src/probes/`
- **機制**：
  - `NodeProbe`: 讀取 CPU/Memory/EventLoop 指標。
  - `QueueProbe` (Interface): 定義了獲取隊列長度、延遲作業數的標準介面。
  - `BullMQProbe`: 針對 BullMQ 的具體實作。

### 2.3 Bridges (Push Model)
- **職責**：實時「推送」Job 執行日誌。
- **位置**：`src/bridges/`
- **機制**：
  - 通過 Hook 或 Event Listener 綁定到 Worker 實例。
  - 當 Job 狀態變更 (Start, Complete, Fail) 時，生成結構化日誌。
  - **Batching**：使用 `RedisBatcher` 將多條日誌合併為一次 Redis `RPUSH`，大幅降低網路開銷。

### 2.4 CommandListener (Remote Control)
- **職責**：接收並執行來自 Zenith 的控制指令。
- **位置**：`src/CommandListener.ts`
- **協議**：
  - 訂閱 Redis Pub/Sub 頻道：`gravito:quasar:cmd:{service}:{nodeId}`。
  - 驗證 HMAC 簽名 (若設定了 Secret)。
  - 分發給對應的 `Executor` (如 `RetryJobExecutor`)。

---

## 3. 技術規格與設計決策

### 3.1 雙 Redis 連接策略
Quasar 允許 `transport` (通訊) 與 `monitor` (監控) 使用不同的 Redis 連接。
- **場景**：應用程式使用 Cluster A 處理隊列，但監控數據需寫入獨立的 Cluster B 以避免污染業務數據。
- **實作**：`QuasarAgent` 維護兩個獨立的 `RedisConnectionManager`。

### 3.2 自適應心跳 (Adaptive Heartbeat)
為了避免在系統高負載時加劇 Redis 壓力，`heartbeat` 會根據 CPU 使用率動態調整頻率。
- **演算法**：
  - CPU < 40%: 縮短間隔 (高頻更新)。
  - CPU > 80%: 延長間隔 (低頻更新)。
  - 引入 Jitter 防止多個 Agent 同時發送心跳 (Thundering Herd)。

### 3.3 安全性設計
- **HMAC 簽名**：所有控制指令 (Retry, Delete) 必須攜帶簽名，防止未經授權的操作。
- **Command Whitelist**：僅允許執行預定義的指令，杜絕 RCE (Remote Code Execution) 風險。

---

## 4. 潛在風險與效能評估

### 4.1 Redis 頻寬消耗
在高並發 Job 場景下，即時日誌推送可能佔用大量 Redis 頻寬。
- **優化**：
  - `LogSampler`: 在高負載時自動降級，僅採樣部分日誌。
  - `Compression`: 支援 msgpack/protobuf 序列化與 Gzip 壓縮。

### 4.2 Event Loop 阻塞
`NodeProbe` 在獲取指標時若執行同步重計算，可能阻塞主線程。
- **解決**：使用 `CachedNodeProbe`，將指標快取一段時間，並在背景非同步更新。

---

## 5. 後續優化建議

### 短期 (v1.1)
1. **OpenTelemetry Exporter**：支援將指標直接導出到 Prometheus/Grafana，而不僅是 Zenith。
2. **Auto Discovery**：自動掃描並註冊 BullMQ 隊列，無需手動呼叫 `monitorQueue`。

### 中期 (v1.2)
1. **Sidecar Mode**：提供獨立的 Binary/Docker Image，作為獨立進程運行，完全不影響主 Node.js 應用的效能。

### 長期 (v2.0)
1. **eBPF Integration**：利用 eBPF 技術進行更深層次的系統與網路監控 (僅限 Linux 環境)。

---
*Created by Gravito Architect.*
