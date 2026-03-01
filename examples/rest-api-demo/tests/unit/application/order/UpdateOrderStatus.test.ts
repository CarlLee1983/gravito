/**
 * UpdateOrderStatus Use Case 單元測試
 *
 * 測試訂單狀態更新功能
 */

import { UpdateOrderStatusUseCase } from '@application/order/UpdateOrderStatus'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('UpdateOrderStatus', () => {
  let useCase: UpdateOrderStatusUseCase
  let mockRepository: any

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      updateStatus: vi.fn(),
    }
    useCase = new UpdateOrderStatusUseCase(mockRepository)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('更新訂單狀態', () => {
    it('應更新訂單狀態', async () => {
      const order = {
        id: 'order-1',
        orderNumber: 'ORD-ABC123',
        status: 'pending',
      }
      const updatedOrder = {
        ...order,
        status: 'paid',
      }

      mockRepository.findById.mockResolvedValue(order)
      mockRepository.updateStatus.mockResolvedValue(updatedOrder)

      const result = await useCase.execute({
        orderId: 'order-1',
        status: 'paid',
      })

      expect(result).toEqual(updatedOrder)
      expect(mockRepository.updateStatus).toHaveBeenCalledWith('order-1', {
        status: 'paid',
        trackingNumber: undefined,
      })
    })

    it('應包含追蹤號碼', async () => {
      const order = {
        id: 'order-1',
        status: 'processing',
      }
      const updatedOrder = {
        ...order,
        status: 'shipped',
        trackingNumber: 'TRACK123',
      }

      mockRepository.findById.mockResolvedValue(order)
      mockRepository.updateStatus.mockResolvedValue(updatedOrder)

      const result = await useCase.execute({
        orderId: 'order-1',
        status: 'shipped',
        trackingNumber: 'TRACK123',
      })

      expect(result.trackingNumber).toBe('TRACK123')
      expect(mockRepository.updateStatus).toHaveBeenCalledWith('order-1', {
        status: 'shipped',
        trackingNumber: 'TRACK123',
      })
    })

    it('應驗證訂單存在', async () => {
      mockRepository.findById.mockResolvedValue(null)

      await expect(
        useCase.execute({
          orderId: 'invalid-id',
          status: 'shipped',
        })
      ).rejects.toThrow('Order not found')
    })

    it('應驗證狀態轉換合法', async () => {
      const order = {
        id: 'order-1',
        status: 'delivered',
      }
      mockRepository.findById.mockResolvedValue(order)

      // delivered 只能轉換到 refunded，不能轉換到 pending
      await expect(
        useCase.execute({
          orderId: 'order-1',
          status: 'pending',
        })
      ).rejects.toThrow('Cannot transition from delivered to pending')
    })
  })
})
