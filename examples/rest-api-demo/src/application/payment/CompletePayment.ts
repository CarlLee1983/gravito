/**
 * CompletePayment Use Case
 */

import type { CompletePaymentInput, Payment } from '@domain/payment/Payment'
import type { PaymentRepository } from '@infrastructure/repositories/PaymentRepository'

export interface CompletePaymentRequest {
  paymentId: string
  transactionId: string
  receiptUrl?: string
}

export class CompletePaymentUseCase {
  constructor(private paymentRepository: PaymentRepository) {}

  async execute(request: CompletePaymentRequest): Promise<Payment> {
    if (!request.paymentId || !request.transactionId) {
      throw new Error('Payment ID and transaction ID are required')
    }

    const completePaymentInput: CompletePaymentInput = {
      transactionId: request.transactionId,
      receiptUrl: request.receiptUrl,
    }

    const payment = await this.paymentRepository.complete(request.paymentId, completePaymentInput)
    if (!payment) {
      throw new Error('Failed to complete payment')
    }

    return payment
  }
}
