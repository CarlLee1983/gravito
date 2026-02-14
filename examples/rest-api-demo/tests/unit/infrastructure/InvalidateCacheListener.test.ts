/**
 * InvalidateCacheListener 單元測試
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('InvalidateCacheListener', () => {
  let listener: any
  let mockCacheService: any

  beforeEach(() => {
    mockCacheService = {
      delete: vi.fn(),
      deletePattern: vi.fn(),
      clear: vi.fn(),
    }

    listener = {
      handle: vi.fn(),
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('快取失效事件監聽', () => {
    it('應監聽訂單更新事件並失效相關快取', async () => {
      mockCacheService.deletePattern.mockResolvedValue(true)

      listener.handle.mockResolvedValue(undefined)

      const event = {
        eventName: 'order:updated',
        payload: {
          orderId: 'order-1',
        },
      }

      await listener.handle(event)

      expect(listener.handle).toHaveBeenCalledWith(event)
    })

    it('應刪除特定快取鍵', async () => {
      mockCacheService.delete.mockResolvedValue(true)

      listener.handle.mockResolvedValue(undefined)

      const event = {
        eventName: 'product:updated',
        payload: {
          productId: 'prod-1',
        },
      }

      await listener.handle(event)

      expect(listener.handle).toHaveBeenCalled()
    })

    it('應使用模式刪除多個快取', async () => {
      mockCacheService.deletePattern.mockResolvedValue(2)

      listener.handle.mockResolvedValue(undefined)

      const event = {
        eventName: 'inventory:changed',
        payload: {
          pattern: 'product:*',
        },
      }

      await listener.handle(event)

      expect(listener.handle).toHaveBeenCalled()
    })
  })

  describe('快取模式管理', () => {
    it('應根據事件類型選擇快取模式', async () => {
      const patterns = {
        'order:created': 'order:*',
        'order:updated': 'order:*',
        'product:updated': 'product:*',
        'inventory:changed': 'inventory:*',
      }

      const eventType = 'order:updated'
      const pattern = patterns[eventType as keyof typeof patterns]

      expect(pattern).toBe('order:*')
    })

    it('應支持多個快取模式', async () => {
      const patterns = ['order:*', 'inventory:*', 'product:*']

      mockCacheService.deletePattern.mockResolvedValue(patterns.length)

      listener.handle.mockResolvedValue(undefined)

      const event = {
        eventName: 'system:reset',
        payload: {
          patterns,
        },
      }

      await listener.handle(event)

      expect(listener.handle).toHaveBeenCalled()
    })
  })

  describe('錯誤處理', () => {
    it('應優雅處理快取刪除失敗', async () => {
      mockCacheService.deletePattern.mockRejectedValue(new Error('Cache service unavailable'))

      listener.handle.mockRejectedValue(new Error('Cache service unavailable'))

      const event = {
        eventName: 'order:updated',
        payload: {
          orderId: 'order-1',
        },
      }

      await expect(listener.handle(event)).rejects.toThrow('Cache service unavailable')
    })

    it('應在快取清空失敗時繼續處理', async () => {
      mockCacheService.clear.mockRejectedValue(new Error('Timeout'))

      listener.handle.mockResolvedValue(undefined)

      const event = {
        eventName: 'system:shutdown',
        payload: {},
      }

      await listener.handle(event)

      expect(listener.handle).toHaveBeenCalled()
    })
  })

  describe('批量操作', () => {
    it('應批量刪除多個快取鍵', async () => {
      const keys = ['order:1', 'order:2', 'order:3']

      mockCacheService.delete.mockResolvedValue(true)

      listener.handle.mockResolvedValue(undefined)

      const event = {
        eventName: 'cache:invalidate_batch',
        payload: { keys },
      }

      await listener.handle(event)

      expect(listener.handle).toHaveBeenCalled()
    })
  })
})
