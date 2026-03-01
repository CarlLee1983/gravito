/**
 * SearchProducts Use Case 單元測試
 *
 * 測試產品搜尋功能
 */

import { SearchProductsUseCase } from '@application/product/SearchProducts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('SearchProducts', () => {
  let useCase: SearchProductsUseCase
  let mockRepository: any

  beforeEach(() => {
    mockRepository = {
      search: vi.fn(),
    }
    useCase = new SearchProductsUseCase(mockRepository)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('搜尋商品', () => {
    it('應返回搜尋結果', async () => {
      const searchResults = {
        data: [{ id: 'prod-1', name: 'Test Product' }],
        total: 1,
        page: 1,
        limit: 20,
      }
      mockRepository.search.mockResolvedValue(searchResults)

      const result = await useCase.execute({
        query: 'test',
        page: 1,
        limit: 20,
      })

      expect(result).toEqual(searchResults)
      expect(mockRepository.search).toHaveBeenCalledWith('test', 1, 20)
    })

    it('應驗證搜尋關鍵詞最少 2 個字符', async () => {
      await expect(
        useCase.execute({
          query: 'a',
          page: 1,
          limit: 20,
        })
      ).rejects.toThrow('Search query must be at least 2 characters')
    })

    it('應修剪搜尋關鍵詞空白', async () => {
      mockRepository.search.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      })

      await useCase.execute({
        query: '  test  ',
        page: 1,
        limit: 20,
      })

      expect(mockRepository.search).toHaveBeenCalledWith('test', 1, 20)
    })

    it('應驗證頁碼至少為 1', async () => {
      await expect(
        useCase.execute({
          query: 'test',
          page: 0,
          limit: 20,
        })
      ).rejects.toThrow('Page must be >= 1')
    })

    it('應驗證 limit 在 1-100 之間', async () => {
      await expect(
        useCase.execute({
          query: 'test',
          page: 1,
          limit: 0,
        })
      ).rejects.toThrow('Limit must be between 1 and 100')

      await expect(
        useCase.execute({
          query: 'test',
          page: 1,
          limit: 101,
        })
      ).rejects.toThrow('Limit must be between 1 and 100')
    })
  })
})
