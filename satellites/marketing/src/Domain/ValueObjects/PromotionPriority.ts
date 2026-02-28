/**
 * PromotionPriority ValueObject
 * 代表促銷活動的優先級（1-100）
 */
export class PromotionPriority {
  readonly value: number

  private constructor(value: number) {
    this.value = value
  }

  static create(priority: number): PromotionPriority {
    if (!Number.isInteger(priority)) {
      throw new Error('promotion_priority_must_be_integer')
    }

    if (priority < 1 || priority > 100) {
      throw new Error('promotion_priority_out_of_range')
    }

    return new PromotionPriority(priority)
  }

  static highest(): PromotionPriority {
    return new PromotionPriority(100)
  }

  static lowest(): PromotionPriority {
    return new PromotionPriority(1)
  }

  static default(): PromotionPriority {
    return new PromotionPriority(50)
  }

  isHigherThan(other: PromotionPriority): boolean {
    return this.value > other.value
  }

  isLowerThan(other: PromotionPriority): boolean {
    return this.value < other.value
  }

  equals(other: PromotionPriority): boolean {
    return this.value === other.value
  }

  toString(): string {
    return String(this.value)
  }
}
