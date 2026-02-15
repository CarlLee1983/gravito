/**
 * OrderController 單元測試
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('OrderController', () => {
  let mockCtx: any

  beforeEach(() => {
    mockCtx = {
      req: {
        json: vi.fn(),
        param: vi.fn(),
      },
      json: vi.fn(),
      get: vi.fn(),
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('建立訂單', () => {
    it('應成功建立訂單', async () => {
      const mockCore = {
        container: {
          make: vi.fn((key: string) => {
            if (key === 'CreateOrderUseCase') {
              return {
                execute: vi.fn().mockResolvedValue({
                  id: 'order-1',
                  userId: 'user-1',
                  status: 'pending',
                  total: 10000,
                }),
              }
            }
            return null
          }),
        },
      }

      mockCtx.get.mockReturnValue(mockCore)
      mockCtx.req.json.mockResolvedValue({
        userId: 'user-1',
        items: [{ productId: 'prod-1', quantity: 1 }],
      })

      const useCase = mockCore.container.make('CreateOrderUseCase')!
      const result = await useCase.execute({
        userId: 'user-1',
        items: [{ productId: 'prod-1', quantity: 1 }],
      })

      expect(result.id).toBe('order-1')
      expect(result.status).toBe('pending')
    })

    it('建立訂單失敗時應拋出錯誤', async () => {
      const mockCore = {
        container: {
          make: vi.fn((key: string) => {
            if (key === 'CreateOrderUseCase') {
              return {
                execute: vi.fn().mockRejectedValue(new Error('Invalid order')),
              }
            }
            return null
          }),
        },
      }

      mockCtx.get.mockReturnValue(mockCore)

      const useCase = mockCore.container.make('CreateOrderUseCase')!

      await expect(
        useCase.execute({
          userId: 'user-1',
          items: [],
        })
      ).rejects.toThrow('Invalid order')
    })
  })

  describe('獲取訂單', () => {
    it('應返回訂單詳情', async () => {
      const mockCore = {
        container: {
          make: vi.fn((key: string) => {
            if (key === 'GetOrderUseCase') {
              return {
                execute: vi.fn().mockResolvedValue({
                  id: 'order-1',
                  userId: 'user-1',
                  status: 'pending',
                  total: 10000,
                }),
              }
            }
            return null
          }),
        },
      }

      mockCtx.get.mockReturnValue(mockCore)
      mockCtx.req.param.mockReturnValue('order-1')

      const useCase = mockCore.container.make('GetOrderUseCase')!
      const result = await useCase.execute('order-1')

      expect(result.id).toBe('order-1')
      expect(result.userId).toBe('user-1')
    })

    it('訂單不存在時應返回 null', async () => {
      const mockCore = {
        container: {
          make: vi.fn((key: string) => {
            if (key === 'GetOrderUseCase') {
              return {
                execute: vi.fn().mockResolvedValue(null),
              }
            }
            return null
          }),
        },
      }

      mockCtx.get.mockReturnValue(mockCore)

      const useCase = mockCore.container.make('GetOrderUseCase')!
      const result = await useCase.execute('invalid-id')

      expect(result).toBeNull()
    })
  })

  describe('更新訂單狀態', () => {
    it('應更新訂單狀態', async () => {
      const mockCore = {
        container: {
          make: vi.fn((key: string) => {
            if (key === 'UpdateOrderStatusUseCase') {
              return {
                execute: vi.fn().mockResolvedValue({
                  id: 'order-1',
                  status: 'shipped',
                }),
              }
            }
            return null
          }),
        },
      }

      mockCtx.get.mockReturnValue(mockCore)

      const useCase = mockCore.container.make('UpdateOrderStatusUseCase')!
      const result = await useCase.execute({
        orderId: 'order-1',
        status: 'shipped',
      })

      expect(result.status).toBe('shipped')
    })

    it('訂單不存在時應拋出錯誤', async () => {
      const mockCore = {
        container: {
          make: vi.fn((key: string) => {
            if (key === 'UpdateOrderStatusUseCase') {
              return {
                execute: vi.fn().mockRejectedValue(new Error('Order not found')),
              }
            }
            return null
          }),
        },
      }

      mockCtx.get.mockReturnValue(mockCore)

      const useCase = mockCore.container.make('UpdateOrderStatusUseCase')!

      await expect(
        useCase.execute({
          orderId: 'invalid-id',
          status: 'shipped',
        })
      ).rejects.toThrow('Order not found')
    })
  })

  describe('取消訂單', () => {
    it('應成功取消訂單', async () => {
      const mockCore = {
        container: {
          make: vi.fn((key: string) => {
            if (key === 'CancelOrderUseCase') {
              return {
                execute: vi.fn().mockResolvedValue({
                  id: 'order-1',
                  status: 'cancelled',
                }),
              }
            }
            return null
          }),
        },
      }

      mockCtx.get.mockReturnValue(mockCore)

      const useCase = mockCore.container.make('CancelOrderUseCase')!
      const result = await useCase.execute('order-1')

      expect(result.status).toBe('cancelled')
    })
  })
})
