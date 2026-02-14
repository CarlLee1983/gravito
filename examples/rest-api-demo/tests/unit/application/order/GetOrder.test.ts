/**
 * GetOrder Use Case 單元測試
 */

import { GetOrder } from '@application/order/GetOrder'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('GetOrder', () => {
  let useCase: GetOrder
  let mockRepository: any

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
    }
    useCase = new GetOrder(mockRepository)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('獲取訂單', () => {
    it('應返回訂單詳情', async () => {
      const order = {
        id: 'order-1',
        userId: 'user-1',
        total: 10000,
        status: 'pending',
      }

      mockRepository.findById.mockResolvedValue(order)

      const result = await useCase.execute('order-1')

      expect(result).toEqual(order)
      expect(mockRepository.findById).toHaveBeenCalledWith('order-1')
    })

    it('訂單不存在時應返回 null', async () => {
      mockRepository.findById.mockResolvedValue(null)

      const result = await useCase.execute('invalid-id')

      expect(result).toBeNull()
    })
  })
})
