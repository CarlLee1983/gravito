/**
 * GetProduct Use Case 單元測試
 *
 * 測試獲取單個產品詳情功能，包括快取檢查和資料庫查詢
 */

import { GetProductUseCase } from '@application/product/GetProduct'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('GetProduct', () => {
  let useCase: GetProductUseCase
  let mockRepository: any

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
    }
    useCase = new GetProductUseCase(mockRepository)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('獲取商品', () => {
    it('應返回商品詳情', async () => {
      const product = {
        id: 'prod-1',
        sku: 'SKU001',
        name: 'Test Product',
        price: 5000,
        stock: 100,
        rating: 4.5,
      }
      mockRepository.findById.mockResolvedValue(product)

      const result = await useCase.execute({ productId: 'prod-1' })

      expect(result).toEqual(product)
      expect(mockRepository.findById).toHaveBeenCalledWith('prod-1')
    })

    it('商品不存在時應拋出錯誤', async () => {
      mockRepository.findById.mockResolvedValue(null)

      await expect(useCase.execute({ productId: 'invalid-id' })).rejects.toThrow(
        'Product not found'
      )
    })

    it('應驗證 productId 為必填', async () => {
      await expect(useCase.execute({ productId: '' })).rejects.toThrow('Product ID is required')
    })
  })
})
