# Gravito 框架改善實施清單

**建立日期**: 2026-02-03
**優化方式**: 按依賴關係與優先級重新排序
**進度**: 15/55 完成（27%）

---

## 🔴 Phase 0: 立即修復（本週完成）

這些任務阻塞其他工作進行，**必須優先完成**。

### Issue 1.2 Phase 1: DLQ 與重試機制
- [ ] 1.2.1.1 創建 `event_dlq` 資料表（schema + 遷移腳本）
  - 相關文件: `packages/atlas/migrations/create_event_dlq_table.ts`
  - 阻塞: 1.2.1.4, 1.2.1.5
  - 工作量: 小 (30 min)

- [x] 1.2.1.2 RetryPolicy 邏輯實現（已完成）
- [x] 1.2.1.3 DeadLetterQueueManager (In-Memory)（已完成）

- [ ] 1.2.1.4 添加 DLQ CLI 工具（list/requeue）
  - 命令: `gravito event:dlq:list`, `gravito event:dlq:requeue`
  - 依賴: 1.2.1.1
  - 工作量: 中 (2-3 hours)

- [ ] 1.2.1.5 編寫 DLQ 整合測試
  - 測試場景: DLQ 持久化、重新入隊、批量重試
  - 依賴: 1.2.1.1
  - 工作量: 中 (2-3 hours)

### Issue 1.1 Phase 2: 可觀測性整合（OpenTelemetry）
- [x] 1.1.2.1 集成 OpenTelemetry SDK（已完成 2026-02-03）
  - 安裝包: `@opentelemetry/api`, `@opentelemetry/sdk-node` 等
  - 相關文件: `packages/core/src/instrumentation/opentelemetry.ts`
  - 測試文件: `packages/core/tests/instrumentation/opentelemetry.test.ts`
  - 測試覆蓋率: 86.20%（34 測試用例）

- [x] 1.1.2.2 實現事件追蹤（Tracing）（已完成 2026-02-03）
  - 在 HookManager 和 EventPriorityQueue 中添加 span 記錄
  - 追蹤指標: event.name, event.priority, listener.count, dispatch_mode
  - 相關文件:
    - `packages/core/src/events/observability/EventTracing.ts`
    - `packages/core/src/events/observability/ObservableHookManager.ts`
    - `packages/core/src/events/EventPriorityQueue.ts`
  - 測試文件: `packages/core/tests/events/observability/tracing-integration.test.ts`
  - 測試覆蓋: 27 測試用例（dispatch span、listener span、同步/異步追蹤、錯誤記錄）

- [ ] 1.1.2.3 實現 Prometheus 指標導出
  - 指標: `gravito_event_dispatch_duration_seconds`, `gravito_event_queue_depth`, `gravito_event_listener_duration_seconds`
  - 依賴: 1.1.2.1
  - 工作量: 中 (2-3 hours)

### Issue 1.1 Phase 3: 向後兼容性（自動檢測）
- [ ] 1.1.3.2 實現自動檢測機制（sync vs async）
  - 在 HookManager.doAction 中檢測監聽器類型
  - 根據配置自動選擇同步或異步執行
  - 工作量: 小 (1-2 hours)
  - 阻塞: 1.1.3.1, 1.1.3.3

---

## 🟠 Phase 1: 核心功能完善（1-2 週）

**前置條件**: Phase 0 全部完成

### Issue 1.1 Phase 2: 可觀測性（續）
- [ ] 1.1.2.4 創建 Grafana 監控面板模板
  - 面板: Event Dispatch Latency, Queue Depth, Throughput
  - 格式: JSON 或 terraform 配置
  - 依賴: 1.1.2.3
  - 工作量: 小 (1-2 hours)

- [ ] 1.1.2.5 添加 Prometheus 告警規則
  - 告警: HighEventDispatchLatency (P99 > 800ms), EventQueueDepthHigh (> 1000)
  - 依賴: 1.1.2.3
  - 工作量: 小 (1 hour)

### Issue 1.1 Phase 3: 向後兼容性（續）
- [ ] 1.1.3.1 編寫兼容性測試套件
  - 測試場景: 純同步、混合、純異步監聽器
  - 依賴: 1.1.3.2
  - 工作量: 中 (2-3 hours)

- [ ] 1.1.3.3 添加遷移警告日誌
  - 當檢測到同步監聽器時輸出警告
  - 依賴: 1.1.3.2
  - 工作量: 小 (30 min)

- [ ] 1.1.3.4 編寫遷移指南文檔
  - 文檔路徑: `docs/guides/event-system-migration.md`
  - 內容: 遷移步驟、最佳實踐、故障排除
  - 工作量: 中 (2-3 hours)

- [ ] 1.1.3.5 在示例項目中驗證（flash-sale-fullstack）
  - 確保所有事件都能正確異步化
  - 運行性能測試驗證提升
  - 依賴: 1.1.3.1, 1.1.3.4
  - 工作量: 中 (2-3 hours)

### Issue 1.2 Phase 2: Circuit Breaker（續）
- [ ] 1.2.2.3 添加 Circuit Breaker 狀態監控 CLI
  - 命令: `gravito circuit:status`
  - 顯示: 狀態(OPEN/CLOSED/HALF_OPEN), 失敗計數, 下次重置時間
  - 工作量: 小 (1-2 hours)

- [ ] 1.2.2.5 混沌測試（Chaos Engineering）
  - 測試隨機失敗下的系統穩定性
  - 驗證 Circuit Breaker 開啟邏輯
  - 工作量: 中 (2-3 hours)

### Issue 1.2 Phase 3: Backpressure（續）
- [ ] 1.2.3.2 添加記憶體監控（process.memoryUsage()）
  - 檢測隊列記憶體使用量
  - 超過 memoryLimit 時觸發背壓
  - 工作量: 小 (1 hour)

- [ ] 1.2.3.4 HTTP 層面的 429 響應
  - 在 Photon（HTTP 引擎）中添加背壓 middleware
  - 隊列利用率 > 90% 時返回 429 + Retry-After
  - 工作量: 小 (1-2 hours)

- [ ] 1.2.3.5 負載測試（10000 events/s）
  - 驗證系統吞吐量與穩定性
  - 使用 k6 或 autocannon 進行測試
  - 工作量: 中 (2-3 hours)

### Issue 1.2 Phase 4: Bull Queue 整合（續）
- [ ] 1.2.4.3 支持多 Worker 部署
  - 配置: 多個 Worker 進程並發處理
  - 驗證: 分佈式執行與負載均衡
  - 工作量: 中 (2-3 hours)

- [ ] 1.2.4.4 集成 Bull Board UI
  - 安裝 `@bull-board/express`
  - 配置監控面板視圖
  - 工作量: 小 (1-2 hours)

- [ ] 1.2.4.5 遷移指南文檔
  - 文檔: 如何將現有事件遷移至 Bull Queue 後端
  - 包含: 配置示例、故障排除
  - 工作量: 中 (2-3 hours)

---

## 🟡 Phase 2: 分佈式增強（3-4 週）

**前置條件**: Phase 1 全部完成

### Issue 1.3: 數據庫連接池管理
- [ ] 1.3.1 曝露連接池監控指標（Prometheus）
  - 指標: `db.connections.active`, `db.connections.idle`, `db.connections.waiting`
  - 依賴: 1.1.2.3 (Prometheus 基礎已完成)
  - 工作量: 小 (1-2 hours)

- [ ] 1.3.2 實現自適應連接池管理
  - 根據負載自動調整池大小
  - 目標利用率: 70%，調整間隔: 60s
  - 工作量: 中 (2-3 hours)

- [ ] 1.3.3 集成 Grafana 監控面板
  - 面板: 連接池狀態、查詢響應時間分佈
  - 依賴: 1.3.1, 1.1.2.4
  - 工作量: 小 (1 hour)

- [ ] 1.3.4 自動告警與恢復機制
  - 告警: 連接耗盡率 > 95%, 查詢等待時間 > 1000ms
  - 自動恢復: 拒絕新連接請求直到釋放
  - 工作量: 中 (2-3 hours)

### Issue 1.4: 分佈式鎖支持
- [ ] 1.4.1 創建 `@gravito/distributed-lock` 包
  - 目錄結構: `packages/distributed-lock/`
  - 導出: LockManager, LockOptions 等接口
  - 工作量: 小 (1 hour)

- [ ] 1.4.2 實現基礎 Redis Lock
  - 基於 `SET ... NX EX` 命令
  - 支持重試與退避策略
  - 工作量: 中 (2-3 hours)

- [ ] 1.4.3 實現 Redlock 算法（多 Redis）
  - 支持多個 Redis 實例的分佈式鎖
  - 複製策略: 'single' | 'redlock'
  - 工作量: 大 (4-5 hours)

- [ ] 1.4.4 添加死鎖偵測與自動恢復
  - 偵測: 監控鎖持有時間
  - 恢復: 超時後自動釋放鎖
  - 工作量: 中 (2-3 hours)

### Issue 2.1: 分佈式追蹤支持
- [ ] 2.1.1 自動追蹤儀器化
  - 使用 `@opentelemetry/auto-instrumentations-node`
  - 自動追蹤 HTTP、DB、Redis 等
  - 工作量: 小 (1-2 hours)

- [ ] 2.1.2 Satellite 間追蹤
  - 在 Hook 派發時創建 span
  - 追蹤跨 Satellite 的調用鏈路
  - 工作量: 中 (2-3 hours)

- [ ] 2.1.3 Jaeger/Zipkin 匯出
  - 配置 span processor
  - 導出至 Jaeger 或 Zipkin
  - 工作量: 小 (1-2 hours)

- [ ] 2.1.4 追蹤可視化面板
  - Jaeger UI 中查看完整調用鏈路
  - 自動識別性能瓶頸（> 1s 自動標記）
  - 工作量: 小 (1 hour)

---

## 🔵 Phase 3: 長期優化（待定）

### Issue 2.2: 速率限制與熔斷機制
- [ ] 2.2.1 內置速率限制 Middleware
  - 基於 IP、用戶、自定義鍵的限流
  - 滑動窗口算法
  - 工作量: 中 (2-3 hours)

- [ ] 2.2.2 熔斷器增強
  - 自適應降級策略
  - 快取降級、回源限制等
  - 工作量: 大 (4-5 hours)

### Issue 3.1: 快取層優化
- [ ] 3.1.1 二級快取實現（本地 + Redis）
  - L1: 本地記憶體快取（100ms TTL）
  - L2: Redis 快取（5 分鐘 TTL）
  - 工作量: 大 (4-5 hours)

- [ ] 3.1.2 快取預熱機制
  - 應用啟動時預熱熱點數據
  - 定期刷新機制
  - 工作量: 中 (2-3 hours)

- [ ] 3.1.3 事件驅動快取失效
  - 監聽數據變更事件自動清理快取
  - 模式匹配清理支持
  - 工作量: 中 (2-3 hours)

### Issue 3.2: 事件溯源支持
- [ ] 3.2.1 Event Store 實現
  - 事件持久化存儲
  - 版本管理與追溯
  - 工作量: 大 (4-5 hours)

- [ ] 3.2.2 狀態重構機制
  - 根據事件序列重建聚合根狀態
  - 快照支持（優化性能）
  - 工作量: 大 (4-5 hours)

- [ ] 3.2.3 審計日誌系統
  - 完整的操作審計鏈
  - 時間旅行調試支持
  - 工作量: 中 (2-3 hours)

---

## 📊 進度追蹤

### 按優先級統計

| Phase | 完成 | 待做 | 完成度 | 預計工時 |
|-------|------|------|--------|---------|
| Phase 0 | 4 | 5 | 44% | 10-12 hours |
| Phase 1 | 0 | 19 | 0% | 35-45 hours |
| Phase 2 | 0 | 14 | 0% | 35-45 hours |
| Phase 3 | 0 | 10 | 0% | 30-40 hours |
| **總計** | **4** | **48** | **8%** | **110-140 hours** |

### 按 Issue 統計

| Issue | Phase | 完成 | 待做 | 完成度 |
|-------|-------|------|------|--------|
| 1.1 | 1-3 | 6 | 9 | 40% |
| 1.2 | 1-4 | 8 | 12 | 40% |
| 1.3 | - | 0 | 4 | 0% |
| 1.4 | - | 0 | 4 | 0% |
| 2.1 | - | 0 | 4 | 0% |
| 2.2 | - | 0 | 2 | 0% |
| 3.1 | - | 0 | 3 | 0% |
| 3.2 | - | 0 | 3 | 0% |

---

## 🎯 執行建議

### Phase 0 的關鍵路徑

```
1.2.1.1 (event_dlq table)
    ↓
1.2.1.4 (DLQ CLI) + 1.2.1.5 (DLQ tests)
    ↓
1.1.2.1 (OpenTelemetry) → 1.1.2.2 (Tracing) → 1.1.2.3 (Prometheus)
    ↓
1.1.3.2 (Auto detection) → 其他兼容性任務並行
```

### 並行可執行任務

- 1.1.2.1 與 1.1.2.2 可與 1.2.1.1 並行
- 1.1.2.4 與 1.1.2.5 可與其他 Phase 2 任務並行
- Phase 2 大部分任務可與 Phase 1 並行（依賴不強）

### 每週目標

- **Week 1**: 完成 Phase 0 的 1.2.1.1-1.1.2.3（~10-12 hours）
- **Week 2**: 完成 Phase 0 的 1.1.3.x（~8-10 hours）
- **Week 3-4**: Phase 1（~35-45 hours）
- **Week 5-6**: Phase 2（~35-45 hours）

---

## 📝 更新日誌

- **2026-02-03**: 完成 Task 1.1.2.2 事件追蹤（Tracing）實現
  - 新增 doActionSync 追蹤支援
  - 補充 27 個追蹤整合測試
  - 追蹤指標: event.name, event.priority, listener.count, dispatch_mode
- **2026-02-03**: 初版清單建立，基於 FRAMEWORK_IMPROVEMENTS.md 優化排序

