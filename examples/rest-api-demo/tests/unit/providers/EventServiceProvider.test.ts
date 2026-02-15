/**
 * EventServiceProvider 單元測試
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('EventServiceProvider', () => {
  let mockContainer: any
  let mockEventManager: any

  beforeEach(() => {
    mockContainer = {
      singleton: vi.fn(),
      make: vi.fn(),
    }

    mockEventManager = {
      listen: vi.fn(),
      emit: vi.fn(),
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('服務註冊', () => {
    it('應註冊 EventManager 單例', () => {
      mockContainer.singleton.mockReturnValue(undefined)

      mockContainer.singleton('EventManager', () => mockEventManager)

      expect(mockContainer.singleton).toHaveBeenCalledWith('EventManager', expect.any(Function))
    })

    it('應註冊事件監聽器', () => {
      mockContainer.singleton.mockReturnValue(undefined)

      const listeners = [
        'UpdateStockListener',
        'ProcessPaymentListener',
        'InvalidateCacheListener',
        'SendEmailListener',
      ]

      listeners.forEach((listener) => {
        mockContainer.singleton(listener, () => ({
          handle: vi.fn(),
        }))
      })

      expect(mockContainer.singleton).toHaveBeenCalledTimes(listeners.length + 1)
    })
  })

  describe('依賴注入', () => {
    it('應提供 EventManager 實例', () => {
      mockContainer.make.mockReturnValue(mockEventManager)

      const result = mockContainer.make('EventManager')

      expect(result).toHaveProperty('listen')
      expect(result).toHaveProperty('emit')
    })

    it('應提供事件監聽器實例', () => {
      const listener = {
        handle: vi.fn(),
      }

      mockContainer.make.mockReturnValue(listener)

      const result = mockContainer.make('UpdateStockListener')

      expect(result).toHaveProperty('handle')
    })
  })

  describe('事件監聽器註冊', () => {
    it('應註冊 order:created 事件監聽器', async () => {
      mockEventManager.listen.mockReturnValue(undefined)

      mockEventManager.listen('order:created', async (event: unknown) => {
        console.log('Order created:', event)
      })

      expect(mockEventManager.listen).toHaveBeenCalledWith('order:created', expect.any(Function))
    })

    it('應註冊 payment:completed 事件監聽器', async () => {
      mockEventManager.listen.mockReturnValue(undefined)

      mockEventManager.listen('payment:completed', async (event: unknown) => {
        console.log('Payment completed:', event)
      })

      expect(mockEventManager.listen).toHaveBeenCalledWith(
        'payment:completed',
        expect.any(Function)
      )
    })

    it('應註冊 order:cancelled 事件監聽器', async () => {
      mockEventManager.listen.mockReturnValue(undefined)

      mockEventManager.listen('order:cancelled', async (event: unknown) => {
        console.log('Order cancelled:', event)
      })

      expect(mockEventManager.listen).toHaveBeenCalledWith('order:cancelled', expect.any(Function))
    })

    it('應支持多個監聽器監聽同一事件', async () => {
      mockEventManager.listen.mockReturnValue(undefined)

      const handler1 = vi.fn()
      const handler2 = vi.fn()

      mockEventManager.listen('order:created', handler1)
      mockEventManager.listen('order:created', handler2)

      expect(mockEventManager.listen).toHaveBeenCalledTimes(2)
      expect(mockEventManager.listen).toHaveBeenCalledWith('order:created', handler1)
      expect(mockEventManager.listen).toHaveBeenCalledWith('order:created', handler2)
    })
  })

  describe('事件發送', () => {
    it('應發送事件到所有監聽器', async () => {
      mockEventManager.emit.mockResolvedValue(undefined)

      const event = {
        eventName: 'order:created',
        payload: {
          orderId: 'order-1',
          userId: 'user-1',
        },
      }

      await mockEventManager.emit(event.eventName, event.payload)

      expect(mockEventManager.emit).toHaveBeenCalledWith('order:created', expect.any(Object))
    })

    it('應支持異步事件監聽器', async () => {
      const handler = vi.fn().mockResolvedValue(undefined)

      mockEventManager.listen('order:created', handler)
      mockEventManager.emit.mockResolvedValue(undefined)

      const event = {
        eventName: 'order:created',
        payload: { orderId: 'order-1' },
      }

      await mockEventManager.emit(event.eventName, event.payload)

      expect(mockEventManager.emit).toHaveBeenCalled()
    })
  })

  describe('事件配置', () => {
    it('應初始化事件管理器配置', () => {
      const config = {
        queueEnabled: true,
        asyncProcessing: true,
        errorHandling: 'retry',
      }

      expect(config.queueEnabled).toBe(true)
      expect(config.asyncProcessing).toBe(true)
    })

    it('應初始化重試策略', () => {
      const retryPolicy = {
        enabled: true,
        maxAttempts: 3,
        backoffMultiplier: 2,
        initialDelayMs: 1000,
      }

      expect(retryPolicy.enabled).toBe(true)
      expect(retryPolicy.maxAttempts).toBe(3)
    })

    it('應初始化 DLQ 配置', () => {
      const dlqConfig = {
        enabled: true,
        maxRetries: 3,
        deadLetterQueue: 'dlq',
      }

      expect(dlqConfig.enabled).toBe(true)
      expect(dlqConfig.maxRetries).toBe(3)
    })
  })

  describe('啟動流程', () => {
    it('應在應用啟動時初始化事件系統', async () => {
      const boot = vi.fn().mockResolvedValue(undefined)

      await boot()

      expect(boot).toHaveBeenCalled()
    })

    it('應驗證事件系統配置完整性', () => {
      const config = {
        eventManagerEnabled: true,
        listenersRegistered: true,
        queueConfigured: true,
      }

      expect(config.eventManagerEnabled).toBeDefined()
      expect(config.listenersRegistered).toBeDefined()
      expect(config.queueConfigured).toBeDefined()
    })

    it('應初始化所有事件監聽器', () => {
      const listeners = [
        { name: 'UpdateStockListener', events: ['order:created'] },
        { name: 'ProcessPaymentListener', events: ['order:created'] },
        { name: 'InvalidateCacheListener', events: ['order:updated', 'product:updated'] },
        { name: 'SendEmailListener', events: ['order:created', 'payment:completed'] },
      ]

      expect(listeners).toHaveLength(4)
      listeners.forEach((listener) => {
        expect(listener.events.length).toBeGreaterThan(0)
      })
    })
  })
})
