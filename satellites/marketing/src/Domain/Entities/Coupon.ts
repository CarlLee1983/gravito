import { Entity } from '@gravito/enterprise'
import { CouponCode, CouponStatus, type DiscountType, DiscountValue } from '../ValueObjects'

export interface CouponProps {
  code: string
  name: string
  type: DiscountType
  value: number
  minPurchase: number
  startsAt: Date
  expiresAt: Date
  usageLimit?: number
  usedCount: number
  status: string
  createdAt: Date
  updatedAt: Date
}

export class Coupon extends Entity<string> {
  private code: CouponCode
  private name: string
  private discount: DiscountValue
  private minPurchase: number
  private startsAt: Date
  private expiresAt: Date
  private usageLimit: number | null
  private usedCount: number
  private status: CouponStatus
  private createdAt: Date
  private updatedAt: Date

  private constructor(
    id: string,
    code: CouponCode,
    name: string,
    discount: DiscountValue,
    minPurchase: number,
    startsAt: Date,
    expiresAt: Date,
    status: CouponStatus,
    createdAt: Date,
    updatedAt: Date,
    usageLimit?: number | null,
    usedCount?: number
  ) {
    super(id)
    this.code = code
    this.name = name
    this.discount = discount
    this.minPurchase = minPurchase
    this.startsAt = startsAt
    this.expiresAt = expiresAt
    this.status = status
    this.createdAt = createdAt
    this.updatedAt = updatedAt
    this.usageLimit = usageLimit ?? null
    this.usedCount = usedCount ?? 0
  }

  static create(
    name: string,
    code: string,
    discountType: DiscountType,
    discountAmount: number,
    minPurchase: number,
    startsAt: Date,
    expiresAt: Date,
    usageLimit?: number,
    id?: string
  ): Coupon {
    const couponCode = CouponCode.create(code)
    const discount = DiscountValue.create(discountType, discountAmount)
    const status = CouponStatus.active()
    const now = new Date()

    return new Coupon(
      id || crypto.randomUUID(),
      couponCode,
      name,
      discount,
      minPurchase,
      startsAt,
      expiresAt,
      status,
      now,
      now,
      usageLimit,
      0
    )
  }

  getCode(): string {
    return this.code.value
  }

  getName(): string {
    return this.name
  }

  getDiscount(): { type: DiscountType; amount: number } {
    return this.discount.toJSON()
  }

  getMinPurchase(): number {
    return this.minPurchase
  }

  getStartsAt(): Date {
    return this.startsAt
  }

  getExpiresAt(): Date {
    return this.expiresAt
  }

  getUsageLimit(): number | null {
    return this.usageLimit
  }

  getUsedCount(): number {
    return this.usedCount
  }

  getStatus(): string {
    return this.status.value
  }

  getCreatedAt(): Date {
    return this.createdAt
  }

  getUpdatedAt(): Date {
    return this.updatedAt
  }

  /**
   * 檢查優惠券是否過期
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt
  }

  /**
   * 檢查優惠券是否在有效期內
   */
  isWithinValidPeriod(): boolean {
    const now = new Date()
    return now >= this.startsAt && now <= this.expiresAt
  }

  /**
   * 檢查優惠券是否可使用
   */
  canUse(orderAmount: number): { canUse: boolean; reason?: string } {
    if (!this.status.isActive()) {
      return { canUse: false, reason: 'coupon_not_active' }
    }

    if (this.isExpired()) {
      return { canUse: false, reason: 'coupon_expired' }
    }

    if (!this.isWithinValidPeriod()) {
      return { canUse: false, reason: 'coupon_not_started' }
    }

    if (orderAmount < this.minPurchase) {
      return {
        canUse: false,
        reason: `coupon_min_purchase_not_met:${this.minPurchase}`,
      }
    }

    if (this.usageLimit !== null && this.usedCount >= this.usageLimit) {
      return { canUse: false, reason: 'coupon_usage_limit_exceeded' }
    }

    return { canUse: true }
  }

  /**
   * 計算實際折扣金額
   */
  calculateDiscount(orderAmount: number): number {
    const { canUse } = this.canUse(orderAmount)
    if (!canUse) {
      return 0
    }

    return this.discount.calculate(orderAmount)
  }

  /**
   * 獲取剩餘使用次數
   */
  getRemainingUsage(): number | null {
    if (this.usageLimit === null) {
      return null
    }

    return Math.max(0, this.usageLimit - this.usedCount)
  }

  /**
   * 使用優惠券（增加 usedCount）
   * 返回新的 Coupon 物件（immutable）
   */
  use(): Coupon {
    if (this.usageLimit !== null && this.usedCount >= this.usageLimit) {
      throw new Error('coupon_usage_limit_exceeded')
    }

    return new Coupon(
      this.id,
      this.code,
      this.name,
      this.discount,
      this.minPurchase,
      this.startsAt,
      this.expiresAt,
      this.status,
      this.createdAt,
      new Date(),
      this.usageLimit,
      this.usedCount + 1
    )
  }

  /**
   * 啟用優惠券
   * 返回新的 Coupon 物件（immutable）
   */
  activate(): Coupon {
    return new Coupon(
      this.id,
      this.code,
      this.name,
      this.discount,
      this.minPurchase,
      this.startsAt,
      this.expiresAt,
      CouponStatus.active(),
      this.createdAt,
      new Date(),
      this.usageLimit,
      this.usedCount
    )
  }

  /**
   * 停用優惠券
   * 返回新的 Coupon 物件（immutable）
   */
  disable(): Coupon {
    return new Coupon(
      this.id,
      this.code,
      this.name,
      this.discount,
      this.minPurchase,
      this.startsAt,
      this.expiresAt,
      CouponStatus.disabled(),
      this.createdAt,
      new Date(),
      this.usageLimit,
      this.usedCount
    )
  }

  /**
   * 將優惠券標記為過期
   * 返回新的 Coupon 物件（immutable）
   */
  markAsExpired(): Coupon {
    return new Coupon(
      this.id,
      this.code,
      this.name,
      this.discount,
      this.minPurchase,
      this.startsAt,
      this.expiresAt,
      CouponStatus.expired(),
      this.createdAt,
      new Date(),
      this.usageLimit,
      this.usedCount
    )
  }

  /**
   * 序列化為 Props（用於持久化和傳輸）
   */
  unpack(): CouponProps {
    return {
      code: this.code.value,
      name: this.name,
      type: this.discount.type,
      value: this.discount.amount,
      minPurchase: this.minPurchase,
      startsAt: this.startsAt,
      expiresAt: this.expiresAt,
      usageLimit: this.usageLimit ?? undefined,
      usedCount: this.usedCount,
      status: this.status.value,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }

  /**
   * 從 Props 重新構建（用於從數據庫hydrate）
   */
  static hydrate(props: CouponProps, id: string): Coupon {
    const code = CouponCode.create(props.code)
    const discount = DiscountValue.create(props.type, props.value)
    const status = CouponStatus.create(props.status)

    return new Coupon(
      id,
      code,
      props.name,
      discount,
      props.minPurchase,
      props.startsAt,
      props.expiresAt,
      status,
      props.createdAt,
      props.updatedAt,
      props.usageLimit,
      props.usedCount
    )
  }
}
