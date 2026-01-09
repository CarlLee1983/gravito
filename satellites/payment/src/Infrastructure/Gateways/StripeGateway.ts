import Stripe from 'stripe'
import type { IPaymentGateway, PaymentIntent } from '../../Domain/Contracts/IPaymentGateway'
import type { Transaction } from '../../Domain/Entities/Transaction'

export class StripeGateway implements IPaymentGateway {
  private stripe: Stripe

  constructor(apiKey: string) {
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-01-27' as any,
    })
  }

  getName(): string {
    return 'stripe'
  }

  async createIntent(transaction: Transaction): Promise<PaymentIntent> {
    // 透過 any 訪問私有屬性以解決跨包訪問問題
    const rawProps = (transaction as any).props

    const intent = await this.stripe.paymentIntents.create({
      amount: Math.round(transaction.amount * 100),
      currency: rawProps.currency.toLowerCase(),
      metadata: {
        orderId: transaction.orderId,
        transactionId: transaction.id,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    })

    return {
      gatewayTransactionId: intent.id,
      clientSecret: intent.client_secret || '',
      status: intent.status,
    }
  }

  async capture(gatewayTransactionId: string): Promise<boolean> {
    const intent = await this.stripe.paymentIntents.capture(gatewayTransactionId)
    return intent.status === 'succeeded'
  }

  async refund(gatewayTransactionId: string, amount?: number): Promise<boolean> {
    const refund = await this.stripe.refunds.create({
      payment_intent: gatewayTransactionId,
      ...(amount && { amount: Math.round(amount * 100) }),
    })
    return refund.status === 'succeeded'
  }
}
