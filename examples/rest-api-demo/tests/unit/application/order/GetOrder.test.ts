/**
 * GetOrder Use Case 單元測試
 *
 * 測試獲取訂單詳情功能，包括所有權驗證
 */

import { GetOrderUseCase } from '@application/order/GetOrder'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('GetOrder', () => {
  let useCase: GetOrderUseCase
  let mockRepository: any

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
    }
    useCase = new GetOrderUseCase(mockRepository)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('獲取訂單', () => {
    it('應返回訂單詳情', async () => {
      const order = {
        id: 'order-1',
        orderNumber: 'ORD-ABC123',
        userId: 'user-1',
        status: 'pending',
        total: 5000,
        createdAt: new Date(),
      }
      mockRepository.findById.mockResolvedValue(order)

      const result = await useCase.execute({ orderId: 'order-1' })

      expect(result).toEqual(order)
      expect(mockRepository.findById).toHaveBeenCalledWith('order-1')
    })

    it('訂單不存在時應拋出錯誤', async () => {
      mockRepository.findById.mockResolvedValue(null)

      await expect(useCase.execute({ orderId: 'invalid-id' })).rejects.toThrow('Order not found')
    })

    it('應驗證 orderId 為必填', async () => {
      await expect(useCase.execute({ orderId: '' })).rejects.toThrow('Order ID is required')
    })

    it('應驗證所有權（userId 匹配）', async () => {
      const order = {
        id: 'order-1',
        userId: 'user-1',
        status: 'pending',
      }
      mockRepository.findById.mockResolvedValue(order)

      await expect(
        useCase.execute({
          orderId: 'order-1',
          userId: 'user-2',
        })
      ).rejects.toThrow('Unauthorized')
    })

    it('所有權驗證通過時應返回訂單', async () => {
      const order = {
        id: 'order-1',
        userId: 'user-1',
        status: 'pending',
      }
      mockRepository.findById.mockResolvedValue(order)

      const result = await useCase.execute({
        orderId: 'order-1',
        userId: 'user-1',
      })

      expect(result).toEqual(order)
    })
  })
})
