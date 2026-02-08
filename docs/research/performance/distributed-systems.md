# 分佈式系統性能考量

## 1. 背景 (Background)

### 1.1 何時需要分佈式？

當單個實例無法滿足需求時：
- **高吞吐量**：每秒數千個請求
- **高可用性**：容錯、故障轉移
- **地理分佈**：多地區部署
- **橫向擴展**：無限水平擴展

### 1.2 分佈式系統的挑戰

```
單體應用：
- 優點：簡單、快速、無分佈式複雜度
- 缺點：難以擴展、單點故障

分佈式應用：
- 優點：高可用、可擴展、容錯
- 缺點：延遲增加、一致性困難、複雜度高

分佈式成本（Fallacies of Distributed Computing）：
1. 網絡是可靠的
2. 延遲為零
3. 帶寬是無限的
4. 網絡是安全的
5. 拓撲不會改變
6. 有一個管理員
7. 傳輸成本為零
8. 網絡是同質的
```

---

## 2. 跨服務通訊延遲 (Inter-Service Communication Latency)

### 2.1 延遲成本分析

```
本地函數調用：
  └─ 耗時：< 1μs (微秒)
  └─ 成本：無

同進程通訊（IPC）：
  └─ 耗時：1-10 ms
  └─ 成本：序列化、上下文切換

同服務器網絡：
  └─ 耗時：1-5 ms
  └─ 成本：TCP/IP、序列化

異服務器網絡：
  └─ 耗時：10-100 ms
  └─ 成本：跨越網絡、可靠性差

地理分佈：
  └─ 耗時：100-500 ms
  └─ 成本：光速限制、跨地區
```

### 2.2 延遲監控

```typescript
// 追蹤跨服務調用延遲
class ServiceCall {
  private startTime: number

  constructor(private serviceName: string, private operation: string) {
    this.startTime = Date.now()
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    try {
      const result = await fn()
      const duration = Date.now() - this.startTime

      // 記錄延遲
      recordLatency(this.serviceName, this.operation, duration)

      // 告警：延遲過高
      if (duration > 500) {
        logger.warn(`Slow ${this.serviceName}.${this.operation}: ${duration}ms`)
      }

      return result
    } catch (error) {
      const duration = Date.now() - this.startTime
      recordLatencyError(this.serviceName, this.operation, duration, error)
      throw error
    }
  }
}

// 使用
const call = new ServiceCall('catalog', 'getProduct')
const product = await call.execute(() => catalogService.getProduct('123'))
```

### 2.3 延遲分佈統計

```typescript
// 計算 P50、P95、P99 延遲
class LatencyHistogram {
  private samples: number[] = []

  record(ms: number): void {
    this.samples.push(ms)
  }

  getPercentile(p: number): number {
    const sorted = this.samples.sort((a, b) => a - b)
    const index = Math.ceil(sorted.length * (p / 100)) - 1
    return sorted[index]
  }

  getStats() {
    return {
      count: this.samples.length,
      avg: this.samples.reduce((a, b) => a + b) / this.samples.length,
      p50: this.getPercentile(50),   // 中位數
      p95: this.getPercentile(95),
      p99: this.getPercentile(99),
      max: Math.max(...this.samples)
    }
  }
}

const histogram = new LatencyHistogram()

// 監控 API 延遲
app.get('/api/product/:id', async (ctx) => {
  const start = Date.now()
  const product = await catalog.getProduct(ctx.param('id'))
  histogram.record(Date.now() - start)

  return ctx.json(product)
})

// 定期輸出統計
setInterval(() => {
  const stats = histogram.getStats()
  console.log(`Latency: avg=${stats.avg}ms p95=${stats.p95}ms p99=${stats.p99}ms`)
}, 60000)
```

---

## 3. 分佈式事務與一致性 (Distributed Transactions)

### 3.1 最終一致性

在分佈式系統中，強一致性難以實現。改用最終一致性：

```typescript
// 交易 Saga：最終一致性模式
class CheckoutSaga {
  async execute(order: Order): Promise<void> {
    // 階段 1：預留庫存
    try {
      const reservation = await catalog.reserve(order.items)
      order.reservationId = reservation.id
    } catch (error) {
      throw new Error('Inventory reservation failed')
    }

    // 階段 2：處理支付
    try {
      const payment = await payment.process(order)
      order.transactionId = payment.id
    } catch (error) {
      // 補償：釋放庫存預留
      await catalog.release(order.reservationId)
      throw new Error('Payment failed')
    }

    // 階段 3：確認訂單
    try {
      await commerce.confirm(order)
    } catch (error) {
      // 補償：退款
      await payment.refund(order.transactionId)
      // 補償：釋放庫存
      await catalog.release(order.reservationId)
      throw new Error('Order confirmation failed')
    }

    // 所有階段都成功，達到最終一致性
  }
}
```

### 3.2 分佈式鎖

某些場景需要分佈式鎖確保一致性：

```typescript
import { createClient } from 'redis'

const redis = createClient()

class DistributedLock {
  async acquire(
    key: string,
    ttlMs: number = 5000
  ): Promise<{ release: () => Promise<void> }> {
    const lockId = crypto.randomUUID()
    const lockKey = `lock:${key}`

    // 嘗試獲取鎖
    let acquired = false
    let attempts = 0

    while (!acquired && attempts < 10) {
      const result = await redis.set(
        lockKey,
        lockId,
        { EX: Math.floor(ttlMs / 1000), NX: true }
      )

      acquired = result === 'OK'

      if (!acquired) {
        await new Promise(r => setTimeout(r, 100))
        attempts++
      }
    }

    if (!acquired) {
      throw new Error(`Failed to acquire lock: ${key}`)
    }

    return {
      release: async () => {
        // 檢查是否仍然是我們的鎖
        const currentId = await redis.get(lockKey)
        if (currentId === lockId) {
          await redis.del(lockKey)
        }
      }
    }
  }
}

// 使用分佈式鎖
const lock = new DistributedLock()

app.post('/api/transfer', async (ctx) => {
  const { fromId, toId, amount } = ctx.body

  // 獲取鎖以確保原子性
  const fromLock = await lock.acquire(`account:${fromId}`, 5000)
  const toLock = await lock.acquire(`account:${toId}`, 5000)

  try {
    // 轉帳操作
    await executeTransfer(fromId, toId, amount)
  } finally {
    await fromLock.release()
    await toLock.release()
  }
})
```

---

## 4. 服務發現與負載均衡 (Service Discovery & Load Balancing)

### 4.1 服務註冊

```typescript
// 服務啟動時註冊
const SERVICE_REGISTRY = new Map<string, ServiceInstance[]>()

class ServiceRegistry {
  async register(serviceName: string, instance: ServiceInstance): Promise<void> {
    // 存儲到 Redis
    await redis.setex(
      `service:${serviceName}:${instance.id}`,
      30,  // 30 秒 TTL
      JSON.stringify({
        host: instance.host,
        port: instance.port,
        weight: instance.weight
      })
    )

    // 定期續期（心跳）
    setInterval(async () => {
      await redis.expire(`service:${serviceName}:${instance.id}`, 30)
    }, 15000)
  }

  async getInstances(serviceName: string): Promise<ServiceInstance[]> {
    const keys = await redis.keys(`service:${serviceName}:*`)
    const instances = []

    for (const key of keys) {
      const data = await redis.get(key)
      instances.push(JSON.parse(data))
    }

    return instances
  }
}
```

### 4.2 負載均衡

```typescript
class LoadBalancer {
  private currentIndex = 0

  // 輪詢（Round Robin）
  selectRoundRobin(instances: ServiceInstance[]): ServiceInstance {
    const instance = instances[this.currentIndex]
    this.currentIndex = (this.currentIndex + 1) % instances.length
    return instance
  }

  // 加權輪詢（Weighted Round Robin）
  selectWeightedRoundRobin(instances: ServiceInstance[]): ServiceInstance {
    const totalWeight = instances.reduce((sum, i) => sum + i.weight, 0)
    let random = Math.random() * totalWeight

    for (const instance of instances) {
      random -= instance.weight
      if (random <= 0) {
        return instance
      }
    }

    return instances[0]
  }

  // 最少連接（Least Connections）
  selectLeastConnections(
    instances: ServiceInstance[],
    connectionCounts: Map<string, number>
  ): ServiceInstance {
    let minInstance = instances[0]
    let minConnections = connectionCounts.get(minInstance.id) || 0

    for (const instance of instances) {
      const connections = connectionCounts.get(instance.id) || 0
      if (connections < minConnections) {
        minInstance = instance
        minConnections = connections
      }
    }

    return minInstance
  }
}
```

---

## 5. 服務間通訊協議 (Inter-Service Communication Protocol)

### 5.1 同步通訊（HTTP/REST）

```typescript
// 缺點：阻塞、耦合
async function synchronousCommunication() {
  // Catalog 衛星直接調用 Payment 衛星
  const payment = await http.post('http://payment:3000/process', {
    orderId: '123',
    amount: 999
  })

  if (payment.status === 'failed') {
    throw new Error('Payment failed')
  }
}
```

### 5.2 非同步通訊（事件驅動）

```typescript
// 優點：解耦、可靠
async function asynchronousCommunication() {
  // Commerce 衛星發佈事件
  await eventBus.publish('order:created', {
    orderId: '123',
    items: [...]
  })

  // Payment 衛星非同步處理
  eventBus.subscribe('order:created', async (event) => {
    const result = await processPayment(event.orderId)
    await eventBus.publish('payment:completed', result)
  })
}
```

### 5.3 請求/回應模式（RPC）

```typescript
// 混合方案：非同步但需要回應
class RPC {
  async call<T>(serviceName: string, method: string, args: any): Promise<T> {
    const requestId = crypto.randomUUID()

    // 發佈請求
    await eventBus.publish(`rpc:${serviceName}:${method}`, {
      requestId,
      args
    })

    // 等待回應（超時 30 秒）
    return new Promise((resolve, reject) => {
      const handler = (response: any) => {
        if (response.requestId === requestId) {
          eventBus.unsubscribe(`rpc:response:${requestId}`, handler)
          clearTimeout(timeout)
          resolve(response.result)
        }
      }

      eventBus.subscribe(`rpc:response:${requestId}`, handler)

      const timeout = setTimeout(() => {
        eventBus.unsubscribe(`rpc:response:${requestId}`, handler)
        reject(new Error('RPC timeout'))
      }, 30000)
    })
  }
}
```

---

## 6. 災難恢復與故障轉移 (Disaster Recovery)

### 6.1 健康檢查

```typescript
class HealthChecker {
  async check(serviceName: string, instance: ServiceInstance): Promise<boolean> {
    try {
      const response = await fetch(
        `http://${instance.host}:${instance.port}/health`,
        { timeout: 5000 }
      )

      return response.status === 200
    } catch (error) {
      return false
    }
  }

  async monitorServices(services: Map<string, ServiceInstance[]>): Promise<void> {
    setInterval(async () => {
      for (const [serviceName, instances] of services) {
        for (const instance of instances) {
          const healthy = await this.check(serviceName, instance)

          if (!healthy) {
            logger.error(`Service ${serviceName}:${instance.id} is unhealthy`)

            // 從負載均衡器移除
            await registry.unregister(serviceName, instance.id)

            // 自動重啟（需要容器編排支援）
            await restartInstance(instance)
          }
        }
      }
    }, 10000)
  }
}
```

### 6.2 斷路器模式

```typescript
enum CircuitState {
  CLOSED = 'closed',      // 正常
  OPEN = 'open',          // 故障，拒絕請求
  HALF_OPEN = 'half-open' // 測試恢復
}

class CircuitBreaker {
  private state = CircuitState.CLOSED
  private failureCount = 0
  private lastFailureTime = 0
  private readonly failureThreshold = 5
  private readonly resetTimeout = 60000

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      // 檢查是否應轉為 HALF_OPEN
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = CircuitState.HALF_OPEN
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }

    try {
      const result = await fn()

      if (this.state === CircuitState.HALF_OPEN) {
        // 恢復成功
        this.state = CircuitState.CLOSED
        this.failureCount = 0
      }

      return result
    } catch (error) {
      this.failureCount++
      this.lastFailureTime = Date.now()

      if (this.failureCount >= this.failureThreshold) {
        this.state = CircuitState.OPEN
        logger.error('Circuit breaker opened')
      }

      throw error
    }
  }
}

// 使用
const breaker = new CircuitBreaker()

app.get('/api/product/:id', async (ctx) => {
  try {
    const product = await breaker.call(() =>
      catalog.getProduct(ctx.param('id'))
    )
    return ctx.json(product)
  } catch (error) {
    return ctx.status(503).json({ error: 'Service temporarily unavailable' })
  }
})
```

---

## 7. 數據一致性策略 (Data Consistency Strategies)

### 7.1 事件溯源（Event Sourcing）

```typescript
// 不存儲當前狀態，而是存儲事件歷史
interface Event {
  id: string
  aggregate: string  // 如 'order-123'
  type: string       // 如 'OrderCreated'
  data: any
  timestamp: number
  version: number
}

class EventStore {
  async append(event: Event): Promise<void> {
    // 以附加日誌方式存儲事件
    await db('events').insert(event)
  }

  async getEvents(aggregate: string): Promise<Event[]> {
    // 重現狀態
    return db('events')
      .where('aggregate', aggregate)
      .orderBy('version', 'asc')
  }

  async rebuild(aggregate: string): Promise<any> {
    const events = await this.getEvents(aggregate)
    let state = { id: aggregate, version: 0 }

    for (const event of events) {
      state = applyEvent(state, event)
    }

    return state
  }
}

// 優點：完整的審計日誌、可恢復、可重現
// 缺點：查詢複雜、存儲量大
```

### 7.2 CQRS（命令查詢責任分離）

```typescript
// 分離讀寫模型
class CommandHandler {
  // 處理寫操作（改變狀態）
  async handle(command: CreateOrderCommand): Promise<void> {
    const event = new OrderCreatedEvent(command.customerId, command.items)
    await eventStore.append(event)

    // 異步更新讀模型
    await eventBus.publish('order:created', event)
  }
}

class QueryHandler {
  // 處理讀操作（查詢優化的視圖）
  async getOrder(orderId: string): Promise<Order> {
    // 從讀優化的表查詢（可能是物化視圖）
    return db('order_view').where('id', orderId).first()
  }

  async searchOrders(filters: any): Promise<Order[]> {
    // 使用搜索索引（Elasticsearch）
    return elasticsearch.search('orders', filters)
  }
}

// 優點：分離讀寫、可獨立優化、支援複雜查詢
// 缺點：數據一致性延遲、複雜度增加
```

---

## 8. 相關文檔與資源

- **[分佈式系統原理](https://en.wikipedia.org/wiki/Distributed_computing)** - 基礎概念
- **[Saga 模式](https://microservices.io/patterns/data/saga.html)** - 分佈式事務
- **[服務網格 Istio](https://istio.io/)** - 服務間通訊管理
- **[Kubernetes 故障轉移](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)** - 容器編排

---

**撰寫日期**：2026-02-08
**版本**：1.0
