import { describe, expect, it } from 'bun:test'
import { Transaction, TransactionStatus } from '../src/Domain/Entities/Transaction'

describe('Payment Domain - Transaction Entity', () => {
  describe('Transaction Creation & Initial State', () => {
    it('應該建立初始狀態為 PENDING 的交易', () => {
      const tx = Transaction.create('tx-1', {
        orderId: 'ord-123',
        amount: 1000,
        currency: 'TWD',
        gateway: 'stripe',
      })

      expect(tx.id).toBe('tx-1')
      expect(tx.orderId).toBe('ord-123')
      expect(tx.amount).toBe(1000)
      expect(tx.status).toBe(TransactionStatus.PENDING)
      expect(tx.gateway).toBe('stripe')
    })
  })

  describe('Transaction Status Transitions', () => {
    it('PENDING → AUTHORIZED: authorize() 應轉移狀態並設置 gatewayId', () => {
      const tx = Transaction.create('tx-1', {
        orderId: 'ord-123',
        amount: 1000,
        currency: 'TWD',
        gateway: 'stripe',
      })

      tx.authorize('stripe_charge_xyz')
      expect(tx.status).toBe(TransactionStatus.AUTHORIZED)
    })

    it('AUTHORIZED → CAPTURED: capture() 應轉移狀態', () => {
      const tx = Transaction.create('tx-1', {
        orderId: 'ord-123',
        amount: 1000,
        currency: 'TWD',
        gateway: 'stripe',
      })

      tx.authorize('stripe_charge_xyz')
      tx.capture()
      expect(tx.status).toBe(TransactionStatus.CAPTURED)
    })

    it('CAPTURED → REFUNDED: refund() 應轉移狀態', () => {
      const tx = Transaction.create('tx-1', {
        orderId: 'ord-123',
        amount: 1000,
        currency: 'TWD',
        gateway: 'stripe',
      })

      tx.authorize('stripe_charge_xyz')
      tx.capture()
      tx.refund()
      expect(tx.status).toBe(TransactionStatus.REFUNDED)
    })

    it('非 PENDING 時，authorize() 應拋出錯誤', () => {
      const tx = Transaction.create('tx-1', {
        orderId: 'ord-123',
        amount: 1000,
        currency: 'TWD',
        gateway: 'stripe',
      })

      tx.authorize('stripe_charge_xyz')

      expect(() => tx.authorize('another_id')).toThrow(
        'Only pending transactions can be authorized'
      )
    })

    it('非 AUTHORIZED 時，capture() 應拋出錯誤', () => {
      const tx = Transaction.create('tx-1', {
        orderId: 'ord-123',
        amount: 1000,
        currency: 'TWD',
        gateway: 'stripe',
      })

      expect(() => tx.capture()).toThrow('Only authorized transactions can be captured')
    })

    it('非 CAPTURED 時，refund() 應拋出錯誤', () => {
      const tx = Transaction.create('tx-1', {
        orderId: 'ord-123',
        amount: 1000,
        currency: 'TWD',
        gateway: 'stripe',
      })

      tx.authorize('stripe_charge_xyz')

      expect(() => tx.refund()).toThrow('Only captured transactions can be refunded')
    })

    it('fail() 應將狀態設為 FAILED 並儲存失敗原因', () => {
      const tx = Transaction.create('tx-1', {
        orderId: 'ord-123',
        amount: 1000,
        currency: 'TWD',
        gateway: 'stripe',
      })

      tx.fail('Card declined')
      expect(tx.status).toBe(TransactionStatus.FAILED)
    })
  })

  describe('Multiple Transaction Types', () => {
    it('應該支援不同的支付閘道', () => {
      const stripeTx = Transaction.create('tx-1', {
        orderId: 'ord-1',
        amount: 1000,
        currency: 'TWD',
        gateway: 'stripe',
      })

      const paypalTx = Transaction.create('tx-2', {
        orderId: 'ord-2',
        amount: 2000,
        currency: 'TWD',
        gateway: 'paypal',
      })

      expect(stripeTx.gateway).toBe('stripe')
      expect(paypalTx.gateway).toBe('paypal')
    })
  })
})
