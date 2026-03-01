/**
 * 購物車域錯誤
 * 定義所有購物車相關的業務規則錯誤
 */
export class CartError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'CartError'
  }

  static cartNotFound(): CartError {
    return new CartError('CART_NOT_FOUND', '購物車未找到')
  }

  static itemNotFound(): CartError {
    return new CartError('ITEM_NOT_FOUND', '購物車項目未找到')
  }

  static invalidQuantity(): CartError {
    return new CartError('INVALID_QUANTITY', '無效的數量')
  }

  static emptyCart(): CartError {
    return new CartError('EMPTY_CART', '購物車為空')
  }

  static noOwner(): CartError {
    return new CartError('NO_OWNER', '購物車沒有擁有者')
  }
}
