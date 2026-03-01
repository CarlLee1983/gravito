/**
 * CouponCode ValueObject
 * 驗證並代表優惠券代碼
 */
export class CouponCode {
  readonly value: string

  private constructor(value: string) {
    this.value = value
  }

  static create(code: string): CouponCode {
    const trimmed = code.trim().toUpperCase()

    if (!trimmed || trimmed.length < 4 || trimmed.length > 20) {
      throw new Error('coupon_code_invalid_length')
    }

    if (!/^[A-Z0-9\-_]+$/.test(trimmed)) {
      throw new Error('coupon_code_invalid_format')
    }

    return new CouponCode(trimmed)
  }

  equals(other: CouponCode): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
