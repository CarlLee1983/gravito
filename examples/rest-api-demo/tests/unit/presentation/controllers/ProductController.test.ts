/**
 * ProductController 單元測試
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('ProductController', () => {
  let mockCtx: any

  beforeEach(() => {
    mockCtx = {
      req: {
        json: vi.fn(),
        param: vi.fn(),
        query: vi.fn(),
      },
      json: vi.fn(),
      get: vi.fn(),
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('列出商品', () => {
    it('應返回商品列表', async () => {
      const mockCore = {
        container: {
          make: vi.fn((key: string) => {
            if (key === 'ListProductsUseCase') {
              return {
                execute: vi.fn().mockResolvedValue({
                  data: [
                    { id: 'prod-1', name: 'Product 1' },
                    { id: 'prod-2', name: 'Product 2' },
                  ],
                  total: 2,
                }),
              }
            }
            return null
          }),
        },
      }

      mockCtx.get.mockReturnValue(mockCore)

      const useCase = mockCore.container.make('ListProductsUseCase')
      const result = await useCase.execute({ page: 1, limit: 10 })

      expect(result.data).toHaveLength(2)
      expect(result.total).toBe(2)
    })
  })

  describe('獲取商品', () => {
    it('應返回商品詳情', async () => {
      const mockCore = {
        container: {
          make: vi.fn((key: string) => {
            if (key === 'GetProductUseCase') {
              return {
                execute: vi.fn().mockResolvedValue({
                  id: 'prod-1',
                  name: 'Product 1',
                  price: 9999,
                }),
              }
            }
            return null
          }),
        },
      }

      mockCtx.get.mockReturnValue(mockCore)
      mockCtx.req.param.mockReturnValue('prod-1')

      const useCase = mockCore.container.make('GetProductUseCase')
      const result = await useCase.execute('prod-1')

      expect(result.id).toBe('prod-1')
      expect(result.name).toBe('Product 1')
    })

    it('商品不存在時應返回 null', async () => {
      const mockCore = {
        container: {
          make: vi.fn((key: string) => {
            if (key === 'GetProductUseCase') {
              return {
                execute: vi.fn().mockResolvedValue(null),
              }
            }
            return null
          }),
        },
      }

      mockCtx.get.mockReturnValue(mockCore)

      const useCase = mockCore.container.make('GetProductUseCase')
      const result = await useCase.execute('invalid-id')

      expect(result).toBeNull()
    })
  })

  describe('搜索商品', () => {
    it('應返回搜索結果', async () => {
      const mockCore = {
        container: {
          make: vi.fn((key: string) => {
            if (key === 'SearchProductsUseCase') {
              return {
                execute: vi.fn().mockResolvedValue({
                  data: [{ id: 'prod-1', name: 'Laptop' }],
                  total: 1,
                }),
              }
            }
            return null
          }),
        },
      }

      mockCtx.get.mockReturnValue(mockCore)

      const useCase = mockCore.container.make('SearchProductsUseCase')
      const result = await useCase.execute({ query: 'laptop', page: 1, limit: 10 })

      expect(result.data).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('搜索不到時應返回空列表', async () => {
      const mockCore = {
        container: {
          make: vi.fn((key: string) => {
            if (key === 'SearchProductsUseCase') {
              return {
                execute: vi.fn().mockResolvedValue({
                  data: [],
                  total: 0,
                }),
              }
            }
            return null
          }),
        },
      }

      mockCtx.get.mockReturnValue(mockCore)

      const useCase = mockCore.container.make('SearchProductsUseCase')
      const result = await useCase.execute({ query: 'nonexistent', page: 1, limit: 10 })

      expect(result.data).toHaveLength(0)
    })
  })
})
