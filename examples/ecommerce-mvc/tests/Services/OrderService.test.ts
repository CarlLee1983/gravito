import { beforeEach, describe, expect, it } from 'bun:test'
import type { EventManager } from '@gravito/core'
import { Order, OrderStatus } from '../../src/models'
import { OrderRepository } from '../../src/Repositories'
import { type CreateOrderInput, OrderService } from '../../src/Services'

describe('OrderService', () => {
  let service: OrderService
  let repository: OrderRepository
  let eventManager: EventManager & { dispatchCalls: any[] }

  beforeEach(() => {
    repository = new OrderRepository()

    // Mock EventManager
    eventManager = {
      dispatchCalls: [],
      dispatch: async (event: any) => {
        eventManager.dispatchCalls.push(event)
      },
    } as any
  })

  describe('createOrder', () => {
    it('should create order and dispatch OrderCreated event', async () => {
      service = new OrderService(repository, eventManager)

      const mockOrder = new Order()
      mockOrder.id = 1
      mockOrder.user_id = 1
      mockOrder.order_number = 'ORD-20240101-ABC1'
      mockOrder.status = OrderStatus.PENDING
      mockOrder.subtotal = 10000
      mockOrder.tax = 0
      mockOrder.shipping = 6000
      mockOrder.total = 16000
      mockOrder.created_at = new Date()
      mockOrder.updated_at = new Date()
      mockOrder.items = []

      repository.createOrder = async () => mockOrder

      const input: CreateOrderInput = {
        userId: 1,
        cartId: 1,
        shippingAddress: {
          name: 'John Doe',
          phone: '0912345678',
          address: '123 Main St',
          city: 'Taipei',
          postal_code: '100',
        },
      }

      const order = await service.createOrder(input)

      expect(order.id).toBe(1)
      expect(eventManager.dispatchCalls).toHaveLength(1)
      expect(eventManager.dispatchCalls[0].constructor.name).toBe('OrderCreated')
    })
  })

  describe('markAsPaid', () => {
    it('should mark order as paid and dispatch OrderPaid event', async () => {
      service = new OrderService(repository, eventManager)

      const mockOrder = new Order()
      mockOrder.id = 1
      mockOrder.user_id = 1
      mockOrder.order_number = 'ORD-20240101-ABC1'
      mockOrder.status = OrderStatus.PAID
      mockOrder.subtotal = 10000
      mockOrder.tax = 0
      mockOrder.shipping = 6000
      mockOrder.total = 16000
      mockOrder.created_at = new Date()
      mockOrder.updated_at = new Date()
      mockOrder.items = []

      repository.markAsPaid = async () => {}
      repository.getOrderWithItems = async () => mockOrder

      await service.markAsPaid(1, 'pi_test123')

      expect(eventManager.dispatchCalls).toHaveLength(1)
      expect(eventManager.dispatchCalls[0].constructor.name).toBe('OrderPaid')
    })
  })

  describe('cancelOrder', () => {
    it('should cancel order and dispatch OrderCancelled event', async () => {
      service = new OrderService(repository, eventManager)

      const mockOrder = new Order()
      mockOrder.id = 1
      mockOrder.user_id = 1
      mockOrder.order_number = 'ORD-20240101-ABC1'
      mockOrder.status = OrderStatus.CANCELLED
      mockOrder.subtotal = 10000
      mockOrder.tax = 0
      mockOrder.shipping = 6000
      mockOrder.total = 16000
      mockOrder.created_at = new Date()
      mockOrder.updated_at = new Date()
      mockOrder.items = []

      repository.getOrderWithItems = async () => mockOrder
      repository.cancelOrder = async () => {}

      await service.cancelOrder(1)

      expect(eventManager.dispatchCalls).toHaveLength(1)
      expect(eventManager.dispatchCalls[0].constructor.name).toBe('OrderCancelled')
    })
  })

  describe('createOrderAsDTO', () => {
    it('should create order and return OrderResponseDTO', async () => {
      service = new OrderService(repository, eventManager)

      const mockOrder = new Order()
      mockOrder.id = 1
      mockOrder.user_id = 1
      mockOrder.order_number = 'ORD-20240101-ABC1'
      mockOrder.status = OrderStatus.PENDING
      mockOrder.subtotal = 10000
      mockOrder.tax = 0
      mockOrder.shipping = 6000
      mockOrder.total = 16000
      mockOrder.created_at = new Date('2024-01-01T00:00:00Z')
      mockOrder.updated_at = new Date('2024-01-01T00:00:00Z')
      mockOrder.items = []

      repository.createOrder = async () => mockOrder

      const input: CreateOrderInput = {
        userId: 1,
        cartId: 1,
        shippingAddress: {
          name: 'John Doe',
          phone: '0912345678',
          address: '123 Main St',
          city: 'Taipei',
          postal_code: '100',
        },
      }

      const dto = await service.createOrderAsDTO(input)

      expect(dto.orderNumber).toBe('ORD-20240101-ABC1')
      expect(dto.status).toBe(OrderStatus.PENDING)
      expect(dto.total).toBe(16000)
      // Should have dispatched event
      expect(eventManager.dispatchCalls).toHaveLength(1)
    })
  })

  describe('getOrderAsDTO', () => {
    it('should return OrderResponseDTO for existing order', async () => {
      service = new OrderService(repository, eventManager)

      const mockOrder = new Order()
      mockOrder.id = 1
      mockOrder.user_id = 1
      mockOrder.order_number = 'ORD-20240101-ABC1'
      mockOrder.status = OrderStatus.PENDING
      mockOrder.subtotal = 10000
      mockOrder.tax = 0
      mockOrder.shipping = 6000
      mockOrder.total = 16000
      mockOrder.created_at = new Date('2024-01-01T00:00:00Z')
      mockOrder.updated_at = new Date('2024-01-01T00:00:00Z')
      mockOrder.items = []

      repository.getOrderWithItems = async () => mockOrder

      const dto = await service.getOrderAsDTO(1)

      expect(dto).toBeDefined()
      expect(dto?.orderNumber).toBe('ORD-20240101-ABC1')
    })

    it('should return null if order not found', async () => {
      service = new OrderService(repository, eventManager)

      repository.getOrderWithItems = async () => null

      const dto = await service.getOrderAsDTO(999)

      expect(dto).toBeNull()
    })
  })

  describe('getUserOrdersAsDTO', () => {
    it('should return paginated orders as DTOs', async () => {
      service = new OrderService(repository, eventManager)

      const mockOrder = new Order()
      mockOrder.id = 1
      mockOrder.user_id = 1
      mockOrder.order_number = 'ORD-20240101-ABC1'
      mockOrder.status = OrderStatus.PENDING
      mockOrder.subtotal = 10000
      mockOrder.tax = 0
      mockOrder.shipping = 6000
      mockOrder.total = 16000
      mockOrder.created_at = new Date('2024-01-01T00:00:00Z')
      mockOrder.updated_at = new Date('2024-01-01T00:00:00Z')
      mockOrder.items = []

      repository.getUserOrders = async () => ({
        orders: [mockOrder],
        total: 1,
        totalPages: 1,
      })

      const result = await service.getUserOrdersAsDTO(1)

      expect(result.orders).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.totalPages).toBe(1)
      expect(result.orders[0].orderNumber).toBe('ORD-20240101-ABC1')
    })
  })

  describe('event handling without EventManager', () => {
    it('should work without EventManager (backward compatible)', async () => {
      service = new OrderService(repository)

      const mockOrder = new Order()
      mockOrder.id = 1
      mockOrder.user_id = 1
      mockOrder.order_number = 'ORD-20240101-ABC1'
      mockOrder.status = OrderStatus.PENDING
      mockOrder.subtotal = 10000
      mockOrder.tax = 0
      mockOrder.shipping = 6000
      mockOrder.total = 16000
      mockOrder.created_at = new Date()
      mockOrder.updated_at = new Date()
      mockOrder.items = []

      repository.createOrder = async () => mockOrder

      const input: CreateOrderInput = {
        userId: 1,
        cartId: 1,
        shippingAddress: {
          name: 'John Doe',
          phone: '0912345678',
          address: '123 Main St',
          city: 'Taipei',
          postal_code: '100',
        },
      }

      const order = await service.createOrder(input)

      expect(order.id).toBe(1)
      // No event manager, but service still works
    })
  })
})
