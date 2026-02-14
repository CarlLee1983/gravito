/**
 * GetProduct Use Case 單元測試
 */

import { GetProduct } from '@application/product/GetProduct'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('GetProduct', () => {
  let useCase: GetProduct
  let mockRepository: any

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
    }
    useCase = new GetProduct(mockRepository)
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

      const result = await useCase.execute('prod-1')

      expect(result).toEqual(product)
      expect(mockRepository.findById).toHaveBeenCalledWith('prod-1')
    })

    it('商品不存在時應返回 null', async () => {
      mockRepository.findById.mockResolvedValue(null)

      const result = await useCase.execute('invalid-id')

      expect(result).toBeNull()
    })
  })
})
