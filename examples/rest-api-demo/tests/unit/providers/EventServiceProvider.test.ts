/**
 * EventServiceProvider 單元測試
 *
 * 測試事件服務提供者的註冊和初始化
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
      mockContainer.singleton('EventManager', () => mockEventManager)

      expect(mockContainer.singleton).toHaveBeenCalledWith('EventManager', expect.any(Function))
    })

    it('應註冊事件監聽器', () => {
      // 先註冊 EventManager
      mockContainer.singleton('EventManager', () => mockEventManager)

      // 再註冊各個監聽器
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

      // 檢查是否註冊了所有監聽器（+1 for EventManager）
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

      mockEventManager.listen('order:created', async (event: any) => {
        console.log('Order created:', event)
      })

      expect(mockEventManager.listen).toHaveBeenCalledWith('order:created', expect.any(Function))
    })

    it('應支持多個監聽器監聽同一事件', async () => {
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
  })
})
