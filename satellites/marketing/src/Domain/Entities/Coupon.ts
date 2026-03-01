import { Entity } from '@gravito/enterprise'
import { CouponCode, CouponStatus, type DiscountType, DiscountValue } from '../ValueObjects'

export interface CouponCreateInput {
  code: string
  name: string
  type: DiscountType
  value: number
  minPurchase: number
  startsAt: Date
  expiresAt: Date
  status?: string
  usageLimit?: number
  usedCount?: number
}

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
  private _code: CouponCode
  private _name: string
  private _discount: DiscountValue
  private _minPurchase: number
  private _startsAt: Date
  private _expiresAt: Date
  private _usageLimit: number | null
  private _usedCount: number
  private _status: CouponStatus
  private _createdAt: Date
  private _updatedAt: Date

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
    this._code = code
    this._name = name
    this._discount = discount
    this._minPurchase = minPurchase
    this._startsAt = startsAt
    this._expiresAt = expiresAt
    this._status = status
    this._createdAt = createdAt
    this._updatedAt = updatedAt
    this._usageLimit = usageLimit ?? null
    this._usedCount = usedCount ?? 0
  }

  static create(input: CouponCreateInput, id?: string): Coupon {
    const couponCode = CouponCode.create(input.code)
    const discount = DiscountValue.create(input.type, input.value)
    const status = CouponStatus.create(input.status ?? 'ACTIVE')
    const now = new Date()

    return new Coupon(
      id || crypto.randomUUID(),
      couponCode,
      input.name,
      discount,
      input.minPurchase,
      input.startsAt,
      input.expiresAt,
      status,
      now,
      now,
      input.usageLimit,
      input.usedCount ?? 0
    )
  }

  get code(): string {
    return this._code.value
  }

  getCode(): string {
    return this._code.value
  }

  get status(): string {
    return this._status.value
  }

  getName(): string {
    return this._name
  }

  getDiscount(): { type: DiscountType; amount: number } {
    return this._discount.toJSON()
  }

  getMinPurchase(): number {
    return this._minPurchase
  }

  getStartsAt(): Date {
    return this._startsAt
  }

  getExpiresAt(): Date {
    return this._expiresAt
  }

  getUsageLimit(): number | null {
    return this._usageLimit
  }

  getUsedCount(): number {
    return this._usedCount
  }

  getStatus(): string {
    return this._status.value
  }

  getCreatedAt(): Date {
    return this._createdAt
  }

  getUpdatedAt(): Date {
    return this._updatedAt
  }

  /**
   * 檢查優惠券是否過期
   */
  isExpired(): boolean {
    return new Date() > this._expiresAt
  }

  /**
   * 檢查優惠券是否在有效期內
   */
  isWithinValidPeriod(): boolean {
    const now = new Date()
    return now >= this._startsAt && now <= this._expiresAt
  }

  /**
   * 檢查優惠券是否可使用
   */
  canUse(orderAmount: number): { canUse: boolean; reason?: string } {
    if (!this._status.isActive()) {
      return { canUse: false, reason: 'coupon_not_active' }
    }

    if (this.isExpired()) {
      return { canUse: false, reason: 'coupon_expired' }
    }

    if (!this.isWithinValidPeriod()) {
      return { canUse: false, reason: 'coupon_not_started' }
    }

    if (orderAmount < this._minPurchase) {
      return {
        canUse: false,
        reason: `coupon_min_purchase_not_met:${this._minPurchase}`,
      }
    }

    if (this._usageLimit !== null && this._usedCount >= this._usageLimit) {
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

    return this._discount.calculate(orderAmount)
  }

  /**
   * 獲取剩餘使用次數
   */
  getRemainingUsage(): number | null {
    if (this._usageLimit === null) {
      return null
    }

    return Math.max(0, this._usageLimit - this._usedCount)
  }

  /**
   * 使用優惠券（增加 usedCount）
   * 返回新的 Coupon 物件（immutable）
   */
  use(): Coupon {
    if (this._usageLimit !== null && this._usedCount >= this._usageLimit) {
      throw new Error('coupon_usage_limit_exceeded')
    }

    return new Coupon(
      this.id,
      this._code,
      this._name,
      this._discount,
      this._minPurchase,
      this._startsAt,
      this._expiresAt,
      this._status,
      this._createdAt,
      new Date(),
      this._usageLimit,
      this._usedCount + 1
    )
  }

  /**
   * 啟用優惠券
   * 返回新的 Coupon 物件（immutable）
   */
  activate(): Coupon {
    return new Coupon(
      this.id,
      this._code,
      this._name,
      this._discount,
      this._minPurchase,
      this._startsAt,
      this._expiresAt,
      CouponStatus.active(),
      this._createdAt,
      new Date(),
      this._usageLimit,
      this._usedCount
    )
  }

  /**
   * 停用優惠券
   * 返回新的 Coupon 物件（immutable）
   */
  disable(): Coupon {
    return new Coupon(
      this.id,
      this._code,
      this._name,
      this._discount,
      this._minPurchase,
      this._startsAt,
      this._expiresAt,
      CouponStatus.disabled(),
      this._createdAt,
      new Date(),
      this._usageLimit,
      this._usedCount
    )
  }

  /**
   * 將優惠券標記為過期
   * 返回新的 Coupon 物件（immutable）
   */
  markAsExpired(): Coupon {
    return new Coupon(
      this.id,
      this._code,
      this._name,
      this._discount,
      this._minPurchase,
      this._startsAt,
      this._expiresAt,
      CouponStatus.expired(),
      this._createdAt,
      new Date(),
      this._usageLimit,
      this._usedCount
    )
  }

  /**
   * 序列化為 Props（用於持久化和傳輸）
   */
  unpack(): CouponProps {
    return {
      code: this._code.value,
      name: this._name,
      type: this._discount.type,
      value: this._discount.amount,
      minPurchase: this._minPurchase,
      startsAt: this._startsAt,
      expiresAt: this._expiresAt,
      usageLimit: this._usageLimit ?? undefined,
      usedCount: this._usedCount,
      status: this._status.value,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
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
