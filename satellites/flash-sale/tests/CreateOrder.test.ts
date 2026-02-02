/**
 * CreateOrder Use Case 單元測試
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { CreateOrder } from '../src/Application/UseCases/CreateOrder'
import { CreateOrderRequest, OrderStatus, ProductStatus, type Product, type Order } from '../src/Domain/Models'
import type { IProductRepository } from '../src/Application/Contracts/IProductRepository'
import type { IOrderRepository } from '../src/Application/Contracts/IOrderRepository'

/**
 * Mock ProductRepository
 */
class MockProductRepository implements IProductRepository {
  async findById(id: string): Promise<Product | null> {
    if (id === 'PROD-1') {
      return {
        id: 'PROD-1',
        name: 'Flash Sale Item',
        sku: 'FSI-001',
        description: 'Limited item',
        price: 50,
        cost: 25,
        stock: 5,
        status: ProductStatus.ACTIVE,
        images: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }
    return null
  }

  async findBySku(): Promise<Product | null> {
    throw new Error('Not implemented')
  }

  async findAll(): Promise<any> {
    throw new Error('Not implemented')
  }

  async create(): Promise<Product> {
    throw new Error('Not implemented')
  }

  async update(): Promise<Product> {
    throw new Error('Not implemented')
  }

  async updateStock(): Promise<void> {
    // Mock implementation
  }

  async delete(): Promise<void> {
    throw new Error('Not implemented')
  }

  async findByIds(): Promise<Product[]> {
    throw new Error('Not implemented')
  }
}

/**
 * Mock OrderRepository
 */
class MockOrderRepository implements IOrderRepository {
  private orders: Order[] = []
  private nextId = 1

  async findById(id: string): Promise<Order | null> {
    return this.orders.find((o) => o.id === id) || null
  }

  async findByUserId(): Promise<any> {
    throw new Error('Not implemented')
  }

  async create(data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    const order: Order = {
      id: `ORD-${this.nextId++}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.orders.push(order)
    return order
  }

  async update(): Promise<Order> {
    throw new Error('Not implemented')
  }

  async updateStatus(): Promise<Order> {
    throw new Error('Not implemented')
  }

  async delete(): Promise<void> {
    throw new Error('Not implemented')
  }

  async findByDateRange(): Promise<Order[]> {
    throw new Error('Not implemented')
  }
}

describe('CreateOrder Use Case', () => {
  let useCase: CreateOrder
  let productRepository: MockProductRepository
  let orderRepository: MockOrderRepository

  beforeEach(() => {
    productRepository = new MockProductRepository()
    orderRepository = new MockOrderRepository()
    useCase = new CreateOrder(productRepository, orderRepository)
  })

  it('should create order successfully', async () => {
    const request = new CreateOrderRequest('USER-1', 'PROD-1', 2)
    const result = await useCase.execute(request)

    expect(result.order.id).toBeTruthy()
    expect(result.order.userId).toBe('USER-1')
    expect(result.order.status).toBe(OrderStatus.PENDING)
    expect(result.order.totalAmount).toBe(100) // 50 * 2
  })

  it('should reject order with invalid userId', async () => {
    const request = new CreateOrderRequest('', 'PROD-1', 1)

    try {
      await useCase.execute(request)
      expect.unreachable('Should have thrown')
    } catch (error) {
      expect(String(error)).toContain('Validation failed')
    }
  })

  it('should reject order for non-existent product', async () => {
    const request = new CreateOrderRequest('USER-1', 'UNKNOWN', 1)

    try {
      await useCase.execute(request)
      expect.unreachable('Should have thrown')
    } catch (error) {
      expect(String(error)).toContain('Product not found')
    }
  })

  it('should reject order with insufficient stock', async () => {
    const request = new CreateOrderRequest('USER-1', 'PROD-1', 10) // Only 5 in stock

    try {
      await useCase.execute(request)
      expect.unreachable('Should have thrown')
    } catch (error) {
      expect(String(error)).toContain('Insufficient stock')
    }
  })

  it('should reject order with zero quantity', async () => {
    const request = new CreateOrderRequest('USER-1', 'PROD-1', 0)

    try {
      await useCase.execute(request)
      expect.unreachable('Should have thrown')
    } catch (error) {
      expect(String(error)).toContain('Validation failed')
    }
  })

  it('should reject order with excessive quantity', async () => {
    const request = new CreateOrderRequest('USER-1', 'PROD-1', 1001)

    try {
      await useCase.execute(request)
      expect.unreachable('Should have thrown')
    } catch (error) {
      expect(String(error)).toContain('Validation failed')
    }
  })
})
