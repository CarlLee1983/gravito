import { describe, expect, it } from 'bun:test'
import {
  CartCleared,
  CartItemAdded,
  OrderCancelled,
  OrderCreated,
  OrderPaid,
} from '../../src/Events'
import { Cart, CartItem, Order, OrderItem, OrderStatus } from '../../src/models'

describe('Domain Events', () => {
  describe('OrderCreated', () => {
    it('should create OrderCreated event with order and userId', () => {
      const order = new Order()
      order.id = 1
      order.user_id = 1
      order.order_number = 'ORD-20240101-ABC1'

      const event = new OrderCreated(order, 1)

      expect(event.order.id).toBe(1)
      expect(event.userId).toBe(1)
      expect(event.constructor.name).toBe('OrderCreated')
    })
  })

  describe('OrderPaid', () => {
    it('should create OrderPaid event with order, paymentIntentId, and amount', () => {
      const order = new Order()
      order.id = 1
      order.total = 16000

      const event = new OrderPaid(order, 'pi_test123', 16000)

      expect(event.order.id).toBe(1)
      expect(event.paymentIntentId).toBe('pi_test123')
      expect(event.amount).toBe(16000)
      expect(event.constructor.name).toBe('OrderPaid')
    })
  })

  describe('OrderCancelled', () => {
    it('should create OrderCancelled event with order', () => {
      const order = new Order()
      order.id = 1
      order.order_number = 'ORD-20240101-ABC1'

      const event = new OrderCancelled(order)

      expect(event.order.id).toBe(1)
      expect(event.reason).toBeUndefined()
      expect(event.constructor.name).toBe('OrderCancelled')
    })

    it('should include reason if provided', () => {
      const order = new Order()
      order.id = 1

      const event = new OrderCancelled(order, 'Customer requested cancellation')

      expect(event.reason).toBe('Customer requested cancellation')
    })
  })

  describe('CartItemAdded', () => {
    it('should create CartItemAdded event with item, cartId, and productId', () => {
      const item = new CartItem()
      item.id = 1
      item.product_id = 1
      item.quantity = 2

      const event = new CartItemAdded(item, 1, 1)

      expect(event.item.id).toBe(1)
      expect(event.cartId).toBe(1)
      expect(event.productId).toBe(1)
      expect(event.constructor.name).toBe('CartItemAdded')
    })
  })

  describe('CartCleared', () => {
    it('should create CartCleared event with cartId', () => {
      const event = new CartCleared(1)

      expect(event.cartId).toBe(1)
      expect(event.constructor.name).toBe('CartCleared')
    })
  })

  describe('Event inheritance', () => {
    it('should extend Event base class', () => {
      const order = new Order()
      order.id = 1

      const event = new OrderCreated(order, 1)

      expect(event instanceof Object).toBe(true)
      expect(event.constructor.name).toBe('OrderCreated')
    })
  })
})
