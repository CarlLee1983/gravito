import { UseCase } from '@gravito/enterprise'
import type { PaymentIntent } from '../../Domain/Contracts/IPaymentGateway'
import { Transaction } from '../../Domain/Entities/Transaction'
import type { PaymentManager } from '../../Infrastructure/PaymentManager'

export interface ProcessPaymentInput {
  orderId: string
  amount: number
  currency: string
  gateway?: string // 現在可以動態指定
}

export class ProcessPayment extends UseCase<ProcessPaymentInput, PaymentIntent> {
  constructor(private manager: PaymentManager) {
    super()
  }

  async execute(input: ProcessPaymentInput): Promise<PaymentIntent> {
    const transaction = Transaction.create(crypto.randomUUID(), {
      orderId: input.orderId,
      amount: input.amount,
      currency: input.currency,
      gateway: input.gateway || 'default',
    })

    // 從 Manager 取得指定的金流驅動器
    const gateway = this.manager.driver(input.gateway)
    const intent = await gateway.createIntent(transaction)

    transaction.authorize(intent.gatewayTransactionId)

    return intent
  }
}
