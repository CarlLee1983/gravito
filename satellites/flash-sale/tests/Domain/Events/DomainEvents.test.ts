import { describe, expect, it } from 'bun:test'
import { DomainEvent } from '@gravito/enterprise'
import { Order } from '../../../src/Domain/Entities/Order'
import { OrderConfirmed } from '../../../src/Domain/Events/OrderConfirmed'
import { OrderCreated } from '../../../src/Domain/Events/OrderCreated'
import { OrderRefunded } from '../../../src/Domain/Events/OrderRefunded'
import { PaymentSucceeded } from '../../../src/Domain/Events/PaymentSucceeded'
import { Money } from '../../../src/Domain/ValueObjects/Money'
import { OrderItem } from '../../../src/Domain/ValueObjects/OrderItem'

describe('Domain Events', () => {
  describe('OrderCreated', () => {
    it('應繼承 DomainEvent', () => {
      const items = [OrderItem.create('prod-1', 'Product A', 1, Money.of(100))]
      const order = Order.create('order-1', 'user-1', items)
      const events = order.pullDomainEvents()
      const event = events[0]

      expect(event).toBeInstanceOf(DomainEvent)
      expect(event).toBeInstanceOf(OrderCreated)
    })

    it('應包含正確的 eventName', () => {
      const items = [OrderItem.create('prod-1', 'Product A', 1, Money.of(100))]
      const order = Order.create('order-1', 'user-1', items)
      const events = order.pullDomainEvents()

      expect(events[0].eventName).toBe('OrderCreated')
    })

    it('應包含 eventId 和 occurredOn', () => {
      const items = [OrderItem.create('prod-1', 'Product A', 1, Money.of(100))]
      const order = Order.create('order-1', 'user-1', items)
      const events = order.pullDomainEvents()
      const event = events[0]

      expect(event.eventId).toBeDefined()
      expect(typeof event.eventId).toBe('string')
      expect(event.occurredOn).toBeInstanceOf(Date)
    })

    it('應包含 aggregateId', () => {
      const items = [OrderItem.create('prod-1', 'Product A', 1, Money.of(100))]
      const order = Order.create('order-1', 'user-1', items)
      const events = order.pullDomainEvents()
      const event = events[0] as OrderCreated

      expect(event.aggregateId).toBe('order-1')
    })

    it('應包含 order 參考', () => {
      const items = [OrderItem.create('prod-1', 'Product A', 1, Money.of(100))]
      const order = Order.create('order-1', 'user-1', items)
      const events = order.pullDomainEvents()
      const event = events[0] as OrderCreated

      expect(event.order).toBeDefined()
      expect(event.order.id).toBe('order-1')
    })
  })

  describe('OrderConfirmed', () => {
    it('應繼承 DomainEvent', () => {
      const event = new OrderConfirmed('order-1')

      expect(event).toBeInstanceOf(DomainEvent)
      expect(event).toBeInstanceOf(OrderConfirmed)
    })

    it('應包含正確的屬性', () => {
      const event = new OrderConfirmed('order-1')

      expect(event.eventName).toBe('OrderConfirmed')
      expect(event.aggregateId).toBe('order-1')
      expect(event.orderId).toBe('order-1')
      expect(event.eventId).toBeDefined()
      expect(event.occurredOn).toBeInstanceOf(Date)
    })
  })

  describe('OrderRefunded', () => {
    it('應繼承 DomainEvent', () => {
      const event = new OrderRefunded('order-1', 'Customer request')

      expect(event).toBeInstanceOf(DomainEvent)
      expect(event).toBeInstanceOf(OrderRefunded)
    })

    it('應包含正確的屬性', () => {
      const event = new OrderRefunded('order-1', 'Defective product')

      expect(event.eventName).toBe('OrderRefunded')
      expect(event.aggregateId).toBe('order-1')
      expect(event.orderId).toBe('order-1')
      expect(event.reason).toBe('Defective product')
      expect(event.eventId).toBeDefined()
      expect(event.occurredOn).toBeInstanceOf(Date)
    })
  })

  describe('PaymentSucceeded', () => {
    it('應繼承 DomainEvent', () => {
      const event = new PaymentSucceeded('order-1', 'pay-123', 500)

      expect(event).toBeInstanceOf(DomainEvent)
      expect(event).toBeInstanceOf(PaymentSucceeded)
    })

    it('應包含正確的屬性', () => {
      const event = new PaymentSucceeded('order-1', 'pay-123', 500)

      expect(event.eventName).toBe('PaymentSucceeded')
      expect(event.aggregateId).toBe('order-1')
      expect(event.orderId).toBe('order-1')
      expect(event.paymentId).toBe('pay-123')
      expect(event.amount).toBe(500)
      expect(event.eventId).toBeDefined()
      expect(event.occurredOn).toBeInstanceOf(Date)
    })
  })
})
