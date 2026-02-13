/**
 * InitiatePayment Use Case
 */

import type {
  InitiatePaymentInput,
  Payment,
  PaymentGateway,
  PaymentMethod,
} from '@domain/payment/Payment'
import { PaymentDomainService } from '@domain/payment/Payment'
import type { PaymentRepository } from '@infrastructure/repositories/PaymentRepository'

export interface InitiatePaymentRequest {
  orderId: string
  userId: string
  amount: number
  currency: string
  method: PaymentMethod
  gateway: PaymentGateway
}

export class InitiatePaymentUseCase {
  constructor(private paymentRepository: PaymentRepository) {}

  async execute(request: InitiatePaymentRequest): Promise<Payment> {
    // =====================================================================
    // 1. 驗證輸入
    // =====================================================================
    if (!PaymentDomainService.isValidAmount(request.amount)) {
      throw new Error('Invalid amount')
    }

    if (!PaymentDomainService.isValidCurrency(request.currency)) {
      throw new Error('Invalid currency')
    }

    if (!PaymentDomainService.isValidPaymentMethod(request.method)) {
      throw new Error('Invalid payment method')
    }

    if (!PaymentDomainService.isValidPaymentGateway(request.gateway)) {
      throw new Error('Invalid payment gateway')
    }

    // =====================================================================
    // 2. 驗證支付方式與閘道的兼容性
    // =====================================================================
    if (!PaymentDomainService.isCompatible(request.method, request.gateway)) {
      throw new Error(
        `Payment method ${request.method} is not compatible with gateway ${request.gateway}`
      )
    }

    // =====================================================================
    // 3. 創建支付記錄
    // =====================================================================
    const initiatePaymentInput: InitiatePaymentInput = {
      orderId: request.orderId,
      userId: request.userId,
      amount: request.amount,
      currency: request.currency,
      method: request.method,
      gateway: request.gateway,
    }

    const payment = await this.paymentRepository.create(initiatePaymentInput)

    // =====================================================================
    // 4. 返回結果
    // =====================================================================
    return payment
  }
}
