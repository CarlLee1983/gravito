import { Entity } from '@gravito/enterprise'

export interface CouponProps {
  code: string
  name: string
  type: 'FIXED' | 'PERCENTAGE'
  value: number
  minPurchase: number
  startsAt: Date
  expiresAt: Date
  usageLimit?: number
  usedCount: number
  status: 'ACTIVE' | 'EXPIRED' | 'DISABLED'
}

export class Coupon extends Entity<string> {
  private _props: CouponProps

  constructor(props: CouponProps, id?: string) {
    super(id || crypto.randomUUID())
    this._props = props
  }

  static create(props: Omit<CouponProps, 'usedCount'>, id?: string): Coupon {
    return new Coupon(
      {
        ...props,
        usedCount: 0,
      },
      id
    )
  }

  get code() {
    return this._props.code
  }
  get status() {
    return this._props.status
  }

  unpack(): CouponProps {
    return { ...this._props }
  }
}
