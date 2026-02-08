# 事件系統與 Hooks 架構

## 1. 背景 (Background)

### 1.1 Hooks 的演進

Gravito 的事件系統不是傳統的 Pub/Sub（如 RabbitMQ），而是一個應用級的 **Hooks 系統**：

```
傳統事件系統（Redis/RabbitMQ）：
- 優點：分佈式、持久化
- 缺點：需要額外服務、延遲高

Hooks 系統（應用記憶體中）：
- 優點：極快、開箱即用
- 缺點：不跨進程、應用重啟丟失

Gravito 策略：混合方案
├─ Hooks：同步事件（快速響應）
├─ Stream：非同步隊列（BullMQ）
└─ Signal：外部通知（郵件、SMS）
```

### 1.2 為什麼 Hooks 重要？

Hooks 是衛星間通訊的唯一途徑，因此是 Galaxy Architecture 隔離原則的核心。

---

## 2. Hooks 核心 API (Core API)

### 2.1 註冊 Hooks

```typescript
// 1. 同步 Hook（doAction）
core.hooks.addAction('commerce:order:created', async (payload: OrderPayload) => {
  // 處理訂單建立
  console.log('Order created:', payload.orderId)
})

// 2. 過濾 Hook（applyFilters）
core.hooks.addFilter('catalog:validate:product', (product: Product) => {
  // 驗證產品
  if (product.price < 0) {
    throw new Error('Price cannot be negative')
  }
  return product
})

// 3. 移除 Hook
core.hooks.removeAction('commerce:order:created', handler)
```

### 2.2 發佈 Hooks

```typescript
// 發佈動作 Hook（異步）
await core.hooks.doAction('commerce:order:created', {
  orderId: 'order-123',
  customerId: 'cust-456',
  totalAmount: 999.99
})

// 所有監聽此 Hook 的衛星會立即執行

// 應用過濾 Hook（同步）
const validatedProduct = core.hooks.applyFilters(
  'catalog:validate:product',
  product  // 初始值
)

// 每個 filter 會依次處理，返回最終值
```

---

## 3. Hook 優先級與執行順序 (Priority & Execution Order)

### 3.1 Hook 優先級

```typescript
// 註冊時指定優先級（預設 10）
core.hooks.addAction(
  'commerce:order:created',
  orderCreatedHandler,
  { priority: 5 }  // 更小的數字 → 更早執行
)

// 優先級執行順序：
// priority: 1 → 執行（最早）
// priority: 5 → 執行
// priority: 10 → 執行（預設）
// priority: 20 → 執行（最晚）
```

### 3.2 實踐案例

```typescript
// Catalog 衛星：最優先恢復庫存
core.hooks.addAction(
  'payment:refund:succeeded',
  recoverInventory,
  { priority: 1 }  // 最優先
)

// Analytics 衛星：記錄統計
core.hooks.addAction(
  'payment:refund:succeeded',
  logAnalytics,
  { priority: 10 }  // 中等
)

// Marketing 衛星：發送郵件
core.hooks.addAction(
  'payment:refund:succeeded',
  sendRefundEmail,
  { priority: 20 }  // 最後
)
```

---

## 4. 過濾 Hook (Filter Hooks)

### 4.1 順序過濾

```typescript
// 每個過濾器都接收上一個的輸出
const product = core.hooks.applyFilters('catalog:format:product', rawProduct)

// 實現：
// 1. DataRepository → 返回原始數據
// 2. Catalog Filter 1 → 清理敏感字段
// 3. Catalog Filter 2 → 新增計算字段
// 4. 最終結果 → 返回格式化後的產品
```

### 4.2 過濾實現模式

```typescript
// Hook: catalog:format:product

// Catalog 衛星
core.hooks.addFilter('catalog:format:product', (product) => {
  return {
    ...product,
    displayPrice: `$${product.price.toFixed(2)}`  // 添加顯示價格
  }
})

// Marketing 衛星
core.hooks.addFilter('catalog:format:product', (product) => {
  return {
    ...product,
    badgeText: product.discount > 10 ? '熱銷中' : null  // 添加徽章
  }
})

// Membership 衛星
core.hooks.addFilter('catalog:format:product', (product, user) => {
  if (!user) return product

  // 根據用戶權限隱藏信息
  if (!user.isAdmin) {
    delete product.costPrice
  }

  return product
})
```

---

## 5. 事件優先級隊列 (Event Priority Queue)

### 5.1 優先級隊列概念

對於複雜的非同步流程，使用 `EventPriorityQueue`：

```typescript
import { EventPriorityQueue } from '@gravito/core'

const queue = new EventPriorityQueue()

// 新增事件（帶優先級）
queue.enqueue({
  type: 'order:process',
  payload: { orderId: '123' },
  priority: 1  // 緊急
})

queue.enqueue({
  type: 'email:send',
  payload: { to: 'user@example.com' },
  priority: 10  // 低優先級
})

// 處理事件（按優先級順序）
while (!queue.isEmpty()) {
  const event = queue.dequeue()
  await processEvent(event)
}
```

### 5.2 Stream 中的優先級隊列

```typescript
// Stream 衛星使用 BullMQ 實現分佈式優先級隊列
const orderQueue = new Queue('orders', {
  connection: redis
})

// 新增優先級任務
await orderQueue.add(
  'process-order',
  { orderId: '123' },
  { priority: 1 }  // 優先級 1（最高）
)

await orderQueue.add(
  'send-email',
  { to: 'user@example.com' },
  { priority: 10 }  // 優先級 10（最低）
)

// Worker 會自動按優先級處理
```

---

## 6. 死信隊列 (Dead Letter Queue)

### 6.1 失敗事件處理

某些事件重試多次仍失敗，應進入 DLQ：

```typescript
import { DeadLetterQueue } from '@gravito/core'

const dlq = new DeadLetterQueue()

// 在事件處理中捕獲失敗
core.hooks.addAction('commerce:order:created', async (payload) => {
  try {
    await processOrder(payload)
  } catch (error) {
    // 記錄失敗的事件
    dlq.enqueue({
      event: 'commerce:order:created',
      payload: payload,
      error: error.message,
      timestamp: Date.now(),
      attempts: 3
    })
  }
})

// 查詢和重新處理 DLQ
const failedEvents = dlq.query({
  eventType: 'commerce:order:created',
  since: Date.now() - 24 * 60 * 60 * 1000  // 過去 24 小時
})

for (const event of failedEvents) {
  try {
    await reprocessEvent(event)
    dlq.remove(event.id)  // 成功後移除
  } catch (error) {
    console.error('Reprocess failed:', error)
  }
}
```

### 6.2 DLQ 監控

```typescript
// 設置 DLQ 閾值告警
dlq.on('threshold-exceeded', async (threshold) => {
  // DLQ 中的事件超過 100 個
  await sendAlert({
    level: 'warning',
    message: `${threshold.count} events in DLQ`,
    handler: 'manual-review-required'
  })
})
```

---

## 7. 事件追蹤 (Event Tracing)

### 7.1 觀測性配置

```typescript
import { EventTracing } from '@gravito/core'

const tracing = new EventTracing({
  enabled: true,
  capturePayload: true,      // 記錄事件內容
  maxPayloadSize: 10 * 1024,  // 限制 10KB
  trackDuration: true,         // 追蹤執行時間
  trackMemory: true           // 追蹤內存變化
})

core.hooks.use(tracing)
```

### 7.2 事件監測

```typescript
// 查看事件執行統計
const stats = tracing.getStats('commerce:order:created')

console.log({
  eventType: 'commerce:order:created',
  totalInvocations: stats.count,
  averageDuration: stats.avgDuration,  // ms
  maxDuration: stats.maxDuration,
  minDuration: stats.minDuration,
  errors: stats.errorCount,
  errorRate: (stats.errorCount / stats.count * 100).toFixed(2) + '%'
})

// 性能指標
// - 平均耗時 > 100ms → 需要優化
// - 錯誤率 > 1% → 需要檢查
```

### 7.3 事件追蹤示例

```
Commerce 衛星：commerce:order:created
├─ 時間：2026-02-08 10:00:00
├─ 耗時：2ms
├─ 狀態：success
└─ Handlers：
   ├─ Payment 衛星（優先級 5）
   │  ├─ 耗時：45ms
   │  └─ 狀態：success
   └─ Catalog 衛星（優先級 10）
      ├─ 耗時：32ms
      └─ 狀態：success

總耗時：79ms
```

---

## 8. 事件驅動的 Saga 模式 (Event-Driven Saga)

### 8.1 長流程事務

對於跨越多個衛星的複雜業務流程，使用 Saga 模式：

```typescript
// Checkout Saga（訂單結賬流程）
class CheckoutSaga {
  async execute(input: CheckoutInput): Promise<CheckoutResult> {
    const context = {
      orderId: generateId(),
      customerId: input.customerId,
      items: input.items,
      totalAmount: 0,
      status: 'INITIATED'
    }

    try {
      // 1. 驗證庫存
      context.status = 'VALIDATING_INVENTORY'
      const inventory = await this.validateInventory(context.items)
      if (!inventory.valid) {
        throw new Error('Inventory validation failed')
      }

      // 2. 計算價格
      context.status = 'CALCULATING_PRICE'
      context.totalAmount = await this.calculatePrice(context.items)

      // 3. 預留庫存
      context.status = 'RESERVING_INVENTORY'
      await core.hooks.doAction('catalog:reserve:inventory', {
        orderId: context.orderId,
        items: context.items
      })

      // 4. 處理支付
      context.status = 'PROCESSING_PAYMENT'
      const paymentResult = await this.processPayment(context)
      if (!paymentResult.success) {
        throw new Error('Payment failed')
      }

      // 5. 確認訂單
      context.status = 'CONFIRMED'
      await core.hooks.doAction('commerce:order:confirmed', context)

      return { success: true, orderId: context.orderId }

    } catch (error) {
      // 補償：回滾已做的操作
      context.status = 'COMPENSATING'

      // 釋放預留的庫存
      await core.hooks.doAction('catalog:release:inventory', {
        orderId: context.orderId,
        items: context.items
      })

      // 記錄失敗
      await core.hooks.doAction('commerce:order:failed', {
        ...context,
        error: error.message
      })

      throw error
    }
  }
}
```

---

## 9. 衛星間事件通訊示例 (Inter-Satellite Communication)

### 9.1 完整流程示例

```
用戶下單流程（涉及 4 個衛星）：

1. Commerce 衛星：建立訂單
   ├─ 發佈：commerce:order:created
   │  └─ payload: { orderId, items, totalAmount }

2. Catalog 衛星：監聽並預留庫存
   ├─ 監聽：commerce:order:created (優先級 5)
   ├─ 動作：預留庫存
   └─ 發佈：catalog:inventory:reserved

3. Payment 衛星：監聽並處理支付
   ├─ 監聽：commerce:order:created (優先級 10)
   ├─ 動作：建立支付意圖
   └─ 發佈：payment:intent:created

4. Analytics 衛星：監聽並記錄統計
   ├─ 監聽：commerce:order:created (優先級 20)
   └─ 動作：記錄訂單統計

5. Payment 衛星：支付完成
   ├─ 發佈：payment:succeeded
   └─ payload: { orderId, transactionId }

6. Catalog 衛星：確認預留
   ├─ 監聽：payment:succeeded
   └─ 動作：確認庫存扣減

7. Commerce 衛星：訂單完成
   ├─ 監聽：payment:succeeded
   └─ 發佈：commerce:order:completed
```

### 9.2 代碼實現

```typescript
// Commerce 衛星
export class CommerceServiceProvider extends ServiceProvider {
  override boot(): void {
    core.router.post('/api/orders', async (ctx) => {
      const order = await orderRepository.create(ctx.body)

      // 發佈訂單建立事件
      await core.hooks.doAction('commerce:order:created', {
        orderId: order.id,
        items: order.items,
        totalAmount: order.totalAmount
      })

      return ctx.json(order)
    })
  }
}

// Catalog 衛星
export class CatalogServiceProvider extends ServiceProvider {
  override boot(): void {
    // 監聽訂單建立，優先級最高（需要最先預留庫存）
    core.hooks.addAction(
      'commerce:order:created',
      async (payload) => {
        const inventory = await inventoryService.reserve(
          payload.items,
          payload.orderId
        )

        if (!inventory.success) {
          throw new Error('Inventory reservation failed')
        }

        // 發佈庫存已預留事件
        await core.hooks.doAction('catalog:inventory:reserved', {
          orderId: payload.orderId,
          items: payload.items
        })
      },
      { priority: 5 }
    )
  }
}

// Payment 衛星
export class PaymentServiceProvider extends ServiceProvider {
  override boot(): void {
    core.hooks.addAction(
      'commerce:order:created',
      async (payload) => {
        const intent = await paymentService.createIntent({
          orderId: payload.orderId,
          amount: payload.totalAmount
        })

        // 發佈支付意圖建立事件
        await core.hooks.doAction('payment:intent:created', {
          orderId: payload.orderId,
          intentId: intent.id
        })
      },
      { priority: 10 }
    )

    // 監聽支付成功
    core.hooks.addAction(
      'payment:succeeded',
      async (payload) => {
        // 發佈支付完成事件
        await core.hooks.doAction('payment:transaction:confirmed', {
          orderId: payload.orderId,
          transactionId: payload.transactionId
        })
      }
    )
  }
}
```

---

## 10. 常見陷阱與最佳實踐 (Pitfalls & Best Practices)

### 陷阱 1：事件處理中的同步 I/O

```typescript
// ❌ 錯誤：阻塞事件處理
core.hooks.addAction('commerce:order:created', (payload) => {
  // 同步讀取文件（會阻塞其他 hooks）
  const config = fs.readFileSync('config.json')
})

// ✅ 正確：非同步 I/O
core.hooks.addAction('commerce:order:created', async (payload) => {
  // 非同步讀取
  const config = await fs.promises.readFile('config.json')
})
```

### 陷阱 2：事件中的無限遞迴

```typescript
// ❌ 錯誤：A 事件發佈 B，B 又發佈 A
core.hooks.addAction('order:created', async () => {
  await core.hooks.doAction('payment:initiated')  // 導致遞迴
})

core.hooks.addAction('payment:initiated', async () => {
  await core.hooks.doAction('order:created')  // 無限遞迴！
})

// ✅ 正確：明確的單向流
core.hooks.addAction('order:created', async () => {
  await core.hooks.doAction('payment:requested')
})

core.hooks.addAction('payment:succeeded', async () => {
  await core.hooks.doAction('order:completed')  // 單向流
})
```

### 陷阱 3：忽視 Hook 順序

```typescript
// ❌ 錯誤：依賴執行順序，但沒有指定優先級
core.hooks.addAction('product:created', updateCache)
core.hooks.addAction('product:created', indexSearch)  // 誰先執行？

// ✅ 正確：顯式指定優先級
core.hooks.addAction('product:created', updateCache, { priority: 5 })
core.hooks.addAction('product:created', indexSearch, { priority: 10 })
```

---

## 11. 相關文檔與資源

- **[packages/core/EventManager.ts](../../packages/core/)** - 事件管理實現
- **[packages/core/events/](../../packages/core/src/events/)** - 優先級隊列、死信隊列
- **[Satellite 隔離原則](./satellite-isolation-principles.md)** - 事件系統應用
- **[Stream 文檔](../../packages/stream/)** - 非同步隊列系統

---

**撰寫日期**：2026-02-08
**版本**：1.0
