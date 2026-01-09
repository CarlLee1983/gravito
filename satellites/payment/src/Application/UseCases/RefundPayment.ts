import { UseCase } from '@gravito/enterprise'
import type { IPaymentGateway } from '../../Domain/Contracts/IPaymentGateway'

export interface RefundPaymentInput {
  gatewayTransactionId: string
  amount?: number
}

export class RefundPayment extends UseCase<RefundPaymentInput, boolean> {
  constructor(private gateway: IPaymentGateway) {
    super()
  }

  async execute(input: RefundPaymentInput): Promise<boolean> {
    console.log(`[Payment] Processing refund for transaction: ${input.gatewayTransactionId}`)
    return await this.gateway.refund(input.gatewayTransactionId, input.amount)
  }
}
