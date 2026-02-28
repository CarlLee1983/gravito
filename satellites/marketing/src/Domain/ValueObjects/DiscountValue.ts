/**
 * DiscountValue ValueObject
 * 代表折扣金額（固定金額或百分比）
 */
export type DiscountType = 'FIXED' | 'PERCENTAGE'

export interface DiscountValueProps {
  type: DiscountType
  amount: number
}

export class DiscountValue {
  readonly type: DiscountType
  readonly amount: number

  private constructor(type: DiscountType, amount: number) {
    this.type = type
    this.amount = amount
  }

  static create(type: string, amount: number): DiscountValue {
    const normalized = String(type).toUpperCase()

    if (!['FIXED', 'PERCENTAGE'].includes(normalized)) {
      throw new Error('discount_type_invalid')
    }

    if (amount <= 0) {
      throw new Error('discount_amount_must_be_positive')
    }

    if (normalized === 'PERCENTAGE' && amount > 100) {
      throw new Error('discount_percentage_cannot_exceed_100')
    }

    return new DiscountValue(normalized as DiscountType, amount)
  }

  static fixed(amount: number): DiscountValue {
    return DiscountValue.create('FIXED', amount)
  }

  static percentage(percent: number): DiscountValue {
    return DiscountValue.create('PERCENTAGE', percent)
  }

  isFixed(): boolean {
    return this.type === 'FIXED'
  }

  isPercentage(): boolean {
    return this.type === 'PERCENTAGE'
  }

  /**
   * 計算實際折扣金額
   * @param baseAmount 基數金額（用於計算百分比）
   */
  calculate(baseAmount: number): number {
    if (this.isFixed()) {
      return Math.min(this.amount, baseAmount)
    }

    return baseAmount * (this.amount / 100)
  }

  equals(other: DiscountValue): boolean {
    return this.type === other.type && this.amount === other.amount
  }

  toJSON(): DiscountValueProps {
    return {
      type: this.type,
      amount: this.amount,
    }
  }
}
