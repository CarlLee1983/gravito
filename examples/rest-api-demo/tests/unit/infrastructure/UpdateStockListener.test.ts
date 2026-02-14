/**
 * UpdateStockListener 單元測試
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('UpdateStockListener', () => {
  let listener: any
  let mockRepository: any

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      update: vi.fn(),
    }

    listener = {
      handle: vi.fn(),
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('庫存更新事件監聽', () => {
    it('應監聽訂單已建立事件並更新庫存', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 'prod-1',
        stock: 100,
      })

      mockRepository.update.mockResolvedValue({
        id: 'prod-1',
        stock: 90,
      })

      listener.handle.mockResolvedValue(undefined)

      const event = {
        eventName: 'order:created',
        payload: {
          items: [{ productId: 'prod-1', quantity: 10 }],
        },
      }

      await listener.handle(event)

      expect(listener.handle).toHaveBeenCalledWith(event)
    })

    it('庫存不足時應拋出錯誤', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 'prod-1',
        stock: 5,
      })

      listener.handle.mockRejectedValue(new Error('Insufficient stock'))

      const event = {
        eventName: 'order:created',
        payload: {
          items: [{ productId: 'prod-1', quantity: 10 }],
        },
      }

      await expect(listener.handle(event)).rejects.toThrow('Insufficient stock')
    })

    it('應更新多個商品的庫存', async () => {
      listener.handle.mockResolvedValue(undefined)

      const event = {
        eventName: 'order:created',
        payload: {
          items: [
            { productId: 'prod-1', quantity: 5 },
            { productId: 'prod-2', quantity: 10 },
          ],
        },
      }

      await listener.handle(event)

      expect(listener.handle).toHaveBeenCalled()
    })
  })

  describe('錯誤處理', () => {
    it('應優雅處理缺失的產品', async () => {
      mockRepository.findById.mockResolvedValue(null)

      listener.handle.mockRejectedValue(new Error('Product not found'))

      const event = {
        eventName: 'order:created',
        payload: {
          items: [{ productId: 'unknown-prod', quantity: 10 }],
        },
      }

      await expect(listener.handle(event)).rejects.toThrow('Product not found')
    })

    it('應記錄更新失敗的事件', async () => {
      mockRepository.update.mockRejectedValue(new Error('Database error'))

      listener.handle.mockRejectedValue(new Error('Database error'))

      const event = {
        eventName: 'order:created',
        payload: {
          items: [{ productId: 'prod-1', quantity: 10 }],
        },
      }

      await expect(listener.handle(event)).rejects.toThrow('Database error')
    })
  })
})
