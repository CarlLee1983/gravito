import { describe, expect, it, jest } from 'bun:test'
import { RateLimitMiddleware } from '../src/middleware/RateLimitMiddleware'
import { Notification } from '../src/Notification'
import { NotificationManager } from '../src/NotificationManager'
import type { Notifiable } from '../src/types'

const user: Notifiable = {
  getNotifiableId: () => 'user-123',
  getNotifiableType: () => 'user',
}

class TestNotification extends Notification {
  via(_notifiable: Notifiable): string[] {
    return ['email', 'sms']
  }
}

describe('Rate Limit Integration', () => {
  it('應該整合 RateLimitMiddleware 到 NotificationManager', async () => {
    const core = {
      logger: { warn: jest.fn(), error: jest.fn() },
      hooks: { emit: jest.fn() },
    }
    const manager = new NotificationManager(core as any)

    // 註冊限流中介層
    const rateLimiter = new RateLimitMiddleware({
      email: { maxPerSecond: 3 },
      sms: { maxPerSecond: 2 },
    })
    manager.use(rateLimiter)

    // 註冊通道
    let emailCount = 0
    let smsCount = 0

    manager.channel('email', {
      send: async () => {
        emailCount++
      },
    })

    manager.channel('sms', {
      send: async () => {
        smsCount++
      },
    })

    const notification = new TestNotification()

    // 發送 5 次通知
    const results = []
    for (let i = 0; i < 5; i++) {
      const result = await manager.send(user, notification)
      results.push(result)
    }

    // Email 應該只發送 3 次（限流）
    expect(emailCount).toBe(3)
    // SMS 應該只發送 2 次（限流）
    expect(smsCount).toBe(2)

    // 檢查失敗的結果
    const failedResults = results.filter((r) => !r.allSuccess)
    expect(failedResults.length).toBeGreaterThan(0)
  })

  it('應該支援多個中介層按順序執行', async () => {
    const executionOrder: string[] = []

    const core = {
      logger: { warn: jest.fn(), error: jest.fn() },
      hooks: { emit: jest.fn() },
    }
    const manager = new NotificationManager(core as any)

    // 第一個中介層：記錄
    manager.use({
      name: 'logger',
      handle: async (_notification, _notifiable, channel, next) => {
        executionOrder.push(`before-logger-${channel}`)
        await next()
        executionOrder.push(`after-logger-${channel}`)
      },
    })

    // 第二個中介層：限流
    const rateLimiter = new RateLimitMiddleware({
      email: { maxPerSecond: 10 },
    })
    manager.use(rateLimiter)

    // 第三個中介層：監控
    manager.use({
      name: 'monitor',
      handle: async (_notification, _notifiable, channel, next) => {
        executionOrder.push(`before-monitor-${channel}`)
        await next()
        executionOrder.push(`after-monitor-${channel}`)
      },
    })

    manager.channel('email', {
      send: async () => {
        executionOrder.push('send-email')
      },
    })

    const notification = new TestNotification()
    await manager.send(user, notification)

    // 驗證執行順序
    expect(executionOrder).toContain('before-logger-email')
    expect(executionOrder).toContain('before-monitor-email')
    expect(executionOrder).toContain('send-email')
    expect(executionOrder).toContain('after-monitor-email')
    expect(executionOrder).toContain('after-logger-email')

    // 驗證洋蔥模型順序
    const loggerBeforeIndex = executionOrder.indexOf('before-logger-email')
    const monitorBeforeIndex = executionOrder.indexOf('before-monitor-email')
    const sendIndex = executionOrder.indexOf('send-email')
    const monitorAfterIndex = executionOrder.indexOf('after-monitor-email')
    const loggerAfterIndex = executionOrder.indexOf('after-logger-email')

    expect(loggerBeforeIndex).toBeLessThan(monitorBeforeIndex)
    expect(monitorBeforeIndex).toBeLessThan(sendIndex)
    expect(sendIndex).toBeLessThan(monitorAfterIndex)
    expect(monitorAfterIndex).toBeLessThan(loggerAfterIndex)
  })

  it('中介層錯誤應該阻止通知發送', async () => {
    const core = {
      logger: { warn: jest.fn(), error: jest.fn() },
      hooks: { emit: jest.fn() },
    }
    const manager = new NotificationManager(core as any)

    // 阻擋中介層
    manager.use({
      name: 'blocker',
      handle: async (_notification, _notifiable, channel) => {
        if (channel === 'email') {
          throw new Error('Email blocked by middleware')
        }
      },
    })

    let emailSent = false
    manager.channel('email', {
      send: async () => {
        emailSent = true
      },
    })

    const notification = new TestNotification()
    const result = await manager.send(user, notification)

    // Email 不應該被發送
    expect(emailSent).toBe(false)
    // 結果應該包含錯誤
    const emailResult = result.results.find((r) => r.channel === 'email')
    expect(emailResult?.success).toBe(false)
    expect(emailResult?.error?.message).toContain('blocked')
  })

  it('應該在時間經過後允許新的請求', async () => {
    const core = {
      logger: { warn: jest.fn(), error: jest.fn() },
      hooks: { emit: jest.fn() },
    }
    const manager = new NotificationManager(core as any)

    const rateLimiter = new RateLimitMiddleware({
      email: { maxPerSecond: 2 },
    })
    manager.use(rateLimiter)

    let emailCount = 0
    manager.channel('email', {
      send: async () => {
        emailCount++
      },
    })

    const notification = new TestNotification()

    // 發送 2 次應該成功
    await manager.send(user, notification)
    await manager.send(user, notification)
    expect(emailCount).toBe(2)

    // 第 3 次應該失敗
    const result3 = await manager.send(user, notification)
    expect(result3.allSuccess).toBe(false)
    expect(emailCount).toBe(2) // 沒有增加

    // 等待 1 秒讓 tokens 補充
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // 現在應該可以再次發送
    const result4 = await manager.send(user, notification)
    const emailResult = result4.results.find((r) => r.channel === 'email')
    expect(emailResult?.success).toBe(true)
    expect(emailCount).toBeGreaterThan(2)
  })

  it('應該支援監控限流狀態', async () => {
    const core = {
      logger: { warn: jest.fn(), error: jest.fn() },
      hooks: { emit: jest.fn() },
    }
    const manager = new NotificationManager(core as any)

    const rateLimiter = new RateLimitMiddleware({
      email: {
        maxPerSecond: 10,
        maxPerMinute: 50,
        maxPerHour: 200,
      },
    })
    manager.use(rateLimiter)

    manager.channel('email', {
      send: async () => {},
    })

    const notification = new TestNotification()

    // 檢查初始狀態
    const initialStatus = rateLimiter.getStatus('email')
    expect(initialStatus.second).toBe(10)
    expect(initialStatus.minute).toBe(50)
    expect(initialStatus.hour).toBe(200)

    // 發送幾次
    await manager.send(user, notification)
    await manager.send(user, notification)

    // 檢查狀態變化
    const afterStatus = rateLimiter.getStatus('email')
    expect(afterStatus.second).toBeLessThan(10)
    expect(afterStatus.minute).toBeLessThan(50)
    expect(afterStatus.hour).toBeLessThan(200)
  })

  it('應該支援手動重置限流', async () => {
    const core = {
      logger: { warn: jest.fn(), error: jest.fn() },
      hooks: { emit: jest.fn() },
    }
    const manager = new NotificationManager(core as any)

    const rateLimiter = new RateLimitMiddleware({
      email: { maxPerSecond: 1 },
    })
    manager.use(rateLimiter)

    let emailCount = 0
    manager.channel('email', {
      send: async () => {
        emailCount++
      },
    })

    const notification = new TestNotification()

    // 第一次發送成功
    await manager.send(user, notification)
    expect(emailCount).toBe(1)

    // 第二次發送失敗（達到限制）
    const result2 = await manager.send(user, notification)
    expect(result2.allSuccess).toBe(false)
    expect(emailCount).toBe(1)

    // 手動重置
    rateLimiter.reset('email')

    // 現在應該可以再次發送
    await manager.send(user, notification)
    expect(emailCount).toBe(2)
  })
})
