/**
 * 購物車領域錯誤基類
 */
export abstract class CartError extends Error {
  abstract readonly code: string

  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

/**
 * 購物車未找到
 */
export class CartNotFoundError extends CartError {
  readonly code = 'CART_NOT_FOUND'

  constructor(public readonly cartId?: string) {
    super('購物車未找到')
  }
}

/**
 * 購物車項目未找到
 */
export class CartItemNotFoundError extends CartError {
  readonly code = 'CART_ITEM_NOT_FOUND'

  constructor(public readonly variantId: string) {
    super(`商品變體 ${variantId} 未在購物車中找到`)
  }
}

/**
 * 無效的商品數量
 */
export class InvalidQuantityError extends CartError {
  readonly code = 'INVALID_QUANTITY'

  constructor(
    public readonly quantity: number,
    reason: string
  ) {
    super(`無效的商品數量 ${quantity}：${reason}`)
  }
}

/**
 * 購物車為空
 */
export class EmptyCartError extends CartError {
  readonly code = 'EMPTY_CART'

  constructor() {
    super('購物車為空')
  }
}
