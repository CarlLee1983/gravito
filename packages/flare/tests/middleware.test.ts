import { describe, expect, it, jest } from 'bun:test'
import { Notification } from '../src/Notification'
import { NotificationManager } from '../src/NotificationManager'
import type { Notifiable } from '../src/types'
import type { ChannelMiddleware } from '../src/types/middleware'

const notifiable: Notifiable = {
  getNotifiableId: () => 'user-123',
  getNotifiableType: () => 'user',
}

class TestNotification extends Notification {
  via(_notifiable: Notifiable): string[] {
    return ['test']
  }
}

describe('ChannelMiddleware', () => {
  describe('中介層介面', () => {
    it('應該定義正確的中介層介面', () => {
      const middleware: ChannelMiddleware = {
        name: 'test-middleware',
        handle: async (_notification, _notifiable, _channel, next) => {
          await next()
        },
      }

      expect(middleware.name).toBe('test-middleware')
      expect(typeof middleware.handle).toBe('function')
    })

    it('中介層應該能夠攔截通知發送', async () => {
      let intercepted = false

      const middleware: ChannelMiddleware = {
        name: 'interceptor',
        handle: async (_notification, _notifiable, _channel, next) => {
          intercepted = true
          await next()
        },
      }

      expect(intercepted).toBe(false)
      await middleware.handle(new TestNotification(), notifiable, 'test', async () => {})
      expect(intercepted).toBe(true)
    })

    it('中介層應該能夠修改或阻止發送流程', async () => {
      let sendExecuted = false

      const blockingMiddleware: ChannelMiddleware = {
        name: 'blocker',
        handle: async (_notification, _notifiable, channel) => {
          // 不呼叫 next()，阻止後續執行
          if (channel === 'blocked') {
            return
          }
        },
      }

      // 這個不應該被執行
      await blockingMiddleware.handle(new TestNotification(), notifiable, 'blocked', async () => {
        sendExecuted = true
      })
      expect(sendExecuted).toBe(false)
    })

    it('中介層應該能夠鏈式執行', async () => {
      const executionOrder: string[] = []

      const middleware1: ChannelMiddleware = {
        name: 'first',
        handle: async (_notification, _notifiable, _channel, next) => {
          executionOrder.push('before-1')
          await next()
          executionOrder.push('after-1')
        },
      }

      const middleware2: ChannelMiddleware = {
        name: 'second',
        handle: async (_notification, _notifiable, _channel, next) => {
          executionOrder.push('before-2')
          await next()
          executionOrder.push('after-2')
        },
      }

      await middleware1.handle(new TestNotification(), notifiable, 'test', async () => {
        await middleware2.handle(new TestNotification(), notifiable, 'test', async () => {
          executionOrder.push('core')
        })
      })

      expect(executionOrder).toEqual(['before-1', 'before-2', 'core', 'after-2', 'after-1'])
    })
  })

  describe('NotificationManager 中介層整合', () => {
    it('NotificationManager 應該支援註冊中介層', () => {
      const core = {
        logger: { warn: jest.fn(), error: jest.fn() },
        hooks: { emit: jest.fn() },
      }
      const manager = new NotificationManager(core as any)

      const _middleware: ChannelMiddleware = {
        name: 'test',
        handle: async (_notification, _notifiable, _channel, next) => {
          await next()
        },
      }

      // 測試 use 方法存在
      expect(typeof (manager as any).use).toBe('function')
    })

    it('中介層應該在發送通知時被執行', async () => {
      let middlewareExecuted = false
      const core = {
        logger: { warn: jest.fn(), error: jest.fn() },
        hooks: { emit: jest.fn() },
      }
      const manager = new NotificationManager(core as any)

      const middleware: ChannelMiddleware = {
        name: 'tracker',
        handle: async (_notification, _notifiable, _channel, next) => {
          middlewareExecuted = true
          await next()
        },
      }

      if (typeof (manager as any).use === 'function') {
        ;(manager as any).use(middleware)
      }

      let channelExecuted = false
      manager.channel('test', {
        send: async () => {
          channelExecuted = true
        },
      })

      await manager.send(notifiable, new TestNotification())

      // 如果中介層功能已實作，應該被執行
      if (typeof (manager as any).use === 'function') {
        expect(middlewareExecuted).toBe(true)
      }
      expect(channelExecuted).toBe(true)
    })

    it('多個中介層應該按照註冊順序執行', async () => {
      const executionOrder: number[] = []
      const core = {
        logger: { warn: jest.fn(), error: jest.fn() },
        hooks: { emit: jest.fn() },
      }
      const manager = new NotificationManager(core as any)

      const middleware1: ChannelMiddleware = {
        name: 'first',
        handle: async (_notification, _notifiable, _channel, next) => {
          executionOrder.push(1)
          await next()
        },
      }

      const middleware2: ChannelMiddleware = {
        name: 'second',
        handle: async (_notification, _notifiable, _channel, next) => {
          executionOrder.push(2)
          await next()
        },
      }

      if (typeof (manager as any).use === 'function') {
        ;(manager as any).use(middleware1)
        ;(manager as any).use(middleware2)
      }

      manager.channel('test', {
        send: async () => {
          executionOrder.push(3)
        },
      })

      await manager.send(notifiable, new TestNotification())

      // 如果中介層功能已實作
      if (typeof (manager as any).use === 'function') {
        expect(executionOrder).toEqual([1, 2, 3])
      }
    })
  })
})
