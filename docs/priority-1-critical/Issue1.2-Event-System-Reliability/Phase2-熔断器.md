# Phase 2: Circuit Breaker 熔斷器

**週期**：Week 9-10
**任務數**：5 個
**技術棧**：OpenTelemetry + Prometheus + Circuit Breaker Pattern
**預期交付物**：完整的熔斷器系統 + Metrics 監控 + 綜合測試

---

## 📋 任務清單

### ✅ Task 1.2.2.1: 增強 Core CircuitBreaker

**檔案**：`packages/core/src/events/CircuitBreaker.ts`

**目標**：
實現完整的熔斷器引擎，支持監聽器級別的故障隔離

**功能實現**：
- [x] **CircuitBreakerState 列舉**：CLOSED → HALF_OPEN → OPEN 狀態轉移
- [x] **CircuitBreakerMetrics 介面**：狀態、失敗數、成功數等指標
- [x] **CircuitBreakerMetricsRecorder 介面**：Metrics 記錄回調
- [x] **CircuitBreaker 類**（方法）：
  - `constructor(options: CircuitBreakerOptions)` - 初始化
  - `execute(fn: Function)` - 執行受保護操作
  - `recordSuccess()` - 記錄成功
  - `recordFailure()` - 記錄失敗
  - `getMetrics()` - 獲取狀態快照
  - `reset()` - 重置狀態
  - `setMetricsRecorder()` - 綁定 Metrics 記錄器

**配置選項**（CircuitBreakerOptions）**：
```typescript
{
  failureThreshold: 5,           // 故障計數閾值
  successThreshold: 2,           // 半開時成功次數閾值
  timeout: 60000,                // 熔斷器開啟後恢復時間（ms）
  windowSize: 60000              // 統計時間窗（ms）
}
```

**驗收標準**：
- [x] 熔斷器狀態轉移正確
- [x] 故障隔離有效
- [x] Metrics 記錄完整
- [x] 自動恢復機制工作
- [x] 24 個單元測試全部通過 ✅

**測試覆蓋**：
- [x] `tests/events/CircuitBreaker.test.ts` - 24 個測試（100% 覆蓋）

**狀態**：✅ 已完成

---

### ✅ Task 1.2.2.2: EventPriorityQueue 事件層級整合

**檔案**：
- 修改：`packages/core/src/events/EventPriorityQueue.ts`
- 新增：`packages/core/tests/events/EventPriorityQueue-CircuitBreaker.test.ts`

**目標**：
將熔斷器整合到事件隊列，實現監聽器級別的故障隔離

**功能實現**：
- [x] **CircuitBreaker 初始化**：為每個監聽器創建獨立熔斷器
- [x] **故障隔離**：監聽器失敗時自動開啟熔斷器
- [x] **自動恢復**：半開狀態下重試故障監聽器
- [x] **DLQ 整合**：失敗事件流向 DLQ（與 Phase 1 協調）
- [x] **Metrics 記錄**：將熔斷器狀態同步到 Metrics

**驗收標準**：
- [x] 監聽器級別故障隔離有效
- [x] 級聯故障完全消除
- [x] DLQ + 熔斷器協調正確
- [x] 10 個集成測試全部通過 ✅

**測試覆蓋**：
- [x] `tests/events/EventPriorityQueue-CircuitBreaker.test.ts` - 10 個測試

**狀態**：✅ 已完成

---

### ✅ Task 1.2.2.3: CLI 工具增強

**檔案**：
- 修改：`packages/core/src/HookManager.ts`
- 修改：`packages/core/src/events/EventPriorityQueue.ts`

**目標**：
提供 CLI 和公開 API 用於管理熔斷器狀態

**功能實現**：

**HookManager 新增公開 API**（5 個）：
- [x] `getCircuitBreakerStatus(eventName?: string): Promise<CircuitBreakerStatus>` - 查詢熔斷器狀態
- [x] `resetCircuitBreaker(eventName: string): Promise<void>` - 重置特定熔斷器
- [x] `resetAllCircuitBreakers(): Promise<void>` - 重置所有熔斷器
- [x] `listCircuitBreakers(): Promise<CircuitBreakerInfo[]>` - 列出所有熔斷器
- [x] `monitorCircuitBreakers(callback: MonitorCallback): () => void` - 監控熔斷器狀態變化

**EventPriorityQueue 新增熔斷器管理方法**：
- [x] `getCircuitBreakerForListener(eventName: string, index: number)` - 獲取監聽器熔斷器
- [x] `getAllCircuitBreakers()` - 獲取所有熔斷器
- [x] 支持 CLI 查詢和重置操作

**CLI 命令示例**：
```bash
# 查看所有熔斷器狀態
gravito events circuit-breaker status

# 查看特定事件的熔斷器
gravito events circuit-breaker status --event order:created

# 重置特定事件的熔斷器
gravito events circuit-breaker reset --event order:created

# 重置所有熔斷器
gravito events circuit-breaker reset --all

# 監控熔斷器狀態（實時更新）
gravito events circuit-breaker monitor
```

**驗收標準**：
- [x] 5 個公開 API 實現完整
- [x] CLI 工具可用
- [x] 狀態查詢準確
- [x] 重置操作有效

**狀態**：✅ 已完成

---

### ⏳ Task 1.2.2.4: Prometheus Metrics 整合

**檔案**：
- 存在：`packages/core/src/events/observability/OTelEventMetrics.ts`
- 測試：`packages/core/tests/events/observability/prometheus-integration.test.ts`

**目標**：
整合 Prometheus Metrics，實現熔斷器的可觀測性

**功能實現**：

**OTelEventMetrics 支持的 Metrics**：
- [x] `gravito_event_dispatch_duration_seconds` (Histogram) - 事件分發耗時
- [x] `gravito_event_listener_duration_seconds` (Histogram) - 監聽器執行耗時
- [x] `gravito_event_queue_depth` (Gauge) - 隊列深度（按優先級）

**熔斷器相關 Metrics**（需新增）：
- [ ] `gravito_event_circuit_breaker_state` (Gauge) - 熔斷器狀態（0=CLOSED, 1=HALF_OPEN, 2=OPEN）
- [ ] `gravito_event_circuit_breaker_failures_total` (Counter) - 熔斷器累計故障數
- [ ] `gravito_event_circuit_breaker_successes_total` (Counter) - 熔斷器累計成功數
- [ ] `gravito_event_circuit_breaker_transitions_total` (Counter) - 狀態轉移總數
- [ ] `gravito_event_circuit_breaker_open_duration_seconds` (Histogram) - 熔斷器開啟時長

**Label 設計**：
```
labels {
  event_name: "order:created"      // 事件名稱
  listener_index: "0"               // 監聽器索引（用於熔斷器）
  state: "OPEN|HALF_OPEN|CLOSED"   // 熔斷器狀態
}
```

**Prometheus 查詢示例**：
```promql
# 查詢所有打開的熔斷器
gravito_event_circuit_breaker_state{state="OPEN"} > 0

# 查詢最近 5 分鐘的故障率
increase(gravito_event_circuit_breaker_failures_total[5m]) /
increase(gravito_event_circuit_breaker_state[5m])

# 查詢熔斷器平均開啟時長
histogram_quantile(0.95, gravito_event_circuit_breaker_open_duration_seconds)
```

**驗收標準**：
- [ ] 5 個熔斷器 Metrics 已實現
- [ ] Label 完整且合理
- [ ] Prometheus 查詢正確
- [ ] Grafana 面板可視化
- [ ] 12 個 Prometheus 集成測試通過 ✅

**測試覆蓋**：
- [x] `tests/events/observability/prometheus-integration.test.ts` - 12 個測試（100% 覆蓋）

**狀態**：⏳ 部分完成（基礎 Metrics 已實現，熔斷器特定 Metrics 待新增）

**預計工作量**：3 小時

---

### ⏳ Task 1.2.2.5: 完整測試套件

**檔案**：
- 新增：`packages/core/tests/events/circuit-breaker-reliability.test.ts`
- 新增：`packages/core/tests/events/circuit-breaker-integration.test.ts`

**目標**：
補充綜合測試，確保熔斷器在複雜場景下的可靠性

**測試場景**（待補充）：

**1. 基礎場景（已有 24 個測試）**：
- [x] 狀態轉移正確
- [x] 計數器準確
- [x] 自動恢復有效

**2. 複雜場景（待補充）**：
- [ ] **並發故障隔離**：多個監聽器同時失敗
- [ ] **级联恢复**：一個監聽器恢復後，其他監聽器逐漸恢復
- [ ] **DLQ + 熔斷器協調**：失敗事件正確流向 DLQ，同時熔斷器記錄
- [ ] **混合優先級場景**：高、中、低優先級事件混合，熔斷器獨立工作
- [ ] **Metrics 準確性**：Metrics 數值與實際狀態相符
- [ ] **性能 Benchmark**：熔斷器開銷 < 5%
- [ ] **長時間運行穩定性**：24 小時連續運行無洩漏
- [ ] **恢復時間**：從 OPEN 到 HALF_OPEN 再到 CLOSED 的恢復時間 < 5s

**測試結構**：
```typescript
// circuit-breaker-reliability.test.ts - 20+ 個可靠性測試
describe('CircuitBreaker Reliability', () => {
  // 故障隔離、恢復、性能等

  // circuit-breaker-integration.test.ts - 15+ 個集成測試
  describe('CircuitBreaker Integration', () => {
    // 與 DLQ、隊列、Metrics 的整合
  })
})
```

**驗收標準**：
- [ ] 35+ 個新增測試
- [ ] 測試覆蓋率 > 95%
- [ ] 所有測試通過 ✅
- [ ] 性能基準測試達標

**當前進度**：
- ✅ 基礎測試：24 個（CircuitBreaker.test.ts）
- ✅ 集成測試：10 個（EventPriorityQueue-CircuitBreaker.test.ts）
- ⏳ 可靠性測試：0/20+ 待新增
- ⏳ 性能測試：0/10+ 待新增
- **總計**：34/∞ 測試完成（31% 進度）

**預計工作量**：5 小時

**狀態**：⏳ 進行中

---

## 📊 交付物清單

### ✅ 已完成（Phase 2 的 3 個任務）

| Task | 狀態 | 交付物 | 測試 |
|------|------|--------|------|
| 1.2.2.1 | ✅ | CircuitBreaker.ts | 24 個 |
| 1.2.2.2 | ✅ | EventPriorityQueue 整合 | 10 個 |
| 1.2.2.3 | ✅ | CLI 工具 + 公開 API | 部分 |
| 1.2.2.4 | ⏳ | OTelEventMetrics (基礎) | 12 個 ✅ |
| 1.2.2.5 | ⏳ | 綜合測試套件 | 34/∞ |

### 🎯 下一步

1. **完成 Task 1.2.2.4**（1-2 小時）：
   - 新增 5 個熔斷器特定 Metrics
   - 更新 CircuitBreaker 以記錄 Metrics
   - 補充 Prometheus 查詢示例

2. **完成 Task 1.2.2.5**（3-5 小時）：
   - 編寫 20+ 可靠性測試
   - 編寫 10+ 集成測試
   - 補充性能基準測試

3. **建立 Phase 2 文檔**：
   - 編寫使用指南：`docs/CIRCUIT_BREAKER_GUIDE.md`
   - 編寫遷移指南：更新 `docs/MIGRATION_GUIDE_ASYNC_EVENTS.md`
   - 編寫 Grafana 面板設定

---

## ⏸️ 實施計畫

### Week 9（當前）

**目標**：完成 Phase 2 所有任務

```
- (完成) Task 1.2.2.1 - CircuitBreaker 核心實現
- (完成) Task 1.2.2.2 - EventPriorityQueue 集成
- (完成) Task 1.2.2.3 - CLI 工具
- (進行中) Task 1.2.2.4 - Prometheus Metrics
- (進行中) Task 1.2.2.5 - 綜合測試
```

### Week 10

**目標**：Phase 2 完成 + Phase 3 開始準備

```
- 完成所有 Prometheus Metrics 集成
- 補充所有缺失測試
- 文檔完善
- Phase 3 準備：背壓機制設計
```

---

## 📈 進度追蹤

| 階段 | 完成度 | 備註 |
|------|--------|------|
| 核心實現 | 100% | 3/3 任務完成 |
| Metrics 整合 | 50% | 基礎 Metrics 完成，熔斷器特定 Metrics 待新增 |
| 測試覆蓋 | 31% | 34/∞ 測試完成 |
| **Phase 2 總體** | **60%** | 預計 Week 9 完成 |

---

## 🔗 相關資源

- [Phase 1 文檔](./Phase1-DLQ-And-Retry.md) - DLQ 與重試機制
- [OTelEventMetrics](../../src/events/observability/OTelEventMetrics.ts) - Metrics 實現
- [CircuitBreaker](../../src/events/CircuitBreaker.ts) - 熔斷器實現
- [Prometheus 整合測試](../../tests/events/observability/prometheus-integration.test.ts)

---

**最後更新**：2026-02-04
**維護者**：Gravito Framework Team
**狀態**：🔄 Phase 2 進行中（60% 完成）
