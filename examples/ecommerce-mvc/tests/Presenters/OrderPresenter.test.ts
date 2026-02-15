import { describe, expect, it } from 'bun:test'
import { Order, OrderItem, OrderStatus } from '../../src/models'
import { OrderPresenter } from '../../src/Presenters'

describe('OrderPresenter', () => {
  describe('present', () => {
    it('should transform order model to DTO', () => {
      // Setup
      const order = new Order()
      order.id = 1
      order.order_number = 'ORD-20240101-ABC1'
      order.user_id = 1
      order.status = OrderStatus.PENDING
      order.subtotal = 10000
      order.tax = 0
      order.shipping = 6000
      order.total = 16000
      order.created_at = new Date('2024-01-01T00:00:00Z')
      order.updated_at = new Date('2024-01-01T00:00:00Z')
      order.shipping_address = JSON.stringify({
        name: 'John Doe',
        phone: '0912345678',
        address: '123 Main St',
        city: 'Taipei',
        postal_code: '100',
      })

      const item = new OrderItem()
      item.id = 1
      item.order_id = 1
      item.product_id = 1
      item.product_name = 'Test Product'
      item.quantity = 2
      item.price = 5000

      order.items = [item]

      // Test
      const dto = OrderPresenter.present(order)

      expect(dto.id).toBe(1)
      expect(dto.orderNumber).toBe('ORD-20240101-ABC1')
      expect(dto.status).toBe(OrderStatus.PENDING)
      expect(dto.statusLabel).toBe('待付款')
      expect(dto.userId).toBe(1)
      expect(dto.subtotal).toBe(10000)
      expect(dto.total).toBe(16000)
      expect(dto.formattedTotal).toBe('NT$ 160')
      expect(dto.canBeCancelled).toBe(true)
      expect(dto.items).toHaveLength(1)
    })

    it('should include user data if available', () => {
      // Setup
      const order = new Order()
      order.id = 1
      order.order_number = 'ORD-20240101-ABC1'
      order.user_id = 1
      order.status = OrderStatus.PENDING
      order.subtotal = 10000
      order.tax = 0
      order.shipping = 6000
      order.total = 16000
      order.created_at = new Date()
      order.updated_at = new Date()
      order.items = []
      order.user = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
      }

      // Test
      const dto = OrderPresenter.present(order)

      expect(dto.user).toBeDefined()
      expect(dto.user?.name).toBe('John Doe')
      expect(dto.user?.email).toBe('john@example.com')
    })

    it('should format order number correctly', () => {
      // Setup
      const order = new Order()
      order.id = 1
      order.order_number = 'ORD-20240115-XYZ9'
      order.user_id = 1
      order.status = OrderStatus.PENDING
      order.subtotal = 5000
      order.tax = 0
      order.shipping = 6000
      order.total = 11000
      order.created_at = new Date()
      order.updated_at = new Date()
      order.items = []

      // Test
      const dto = OrderPresenter.present(order)

      expect(dto.orderNumber).toBe('ORD-20240115-XYZ9')
    })

    it('should indicate order cannot be cancelled when shipped', () => {
      // Setup
      const order = new Order()
      order.id = 1
      order.order_number = 'ORD-20240101-ABC1'
      order.user_id = 1
      order.status = OrderStatus.SHIPPED
      order.subtotal = 10000
      order.tax = 0
      order.shipping = 6000
      order.total = 16000
      order.created_at = new Date()
      order.updated_at = new Date()
      order.items = []

      // Test
      const dto = OrderPresenter.present(order)

      expect(dto.canBeCancelled).toBe(false)
    })

    it('should use camelCase for properties', () => {
      // Setup
      const order = new Order()
      order.id = 1
      order.order_number = 'ORD-20240101-ABC1'
      order.user_id = 1
      order.status = OrderStatus.PENDING
      order.subtotal = 10000
      order.tax = 0
      order.shipping = 6000
      order.total = 16000
      order.created_at = new Date()
      order.updated_at = new Date()
      order.items = []

      // Test
      const dto = OrderPresenter.present(order)

      expect(Object.keys(dto)).toContain('orderNumber')
      expect(Object.keys(dto)).not.toContain('order_number')
      expect(Object.keys(dto)).toContain('userId')
      expect(Object.keys(dto)).not.toContain('user_id')
    })
  })
})
