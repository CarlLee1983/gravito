/**
 * Middleware Priority 測試
 *
 * 測試中介層優先級功能，包括：
 * - 基本優先級排序（高優先級先執行）
 * - 同優先級維持註冊順序（stable sort）
 * - 預設優先級（0）
 * - 內建中介層的優先級設定
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PreferenceMiddleware } from '../src/middleware/PreferenceMiddleware'
import { RateLimitMiddleware } from '../src/middleware/RateLimitMiddleware'
import { Notification } from '../src/Notification'
import { NotificationManager } from '../src/NotificationManager'
import type { Notifiable, PlanetCore } from '../src/types'
import { type ChannelMiddleware, MiddlewarePriority } from '../src/types/middleware'

// Mock PlanetCore
const mockCore: PlanetCore = {
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  hooks: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  },
} as any

// Mock Notification
class TestNotification extends Notification {
  via(_notifiable: Notifiable): string[] {
    return ['test']
  }
}

// Mock Notifiable
const mockNotifiable: Notifiable = {
  getNotifiableId: () => 1,
  getNotifiableType: () => 'user',
}

describe('Middleware Priority', () => {
  let manager: NotificationManager
  let executionOrder: string[]

  beforeEach(() => {
    manager = new NotificationManager(mockCore)
    executionOrder = []
  })

  /**
   * 建立測試用的中介層
   */
  function createTestMiddleware(name: string, priority?: number): ChannelMiddleware {
    return {
      name,
      priority,
      async handle(_notification, _notifiable, _channel, next) {
        executionOrder.push(name)
        await next()
      },
    }
  }

  describe('Basic Priority Ordering', () => {
    it('應該按優先級降序執行中介層（高優先級先執行）', async () => {
      const middleware1 = createTestMiddleware('low', 10)
      const middleware2 = createTestMiddleware('high', 100)
      const middleware3 = createTestMiddleware('medium', 50)

      manager.use(middleware1)
      manager.use(middleware2)
      manager.use(middleware3)

      // Register mock channel
      manager.channel('test', {
        send: vi.fn(),
      })

      await manager.send(mockNotifiable, new TestNotification())

      // 應該按優先級降序執行：high(100) -> medium(50) -> low(10)
      expect(executionOrder).toEqual(['high', 'medium', 'low'])
    })

    it('應該在同優先級時維持註冊順序（stable sort）', async () => {
      const middleware1 = createTestMiddleware('first', 50)
      const middleware2 = createTestMiddleware('second', 50)
      const middleware3 = createTestMiddleware('third', 50)

      manager.use(middleware1)
      manager.use(middleware2)
      manager.use(middleware3)

      manager.channel('test', {
        send: vi.fn(),
      })

      await manager.send(mockNotifiable, new TestNotification())

      // 同優先級應該維持註冊順序
      expect(executionOrder).toEqual(['first', 'second', 'third'])
    })
  })

  describe('Default Priority', () => {
    it('沒有設定 priority 的中介層應該使用預設值 0', async () => {
      const middleware1 = createTestMiddleware('no-priority') // undefined -> 0
      const middleware2 = createTestMiddleware('high', 100)
      const middleware3 = createTestMiddleware('low', -50)

      manager.use(middleware1)
      manager.use(middleware2)
      manager.use(middleware3)

      manager.channel('test', {
        send: vi.fn(),
      })

      await manager.send(mockNotifiable, new TestNotification())

      // high(100) -> no-priority(0) -> low(-50)
      expect(executionOrder).toEqual(['high', 'no-priority', 'low'])
    })
  })

  describe('Mixed Priority Scenarios', () => {
    it('應該正確處理混合優先級和同優先級的中介層', async () => {
      const m1 = createTestMiddleware('security-1', MiddlewarePriority.SECURITY) // 100
      const m2 = createTestMiddleware('security-2', MiddlewarePriority.SECURITY) // 100
      const m3 = createTestMiddleware('rate-limit', MiddlewarePriority.RATE_LIMIT) // 80
      const m4 = createTestMiddleware('validation', MiddlewarePriority.VALIDATION) // 50
      const m5 = createTestMiddleware('default-1', MiddlewarePriority.DEFAULT) // 0
      const m6 = createTestMiddleware('default-2') // undefined -> 0
      const m7 = createTestMiddleware('logging', MiddlewarePriority.LOGGING) // -50
      const m8 = createTestMiddleware('monitoring', MiddlewarePriority.MONITORING) // -100

      manager.use(m1)
      manager.use(m2)
      manager.use(m3)
      manager.use(m4)
      manager.use(m5)
      manager.use(m6)
      manager.use(m7)
      manager.use(m8)

      manager.channel('test', {
        send: vi.fn(),
      })

      await manager.send(mockNotifiable, new TestNotification())

      // 預期順序：
      // security-1, security-2 (100, 維持註冊順序)
      // rate-limit (80)
      // validation (50)
      // default-1, default-2 (0, 維持註冊順序)
      // logging (-50)
      // monitoring (-100)
      expect(executionOrder).toEqual([
        'security-1',
        'security-2',
        'rate-limit',
        'validation',
        'default-1',
        'default-2',
        'logging',
        'monitoring',
      ])
    })
  })

  describe('Built-in Middleware Priorities', () => {
    it('RateLimitMiddleware 應該有 RATE_LIMIT 優先級', () => {
      const rateLimiter = new RateLimitMiddleware({
        test: { maxPerSecond: 10 },
      })

      expect(rateLimiter.priority).toBe(MiddlewarePriority.RATE_LIMIT)
      expect(rateLimiter.priority).toBe(80)
    })

    it('PreferenceMiddleware 應該有 VALIDATION 優先級', () => {
      const preference = new PreferenceMiddleware()

      expect(preference.priority).toBe(MiddlewarePriority.VALIDATION)
      expect(preference.priority).toBe(50)
    })

    it('RateLimitMiddleware 應該在 PreferenceMiddleware 之前執行', async () => {
      const rateLimiter = new RateLimitMiddleware({
        test: { maxPerSecond: 10 },
      })
      const preference = new PreferenceMiddleware()

      // 包裝中介層來記錄執行順序
      const wrappedRateLimiter: ChannelMiddleware = {
        name: rateLimiter.name,
        priority: rateLimiter.priority,
        async handle(notification, notifiable, channel, next) {
          executionOrder.push('rate-limit')
          await rateLimiter.handle(notification, notifiable, channel, next)
        },
      }

      const wrappedPreference: ChannelMiddleware = {
        name: preference.name,
        priority: preference.priority,
        async handle(notification, notifiable, channel, next) {
          executionOrder.push('preference')
          await preference.handle(notification, notifiable, channel, next)
        },
      }

      manager.use(wrappedPreference) // 先註冊 preference
      manager.use(wrappedRateLimiter) // 後註冊 rate-limit

      manager.channel('test', {
        send: vi.fn(),
      })

      await manager.send(mockNotifiable, new TestNotification())

      // 即使 preference 先註冊，rate-limit (80) 應該在 preference (50) 之前執行
      expect(executionOrder).toEqual(['rate-limit', 'preference'])
    })
  })

  describe('Lazy Sorting', () => {
    it('應該只在第一次執行時排序一次（lazy evaluation）', async () => {
      const m1 = createTestMiddleware('first', 100)
      const m2 = createTestMiddleware('second', 50)

      manager.use(m1)
      manager.use(m2)

      manager.channel('test', {
        send: vi.fn(),
      })

      // 第一次執行
      await manager.send(mockNotifiable, new TestNotification())
      expect(executionOrder).toEqual(['first', 'second'])

      // 清空執行順序
      executionOrder = []

      // 第二次執行（應該使用已排序的結果）
      await manager.send(mockNotifiable, new TestNotification())
      expect(executionOrder).toEqual(['first', 'second'])
    })

    it('當新增新的中介層時應該重新排序', async () => {
      const m1 = createTestMiddleware('first', 100)
      const m2 = createTestMiddleware('second', 50)

      manager.use(m1)
      manager.use(m2)

      manager.channel('test', {
        send: vi.fn(),
      })

      // 第一次執行
      await manager.send(mockNotifiable, new TestNotification())
      expect(executionOrder).toEqual(['first', 'second'])

      // 新增新的中介層
      const m3 = createTestMiddleware('third', 80)
      manager.use(m3)

      // 清空執行順序
      executionOrder = []

      // 第二次執行（應該包含新的中介層，並重新排序）
      await manager.send(mockNotifiable, new TestNotification())
      expect(executionOrder).toEqual(['first', 'third', 'second'])
    })
  })

  describe('MiddlewarePriority Constants', () => {
    it('應該導出所有優先級常數', () => {
      expect(MiddlewarePriority.SECURITY).toBe(100)
      expect(MiddlewarePriority.RATE_LIMIT).toBe(80)
      expect(MiddlewarePriority.VALIDATION).toBe(50)
      expect(MiddlewarePriority.DEFAULT).toBe(0)
      expect(MiddlewarePriority.LOGGING).toBe(-50)
      expect(MiddlewarePriority.MONITORING).toBe(-100)
    })
  })
})
