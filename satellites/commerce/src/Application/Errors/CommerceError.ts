/**
 * Commerce 錯誤碼
 */
export enum CommerceErrorCode {
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INVALID_FACTOR = 'INVALID_FACTOR',
  CURRENCY_MISMATCH = 'CURRENCY_MISMATCH',
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  INVALID_STATUS_TRANSITION = 'INVALID_STATUS_TRANSITION',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  VARIANT_NOT_FOUND = 'VARIANT_NOT_FOUND',
  MEMBER_NOT_FOUND = 'MEMBER_NOT_FOUND',
  CONCURRENT_MODIFICATION = 'CONCURRENT_MODIFICATION',
  INVALID_CHECKOUT = 'INVALID_CHECKOUT',
}

/**
 * Commerce 業務錯誤
 */
export class CommerceError extends Error {
  constructor(
    message: string,
    public readonly code: CommerceErrorCode,
    public readonly statusCode: number = 400
  ) {
    super(message)
    this.name = 'CommerceError'
  }

  // 靜態工廠方法
  static invalidAmount(amount: number): CommerceError {
    return new CommerceError(`金額不能為負數: ${amount}`, CommerceErrorCode.INVALID_AMOUNT, 400)
  }

  static invalidFactor(factor: number): CommerceError {
    return new CommerceError(`乘法因子不能為負數: ${factor}`, CommerceErrorCode.INVALID_FACTOR, 400)
  }

  static currencyMismatch(currency1: string, currency2: string): CommerceError {
    return new CommerceError(
      `通貨不匹配: ${currency1} vs ${currency2}`,
      CommerceErrorCode.CURRENCY_MISMATCH,
      400
    )
  }

  static orderNotFound(orderId: string): CommerceError {
    return new CommerceError(`訂單未找到: ${orderId}`, CommerceErrorCode.ORDER_NOT_FOUND, 404)
  }

  static invalidStatusTransition(fromStatus: string, toStatus: string): CommerceError {
    return new CommerceError(
      `無效的狀態轉移: ${fromStatus} -> ${toStatus}`,
      CommerceErrorCode.INVALID_STATUS_TRANSITION,
      400
    )
  }

  static insufficientStock(variantId: string, available: number, required: number): CommerceError {
    return new CommerceError(
      `庫存不足: ${variantId} (可用: ${available}, 需要: ${required})`,
      CommerceErrorCode.INSUFFICIENT_STOCK,
      400
    )
  }

  static variantNotFound(variantId: string): CommerceError {
    return new CommerceError(
      `商品變體未找到: ${variantId}`,
      CommerceErrorCode.VARIANT_NOT_FOUND,
      404
    )
  }

  static memberNotFound(memberId: string): CommerceError {
    return new CommerceError(`會員未找到: ${memberId}`, CommerceErrorCode.MEMBER_NOT_FOUND, 404)
  }

  static concurrentModification(): CommerceError {
    return new CommerceError(`並發修改: 請重試`, CommerceErrorCode.CONCURRENT_MODIFICATION, 409)
  }

  static invalidCheckout(reason: string): CommerceError {
    return new CommerceError(`無效的結帳: ${reason}`, CommerceErrorCode.INVALID_CHECKOUT, 400)
  }
}
