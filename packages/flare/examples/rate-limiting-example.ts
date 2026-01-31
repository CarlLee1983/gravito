/**
 * Rate Limiting 使用範例
 *
 * 此範例展示如何使用 RateLimitMiddleware 來限制通知發送速率，
 * 保護下游服務免受過載。
 */

import { PlanetCore } from '@gravito/core'
import {
  MailChannel,
  type MailMessage,
  type Notifiable,
  Notification,
  NotificationManager,
  RateLimitMiddleware,
  SmsChannel,
  type SmsMessage,
} from '@gravito/flare'

// ============================================================================
// 1. 基本使用：單一時間窗口限流
// ============================================================================

async function basicRateLimiting() {
  const core = new PlanetCore()
  const manager = new NotificationManager(core)

  // 註冊限流中介層
  const rateLimiter = new RateLimitMiddleware({
    email: {
      maxPerSecond: 10, // 每秒最多 10 封郵件
    },
    sms: {
      maxPerSecond: 5, // 每秒最多 5 則簡訊
    },
  })

  manager.use(rateLimiter)

  // 註冊通道
  manager.channel(
    'email',
    new MailChannel({
      /* 配置 */
    } as any)
  )
  manager.channel(
    'sms',
    new SmsChannel({
      /* 配置 */
    } as any)
  )

  // 定義通知
  class OrderConfirmation extends Notification {
    constructor(private orderId: string) {
      super()
    }

    via(_notifiable: Notifiable): string[] {
      return ['email', 'sms']
    }

    toMail(_notifiable: Notifiable): MailMessage {
      return {
        subject: `訂單確認 #${this.orderId}`,
        html: `您的訂單 ${this.orderId} 已確認`,
      }
    }

    toSms(_notifiable: Notifiable): SmsMessage {
      return {
        to: '+886912345678',
        message: `訂單 ${this.orderId} 已確認`,
      }
    }
  }

  // 發送通知
  const user: Notifiable = {
    getNotifiableId: () => 'user-123',
  }

  try {
    await manager.send(user, new OrderConfirmation('ORD-001'))
    console.log('✓ 通知發送成功')
  } catch (error) {
    if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
      console.error('✗ 超過發送速率限制，請稍後再試')
    }
  }
}

// ============================================================================
// 2. 進階使用：多時間窗口限流
// ============================================================================

async function multiWindowRateLimiting() {
  const core = new PlanetCore()
  const manager = new NotificationManager(core)

  // 配置多個時間窗口
  const rateLimiter = new RateLimitMiddleware({
    email: {
      maxPerSecond: 10, // 每秒 10 封
      maxPerMinute: 100, // 每分鐘 100 封
      maxPerHour: 1000, // 每小時 1000 封
    },
    sms: {
      maxPerSecond: 5,
      maxPerMinute: 50,
      maxPerHour: 200,
    },
  })

  manager.use(rateLimiter)

  // 批次發送時會受到限流保護
  const users: Notifiable[] = Array.from({ length: 100 }, (_, i) => ({
    getNotifiableId: () => `user-${i}`,
  }))

  class Newsletter extends Notification {
    via(_notifiable: Notifiable): string[] {
      return ['email']
    }

    toMail(_notifiable: Notifiable): MailMessage {
      return {
        subject: '本週電子報',
        html: '<h1>最新消息</h1>',
      }
    }
  }

  const result = await manager.sendBatch(users, new Newsletter())
  console.log(`成功發送: ${result.success}/${result.total}`)
  console.log(`失敗: ${result.failed}`)
}

// ============================================================================
// 3. 監控與管理
// ============================================================================

async function monitoringAndManagement() {
  const core = new PlanetCore()
  const manager = new NotificationManager(core)

  const rateLimiter = new RateLimitMiddleware({
    email: {
      maxPerSecond: 10,
      maxPerMinute: 100,
      maxPerHour: 1000,
    },
  })

  manager.use(rateLimiter)

  // 檢查當前限流狀態
  const status = rateLimiter.getStatus('email')
  console.log('Email 限流狀態:')
  console.log(`  每秒剩餘: ${status.second}/10`)
  console.log(`  每分鐘剩餘: ${status.minute}/100`)
  console.log(`  每小時剩餘: ${status.hour}/1000`)

  // 手動重置限流（例如在測試環境或緊急情況下）
  rateLimiter.reset('email')
  console.log('✓ Email 限流已重置')

  // 再次檢查狀態
  const resetStatus = rateLimiter.getStatus('email')
  console.log(`重置後每秒剩餘: ${resetStatus.second}/10`)
}

// ============================================================================
// 4. 多中介層組合
// ============================================================================

async function multipleMiddlewares() {
  const core = new PlanetCore()
  const manager = new NotificationManager(core)

  // 1. 日誌記錄中介層
  manager.use({
    name: 'logger',
    async handle(notification, _notifiable, channel, next) {
      console.log(`[LOG] 準備發送 ${notification.constructor.name} 到 ${channel}`)
      const start = Date.now()
      await next()
      const duration = Date.now() - start
      console.log(`[LOG] 發送完成，耗時 ${duration}ms`)
    },
  })

  // 2. 限流中介層
  const rateLimiter = new RateLimitMiddleware({
    email: { maxPerSecond: 10 },
  })
  manager.use(rateLimiter)

  // 3. 重試計數中介層
  let retryCount = 0
  manager.use({
    name: 'retry-counter',
    async handle(_notification, _notifiable, _channel, next) {
      try {
        await next()
      } catch (error) {
        retryCount++
        console.log(`[RETRY] 第 ${retryCount} 次重試`)
        throw error
      }
    },
  })

  // 中介層會按照註冊順序執行：logger -> rate-limiter -> retry-counter -> channel.send
}

// ============================================================================
// 5. 分散式限流（使用 Redis）
// ============================================================================

async function distributedRateLimiting() {
  // 自定義 Redis Store
  class RedisStore {
    async get<T>(_key: string): Promise<T | null> {
      // 從 Redis 獲取值
      // const value = await redis.get(key)
      // return value ? JSON.parse(value) : null
      return null
    }

    async put<T>(_key: string, _value: T, _ttl: number): Promise<void> {
      // 儲存到 Redis 並設定過期時間
      // await redis.setex(key, ttl, JSON.stringify(value))
    }

    async forget(_key: string): Promise<void> {
      // 從 Redis 刪除
      // await redis.del(key)
    }
  }

  const core = new PlanetCore()
  const manager = new NotificationManager(core)

  // 使用 Redis Store 實現分散式限流
  const redisStore = new RedisStore()
  const rateLimiter = new RateLimitMiddleware(
    {
      email: { maxPerSecond: 100 },
    },
    redisStore
  )

  manager.use(rateLimiter)

  // 現在多個應用實例會共享同一個限流計數器
  console.log('✓ 分散式限流已啟用')
}

// ============================================================================
// 6. 條件限流
// ============================================================================

async function conditionalRateLimiting() {
  const core = new PlanetCore()
  const manager = new NotificationManager(core)

  // 自定義中介層：根據使用者類型應用不同的限流
  manager.use({
    name: 'conditional-rate-limit',
    async handle(_notification, notifiable, _channel, next) {
      const userId = notifiable.getNotifiableId()
      const isPremiumUser = userId.toString().startsWith('premium-')

      if (isPremiumUser) {
        // Premium 使用者無限流
        await next()
      } else {
        // 一般使用者需要限流
        // 這裡可以使用不同的 RateLimitMiddleware 實例
        await next()
      }
    },
  })

  // 基礎限流
  const rateLimiter = new RateLimitMiddleware({
    email: { maxPerSecond: 5 },
  })
  manager.use(rateLimiter)
}

// ============================================================================
// 執行範例
// ============================================================================

async function main() {
  console.log('\n=== 1. 基本限流 ===')
  await basicRateLimiting()

  console.log('\n=== 2. 多時間窗口限流 ===')
  await multiWindowRateLimiting()

  console.log('\n=== 3. 監控與管理 ===')
  await monitoringAndManagement()

  console.log('\n=== 4. 多中介層組合 ===')
  await multipleMiddlewares()

  console.log('\n=== 5. 分散式限流 ===')
  await distributedRateLimiting()

  console.log('\n=== 6. 條件限流 ===')
  await conditionalRateLimiting()
}

// 如果直接執行此檔案
if (import.meta.main) {
  main().catch(console.error)
}
