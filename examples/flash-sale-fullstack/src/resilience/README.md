# Resilience Module Integration

本示例展示如何在 Flash Sale 應用中集成 `@gravito/resilience` 模組，實現企業級容錯機制。

## 功能概覽

### 1. Circuit Breaker（熔斷器）

防止級聯故障，當服務頻繁失敗時自動打開，阻止後續請求。

**應用場景**：
- **支付 API** - 失敗 5 次後打開，防止支付服務故障傳播
- **庫存查詢** - 失敗 10 次後打開，寬鬆規則適應庫存系統的波動

```typescript
import { executeWithPaymentCircuitBreaker } from '@gravito/examples/flash-sale-fullstack'

// 支付時使用熔斷器保護
const result = await executeWithPaymentCircuitBreaker(
  async () => {
    return await paymentAPI.charge(orderId, amount)
  },
  logger
)
```

### 2. Backpressure Manager（背壓管理）

監控系統負載，當隊列深度超過閾值時觸發背壓，保護系統不被淹沒。

**配置**：
- 高水位線：80% - 隊列使用率超過此閾值時觸發背壓
- 低水位線：30% - 隊列使用率降至此閾值時解除背壓

```typescript
import { shouldApplyBackpressure } from '@gravito/examples/flash-sale-fullstack'

if (shouldApplyBackpressure(currentQueueDepth, maxQueueDepth)) {
  // 採取背壓措施：降速、返回 429、延遲處理等
  console.log('Applying backpressure...')
}
```

### 3. Deduplication Manager（去重管理）

防止同一事件在短時間內重複處理，特別是異常重試場景。

**應用場景**：
- **支付成功事件** - 同一訂單 10 秒內的重複支付成功
- **庫存扣減** - 同一物品 5 秒內的重複扣減

```typescript
import { isDuplicate } from '@gravito/examples/flash-sale-fullstack'

if (isDuplicate('payment_success', `order_${orderId}`, 10000)) {
  console.log('Duplicate event, skipping...')
  return
}

// 處理事件...
```

### 4. Dead Letter Queue（死信隊列）

存儲失敗的消息，供稍後分析、重試或人工處理。

**應用場景**：
- 支付失敗
- 庫存操作異常
- 任何需要重試的失敗操作

```typescript
import { addToDeadLetterQueue } from '@gravito/examples/flash-sale-fullstack'

try {
  await processPayment(order)
} catch (error) {
  await addToDeadLetterQueue({
    source: 'payment_handler',
    payload: { orderId: order.id, amount: order.amount },
    error,
  }, logger)
}
```

### 5. Event Priority Queue（優先級隊列）

按優先級調度事件處理，確保關鍵操作優先執行。

**優先級等級**：
- `critical` (0) - 系統關鍵操作
- `high` (1) - 已支付訂單的庫存扣減
- `normal` (2) - 常規事件
- `low` (3) - 後台任務

```typescript
import { addToPriorityQueue } from '@gravito/examples/flash-sale-fullstack'

// 高優先級：已支付訂單
await addToPriorityQueue({
  type: 'inventory_deduct',
  priority: 'high',
  data: { orderId, quantity }
}, logger)

// 低優先級：日誌記錄
await addToPriorityQueue({
  type: 'audit_log',
  priority: 'low',
  data: { event: 'user_browse' }
}, logger)
```

## 初始化流程

Resilience 模組在應用啟動時自動初始化：

```typescript
// src/app.ts
async function bootstrap() {
  // ...

  // P0.2：初始化容錯機制
  await initializeResilience(app.core)

  // ...
}
```

## 集成示例

查看 `src/integrations/resilience-integration.ts` 了解如何在實際業務邏輯中使用各項機制：

- **支付成功** - 使用去重防止重複支付成功事件
- **支付失敗** - 消息存入 DLQ 進行後續處理
- **庫存查詢** - 熔斷器保護防止級聯故障
- **庫存扣減** - 優先級隊列確保已支付訂單優先處理
- **訂單創建** - 支付 API 使用熔斷器保護

## 監控與診斷

獲取 Resilience 統計資訊：

```typescript
import { getResilienceMetrics } from '@gravito/examples/flash-sale-fullstack'

const metrics = getResilienceMetrics()
console.log(metrics)
// {
//   circuitBreakers: {
//     payment: { state: 'closed', failureCount: 2 },
//     inventory: { state: 'half-open', failureCount: 8 }
//   },
//   backpressure: { isActive: false },
//   deadLetterQueue: { /* ... */ },
//   eventQueue: { /* ... */ }
// }
```

## 最佳實踐

### 1. 合理設置熔斷器閾值

```typescript
// 寬鬆規則：容許更多失敗再打開
const circuitBreaker = new CircuitBreaker({
  failureThreshold: 10,  // 失敗 10 次後打開
  timeout: 20000,        // 20 秒超時
  halfOpenTimeout: 15000 // 15 秒後嘗試恢復
})

// 嚴格規則：快速反應
const circuitBreaker = new CircuitBreaker({
  failureThreshold: 3,   // 失敗 3 次後打開
  timeout: 5000,         // 5 秒超時
  halfOpenTimeout: 10000 // 10 秒後嘗試恢復
})
```

### 2. 為 DLQ 消息設計重試策略

不同類型的失敗需要不同的重試策略：

```typescript
// 網路超時 - 立即重試
if (error.code === 'TIMEOUT') {
  await addToDeadLetterQueue({
    source: 'payment',
    payload: { orderId, retryAfterMs: 1000 },
    error
  }, logger)
}

// 限流 - 延遲重試
if (error.code === 'RATE_LIMIT') {
  await addToDeadLetterQueue({
    source: 'payment',
    payload: { orderId, retryAfterMs: 30000 },
    error
  }, logger)
}

// 業務錯誤 - 需要人工介入
if (error.code === 'INSUFFICIENT_FUNDS') {
  await addToDeadLetterQueue({
    source: 'payment',
    payload: { orderId, requiresManualReview: true },
    error
  }, logger)
}
```

### 3. 根據優先級調整隊列處理速度

```typescript
// 高優先級事件 - 快速處理（如已支付訂單）
await addToPriorityQueue({
  type: 'inventory_deduct',
  priority: 'high',
  data: { orderId }
}, logger)

// 低優先級事件 - 可以批量或延遲處理（如審計日誌）
await addToPriorityQueue({
  type: 'audit_log',
  priority: 'low',
  data: { event }
}, logger)
```

## 關閉與清理

應用關閉時自動清理資源：

```typescript
process.on('SIGTERM', async () => {
  // 關閉熔斷器、清空 DLQ、清空事件隊列
  await shutdownResilience()
  process.exit(0)
})
```

## 相關文檔

- [@gravito/resilience](../../../../packages/resilience/README.md) - 完整 API 文檔
- [Architecture](../ARCHITECTURE.md) - 應用架構設計
- [Performance Guide](../PERFORMANCE.md) - 性能優化指南
