import { DB } from '@gravito/atlas'
import type { PlanetCore } from '@gravito/core'

export class CouponService {
  constructor(private core: PlanetCore) {}

  /**
   * 根據代碼查找折價券
   */
  async findByCode(code: string): Promise<any> {
    this.core.logger.info(`[CouponService] Looking up coupon: ${code}`)
    return DB.table('coupons').where('code', code).first()
  }

  /**
   * 計算折價券調整金額
   */
  async getAdjustment(code: string, _order: any): Promise<any> {
    this.core.logger.info(`[CouponService] Calculating adjustment for: ${code}`)
    const coupon = await this.findByCode(code)

    if (!coupon) {
      throw new Error('coupon_not_found')
    }

    if (coupon.is_active === false) {
      throw new Error('inactive')
    }

    if (coupon.expires_at) {
      const expiresAt = new Date(coupon.expires_at)
      if (!Number.isNaN(expiresAt.getTime()) && expiresAt < new Date()) {
        throw new Error('expired')
      }
    }

    const value = Number(coupon.value)
    const subtotal = Number(_order?.subtotalAmount ?? 0)

    let amount = 0
    const type = String(coupon.type || '').toLowerCase()
    if (type === 'fixed') {
      amount = -value
    } else if (type === 'percent' || type === 'percentage') {
      amount = -(subtotal * (value / 100))
    } else {
      throw new Error('unsupported_coupon_type')
    }

    return {
      label: `Coupon: ${coupon.name}`,
      amount,
      sourceType: 'coupon',
      sourceId: coupon.id ?? coupon.code,
    }
  }
}
