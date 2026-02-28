/**
 * CouponStatus ValueObject
 * 代表優惠券的狀態
 */
export type CouponStatusType = 'ACTIVE' | 'DISABLED' | 'EXPIRED'

export class CouponStatus {
  readonly value: CouponStatusType

  private constructor(value: CouponStatusType) {
    this.value = value
  }

  static create(status: string): CouponStatus {
    const normalized = String(status).toUpperCase()

    if (!['ACTIVE', 'DISABLED', 'EXPIRED'].includes(normalized)) {
      throw new Error('coupon_status_invalid')
    }

    return new CouponStatus(normalized as CouponStatusType)
  }

  static active(): CouponStatus {
    return new CouponStatus('ACTIVE')
  }

  static disabled(): CouponStatus {
    return new CouponStatus('DISABLED')
  }

  static expired(): CouponStatus {
    return new CouponStatus('EXPIRED')
  }

  isActive(): boolean {
    return this.value === 'ACTIVE'
  }

  isDisabled(): boolean {
    return this.value === 'DISABLED'
  }

  isExpired(): boolean {
    return this.value === 'EXPIRED'
  }

  equals(other: CouponStatus): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
