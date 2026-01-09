import type { Transaction } from '../Entities/Transaction'

export interface PaymentIntent {
  gatewayTransactionId: string
  clientSecret: string // 用於前端付款（如 Stripe Elements）
  status: string
}

export interface IPaymentGateway {
  getName(): string

  /**
   * 建立支付意向 (Create Intent)
   */
  createIntent(transaction: Transaction): Promise<PaymentIntent>

  /**
   * 清算授權金額 (Capture)
   */
  capture(gatewayTransactionId: string): Promise<boolean>

  /**
   * 退款 (Refund)
   */
  refund(gatewayTransactionId: string, amount?: number): Promise<boolean>
}
