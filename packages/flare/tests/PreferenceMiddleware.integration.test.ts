import { describe, expect, it } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { PreferenceMiddleware } from '../src/middleware/PreferenceMiddleware'
import { RateLimitMiddleware } from '../src/middleware/RateLimitMiddleware'
import { Notification } from '../src/Notification'
import { NotificationManager } from '../src/NotificationManager'
import type { Notifiable, NotificationChannel, NotificationPreference } from '../src/types'

// Mock PlanetCore
const mockCore = {
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
  },
  container: {
    make: () => undefined,
  },
  hooks: {
    emit: async () => {},
  },
  emitHook: async () => {},
} as unknown as PlanetCore

// 測試用 Notifiable
const createNotifiable = (overrides: Partial<Notifiable> = {}): Notifiable => ({
  getNotifiableId: () => 'user-123',
  getNotifiableType: () => 'user',
  ...overrides,
})

// 測試用 Notification
class TestNotification extends Notification {
  via(_notifiable: Notifiable): string[] {
    return ['email', 'sms', 'slack']
  }
}

// Mock Channel
class MockChannel implements NotificationChannel {
  public sent: Array<{ notification: Notification; notifiable: Notifiable }> = []

  async send(notification: Notification, notifiable: Notifiable): Promise<void> {
    this.sent.push({ notification, notifiable })
  }

  getSentCount(): number {
    return this.sent.length
  }

  reset(): void {
    this.sent = []
  }
}

describe('PreferenceMiddleware 整合測試', () => {
  describe('與 NotificationManager 整合', () => {
    it('應該正確過濾通道', async () => {
      const manager = new NotificationManager(mockCore)
      const emailChannel = new MockChannel()
      const smsChannel = new MockChannel()

      manager.channel('email', emailChannel)
      manager.channel('sms', smsChannel)

      // 用戶只啟用 email
      const notifiable = createNotifiable({
        getNotificationPreferences: async () => ({
          enabledChannels: ['email'],
        }),
      })

      const preferenceMiddleware = new PreferenceMiddleware()
      manager.use(preferenceMiddleware)

      await manager.send(notifiable, new TestNotification())

      // 只有 email 應該收到通知
      expect(emailChannel.getSentCount()).toBe(1)
      expect(smsChannel.getSentCount()).toBe(0)
    })

    it('應該正確過濾通知類型', async () => {
      const manager = new NotificationManager(mockCore)
      const emailChannel = new MockChannel()

      manager.channel('email', emailChannel)

      // 用戶禁用 TestNotification
      const notifiable = createNotifiable({
        getNotificationPreferences: async () => ({
          disabledNotifications: ['TestNotification'],
        }),
      })

      const preferenceMiddleware = new PreferenceMiddleware()
      manager.use(preferenceMiddleware)

      await manager.send(notifiable, new TestNotification())

      // 不應該有任何通知被發送
      expect(emailChannel.getSentCount()).toBe(0)
    })
  })

  describe('與 RateLimitMiddleware 組合使用', () => {
    it('應該先應用偏好過濾，再應用限流', async () => {
      const manager = new NotificationManager(mockCore)
      const emailChannel = new MockChannel()
      const smsChannel = new MockChannel()

      manager.channel('email', emailChannel)
      manager.channel('sms', smsChannel)

      // 用戶只啟用 email（sms 被偏好過濾掉）
      const notifiable = createNotifiable({
        getNotificationPreferences: async () => ({
          enabledChannels: ['email'],
        }),
      })

      // 先註冊 PreferenceMiddleware，再註冊 RateLimitMiddleware
      const preferenceMiddleware = new PreferenceMiddleware()
      const rateLimitMiddleware = new RateLimitMiddleware({
        email: { maxPerSecond: 1 },
        sms: { maxPerSecond: 1 },
      })

      manager.use(preferenceMiddleware)
      manager.use(rateLimitMiddleware)

      // 發送兩次
      await manager.send(notifiable, new TestNotification())
      await manager.send(notifiable, new TestNotification())

      // Email 第一次應該成功，第二次被限流
      expect(emailChannel.getSentCount()).toBe(1)
      // SMS 應該都被偏好過濾掉（不會觸發限流）
      expect(smsChannel.getSentCount()).toBe(0)
    })

    it('限流中介層應該在偏好過濾之後執行', async () => {
      const manager = new NotificationManager(mockCore)
      const emailChannel = new MockChannel()
      const smsChannel = new MockChannel()

      manager.channel('email', emailChannel)
      manager.channel('sms', smsChannel)

      // 用戶禁用 sms
      const notifiable = createNotifiable({
        getNotificationPreferences: async () => ({
          disabledChannels: ['sms'],
        }),
      })

      const preferenceMiddleware = new PreferenceMiddleware()
      const rateLimitMiddleware = new RateLimitMiddleware({
        sms: { maxPerSecond: 1 },
      })

      manager.use(preferenceMiddleware)
      manager.use(rateLimitMiddleware)

      // 快速發送多次
      for (let i = 0; i < 5; i++) {
        await manager.send(notifiable, new TestNotification())
      }

      // SMS 都應該被偏好過濾掉，不會消耗限流配額
      expect(smsChannel.getSentCount()).toBe(0)
    })
  })

  describe('使用自定義 NotificationPreference 提供者', () => {
    it('應該從自定義提供者載入偏好', async () => {
      const manager = new NotificationManager(mockCore)
      const emailChannel = new MockChannel()
      const smsChannel = new MockChannel()

      manager.channel('email', emailChannel)
      manager.channel('sms', smsChannel)

      // 自定義提供者：VIP 用戶可以用所有通道，普通用戶只能用 email
      const customProvider: NotificationPreference = {
        getUserPreferences: async (notifiable) => {
          if (notifiable.getNotifiableId() === 'vip-user') {
            return {
              enabledChannels: ['email', 'sms'],
              disabledChannels: [],
              disabledNotifications: [],
            }
          }
          return {
            enabledChannels: ['email'],
            disabledChannels: [],
            disabledNotifications: [],
          }
        },
      }

      const preferenceMiddleware = new PreferenceMiddleware(customProvider)
      manager.use(preferenceMiddleware)

      // 測試普通用戶
      const normalUser = createNotifiable({ getNotifiableId: () => 'normal-user' })
      await manager.send(normalUser, new TestNotification())

      expect(emailChannel.getSentCount()).toBe(1)
      expect(smsChannel.getSentCount()).toBe(0)

      // 重置
      emailChannel.reset()
      smsChannel.reset()

      // 測試 VIP 用戶
      const vipUser = createNotifiable({ getNotifiableId: () => 'vip-user' })
      await manager.send(vipUser, new TestNotification())

      expect(emailChannel.getSentCount()).toBe(1)
      expect(smsChannel.getSentCount()).toBe(1)
    })
  })

  describe('多個中介層執行順序', () => {
    it('中介層應該按註冊順序執行', async () => {
      const manager = new NotificationManager(mockCore)
      const emailChannel = new MockChannel()

      manager.channel('email', emailChannel)

      const executionOrder: string[] = []

      // 自定義中介層 1
      const middleware1 = {
        name: 'middleware-1',
        async handle(_n: any, _no: any, _c: any, next: any) {
          executionOrder.push('middleware-1-before')
          await next()
          executionOrder.push('middleware-1-after')
        },
      }

      // PreferenceMiddleware
      const preferenceMiddleware = new PreferenceMiddleware()

      // 自定義中介層 2
      const middleware2 = {
        name: 'middleware-2',
        async handle(_n: any, _no: any, _c: any, next: any) {
          executionOrder.push('middleware-2-before')
          await next()
          executionOrder.push('middleware-2-after')
        },
      }

      manager.use(middleware1)
      manager.use(preferenceMiddleware)
      manager.use(middleware2)

      const notifiable = createNotifiable()
      await manager.send(notifiable, new TestNotification())

      // 應該按照：1-before -> preference -> 2-before -> send -> 2-after -> 1-after
      expect(executionOrder).toEqual([
        'middleware-1-before',
        'middleware-2-before',
        'middleware-2-after',
        'middleware-1-after',
      ])
    })
  })

  describe('容錯測試', () => {
    it('偏好載入失敗時，其他中介層應該仍然執行', async () => {
      const manager = new NotificationManager(mockCore)
      const emailChannel = new MockChannel()

      manager.channel('email', emailChannel)

      // 錯誤的偏好提供者
      const errorProvider: NotificationPreference = {
        getUserPreferences: async () => {
          throw new Error('Database error')
        },
      }

      const preferenceMiddleware = new PreferenceMiddleware(errorProvider)
      manager.use(preferenceMiddleware)

      const notifiable = createNotifiable()
      await manager.send(notifiable, new TestNotification())

      // 應該容錯，通知仍然發送
      expect(emailChannel.getSentCount()).toBe(1)
    })
  })
})
