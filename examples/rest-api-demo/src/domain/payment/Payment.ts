/**
 * Payment Domain Model
 *
 * 代表電商系統中的支付記錄
 */

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'

export type PaymentMethod = 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer'

export type PaymentGateway = 'stripe' | 'paypal' | 'square'

export interface Payment {
  id: string
  orderId: string
  userId: string
  amount: number // 金額（分為單位）
  currency: string // 貨幣代碼，例如 'USD'
  method: PaymentMethod
  gateway: PaymentGateway
  status: PaymentStatus
  transactionId?: string // 支付閘道的交易 ID
  receiptUrl?: string // 收據 URL
  failureReason?: string // 失敗原因
  attemptCount: number // 嘗試次數
  metadata?: Record<string, unknown> // 額外的元數據
  paidAt?: Date
  failedAt?: Date
  refundedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface InitiatePaymentInput {
  orderId: string
  userId: string
  amount: number
  currency: string
  method: PaymentMethod
  gateway: PaymentGateway
}

export interface CompletePaymentInput {
  transactionId: string
  receiptUrl?: string
}

export interface RefundPaymentInput {
  reason: string
  amount?: number // 部分退款時指定金額
}

/**
 * Payment 領域服務
 */
export class PaymentDomainService {
  /**
   * 驗證金額
   */
  static isValidAmount(amount: number): boolean {
    return amount > 0 && Number.isInteger(amount)
  }

  /**
   * 驗證貨幣代碼
   */
  static isValidCurrency(currency: string): boolean {
    // ISO 4217 貨幣代碼示例
    const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'TWD', 'INR', 'AUD', 'CAD', 'CHF']
    return validCurrencies.includes(currency.toUpperCase())
  }

  /**
   * 驗證支付方式
   */
  static isValidPaymentMethod(method: PaymentMethod): boolean {
    const validMethods: PaymentMethod[] = ['credit_card', 'debit_card', 'paypal', 'bank_transfer']
    return validMethods.includes(method)
  }

  /**
   * 驗證支付閘道
   */
  static isValidPaymentGateway(gateway: PaymentGateway): boolean {
    const validGateways: PaymentGateway[] = ['stripe', 'paypal', 'square']
    return validGateways.includes(gateway)
  }

  /**
   * 檢查支付是否可以重試
   */
  static canRetry(payment: Payment): boolean {
    return payment.status === 'failed' && payment.attemptCount < 3
  }

  /**
   * 檢查支付是否可以退款
   */
  static canBeRefunded(payment: Payment): boolean {
    return payment.status === 'completed'
  }

  /**
   * 驗證支付方式與閘道的兼容性
   */
  static isCompatible(method: PaymentMethod, gateway: PaymentGateway): boolean {
    const compatibility: Record<PaymentGateway, PaymentMethod[]> = {
      stripe: ['credit_card', 'debit_card'],
      paypal: ['paypal'],
      square: ['credit_card', 'debit_card'],
    }

    return compatibility[gateway]?.includes(method) ?? false
  }

  /**
   * 計算支付手續費
   */
  static calculateFee(amount: number, feePercentage = 0.029): number {
    return Math.round(amount * feePercentage + 30) // 2.9% + $0.30
  }
}
