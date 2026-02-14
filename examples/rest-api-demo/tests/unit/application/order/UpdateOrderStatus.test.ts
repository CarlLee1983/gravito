/**
 * UpdateOrderStatus Use Case 單元測試
 */

import { UpdateOrderStatus } from '@application/order/UpdateOrderStatus'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('UpdateOrderStatus', () => {
  let useCase: UpdateOrderStatus
  let mockRepository: any

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      update: vi.fn(),
    }
    useCase = new UpdateOrderStatus(mockRepository)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('更新訂單狀態', () => {
    it('應更新訂單狀態', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 'order-1',
        status: 'pending',
      })

      mockRepository.update.mockResolvedValue({
        id: 'order-1',
        status: 'shipped',
      })

      const result = await useCase.execute({ orderId: 'order-1', status: 'shipped' })

      expect(result.status).toBe('shipped')
    })

    it('訂單不存在時應拋出錯誤', async () => {
      mockRepository.findById.mockResolvedValue(null)

      await expect(useCase.execute({ orderId: 'invalid-id', status: 'shipped' })).rejects.toThrow()
    })
  })
})
