# Resilience 套件 - 快速參考卡

## 現狀一覽

```
📦 @gravito/resilience v1.0.0
├─ 代碼：7,971 行
├─ 文件：36 個源檔案
├─ API：86 個導出
├─ 測試：0 個 ❌
└─ 狀態：功能完整但缺測試
```

## 模組清單 & 複雜度

| # | 模組 | 行數 | 複雜度 | 優先級 | 狀態 |
|---|------|-----|--------|-------|------|
| 1 | **EventPriorityQueue** | 1,044 | 🔴 高 | 1 | 待測 |
| 2 | **OTelEventMetrics** | 728 | 🟠 中高 | 2 | 待測 |
| 3 | **BackpressureManager** | 655 | 🔴 高 | 1 | 待測 |
| 4 | **CircuitBreaker** | 463 | 🔴 高 | 1 | 待測 |
| 5 | **DeduplicationManager** | 435 | 🟡 中 | 1 | 待測 |
| 6 | **DeadLetterQueue** | 420 | 🟡 中 | 1 | 待測 |
| 7 | EventTracing | 396 | 🟡 中 | 2 | 待測 |
| 8 | WorkerPool | 394 | 🟡 中 | 2 | 待測 |
| 9 | MessageQueueBridge | 313 | 🟡 中 | 3 | 待測 |
| 10 | ObservableHookManager | 307 | 🟡 中 | 3 | 待測 |
| ... | 其他 26 個 | 2,615 | 🟢 低 | 3-4 | 待測 |

## 決策矩陣

### 方案 A：Beta (保守)
```
版本: 0.1.0-beta.0
時間: 0 小時
測試: 0%
風險: ⚠️ 推遲發布 1-2 週
```

### 方案 B：核心測試 (推薦) ✅
```
版本: 1.0.0
時間: 5-6 小時
測試: 60-70%
包含: 5 個核心模組 (3,017 行)
  ✓ CircuitBreaker (35 min)
  ✓ DeadLetterQueue (30 min)
  ✓ BackpressureManager (40 min)
  ✓ EventPriorityQueue (50 min)
  ✓ DeduplicationManager (35 min)
風險: 🟢 低 - 高頻路徑完全驗證
```

### 方案 C：完整測試 (理想)
```
版本: 1.0.0
時間: 11 小時
測試: 75%+
風險: 🟡 中 - 耗時推遲 2-3 天
```

## 核心 API 概覽

### 斷路器 (Circuit Breaker)
```typescript
const breaker = new CircuitBreaker('my-service', {
  failureThreshold: 5,      // 開路前的失敗數
  resetTimeout: 30000,      // 嘗試恢復的等待時間
  halfOpenRequests: 3,      // 半開時允許的測試請求
})

await breaker.execute(async () => {
  // 操作代碼
})

// 狀態檢查
breaker.isOpen()         // 是否開路
breaker.isHalfOpen()     // 是否半開
breaker.isClosed()       // 是否閉合
```

### 失信隊列 (Dead Letter Queue)
```typescript
const dlq = new DeadLetterQueue(10000)  // 最大容量

// 添加失敗事件
dlq.add(eventName, payload, options, error, retryCount, timestamp)

// 查詢
dlq.getAll()
dlq.getByEventName('order.failed')
dlq.query({ eventName: 'payment', from: startTime, to: endTime })

// 統計
dlq.size()
dlq.stats()
```

### 背壓管理 (Backpressure)
```typescript
const backpressure = new BackpressureManager({
  maxQueueSize: 10000,
  warnThreshold: 0.7,
  rejectThreshold: 0.9,
})

// 檢查是否可以接受新請求
const state = backpressure.checkCapacity(newItemSize)
// BackpressureState: NONE | WARN | REJECT
```

### 優先級隊列 (Priority Queue)
```typescript
const queue = new EventPriorityQueue()

// 不同優先級的事件
queue.enqueue(event, EventPriority.CRITICAL)
queue.enqueue(event, EventPriority.HIGH)
queue.enqueue(event, EventPriority.NORMAL)
queue.enqueue(event, EventPriority.LOW)

// 取出最高優先級的事件
const next = queue.dequeue()
```

## 依賴檢查

### Peer Dependencies
```json
{
  "@gravito/core": "workspace:*",           // 必須
  "@opentelemetry/api": "^1.9.0"            // 可選
}
```

### 無向下依賴
✅ 沒有其他 @gravito 套件依賴此包
✅ 可以安全發布

## 測試策略速查

### 優先級 1（必須）- 5-6 小時
```
總代碼行數: 3,017
覆蓋比例: 60-70%

□ CircuitBreaker
  • 狀態轉換 (CLOSED → OPEN → HALF_OPEN)
  • 滑動窗口故障計數
  • 回調和指標集成
  時間: 35 分鐘
  測試數: 15-18 個

□ DeadLetterQueue
  • 添加/移除/查詢操作
  • 容量超限淘汰
  • 過濾統計
  時間: 30 分鐘
  測試數: 12-15 個

□ BackpressureManager
  • 狀態轉換 (NONE → WARN → REJECT)
  • 流控策略應用
  • 恢復機制
  時間: 40 分鐘
  測試數: 12-15 個

□ EventPriorityQueue
  • Min-heap 排序
  • 優先級升級
  • 批量操作
  時間: 50 分鐘
  測試數: 15-18 個

□ DeduplicationManager
  • 去重邏輯
  • 時間窗口邊界
  • 緩存淘汰
  時間: 35 分鐘
  測試數: 12-15 個
```

### 優先級 2（補充）- 3 小時
```
EventAggregationManager, EventBatcher, WorkerPool,
RetryScheduler, EventTracing, OTelEventMetrics
```

### 優先級 3-4（邊界）- 3 小時
```
小型工具類、配置、邊界條件、異常恢復
```

## 發布檢查清單

方案 B 完成後（5-6 小時）：

- [ ] 優先級 1 所有模組有單元測試
- [ ] 測試覆蓋率 ≥ 60%
- [ ] 所有核心 API 有測試覆蓋
- [ ] 無類型錯誤 (tsc --noEmit)
- [ ] 無 lint 錯誤 (biome check)
- [ ] 構建成功 (bun run build)
- [ ] 版本確認：1.0.0
- [ ] 發布準備完畢

## 快速開始命令

```bash
# 安裝依賴
bun install

# 檢查類型
bun run typecheck

# 執行全部測試（發布後）
bun run test

# 執行特定模組測試
cd packages/resilience && bun test

# 查看覆蓋率
bun test --coverage

# 構建
bun run build
```

## 關鍵聯繫人決策

**Tech-Lead 需要批准**：
1. 選擇方案（推薦 B）
2. 批准 5-6 小時時間投入
3. 確認發布日期

**一旦批准，立即開始實施，預計當日 EOD 前完成。**

---

**報告生成時間**：2026-02-25
**評估者**：Claude Code (Haiku 4.5)
**狀態**：⏳ 等待 Tech-Lead 決策
