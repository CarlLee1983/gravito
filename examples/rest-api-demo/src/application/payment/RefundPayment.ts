/**
 * RefundPayment Use Case
 */

import type { Payment, RefundPaymentInput } from '@domain/payment/Payment'
import { PaymentDomainService } from '@domain/payment/Payment'
import type { PaymentRepository } from '@infrastructure/repositories/PaymentRepository'

export interface RefundPaymentRequest {
  paymentId: string
  reason: string
  amount?: number
}

export class RefundPaymentUseCase {
  constructor(private paymentRepository: PaymentRepository) {}

  async execute(request: RefundPaymentRequest): Promise<Payment> {
    // =====================================================================
    // 1. 驗證輸入
    // =====================================================================
    if (!request.paymentId) {
      throw new Error('Payment ID is required')
    }

    if (!request.reason) {
      throw new Error('Refund reason is required')
    }

    // =====================================================================
    // 2. 獲取支付記錄
    // =====================================================================
    const payment = await this.paymentRepository.findById(request.paymentId)
    if (!payment) {
      throw new Error('Payment not found')
    }

    // =====================================================================
    // 3. 驗證支付是否可以退款
    // =====================================================================
    if (!PaymentDomainService.canBeRefunded(payment)) {
      throw new Error(`Cannot refund payment with status ${payment.status}`)
    }

    // =====================================================================
    // 4. 驗證退款金額
    // =====================================================================
    if (request.amount) {
      if (!PaymentDomainService.isValidAmount(request.amount)) {
        throw new Error('Invalid refund amount')
      }
      if (request.amount > payment.amount) {
        throw new Error('Refund amount cannot exceed payment amount')
      }
    }

    // =====================================================================
    // 5. 進行退款
    // =====================================================================
    const refundPaymentInput: RefundPaymentInput = {
      reason: request.reason,
      amount: request.amount,
    }

    const refundedPayment = await this.paymentRepository.refund(
      request.paymentId,
      refundPaymentInput
    )
    if (!refundedPayment) {
      throw new Error('Failed to refund payment')
    }

    return refundedPayment
  }
}
