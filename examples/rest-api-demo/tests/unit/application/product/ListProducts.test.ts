/**
 * ListProducts Use Case 單元測試
 *
 * 測試產品列表功能，包括分頁、快取和查詢優化
 */

import { ListProductsUseCase } from '@application/product/ListProducts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('ListProducts', () => {
  let useCase: ListProductsUseCase
  let mockRepository: any

  beforeEach(() => {
    mockRepository = {
      findAll: vi.fn(),
      findByCategory: vi.fn(),
    }
    useCase = new ListProductsUseCase(mockRepository)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('列表商品', () => {
    it('應返回產品列表', async () => {
      const products = [
        { id: 'prod-1', name: 'Product 1', price: 1000 },
        { id: 'prod-2', name: 'Product 2', price: 2000 },
      ]
      mockRepository.findAll.mockResolvedValue({
        data: products,
        total: 2,
        page: 1,
        limit: 20,
      })

      const result = await useCase.execute({
        page: 1,
        limit: 20,
      })

      expect(result.data).toEqual(products)
      expect(result.total).toBe(2)
      expect(mockRepository.findAll).toHaveBeenCalledWith(1, 20)
    })

    it('應支持按分類篩選', async () => {
      const products = [{ id: 'prod-1', name: 'Product 1' }]
      mockRepository.findByCategory.mockResolvedValue({
        data: products,
        total: 1,
        page: 1,
        limit: 20,
      })

      const result = await useCase.execute({
        page: 1,
        limit: 20,
        categoryId: 'cat-1',
      })

      expect(result.data).toEqual(products)
      expect(mockRepository.findByCategory).toHaveBeenCalledWith('cat-1', 1, 20)
    })

    it('應限制最大 limit 為 100', async () => {
      mockRepository.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 100,
      })

      await useCase.execute({
        page: 1,
        limit: 500,
      })

      expect(mockRepository.findAll).toHaveBeenCalledWith(1, 100)
    })

    it('應使用預設分頁參數', async () => {
      mockRepository.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      })

      await useCase.execute({})

      expect(mockRepository.findAll).toHaveBeenCalledWith(1, 20)
    })
  })
})
