import { describe, expect, it } from 'bun:test'
import { Coupon } from '../src/Domain/Entities/Coupon'
import { Promotion } from '../src/Domain/Entities/Promotion'
import {
  CouponCode,
  DiscountValue,
  PromotionPriority,
  PromotionType,
} from '../src/Domain/ValueObjects'

describe('Domain - ValueObjects', () => {
  it('should create valid coupon code', () => {
    const code = CouponCode.create('WELCOME2025')
    expect(code.value).toBe('WELCOME2025')
  })

  it('should throw on invalid coupon code', () => {
    expect(() => CouponCode.create('abc')).toThrow()
  })

  it('should create fixed discount', () => {
    const discount = DiscountValue.fixed(500)
    expect(discount.isFixed()).toBe(true)
    expect(discount.calculate(1000)).toBe(500)
  })

  it('should create percentage discount', () => {
    const discount = DiscountValue.percentage(10)
    expect(discount.isPercentage()).toBe(true)
    expect(discount.calculate(1000)).toBe(100)
  })
})

describe('Domain - Coupon Entity', () => {
  it('should create coupon with valid data', () => {
    const coupon = Coupon.create({
      name: '新年優惠',
      code: 'NEWYEAR25',
      type: 'PERCENTAGE',
      value: 10,
      minPurchase: 0,
      startsAt: new Date('2025-01-01'),
      expiresAt: new Date('2025-12-31'),
      status: 'ACTIVE',
      usageLimit: 100,
    })

    expect(coupon.getName()).toBe('新年優惠')
    expect(coupon.getCode()).toBe('NEWYEAR25')
    expect(coupon.getUsageLimit()).toBe(100)
  })

  it('should use coupon and return new instance', () => {
    const coupon = Coupon.create({
      name: '優惠',
      code: 'TEST',
      type: 'FIXED',
      value: 100,
      minPurchase: 0,
      startsAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      status: 'ACTIVE',
      usageLimit: 2,
    })

    const used = coupon.use()
    expect(coupon.getUsedCount()).toBe(0)
    expect(used.getUsedCount()).toBe(1)
  })

  it('should check if coupon can be used', () => {
    const coupon = Coupon.create({
      name: '優惠',
      code: 'TEST',
      type: 'FIXED',
      value: 100,
      minPurchase: 0,
      startsAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      status: 'ACTIVE',
    })

    const { canUse } = coupon.canUse(1000)
    expect(canUse).toBe(true)
  })
})

describe('Domain - Promotion Entity', () => {
  it('should create promotion with valid data', () => {
    const promo = Promotion.create(
      '滿千折百',
      'CART_THRESHOLD',
      { threshold: 1000, discountAmount: 100 },
      new Date(),
      new Date(Date.now() + 86400000),
      50,
      '購物滿千元享折扣'
    )

    expect(promo.getName()).toBe('滿千折百')
    expect(promo.getType()).toBe('CART_THRESHOLD')
    expect(promo.isActive()).toBe(true)
  })

  it('should deactivate promotion', () => {
    const promo = Promotion.create(
      '促銷',
      'CART_THRESHOLD',
      {},
      new Date(),
      new Date(Date.now() + 86400000)
    )

    const deactivated = promo.deactivate()
    expect(promo.isActive()).toBe(true)
    expect(deactivated.getStatus()).toBe('INACTIVE')
  })
})
