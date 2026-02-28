/**
 * OrderMapper 單元測試
 *
 * 驗證 Order Entity <-> OrderDTO 的雙向轉換
 */

import { describe, expect, it } from 'bun:test'
import { OrderMapper } from '../../../src/Application/DTOs/OrderDTO'
import { Order } from '../../../src/Domain/Entities/Order'
import { OrderStatus } from '../../../src/Domain/Models'
import { Money } from '../../../src/Domain/ValueObjects/Money'
import { OrderItem } from '../../../src/Domain/ValueObjects/OrderItem'

describe('OrderMapper', () => {
  /**
   * 建立測試用 Order Entity
   */
  function createTestOrder(): Order {
    const item1 = OrderItem.create('prod-1', 'Product A', 2, Money.of(99.99))
    const item2 = OrderItem.create('prod-2', 'Product B', 1, Money.of(50))
    return Order.create('order-123', 'user-456', [item1, item2])
  }

  describe('toDTO', () => {
    it('should convert Order entity to OrderDTO with correct fields', () => {
      const order = createTestOrder()
      const dto = OrderMapper.toDTO(order)

      expect(dto.id).toBe('order-123')
      expect(dto.userId).toBe('user-456')
      expect(dto.status).toBe(OrderStatus.PENDING)
      expect(dto.createdAt).toBeInstanceOf(Date)
    })

    it('should convert Money totalAmount to decimal number', () => {
      const order = createTestOrder()
      const dto = OrderMapper.toDTO(order)

      // 2 * 99.99 + 1 * 50 = 249.98
      expect(dto.totalAmount).toBe(249.98)
    })

    it('should convert OrderItem value objects to OrderItemDTO', () => {
      const order = createTestOrder()
      const dto = OrderMapper.toDTO(order)

      expect(dto.items).toHaveLength(2)
      expect(dto.items[0].productId).toBe('prod-1')
      expect(dto.items[0].productName).toBe('Product A')
      expect(dto.items[0].quantity).toBe(2)
      expect(dto.items[0].unitPrice).toBe(99.99)
      expect(dto.items[0].totalPrice).toBe(199.98)
    })

    it('should convert second item correctly', () => {
      const order = createTestOrder()
      const dto = OrderMapper.toDTO(order)

      expect(dto.items[1].productId).toBe('prod-2')
      expect(dto.items[1].productName).toBe('Product B')
      expect(dto.items[1].quantity).toBe(1)
      expect(dto.items[1].unitPrice).toBe(50)
      expect(dto.items[1].totalPrice).toBe(50)
    })

    it('should handle confirmed order status', () => {
      const order = createTestOrder()
      order.confirm()
      const dto = OrderMapper.toDTO(order)

      expect(dto.status).toBe(OrderStatus.CONFIRMED)
    })
  })

  describe('toDTOList', () => {
    it('should convert array of Order entities to OrderDTO array', () => {
      const order1 = createTestOrder()
      const item = OrderItem.create('prod-3', 'Product C', 3, Money.of(30))
      const order2 = Order.create('order-789', 'user-101', [item])

      const dtos = OrderMapper.toDTOList([order1, order2])

      expect(dtos).toHaveLength(2)
      expect(dtos[0].id).toBe('order-123')
      expect(dtos[1].id).toBe('order-789')
    })

    it('should return empty array for empty input', () => {
      const dtos = OrderMapper.toDTOList([])
      expect(dtos).toHaveLength(0)
    })
  })

  describe('toDomain', () => {
    it('should convert CreateOrderInput to domain parameters', () => {
      const input = {
        userId: 'user-123',
        items: [{ productId: 'prod-1', productName: 'Product A', quantity: 2, unitPrice: 99.99 }],
      }

      const result = OrderMapper.toDomain(input)

      expect(result.userId).toBe('user-123')
      expect(result.items).toHaveLength(1)
      expect(result.items[0].productId).toBe('prod-1')
      expect(result.items[0].productName).toBe('Product A')
      expect(result.items[0].quantity).toBe(2)
      expect(result.items[0].unitPrice.value).toBe(99.99)
    })

    it('should convert multiple items correctly', () => {
      const input = {
        userId: 'user-456',
        items: [
          { productId: 'prod-1', productName: 'A', quantity: 1, unitPrice: 100 },
          { productId: 'prod-2', productName: 'B', quantity: 3, unitPrice: 50 },
        ],
      }

      const result = OrderMapper.toDomain(input)

      expect(result.items).toHaveLength(2)
      expect(result.items[0].unitPrice.value).toBe(100)
      expect(result.items[1].unitPrice.value).toBe(50)
      expect(result.items[1].quantity).toBe(3)
    })
  })
})
