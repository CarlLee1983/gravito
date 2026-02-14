/**
 * ListProducts Use Case 單元測試
 */

import { ListProducts } from '@application/product/ListProducts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('ListProducts', () => {
  let useCase: ListProducts
  let mockRepository: any

  beforeEach(() => {
    mockRepository = {
      findAll: vi.fn(),
    }
    useCase = new ListProducts(mockRepository)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('列出商品', () => {
    it('應返回商品列表', async () => {
      const result = {
        data: [
          { id: 'prod-1', name: 'Product 1' },
          { id: 'prod-2', name: 'Product 2' },
        ],
        total: 2,
        page: 1,
        limit: 10,
      }

      mockRepository.findAll.mockResolvedValue(result)

      const response = await useCase.execute({ page: 1, limit: 10 })

      expect(response.data).toHaveLength(2)
      expect(response.total).toBe(2)
      expect(mockRepository.findAll).toHaveBeenCalledWith(1, 10)
    })

    it('空結果應返回空列表', async () => {
      mockRepository.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      })

      const response = await useCase.execute({ page: 1, limit: 10 })

      expect(response.data).toHaveLength(0)
      expect(response.total).toBe(0)
    })
  })
})
