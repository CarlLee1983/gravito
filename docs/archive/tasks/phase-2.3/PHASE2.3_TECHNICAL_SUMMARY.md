# Phase 2.3 Resilience 套件 - 技術摘要

## 包基本信息

| 項目 | 詳情 |
|------|------|
| 包名 | @gravito/resilience |
| 版本 | 1.0.0 |
| 類型 | ESM + CJS |
| Side Effects | false |
| 測試覆蓋 | **0%** (tests/ 目錄為空) |
| 代碼行數 | 7,971 行 |
| 源文件數 | 36 個 .ts 檔案 |
| 公開 API | 86 個 (類/介面/型別/枚舉) |

## 模組複雜度分析

### 大型模組（需優先測試）

#### 1. EventPriorityQueue (1,044 行)
**職責**：優先級隊列管理，事件優先級調度
**關鍵特性**：
- Min-heap 優先級隊列實作
- 優先級轉換和升級機制
- 統計信息追蹤
- 批量操作支持

**測試重點**：
- 優先級排序正確性
- 堆操作的一致性 (插入/刪除/升級)
- 邊界條件 (空隊列、單元素、大規模數據)

**評估時間**：40-50 分鐘

#### 2. OTelEventMetrics (728 行)
**職責**：OpenTelemetry 指標收集和上報
**關鍵特性**：
- 分佈式追蹤集成
- 指標類型多樣 (計數、直方圖、計時)
- 動態主機名解析
- 自動指標上報

**測試重點**：
- 指標記錄的準確性
- 批量上報邏輯
- 異常情況處理
- OpenTelemetry SDK 集成

**評估時間**：35-40 分鐘

#### 3. BackpressureManager (655 行)
**職責**：背壓管理，防止隊列溢出
**關鍵特性**：
- 三層背壓策略 (NONE/WARN/REJECT)
- 動態限流
- 隊列容量監控
- 流控恢復機制

**測試重點**：
- 狀態轉換邏輯
- 限流策略應用
- 容量計算正確性
- 恢復機制觸發條件

**評估時間**：35-40 分鐘

#### 4. CircuitBreaker (463 行)
**職責**：斷路器模式實作，防止級聯故障
**關鍵特性**：
- 3 狀態機制 (CLOSED/OPEN/HALF_OPEN)
- 滑動窗口故障計數
- 自動狀態轉換
- 指標記錄支持

**測試重點**（已詳列上份報告）：
- 15-18 個狀態轉換測試案例
- 滑動窗口計算
- 回調和指標集成

**評估時間**：30-40 分鐘

#### 5. DeduplicationManager (435 行)
**職責**：事件重複消除，確保冪等性
**關鍵特性**：
- 基於內容/時間的去重
- 滑動時間窗口
- LRU 緩存淘汰
- 統計追蹤

**測試重點**：
- 去重邏輯的準確性
- 時間窗口邊界
- 緩存容量管理
- 統計準確性

**評估時間**：30-35 分鐘

#### 6. DeadLetterQueue (420 行)
**職責**：失信隊列，處理失敗事件
**關鍵特性**（已詳列上份報告）：
- 項目管理 (添加/移除/查詢)
- 容量管理和 FIFO 淘汰
- 多維度過濾和遍歷
- 回調機制

**測試重點**：
- 12-15 個案例覆蓋所有操作
- 容量超限邊界
- 過濾邏輯正確性

**評估時間**：25-35 分鐘

### 中型模組（次優先級）

| 模組 | 代碼行 | 複雜度 | 評估時間 |
|------|-------|-------|--------|
| EventTracing | 396 | 中 | 25-30 分鐘 |
| WorkerPool | 394 | 中-高 | 35-40 分鐘 |
| MessageQueueBridge | 313 | 中 | 20-25 分鐘 |
| ObservableHookManager | 307 | 中 | 25-30 分鐘 |
| EventMetrics | 285 | 中 | 20-25 分鐘 |
| FlowControlStrategy | 265 | 中 | 20-25 分鐘 |
| EventBatcher | 265 | 中 | 25-30 分鐘 |
| EventAggregationManager | 249 | 中 | 25-30 分鐘 |
| RetryScheduler | 240 | 中 | 20-25 分鐘 |

### 小型模組（快速測試）

| 模組 | 代碼行 | 複雜度 | 評估時間 |
|------|-------|-------|--------|
| AggregationWindow | 191 | 低 | 10-15 分鐘 |
| IdempotencyCache | 175 | 低 | 10-15 分鐘 |
| PriorityEscalationManager | 138 | 低 | 10-15 分鐘 |
| 其他模組 | <150 | 低 | <10 分鐘 |

## 核心 API 群組

### 1. 斷路器 API (8 個導出)
```typescript
// 狀態枚舉
CircuitBreakerState (CLOSED, OPEN, HALF_OPEN)

// 指標介面
CircuitBreakerMetrics
CircuitBreakerMetricsRecorder

// 配置
CircuitBreakerOptions
RequiredCircuitBreakerOptions

// 類
CircuitBreaker
```

### 2. 失信隊列 API (4 個導出)
```typescript
// 類型
DLQEntry
DLQEntrySource ('retry_exhausted' | 'circuit_breaker' | ...)
DLQFilter
DLQEntryCallback

// 類
DeadLetterQueue
```

### 3. 背壓管理 API (7 個導出)
```typescript
BackpressureState
BackpressureConfig
BackpressureThreshold
BackpressureStrategy
BackpressureManager
// ... 更多
```

### 4. 事件優先級 API (6 個導出)
```typescript
EventPriority (HIGH, NORMAL, LOW, CRITICAL)
PriorityEvent
PriorityStatistics
PriorityEscalationManager
EventPriorityQueue
```

### 5. 可觀測性 API (12+ 個導出)
```typescript
EventMetricsSnapshot
EventMetricsRecorder
EventTracing / ObservableHookManager
OTelEventMetrics
// ... 更多
```

## 依賴關係

### Peer Dependencies
```json
{
  "@gravito/core": "workspace:*",
  "@opentelemetry/api": "^1.9.0" (optional)
}
```

### 內部依賴
- 無其他 @gravito 包依賴
- 純 TypeScript + 標準庫
- 生命週期依賴 @gravito/core (PlanetCore)

## 關鍵設計考量

### 1. 與 Core 的耦合
resilience 深度依賴 @gravito/core：
- EventOptions 類型
- HookManager 生命週期
- Container 依賴注入

**Phase 2 目標**：解除此依賴（CRITICAL 項目）

### 2. OpenTelemetry 可選性
- 正確標記為 optional peer dependency
- 動態加載支持
- 無強制依賴

### 3. 狀態管理複雜性
- 多個模組維護複雜狀態機
- 需要完整測試覆蓋狀態轉換
- 並發場景的一致性保證

## 測試覆蓋策略

### 優先級 1（必須覆蓋，日後必測）

1. **CircuitBreaker** (30-40 min)
   - 狀態轉換機制
   - 滑動窗口算法
   - 指標集成

2. **DeadLetterQueue** (25-35 min)
   - 添加/移除/查詢操作
   - 容量管理
   - 過濾和統計

3. **BackpressureManager** (35-40 min)
   - 狀態轉換
   - 流控策略應用
   - 恢復機制

### 優先級 2（高複雜度）

4. **EventPriorityQueue** (40-50 min)
5. **EventAggregationManager** (25-30 min)
6. **WorkerPool** (35-40 min)

### 優先級 3（中等複雜度）

7. **RetryScheduler**、**EventBatcher**、**MessageQueueBridge** 等

### 優先級 4（簡單）

8. **AggregationWindow**、**IdempotencyCache** 等

## 完整測試計畫

### 一階段：核心功能 (5 小時)
- Circuit Breaker: 1 小時
- Dead Letter Queue: 1 小時
- Backpressure Manager: 1 小時
- Event Priority Queue: 1 小時
- Deduplication Manager: 1 小時

### 二階段：整合功能 (3 小時)
- Event Aggregation & Batching: 1 小時
- Worker Pool & Flow Control: 1 小時
- Observable Hook & Metrics: 1 小時

### 三階段：邊界和異常 (2 小時)
- 並發場景
- 邊界條件
- 異常恢復
- 性能驗證

### 四階段：驗證和文檔 (1 小時)
- 測試覆蓋率檢查 (目標 75%+)
- 文檔更新
- 發布準備

**總計**：約 11 小時的完整測試覆蓋

## 決策建議（更新）

基於技術複雜度分析：

| 選項 | 投入時間 | 覆蓋範圍 | 建議 |
|------|--------|--------|------|
| A：beta.0 | 0 小時 | 0% | 不推薦 |
| B：v1.0.0 (核心) | 5-6 小時 | 60-70% | **推薦** |
| C：v1.0.0 (完整) | 11 小時 | 75%+ | 理想但耗時 |

**推薦方案**：選項 B 的折中版本
- 立即完成優先級 1（核心模組）：5-6 小時
- 達成 60-70% 測試覆蓋
- 發布 v1.0.0 (production-ready)
- 後續在 Phase 2.4 補充優先級 2-4 的測試
