import { ValueObject } from '@gravito/enterprise'

export interface CartItemQuantityProps {
  value: number
}

/**
 * 購物車項目數量 ValueObject
 * 規則：數量必須 > 0 且為整數
 */
export class CartItemQuantity extends ValueObject<CartItemQuantityProps> {
  private constructor(value: number) {
    super({ value })
  }

  static create(value: number): CartItemQuantity {
    if (!Number.isInteger(value)) {
      throw new Error('Quantity must be an integer')
    }
    if (value <= 0) {
      throw new Error('Quantity must be greater than 0')
    }
    return new CartItemQuantity(value)
  }

  get value(): number {
    return this.props.value
  }

  public increment(amount = 1): CartItemQuantity {
    return CartItemQuantity.create(this.value + amount)
  }

  public decrement(amount = 1): CartItemQuantity {
    return CartItemQuantity.create(this.value - amount)
  }

  public equals(other: CartItemQuantity): boolean {
    return this.value === other.value
  }
}
