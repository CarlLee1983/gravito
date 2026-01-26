# Quasar 優化改進計劃

> 版本：v1.0.0
> 最後更新：2025-01-26
> 狀態：已發佈 (v1.0.0 Stable)

## 概述

Quasar 是 Gravito 生態系統中的通用監控代理，負責：
- 系統指標收集（CPU、記憶體、程序資訊）
- 佇列統計監控（Probes）
- 即時任務執行追蹤（Bridges）
- 遠端控制命令執行

本文件概述 Quasar 的優化改進路線圖，分為四個階段進行。

## 架構現況

```
┌─────────────────────────────────────────────────────────────┐
│                      QuasarAgent                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Probes    │  │   Bridges   │  │  CommandListener    │  │
│  │  (統計監控)  │  │ (即時追蹤)  │  │    (遠端控制)        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│         │                │                    │              │
│         ▼                ▼                    ▼              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  Transport (Redis)                    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 目前支援

| 類別 | 支援項目 |
|------|----------|
| **Probes** | BullMQ, Bull, Bee-Queue, Laravel, Redis List, RabbitMQ, SQS, Kafka |
| **Bridges** | BullMQ, Bull, Bee-Queue, Agenda, Generic (EventEmitter) |
| **Executors** | RetryJob, DeleteJob, PauseQueue, ResumeQueue, CleanQueue, PrioritizeJob |
| **系統探測** | Node.js, Bun, Deno |

## 階段規劃

### Phase 1：程式碼品質與結構優化
- 狀態：✅ 已完成
- 預期目標：提升程式碼可維護性與一致性
- 詳細內容：[Phase 1 詳細計劃](./improvement-plans/phase-1-code-quality.md)

### Phase 2：功能擴展
- 狀態：✅ 已完成
- 預期目標：新增更多佇列系統支援與功能
- 詳細內容：[Phase 2 詳細計劃](./improvement-plans/phase-2-feature-expansion.md)

### Phase 3：效能與監控改進
- 狀態：✅ 已完成
- 預期目標：優化效能並增強監控能力
- 詳細內容：[Phase 3 詳細計劃](./improvement-plans/phase-3-performance.md)

### Phase 4：測試與文件完善
- 狀態：✅ 已完成
- 預期目標：提升測試覆蓋率與文件品質
- 詳細內容：[Phase 4 詳細計劃](./improvement-plans/phase-4-testing.md)

## 未來演進：Phase 5 (Next Generation)

### 5.1 OpenTelemetry Tracing 深度整合
- **目標**：提供分散式追蹤能力，串聯從生產者到消費者的完整路徑。
- **改進項目**：
  - [ ] 實作 `QuasarTracingInstrumentation` 自動注入 Trace Context。
  - [ ] 支援將 Bridge 事件轉換為 OTel Spans。
  - [ ] 支援導出至 OTLP 相容後端 (Jaeger, Honeycomb, Tempo)。
  - [ ] 佇列延遲與處理時間的 Trace 視覺化整合。

### 5.2 外掛系統與生態擴展
- **目標**：允許使用者無需修改核心即可擴展 Quasar。
- **改進項目**：
  - [ ] 實作動態載入的外掛載入器。
  - [ ] 提供 `QuasarPlugin` SDK。
  - [ ] 支援社群驅動的 Probe/Bridge 貢獻。

### 5.3 開放 API 與整合鉤子 (Open API & Hooks)
- **目標**：與其內建封閉的 UI，不如開放標準介面讓開發者自由整合至自有的監控面板。
- **改進項目**：
  - [ ] **RESTful Metrics API**：在 HealthServer 基礎上擴充，提供 JSON 格式的即時指標接口。
  - [ ] **WebSocket Stream API**：開放原始事件流，允許前端或第三方服務直接訂閱任務日誌。
  - [ ] **Webhook Notifications**：支援任務失敗或佇列積壓時，由 Agent 直接觸發外部 Webhook。
  - [ ] **Plug-and-Play Middleware**：提供中間件支援，讓開發者能在指標送出前進行攔截或二次加工。

### 5.4 極限效能優化 (Extreme Performance)
- **目標**：在高吞吐量的任務環境中，儘可能降低序列化開銷與網路頻寬佔用。
- **改進項目**：
  - [ ] **二進位序列化協定 (Binary Protocol)**：
    - [x] **MessagePack** 支援 (已完成核心實作)。
    - [ ] **CBOR (Concise Binary Object Representation)** 整合：提供比 JSON 更緊湊且解析更快的格式。
    - [ ] **Protobuf (Protocol Buffers)** 選項：針對固定結構指標提供最極致的體積壓縮。
  - [ ] **智慧壓縮 (Smart Compression)**：
    - [ ] 針對大型 Payload (如巨大的錯誤堆疊) 自動啟用 **Zstd** 或 **Brotli** 壓縮。
    - [ ] 實作動態閾值：僅在節省的頻寬大於 CPU 壓縮成本時啟用。
  - [ ] **Zero-allocation Logging**：優化內部日誌快取區，減少高併發下的 GC 壓力。

## 改進重點摘要

### 高優先級
1. **TypeScript 嚴格模式** - 啟用 strict mode 提升型別安全
2. **錯誤處理標準化** - 統一錯誤處理機制
3. **連線管理優化** - Redis 連線池與重連機制
4. **測試覆蓋率** - 目標達到 80% 以上

### 中優先級
1. **新增 Bridge 支援** - Bull v3/v4、Agenda
2. **指標聚合功能** - 支援自訂聚合與告警
3. **批次日誌發送** - 減少 Redis 操作頻率
4. **健康檢查端點** - 提供 HTTP 健康檢查

### 低優先級
1. **外掛系統** - 支援自訂 Probe/Bridge 載入
2. **Web UI 整合** - 內建簡易監控介面
3. **OpenTelemetry 支援** - 整合開放遙測標準

## 相容性考量

- 維持對 Node.js >= 18、Bun >= 1.0 的支援
- 維持 BullMQ >= 5.0、Bee-Queue >= 1.0 的相容性
- API 變更需遵循語義化版本控制

## 參考資源

- [Quasar README](../README.md)
- [Zenith 文件](../../zenith/README.md)
- [Gravito 架構概述](../../../docs/architecture.md)
