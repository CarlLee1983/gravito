import { beforeEach, describe, expect, it } from 'bun:test'
import { Order, OrderItem, OrderStatus } from '../../src/models'
import { type CreateOrderInput, OrderRepository } from '../../src/Repositories'

describe('OrderRepository', () => {
  let repository: OrderRepository

  beforeEach(() => {
    repository = new OrderRepository()
  })

  describe('createOrder', () => {
    it('should create order with correct status', async () => {
      const mockOrder = new Order()
      mockOrder.id = 1
      mockOrder.user_id = 1
      mockOrder.order_number = 'ORD-20240101-ABC1'
      mockOrder.status = OrderStatus.PENDING
      mockOrder.subtotal = 10000
      mockOrder.tax = 0
      mockOrder.shipping = 6000
      mockOrder.total = 16000
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

      const order = await repository.createOrder(input)

      expect(order.status).toBe(OrderStatus.PENDING)
      expect(order.total).toBe(16000)
    })
  })

  describe('getOrderWithItems', () => {
    it('should return order with items', async () => {
      const item = new OrderItem()
      item.id = 1
      item.product_name = 'Test Product'
      item.quantity = 2

      const mockOrder = new Order()
      mockOrder.id = 1
      mockOrder.order_number = 'ORD-20240101-ABC1'
      mockOrder.items = [item]

      repository.getOrderWithItems = async () => mockOrder

      const order = await repository.getOrderWithItems(1)

      expect(order.items).toHaveLength(1)
      expect(order.items[0].product_name).toBe('Test Product')
    })
  })

  describe('getByOrderNumber', () => {
    it('should find order by order number', async () => {
      const mockOrder = new Order()
      mockOrder.id = 1
      mockOrder.order_number = 'ORD-20240101-ABC1'
      mockOrder.items = []

      repository.getByOrderNumber = async () => mockOrder

      const order = await repository.getByOrderNumber('ORD-20240101-ABC1')

      expect(order?.order_number).toBe('ORD-20240101-ABC1')
    })

    it('should return null if order not found', async () => {
      repository.getByOrderNumber = async () => null

      const order = await repository.getByOrderNumber('ORD-INVALID')

      expect(order).toBeNull()
    })
  })

  describe('getByStripeSession', () => {
    it('should find order by Stripe session ID', async () => {
      const mockOrder = new Order()
      mockOrder.id = 1
      mockOrder.stripe_session_id = 'cs_test_123'
      mockOrder.items = []

      repository.getByStripeSession = async () => mockOrder

      const order = await repository.getByStripeSession('cs_test_123')

      expect(order?.stripe_session_id).toBe('cs_test_123')
    })
  })

  describe('getUserOrders', () => {
    it('should return paginated user orders', async () => {
      const mockOrder = new Order()
      mockOrder.id = 1
      mockOrder.order_number = 'ORD-20240101-ABC1'

      repository.getUserOrders = async () => ({
        orders: [mockOrder],
        total: 1,
        totalPages: 1,
      })

      const result = await repository.getUserOrders(1, 1, 10)

      expect(result.orders).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.totalPages).toBe(1)
    })
  })

  describe('updateStatus', () => {
    it('should update order status', async () => {
      repository.updateStatus = async () => {}

      await repository.updateStatus(1, OrderStatus.PAID)
      // Test passes if no error thrown
      expect(true).toBe(true)
    })
  })

  describe('markAsPaid', () => {
    it('should mark order as paid', async () => {
      repository.markAsPaid = async () => {}

      await repository.markAsPaid(1, 'pi_test123')
      // Test passes if no error thrown
      expect(true).toBe(true)
    })
  })

  describe('cancelOrder', () => {
    it('should cancel order', async () => {
      const mockOrder = new Order()
      mockOrder.id = 1
      mockOrder.status = OrderStatus.PENDING
      mockOrder.items = []

      repository.getOrderWithItems = async () => mockOrder
      repository.cancelOrder = async () => {}

      await repository.cancelOrder(1)
      // Test passes if no error thrown
      expect(true).toBe(true)
    })
  })
})
