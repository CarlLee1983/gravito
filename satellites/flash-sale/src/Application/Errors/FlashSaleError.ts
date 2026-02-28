/**
 * Flash Sale 錯誤代碼列舉
 */
export enum FlashSaleErrorCode {
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  INVALID_QUANTITY = 'INVALID_QUANTITY',
  PRODUCT_INACTIVE = 'PRODUCT_INACTIVE',
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  INVALID_ORDER_STATUS = 'INVALID_ORDER_STATUS',
  CURRENCY_MISMATCH = 'CURRENCY_MISMATCH',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
}

/**
 * Flash Sale 領域錯誤
 *
 * 統一的錯誤類別，包含錯誤代碼和 HTTP 狀態碼
 */
export class FlashSaleError extends Error {
  public readonly code: FlashSaleErrorCode
  public readonly httpStatus: number

  constructor(message: string, code: FlashSaleErrorCode, httpStatus: number) {
    super(message)
    this.name = 'FlashSaleError'
    this.code = code
    this.httpStatus = httpStatus
  }

  /**
   * 庫存不足
   */
  static insufficientStock(available: number, requested: number): FlashSaleError {
    return new FlashSaleError(
      `Insufficient stock: available ${available}, requested ${requested}`,
      FlashSaleErrorCode.INSUFFICIENT_STOCK,
      409
    )
  }

  /**
   * 無效數量
   */
  static invalidQuantity(quantity: number): FlashSaleError {
    return new FlashSaleError(
      `Invalid quantity: ${quantity}`,
      FlashSaleErrorCode.INVALID_QUANTITY,
      400
    )
  }

  /**
   * 商品未啟用
   */
  static productInactive(productId: string): FlashSaleError {
    return new FlashSaleError(
      `Product is inactive: ${productId}`,
      FlashSaleErrorCode.PRODUCT_INACTIVE,
      400
    )
  }

  /**
   * 商品未找到
   */
  static productNotFound(productId: string): FlashSaleError {
    return new FlashSaleError(
      `Product not found: ${productId}`,
      FlashSaleErrorCode.PRODUCT_NOT_FOUND,
      404
    )
  }

  /**
   * 訂單未找到
   */
  static orderNotFound(orderId: string): FlashSaleError {
    return new FlashSaleError(
      `Order not found: ${orderId}`,
      FlashSaleErrorCode.ORDER_NOT_FOUND,
      404
    )
  }

  /**
   * 無效訂單狀態轉換
   */
  static invalidOrderStatus(currentStatus: string, targetStatus: string): FlashSaleError {
    return new FlashSaleError(
      `Invalid order status transition: ${currentStatus} -> ${targetStatus}`,
      FlashSaleErrorCode.INVALID_ORDER_STATUS,
      409
    )
  }

  /**
   * 通貨不匹配
   */
  static currencyMismatch(expected: string, actual: string): FlashSaleError {
    return new FlashSaleError(
      `Currency mismatch: expected ${expected}, got ${actual}`,
      FlashSaleErrorCode.CURRENCY_MISMATCH,
      400
    )
  }

  /**
   * 無效金額
   */
  static invalidAmount(amount: number): FlashSaleError {
    return new FlashSaleError(`Invalid amount: ${amount}`, FlashSaleErrorCode.INVALID_AMOUNT, 400)
  }
}
