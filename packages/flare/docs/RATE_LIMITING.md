# Rate Limiting 限流機制

## 概述

Rate Limiting 限流機制使用 Token Bucket 演算法，為不同的通知通道提供靈活的速率控制，防止短時間內發送過多通知，保護下游服務。

## 快速開始

### 基本使用

```typescript
import { NotificationManager, RateLimitMiddleware } from '@gravito/flare'

const manager = new NotificationManager(core)

// 註冊限流中介層
const rateLimiter = new RateLimitMiddleware({
  email: { maxPerSecond: 10 },    // 每秒最多 10 封郵件
  sms: { maxPerSecond: 5 }         // 每秒最多 5 則簡訊
})

manager.use(rateLimiter)
```

### 多時間窗口限流

```typescript
const rateLimiter = new RateLimitMiddleware({
  email: {
    maxPerSecond: 10,   // 每秒 10 封
    maxPerMinute: 100,  // 每分鐘 100 封
    maxPerHour: 1000    // 每小時 1000 封
  }
})
```

### 監控限流狀態

```typescript
// 查看當前狀態
const status = rateLimiter.getStatus('email')
console.log(`剩餘額度: ${status.second}/${config.email.maxPerSecond}`)

// 手動重置
rateLimiter.reset('email')
```

## 核心特性

### 1. Token Bucket 演算法
- 自動補充 tokens
- 容量上限控制
- 高效能記憶體操作

### 2. 多時間窗口
- `maxPerSecond` - 每秒限制
- `maxPerMinute` - 每分鐘限制
- `maxPerHour` - 每小時限制

### 3. 通道獨立
- 不同通道獨立計數
- 互不干擾
- 靈活配置

### 4. 分散式支援
```typescript
class RedisStore implements CacheStore {
  async get<T>(key: string): Promise<T | null> { /* ... */ }
  async put<T>(key: string, value: T, ttl: number): Promise<void> { /* ... */ }
  async forget(key: string): Promise<void> { /* ... */ }
}

const rateLimiter = new RateLimitMiddleware(config, new RedisStore())
```

## 中介層系統

### 註冊多個中介層

```typescript
// 1. 日誌
manager.use(loggingMiddleware)

// 2. 限流
manager.use(rateLimiter)

// 3. 監控
manager.use(monitoringMiddleware)

// 執行順序: logging → rate-limit → monitoring → channel.send
```

### 自定義中介層

```typescript
const customMiddleware: ChannelMiddleware = {
  name: 'custom',
  async handle(notification, notifiable, channel, next) {
    // 發送前邏輯
    console.log('Before send')

    await next()

    // 發送後邏輯
    console.log('After send')
  }
}

manager.use(customMiddleware)
```

## API 參考

### RateLimitMiddleware

```typescript
class RateLimitMiddleware implements ChannelMiddleware {
  constructor(
    config: RateLimitConfig,
    store?: CacheStore
  )

  getStatus(channel: string): {
    second?: number
    minute?: number
    hour?: number
  }

  reset(channel: string): void
}
```

### TokenBucket

```typescript
class TokenBucket {
  constructor(
    capacity: number,
    refillRate: number
  )

  tryConsume(tokens?: number): boolean
  getTokens(): number
}
```

### ChannelMiddleware

```typescript
interface ChannelMiddleware {
  name: string
  handle(
    notification: Notification,
    notifiable: Notifiable,
    channel: string,
    next: () => Promise<void>
  ): Promise<void>
}
```

## 錯誤處理

### 超過限流

```typescript
try {
  await manager.send(user, notification)
} catch (error) {
  if (error.message.includes('Rate limit exceeded')) {
    console.log('請稍後再試')
  }
}
```

### 錯誤訊息格式

```
Rate limit exceeded for channel 'email' (secondly limit). Please try again later.
```

## 效能考量

### 記憶體使用
- 每個通道每個時間窗口：~48 bytes
- 例如 3 通道 × 3 窗口 ≈ 432 bytes
- 極低的記憶體開銷

### CPU 使用
- Token 補充：O(1)
- 消耗操作：O(1)
- 適合高併發場景

## 最佳實踐

### 1. 合理設定限流參數
```typescript
{
  // 瞬時高峰保護
  maxPerSecond: 10,

  // 持續流量控制
  maxPerMinute: 100,

  // 每日總量控制
  maxPerHour: 1000
}
```

### 2. 使用分散式儲存
在多實例環境下使用 Redis：
```typescript
const redisStore = new RedisStore(redisClient)
const rateLimiter = new RateLimitMiddleware(config, redisStore)
```

### 3. 監控限流狀態
定期檢查限流狀態，避免意外阻塞：
```typescript
setInterval(() => {
  const status = rateLimiter.getStatus('email')
  if (status.second < 2) {
    logger.warn('Email 限流即將達到上限')
  }
}, 5000)
```

### 4. 優雅降級
```typescript
try {
  await manager.send(user, notification)
} catch (error) {
  if (error.message.includes('Rate limit exceeded')) {
    // 降級處理：儲存到佇列，稍後重試
    await queue.add({ user, notification })
  }
}
```

## 範例

完整的使用範例請參考：
- `/packages/flare/examples/rate-limiting-example.ts`

## 相關文檔

- [Phase 3 實作總結](../PHASE3_RATE_LIMITING_SUMMARY.md)
- [測試報告](../tests/)
- [API 文檔](../README.md)
