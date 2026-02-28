/**
 * PromotionStatus ValueObject
 * 代表促銷活動的狀態
 */
export type PromotionStatusType = 'ACTIVE' | 'INACTIVE' | 'EXPIRED'

export class PromotionStatus {
  readonly value: PromotionStatusType

  private constructor(value: PromotionStatusType) {
    this.value = value
  }

  static create(status: string): PromotionStatus {
    const normalized = String(status).toUpperCase()

    if (!['ACTIVE', 'INACTIVE', 'EXPIRED'].includes(normalized)) {
      throw new Error('promotion_status_invalid')
    }

    return new PromotionStatus(normalized as PromotionStatusType)
  }

  static active(): PromotionStatus {
    return new PromotionStatus('ACTIVE')
  }

  static inactive(): PromotionStatus {
    return new PromotionStatus('INACTIVE')
  }

  static expired(): PromotionStatus {
    return new PromotionStatus('EXPIRED')
  }

  isActive(): boolean {
    return this.value === 'ACTIVE'
  }

  isInactive(): boolean {
    return this.value === 'INACTIVE'
  }

  isExpired(): boolean {
    return this.value === 'EXPIRED'
  }

  equals(other: PromotionStatus): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
