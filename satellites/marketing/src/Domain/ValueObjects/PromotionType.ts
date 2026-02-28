/**
 * PromotionType ValueObject
 * 代表促銷活動的類型
 */
export type PromotionTypeValue =
  | 'CART_THRESHOLD'
  | 'BUY_X_GET_Y'
  | 'CATEGORY_DISCOUNT'
  | 'FREE_SHIPPING'
  | 'MEMBERSHIP_LEVEL'

export class PromotionType {
  readonly value: PromotionTypeValue

  private constructor(value: PromotionTypeValue) {
    this.value = value
  }

  static create(type: string): PromotionType {
    const normalized = String(type).toUpperCase()

    const validTypes: PromotionTypeValue[] = [
      'CART_THRESHOLD',
      'BUY_X_GET_Y',
      'CATEGORY_DISCOUNT',
      'FREE_SHIPPING',
      'MEMBERSHIP_LEVEL',
    ]

    if (!validTypes.includes(normalized as PromotionTypeValue)) {
      throw new Error('promotion_type_invalid')
    }

    return new PromotionType(normalized as PromotionTypeValue)
  }

  static cartThreshold(): PromotionType {
    return new PromotionType('CART_THRESHOLD')
  }

  static buyXGetY(): PromotionType {
    return new PromotionType('BUY_X_GET_Y')
  }

  static categoryDiscount(): PromotionType {
    return new PromotionType('CATEGORY_DISCOUNT')
  }

  static freeShipping(): PromotionType {
    return new PromotionType('FREE_SHIPPING')
  }

  static membershipLevel(): PromotionType {
    return new PromotionType('MEMBERSHIP_LEVEL')
  }

  equals(other: PromotionType): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
