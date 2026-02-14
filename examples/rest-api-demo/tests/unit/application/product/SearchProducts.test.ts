/**
 * SearchProducts Use Case 單元測試
 */

import { SearchProducts } from '@application/product/SearchProducts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('SearchProducts', () => {
  let useCase: SearchProducts
  let mockRepository: any

  beforeEach(() => {
    mockRepository = {
      search: vi.fn(),
    }
    useCase = new SearchProducts(mockRepository)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('搜索商品', () => {
    it('應返回匹配的商品', async () => {
      const result = {
        data: [{ id: 'prod-1', name: 'Laptop' }],
        total: 1,
        page: 1,
        limit: 10,
      }

      mockRepository.search.mockResolvedValue(result)

      const response = await useCase.execute({ query: 'laptop', page: 1, limit: 10 })

      expect(response.data).toHaveLength(1)
      expect(mockRepository.search).toHaveBeenCalledWith('laptop', 1, 10)
    })

    it('搜索不到時應返回空列表', async () => {
      mockRepository.search.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      })

      const response = await useCase.execute({ query: 'nonexistent', page: 1, limit: 10 })

      expect(response.data).toHaveLength(0)
    })
  })
})
