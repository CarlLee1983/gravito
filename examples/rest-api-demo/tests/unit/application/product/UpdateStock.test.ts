/**
 * UpdateStock Use Case 單元測試
 *
 * 測試商品庫存更新功能
 */

import { UpdateStockUseCase } from '@application/product/UpdateStock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('UpdateStock', () => {
  let useCase: UpdateStockUseCase
  let mockRepository: any

  beforeEach(() => {
    mockRepository = {
      getStock: vi.fn(),
      increaseStock: vi.fn(),
      decreaseStock: vi.fn(),
    }
    useCase = new UpdateStockUseCase(mockRepository)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('更新庫存', () => {
    it('應減少庫存', async () => {
      mockRepository.getStock.mockResolvedValue(100)
      mockRepository.decreaseStock.mockResolvedValue(undefined)

      const result = await useCase.execute({
        productId: 'prod-1',
        quantity: -10,
      })

      expect(result).toEqual({
        productId: 'prod-1',
        newStock: 90,
      })
      expect(mockRepository.decreaseStock).toHaveBeenCalledWith('prod-1', 10)
    })

    it('應增加庫存', async () => {
      mockRepository.getStock.mockResolvedValue(100)
      mockRepository.increaseStock.mockResolvedValue(undefined)

      const result = await useCase.execute({
        productId: 'prod-1',
        quantity: 20,
      })

      expect(result).toEqual({
        productId: 'prod-1',
        newStock: 120,
      })
      expect(mockRepository.increaseStock).toHaveBeenCalledWith('prod-1', 20)
    })

    it('應驗證數量為整數', async () => {
      await expect(
        useCase.execute({
          productId: 'prod-1',
          quantity: 10.5,
        })
      ).rejects.toThrow('Quantity must be an integer')
    })

    it('應驗證庫存不足的情況', async () => {
      mockRepository.getStock.mockResolvedValue(10)

      await expect(
        useCase.execute({
          productId: 'prod-1',
          quantity: -20,
        })
      ).rejects.toThrow('Insufficient stock')
    })

    it('商品不存在時應拋出錯誤', async () => {
      mockRepository.getStock.mockResolvedValue(null)

      await expect(
        useCase.execute({
          productId: 'invalid-id',
          quantity: 10,
        })
      ).rejects.toThrow('Product not found')
    })
  })
})
