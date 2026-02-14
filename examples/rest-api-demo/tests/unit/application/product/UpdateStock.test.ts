/**
 * UpdateStock Use Case 單元測試
 */

import { UpdateStock } from '@application/product/UpdateStock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('UpdateStock', () => {
  let useCase: UpdateStock
  let mockRepository: any

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      update: vi.fn(),
    }
    useCase = new UpdateStock(mockRepository)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('更新庫存', () => {
    it('應減少庫存', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 'prod-1',
        stock: 100,
      })

      mockRepository.update.mockResolvedValue({
        id: 'prod-1',
        stock: 90,
      })

      const result = await useCase.execute({ productId: 'prod-1', quantity: 10 })

      expect(result.stock).toBe(90)
      expect(mockRepository.update).toHaveBeenCalled()
    })

    it('庫存不足時應拋出錯誤', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 'prod-1',
        stock: 5,
      })

      await expect(useCase.execute({ productId: 'prod-1', quantity: 10 })).rejects.toThrow()
    })
  })
})
