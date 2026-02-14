/**
 * CreateOrder Use Case 單元測試
 *
 * 測試訂單建立流程，包括驗證、庫存檢查、費用計算、事件發送
 */

import { CreateOrderUseCase } from '@application/order/CreateOrder'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('CreateOrderUseCase', () => {
  let useCase: CreateOrderUseCase
  let mockOrderRepository: any
  let mockProductRepository: any
  let mockEventManager: any

  beforeEach(() => {
    mockOrderRepository = {
      create: vi.fn(),
      findById: vi.fn(),
    }

    mockProductRepository = {
      findById: vi.fn(),
      decreaseStock: vi.fn(),
    }

    mockEventManager = {
      dispatch: vi.fn(),
    }

    useCase = new CreateOrderUseCase(mockOrderRepository, mockProductRepository, mockEventManager)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('有效訂單建立', () => {
    it('應成功建立訂單', async () => {
      const request = {
        userId: 'user-1',
        items: [{ productId: 'prod-1', quantity: 2 }],
        shippingAddress: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '1234567890',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'USA',
        },
      }

      mockProductRepository.findById.mockResolvedValue({
        id: 'prod-1',
        sku: 'SKU001',
        price: 5000,
        stock: 10,
      })

      mockOrderRepository.create.mockResolvedValue({
        id: 'order-1',
        userId: 'user-1',
        items: request.items,
        total: 10000,
        shippingAddress: request.shippingAddress,
        status: 'pending',
        createdAt: new Date(),
      })

      const result = await useCase.execute(request)

      expect(result.id).toBe('order-1')
      expect(result.userId).toBe('user-1')
      expect(mockOrderRepository.create).toHaveBeenCalled()
      expect(mockProductRepository.decreaseStock).toHaveBeenCalledWith('prod-1', 2)
      expect(mockEventManager.dispatch).toHaveBeenCalled()
    })

    it('應計算正確的運費', async () => {
      const request = {
        userId: 'user-1',
        items: [{ productId: 'prod-1', quantity: 2 }],
        shippingAddress: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '1234567890',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'USA',
        },
      }

      mockProductRepository.findById.mockResolvedValue({
        id: 'prod-1',
        sku: 'SKU001',
        price: 5000,
        stock: 10,
      })

      mockOrderRepository.create.mockResolvedValue({
        id: 'order-1',
        total: 11000, // 10000 (subtotal) + 1000 (shipping) + tax
      })

      await useCase.execute(request)

      expect(mockOrderRepository.create).toHaveBeenCalled()
      const createCall = mockOrderRepository.create.mock.calls[0][0]
      expect(createCall.shippingCost).toBeGreaterThanOrEqual(0)
    })

    it('應支持多個訂單項目', async () => {
      const request = {
        userId: 'user-1',
        items: [
          { productId: 'prod-1', quantity: 2 },
          { productId: 'prod-2', quantity: 1 },
        ],
        shippingAddress: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '1234567890',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'USA',
        },
      }

      mockProductRepository.findById
        .mockResolvedValueOnce({ id: 'prod-1', sku: 'SKU001', price: 5000, stock: 10 })
        .mockResolvedValueOnce({ id: 'prod-2', sku: 'SKU002', price: 3000, stock: 5 })

      mockOrderRepository.create.mockResolvedValue({
        id: 'order-1',
        items: request.items,
      })

      await useCase.execute(request)

      expect(mockProductRepository.findById).toHaveBeenCalledTimes(2)
      expect(mockProductRepository.decreaseStock).toHaveBeenCalledWith('prod-1', 2)
      expect(mockProductRepository.decreaseStock).toHaveBeenCalledWith('prod-2', 1)
    })
  })

  describe('配送地址驗證', () => {
    it('應拒絕無效的配送地址', async () => {
      const request = {
        userId: 'user-1',
        items: [{ productId: 'prod-1', quantity: 1 }],
        shippingAddress: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '1234567890',
          address: '', // 空地址
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'USA',
        },
      }

      await expect(useCase.execute(request)).rejects.toThrow('Invalid shipping address')
    })

    it('應拒絕缺少郵遞區號的地址', async () => {
      const request = {
        userId: 'user-1',
        items: [{ productId: 'prod-1', quantity: 1 }],
        shippingAddress: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '1234567890',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '', // 缺少郵遞區號
          country: 'USA',
        },
      }

      await expect(useCase.execute(request)).rejects.toThrow('Invalid shipping address')
    })
  })

  describe('訂單項目驗證', () => {
    it('應拒絕空訂單', async () => {
      const request = {
        userId: 'user-1',
        items: [],
        shippingAddress: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '1234567890',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'USA',
        },
      }

      await expect(useCase.execute(request)).rejects.toThrow('At least one item is required')
    })

    it('應拒絕不存在的商品', async () => {
      const request = {
        userId: 'user-1',
        items: [{ productId: 'non-existent', quantity: 1 }],
        shippingAddress: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '1234567890',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'USA',
        },
      }

      mockProductRepository.findById.mockResolvedValue(null)

      await expect(useCase.execute(request)).rejects.toThrow('not found')
    })

    it('應拒絕庫存不足的訂單', async () => {
      const request = {
        userId: 'user-1',
        items: [{ productId: 'prod-1', quantity: 100 }],
        shippingAddress: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '1234567890',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'USA',
        },
      }

      mockProductRepository.findById.mockResolvedValue({
        id: 'prod-1',
        sku: 'SKU001',
        price: 5000,
        stock: 5,
      })

      await expect(useCase.execute(request)).rejects.toThrow('Insufficient stock')
    })
  })

  describe('費用計算', () => {
    it('應免運費超過特定金額', async () => {
      const request = {
        userId: 'user-1',
        items: [{ productId: 'prod-1', quantity: 3 }],
        shippingAddress: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '1234567890',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'USA',
        },
      }

      mockProductRepository.findById.mockResolvedValue({
        id: 'prod-1',
        sku: 'SKU001',
        price: 5000,
        stock: 10,
      })

      mockOrderRepository.create.mockResolvedValue({
        id: 'order-1',
      })

      await useCase.execute(request)

      const createCall = mockOrderRepository.create.mock.calls[0][0]
      expect(createCall.subtotal).toBe(15000)
      expect(createCall.shippingCost).toBe(0) // 免運費
    })

    it('應計算小額訂單的運費', async () => {
      const request = {
        userId: 'user-1',
        items: [{ productId: 'prod-1', quantity: 1 }],
        shippingAddress: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '1234567890',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'USA',
        },
      }

      mockProductRepository.findById.mockResolvedValue({
        id: 'prod-1',
        sku: 'SKU001',
        price: 5000,
        stock: 10,
      })

      mockOrderRepository.create.mockResolvedValue({
        id: 'order-1',
      })

      await useCase.execute(request)

      const createCall = mockOrderRepository.create.mock.calls[0][0]
      expect(createCall.subtotal).toBe(5000)
      expect(createCall.shippingCost).toBe(1000) // $10 運費
    })
  })

  describe('事件發送', () => {
    it('應發送訂單建立事件', async () => {
      const request = {
        userId: 'user-1',
        items: [{ productId: 'prod-1', quantity: 1 }],
        shippingAddress: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '1234567890',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'USA',
        },
      }

      mockProductRepository.findById.mockResolvedValue({
        id: 'prod-1',
        sku: 'SKU001',
        price: 5000,
        stock: 10,
      })

      mockOrderRepository.create.mockResolvedValue({
        id: 'order-1',
        userId: 'user-1',
        items: request.items,
        total: 6000,
        status: 'pending',
        createdAt: new Date(),
      })

      await useCase.execute(request)

      expect(mockEventManager.dispatch).toHaveBeenCalled()
      const event = mockEventManager.dispatch.mock.calls[0][0]
      expect(event).toBeDefined()
    })
  })

  describe('庫存管理', () => {
    it('應在訂單建立後減少庫存', async () => {
      const request = {
        userId: 'user-1',
        items: [{ productId: 'prod-1', quantity: 5 }],
        shippingAddress: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '1234567890',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'USA',
        },
      }

      mockProductRepository.findById.mockResolvedValue({
        id: 'prod-1',
        sku: 'SKU001',
        price: 5000,
        stock: 10,
      })

      mockOrderRepository.create.mockResolvedValue({
        id: 'order-1',
      })

      await useCase.execute(request)

      expect(mockProductRepository.decreaseStock).toHaveBeenCalledWith('prod-1', 5)
    })

    it('應處理多個商品的庫存減少', async () => {
      const request = {
        userId: 'user-1',
        items: [
          { productId: 'prod-1', quantity: 2 },
          { productId: 'prod-2', quantity: 3 },
        ],
        shippingAddress: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '1234567890',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'USA',
        },
      }

      mockProductRepository.findById
        .mockResolvedValueOnce({ id: 'prod-1', sku: 'SKU001', price: 5000, stock: 10 })
        .mockResolvedValueOnce({ id: 'prod-2', sku: 'SKU002', price: 3000, stock: 5 })

      mockOrderRepository.create.mockResolvedValue({
        id: 'order-1',
      })

      await useCase.execute(request)

      expect(mockProductRepository.decreaseStock).toHaveBeenCalledTimes(2)
    })
  })
})
