import { describe, expect, it } from 'bun:test'
import { ProcessPayment } from '../src/Application/UseCases/ProcessPayment'
import { RefundPayment } from '../src/Application/UseCases/RefundPayment'
import type { IPaymentGateway, PaymentIntent } from '../src/Domain/Contracts/IPaymentGateway'
import { Transaction, TransactionStatus } from '../src/Domain/Entities/Transaction'

/**
 * Mock PaymentGateway
 */
class MockPaymentGateway implements IPaymentGateway {
  private intents: Map<string, PaymentIntent> = new Map()

  getName(): string {
    return 'mock'
  }

  async createIntent(transaction: Transaction): Promise<PaymentIntent> {
    const intent: PaymentIntent = {
      gatewayTransactionId: `mock_${transaction.id}`,
      clientSecret: `secret_${transaction.id}`,
      status: 'requires_action',
    }
    this.intents.set(intent.gatewayTransactionId, intent)
    return intent
  }

  async capture(gatewayTransactionId: string): Promise<boolean> {
    const intent = this.intents.get(gatewayTransactionId)
    if (!intent) {
      return false
    }
    intent.status = 'succeeded'
    return true
  }

  async refund(gatewayTransactionId: string, amount?: number): Promise<boolean> {
    const intent = this.intents.get(gatewayTransactionId)
    if (!intent) {
      return false
    }
    intent.status = 'refunded'
    return true
  }
}

/**
 * Mock PaymentManager
 */
class MockPaymentManager {
  private gateways: Map<string, IPaymentGateway> = new Map()

  constructor() {
    this.gateways.set('mock', new MockPaymentGateway())
    this.gateways.set('stripe', new MockPaymentGateway())
  }

  driver(name?: string): IPaymentGateway {
    const driverName = name || 'stripe'
    const gateway = this.gateways.get(driverName)
    if (!gateway) {
      throw new Error(`Payment driver [${driverName}] is not registered`)
    }
    return gateway
  }

  getGateway(name: string): MockPaymentGateway {
    return this.gateways.get(name) as MockPaymentGateway
  }
}

describe('Payment UseCases', () => {
  describe('ProcessPayment', () => {
    it('應該能成功建立支付意向', async () => {
      const manager = new MockPaymentManager()
      const useCase = new ProcessPayment(manager as any)

      const result = await useCase.execute({
        orderId: 'ord-123',
        amount: 1000,
        currency: 'TWD',
        gateway: 'stripe',
      })

      expect(result.gatewayTransactionId).toBeDefined()
      expect(result.clientSecret).toBeDefined()
      expect(result.status).toBe('requires_action')
    })

    it('應該能設置自定義 metadata', async () => {
      const manager = new MockPaymentManager()
      const useCase = new ProcessPayment(manager as any)

      const result = await useCase.execute({
        orderId: 'ord-123',
        amount: 1000,
        currency: 'TWD',
        gateway: 'stripe',
        metadata: {
          lockId: 'lock-xyz',
          source: 'web',
        },
      })

      expect(result.gatewayTransactionId).toBeDefined()
    })

    it('應該使用預設驅動器當未指定時', async () => {
      const manager = new MockPaymentManager()
      const useCase = new ProcessPayment(manager as any)

      const result = await useCase.execute({
        orderId: 'ord-123',
        amount: 1000,
        currency: 'TWD',
      })

      expect(result.gatewayTransactionId).toBeDefined()
    })

    it('應該在不同幣別間工作', async () => {
      const manager = new MockPaymentManager()
      const useCase = new ProcessPayment(manager as any)

      const twdResult = await useCase.execute({
        orderId: 'ord-1',
        amount: 1000,
        currency: 'TWD',
      })

      const usdResult = await useCase.execute({
        orderId: 'ord-2',
        amount: 30,
        currency: 'USD',
      })

      expect(twdResult.gatewayTransactionId).toBeDefined()
      expect(usdResult.gatewayTransactionId).toBeDefined()
    })

    it('應該支援多個支付閘道', async () => {
      const manager = new MockPaymentManager()
      const useCase = new ProcessPayment(manager as any)

      const stripeResult = await useCase.execute({
        orderId: 'ord-1',
        amount: 1000,
        currency: 'TWD',
        gateway: 'stripe',
      })

      const mockResult = await useCase.execute({
        orderId: 'ord-2',
        amount: 2000,
        currency: 'TWD',
        gateway: 'mock',
      })

      expect(stripeResult.gatewayTransactionId).toBeDefined()
      expect(mockResult.gatewayTransactionId).toBeDefined()
    })

    it('當驅動器不存在時應拋出錯誤', async () => {
      const manager = new MockPaymentManager()
      const useCase = new ProcessPayment(manager as any)

      try {
        await useCase.execute({
          orderId: 'ord-123',
          amount: 1000,
          currency: 'TWD',
          gateway: 'nonexistent',
        })
        expect.unreachable('應該拋出錯誤')
      } catch (error: any) {
        expect(error.message).toContain('not registered')
      }
    })
  })

  describe('RefundPayment', () => {
    it('應該能成功退款', async () => {
      const gateway = new MockPaymentGateway()

      // 先建立一筆交易
      const tx = Transaction.create('tx-1', {
        orderId: 'ord-123',
        amount: 1000,
        currency: 'TWD',
        gateway: 'mock',
      })

      const intent = await gateway.createIntent(tx)

      // 執行退款
      const useCase = new RefundPayment(gateway)
      const result = await useCase.execute({
        gatewayTransactionId: intent.gatewayTransactionId,
      })

      expect(result).toBe(true)
    })

    it('應該能支援部分退款', async () => {
      const gateway = new MockPaymentGateway()

      const tx = Transaction.create('tx-1', {
        orderId: 'ord-123',
        amount: 1000,
        currency: 'TWD',
        gateway: 'mock',
      })

      const intent = await gateway.createIntent(tx)

      const useCase = new RefundPayment(gateway)
      const result = await useCase.execute({
        gatewayTransactionId: intent.gatewayTransactionId,
        amount: 500,
      })

      expect(result).toBe(true)
    })

    it('當交易不存在時應返回 false', async () => {
      const gateway = new MockPaymentGateway()
      const useCase = new RefundPayment(gateway)

      const result = await useCase.execute({
        gatewayTransactionId: 'nonexistent_tx',
      })

      expect(result).toBe(false)
    })

    it('應該能連續退款多筆交易', async () => {
      const gateway = new MockPaymentGateway()

      // 建立多筆交易
      const tx1 = Transaction.create('tx-1', {
        orderId: 'ord-1',
        amount: 1000,
        currency: 'TWD',
        gateway: 'mock',
      })
      const tx2 = Transaction.create('tx-2', {
        orderId: 'ord-2',
        amount: 2000,
        currency: 'TWD',
        gateway: 'mock',
      })

      const intent1 = await gateway.createIntent(tx1)
      const intent2 = await gateway.createIntent(tx2)

      const useCase = new RefundPayment(gateway)

      const result1 = await useCase.execute({
        gatewayTransactionId: intent1.gatewayTransactionId,
      })
      const result2 = await useCase.execute({
        gatewayTransactionId: intent2.gatewayTransactionId,
      })

      expect(result1).toBe(true)
      expect(result2).toBe(true)
    })
  })

  describe('Transaction State Machine with UseCases', () => {
    it('應該能從 PENDING 經過 AUTHORIZED 到 CAPTURED', async () => {
      const gateway = new MockPaymentGateway()

      // 1. 建立交易（ProcessPayment）
      const tx = Transaction.create('tx-1', {
        orderId: 'ord-123',
        amount: 1000,
        currency: 'TWD',
        gateway: 'mock',
      })

      expect(tx.status).toBe(TransactionStatus.PENDING)

      // 2. 建立支付意向
      const intent = await gateway.createIntent(tx)
      tx.authorize(intent.gatewayTransactionId)

      expect(tx.status).toBe(TransactionStatus.AUTHORIZED)

      // 3. 清算
      await gateway.capture(intent.gatewayTransactionId)
      tx.capture()

      expect(tx.status).toBe(TransactionStatus.CAPTURED)
    })

    it('應該能在已清算狀態退款', async () => {
      const gateway = new MockPaymentGateway()

      // 建立並處理交易
      const tx = Transaction.create('tx-1', {
        orderId: 'ord-123',
        amount: 1000,
        currency: 'TWD',
        gateway: 'mock',
      })

      const intent = await gateway.createIntent(tx)
      tx.authorize(intent.gatewayTransactionId)
      tx.capture()

      // 執行退款
      const useCase = new RefundPayment(gateway)
      const result = await useCase.execute({
        gatewayTransactionId: intent.gatewayTransactionId,
      })

      tx.refund()

      expect(result).toBe(true)
      expect(tx.status).toBe(TransactionStatus.REFUNDED)
    })

    it('應該防止無效的狀態轉移', async () => {
      const tx = Transaction.create('tx-1', {
        orderId: 'ord-123',
        amount: 1000,
        currency: 'TWD',
        gateway: 'mock',
      })

      // 不能在 PENDING 狀態捕獲
      expect(() => tx.capture()).toThrow('Only authorized transactions can be captured')

      tx.authorize('gateway_id')

      // 不能在 AUTHORIZED 狀態退款
      expect(() => tx.refund()).toThrow('Only captured transactions can be refunded')
    })
  })

  describe('Edge Cases', () => {
    it('應該能處理大金額交易', async () => {
      const manager = new MockPaymentManager()
      const useCase = new ProcessPayment(manager as any)

      const result = await useCase.execute({
        orderId: 'ord-999999',
        amount: 999999999,
        currency: 'TWD',
      })

      expect(result.gatewayTransactionId).toBeDefined()
    })

    it('應該能處理極小金額交易', async () => {
      const manager = new MockPaymentManager()
      const useCase = new ProcessPayment(manager as any)

      const result = await useCase.execute({
        orderId: 'ord-1',
        amount: 1,
        currency: 'TWD',
      })

      expect(result.gatewayTransactionId).toBeDefined()
    })

    it('應該能處理 0 金額（測試場景）', async () => {
      const manager = new MockPaymentManager()
      const useCase = new ProcessPayment(manager as any)

      const result = await useCase.execute({
        orderId: 'ord-free',
        amount: 0,
        currency: 'TWD',
      })

      expect(result.gatewayTransactionId).toBeDefined()
    })
  })
})
