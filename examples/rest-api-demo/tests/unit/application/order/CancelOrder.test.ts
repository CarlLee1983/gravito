/**
 * CancelOrder Use Case 單元測試
 *
 * 測試訂單取消流程，包括狀態驗證、庫存恢復、訂單更新
 */

import { CancelOrderUseCase } from '@application/order/CancelOrder'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('CancelOrderUseCase', () => {
  let useCase: CancelOrderUseCase
  let mockOrderRepository: any
  let mockProductRepository: any

  beforeEach(() => {
    mockOrderRepository = {
      findById: vi.fn(),
      update: vi.fn(),
    }

    mockProductRepository = {
      increaseStock: vi.fn(),
    }

    useCase = new CancelOrderUseCase(mockOrderRepository, mockProductRepository)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('有效訂單取消', () => {
    it('應成功取消待處理訂單', async () => {
      const request = {
        orderId: 'order-1',
        reason: 'Changed mind',
      }

      const mockOrder = {
        id: 'order-1',
        status: 'pending',
        items: [{ productId: 'prod-1', quantity: 2 }],
        userId: 'user-1',
      }

      mockOrderRepository.findById.mockResolvedValue(mockOrder)
      mockOrderRepository.update.mockResolvedValue({
        id: 'order-1',
        status: 'cancelled',
        cancelledAt: new Date(),
      })

      const result = await useCase.execute(request)

      expect(result.status).toBe('cancelled')
      expect(mockOrderRepository.update).toHaveBeenCalled()
    })

    it('應恢復已扣除的庫存', async () => {
      const request = {
        orderId: 'order-1',
      }

      const mockOrder = {
        id: 'order-1',
        status: 'pending',
        items: [
          { productId: 'prod-1', quantity: 2 },
          { productId: 'prod-2', quantity: 3 },
        ],
      }

      mockOrderRepository.findById.mockResolvedValue(mockOrder)
      mockOrderRepository.update.mockResolvedValue({
        id: 'order-1',
        status: 'cancelled',
      })

      await useCase.execute(request)

      expect(mockProductRepository.increaseStock).toHaveBeenCalledWith('prod-1', 2)
      expect(mockProductRepository.increaseStock).toHaveBeenCalledWith('prod-2', 3)
    })

    it('應為多個商品項目恢復庫存', async () => {
      const request = {
        orderId: 'order-2',
      }

      const mockOrder = {
        id: 'order-2',
        status: 'pending',
        items: [
          { productId: 'prod-1', quantity: 1 },
          { productId: 'prod-2', quantity: 2 },
          { productId: 'prod-3', quantity: 3 },
        ],
      }

      mockOrderRepository.findById.mockResolvedValue(mockOrder)
      mockOrderRepository.update.mockResolvedValue({
        id: 'order-2',
        status: 'cancelled',
      })

      await useCase.execute(request)

      expect(mockProductRepository.increaseStock).toHaveBeenCalledTimes(3)
    })
  })

  describe('輸入驗證', () => {
    it('應拒絕缺少訂單 ID 的請求', async () => {
      const request = {
        orderId: '',
      }

      await expect(useCase.execute(request)).rejects.toThrow('Order ID is required')
    })

    it('應接受包含取消原因的請求', async () => {
      const request = {
        orderId: 'order-1',
        reason: 'User requested cancellation',
      }

      const mockOrder = {
        id: 'order-1',
        status: 'pending',
        items: [],
      }

      mockOrderRepository.findById.mockResolvedValue(mockOrder)
      mockOrderRepository.update.mockResolvedValue({
        id: 'order-1',
        status: 'cancelled',
      })

      const result = await useCase.execute(request)

      expect(result.id).toBe('order-1')
    })
  })

  describe('訂單查找', () => {
    it('應拒絕不存在的訂單', async () => {
      const request = {
        orderId: 'non-existent',
      }

      mockOrderRepository.findById.mockResolvedValue(null)

      await expect(useCase.execute(request)).rejects.toThrow('Order not found')
    })

    it('應查詢數據庫', async () => {
      const request = {
        orderId: 'order-1',
      }

      mockOrderRepository.findById.mockResolvedValue(null)

      await expect(useCase.execute(request)).rejects.toThrow()

      expect(mockOrderRepository.findById).toHaveBeenCalledWith('order-1')
    })
  })

  describe('訂單狀態驗證', () => {
    it('應拒絕已完成的訂單', async () => {
      const request = {
        orderId: 'order-1',
      }

      const mockOrder = {
        id: 'order-1',
        status: 'completed',
        items: [],
      }

      mockOrderRepository.findById.mockResolvedValue(mockOrder)

      await expect(useCase.execute(request)).rejects.toThrow('Cannot cancel order')
    })

    it('應拒絕已取消的訂單', async () => {
      const request = {
        orderId: 'order-1',
      }

      const mockOrder = {
        id: 'order-1',
        status: 'cancelled',
        items: [],
      }

      mockOrderRepository.findById.mockResolvedValue(mockOrder)

      await expect(useCase.execute(request)).rejects.toThrow('Cannot cancel order')
    })

    it('應拒絕已退款的訂單', async () => {
      const request = {
        orderId: 'order-1',
      }

      const mockOrder = {
        id: 'order-1',
        status: 'refunded',
        items: [],
      }

      mockOrderRepository.findById.mockResolvedValue(mockOrder)

      await expect(useCase.execute(request)).rejects.toThrow('Cannot cancel order')
    })

    it('應允許待處理訂單取消', async () => {
      const request = {
        orderId: 'order-1',
      }

      const mockOrder = {
        id: 'order-1',
        status: 'pending',
        items: [],
      }

      mockOrderRepository.findById.mockResolvedValue(mockOrder)
      mockOrderRepository.update.mockResolvedValue({
        id: 'order-1',
        status: 'cancelled',
      })

      const result = await useCase.execute(request)

      expect(result.status).toBe('cancelled')
    })
  })

  describe('訂單更新', () => {
    it('應將訂單狀態更新為已取消', async () => {
      const request = {
        orderId: 'order-1',
      }

      const mockOrder = {
        id: 'order-1',
        status: 'pending',
        items: [],
      }

      mockOrderRepository.findById.mockResolvedValue(mockOrder)
      mockOrderRepository.update.mockResolvedValue({
        id: 'order-1',
        status: 'cancelled',
        cancelledAt: new Date(),
      })

      const result = await useCase.execute(request)

      expect(result.status).toBe('cancelled')
      expect(result.cancelledAt).toBeDefined()
    })

    it('應處理更新失敗的情況', async () => {
      const request = {
        orderId: 'order-1',
      }

      const mockOrder = {
        id: 'order-1',
        status: 'pending',
        items: [],
      }

      mockOrderRepository.findById.mockResolvedValue(mockOrder)
      mockOrderRepository.update.mockResolvedValue(null) // 更新失敗

      await expect(useCase.execute(request)).rejects.toThrow('Failed to cancel order')
    })
  })
})
