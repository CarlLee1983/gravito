import type { Coupon } from '../../Domain/Entities/Coupon'

export interface CouponDTO {
  id: string
  code: string
  name: string
  type: string
  value: number
  minPurchase: number
  startsAt: string
  expiresAt: string
  usageLimit: number | null
  usedCount: number
  status: string
  remainingUsage: number | null
  isExpired: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export function couponToDTO(coupon: Coupon): CouponDTO {
  return {
    id: coupon.id,
    code: coupon.getCode(),
    name: coupon.getName(),
    type: coupon.getDiscount().type,
    value: coupon.getDiscount().amount,
    minPurchase: coupon.getMinPurchase(),
    startsAt: coupon.getStartsAt().toISOString(),
    expiresAt: coupon.getExpiresAt().toISOString(),
    usageLimit: coupon.getUsageLimit(),
    usedCount: coupon.getUsedCount(),
    status: coupon.getStatus(),
    remainingUsage: coupon.getRemainingUsage(),
    isExpired: coupon.isExpired(),
    isActive: coupon.canUse(0).canUse,
    createdAt: coupon.getCreatedAt().toISOString(),
    updatedAt: coupon.getUpdatedAt().toISOString(),
  }
}

export function couponsToDTO(coupons: Coupon[]): CouponDTO[] {
  return coupons.map(couponToDTO)
}
