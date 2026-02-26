import { describe, expect, it } from 'bun:test'
import { AdminListCoupons } from '../src/Application/UseCases/AdminListCoupons'
import { Coupon } from '../src/Domain/Entities/Coupon'

describe('Marketing Domain - Coupon Entity', () => {
  describe('Coupon Creation', () => {
    it('應該能建立新優惠券', () => {
      const coupon = Coupon.create({
        code: 'WELCOME2025',
        name: '新年優惠',
        type: 'PERCENTAGE',
        value: 10,
        minPurchase: 0,
        startsAt: new Date('2025-01-01'),
        expiresAt: new Date('2025-12-31'),
        status: 'ACTIVE',
        usedCount: 0,
      })

      expect(coupon.id).toBeDefined()
      expect(coupon.code).toBe('WELCOME2025')
      expect(coupon.status).toBe('ACTIVE')
    })

    it('應該正確初始化 usedCount 為 0', () => {
      const coupon = Coupon.create({
        code: 'TEST',
        name: 'Test Coupon',
        type: 'FIXED',
        value: 100,
        minPurchase: 1000,
        startsAt: new Date(),
        expiresAt: new Date(),
        status: 'ACTIVE',
      })

      const props = coupon.unpack()
      expect(props.usedCount).toBe(0)
    })

    it('應該能帶自定義 ID 建立', () => {
      const coupon = Coupon.create(
        {
          code: 'CUSTOM',
          name: 'Custom ID',
          type: 'PERCENTAGE',
          value: 20,
          minPurchase: 0,
          startsAt: new Date(),
          expiresAt: new Date(),
          status: 'ACTIVE',
        },
        'custom-id-123'
      )

      expect(coupon.id).toBe('custom-id-123')
    })
  })

  describe('Coupon Properties', () => {
    it('應該能存取所有優惠券屬性', () => {
      const startsAt = new Date('2025-01-01')
      const expiresAt = new Date('2025-12-31')

      const coupon = Coupon.create({
        code: 'SAVE500',
        name: '滿額折抵',
        type: 'FIXED',
        value: 500,
        minPurchase: 5000,
        usageLimit: 100,
        startsAt,
        expiresAt,
        status: 'ACTIVE',
      })

      const props = coupon.unpack()
      expect(props.code).toBe('SAVE500')
      expect(props.name).toBe('滿額折抵')
      expect(props.type).toBe('FIXED')
      expect(props.value).toBe(500)
      expect(props.minPurchase).toBe(5000)
      expect(props.usageLimit).toBe(100)
      expect(props.startsAt).toBe(startsAt)
      expect(props.expiresAt).toBe(expiresAt)
      expect(props.status).toBe('ACTIVE')
    })

    it('unpack() 應該回傳深層副本', () => {
      const coupon = Coupon.create({
        code: 'TEST',
        name: 'Test',
        type: 'PERCENTAGE',
        value: 10,
        minPurchase: 0,
        startsAt: new Date(),
        expiresAt: new Date(),
        status: 'ACTIVE',
      })

      const props1 = coupon.unpack()
      const props2 = coupon.unpack()

      // 應該是不同的物件，但內容相同
      expect(props1).not.toBe(props2)
      expect(props1).toEqual(props2)
    })

    it('應該支援不同的優惠券類型', () => {
      const fixedCoupon = Coupon.create({
        code: 'FIXED100',
        name: 'Fixed Amount',
        type: 'FIXED',
        value: 100,
        minPurchase: 0,
        startsAt: new Date(),
        expiresAt: new Date(),
        status: 'ACTIVE',
      })

      const percentageCoupon = Coupon.create({
        code: 'PERCENT20',
        name: 'Percentage Off',
        type: 'PERCENTAGE',
        value: 20,
        minPurchase: 0,
        startsAt: new Date(),
        expiresAt: new Date(),
        status: 'ACTIVE',
      })

      expect(fixedCoupon.unpack().type).toBe('FIXED')
      expect(percentageCoupon.unpack().type).toBe('PERCENTAGE')
    })
  })

  describe('Coupon Status', () => {
    it('應該能存取優惠券狀態', () => {
      const coupon = Coupon.create({
        code: 'TEST',
        name: 'Test',
        type: 'FIXED',
        value: 100,
        minPurchase: 0,
        startsAt: new Date(),
        expiresAt: new Date(),
        status: 'ACTIVE',
      })

      expect(coupon.status).toBe('ACTIVE')

      const expiredCoupon = Coupon.create({
        code: 'EXPIRED',
        name: 'Expired',
        type: 'FIXED',
        value: 100,
        minPurchase: 0,
        startsAt: new Date(),
        expiresAt: new Date(),
        status: 'EXPIRED',
      })

      expect(expiredCoupon.status).toBe('EXPIRED')
    })

    it('應該支援所有狀態類型', () => {
      const statuses: Array<'ACTIVE' | 'EXPIRED' | 'DISABLED'> = ['ACTIVE', 'EXPIRED', 'DISABLED']

      statuses.forEach((status) => {
        const coupon = Coupon.create({
          code: `TEST-${status}`,
          name: status,
          type: 'FIXED',
          value: 100,
          minPurchase: 0,
          startsAt: new Date(),
          expiresAt: new Date(),
          status,
        })

        expect(coupon.status).toBe(status)
      })
    })
  })
})

describe('Marketing UseCases', () => {
  describe('AdminListCoupons', () => {
    it('應該能列出所有優惠券', async () => {
      const useCase = new AdminListCoupons()
      const result = await useCase.execute()

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
    })

    it('應該回傳 Coupon 實體', async () => {
      const useCase = new AdminListCoupons()
      const result = await useCase.execute()

      result.forEach((coupon) => {
        expect(coupon.id).toBeDefined()
        expect(coupon.code).toBeDefined()
        expect(coupon.status).toBeDefined()
      })
    })

    it('應該包含 WELCOME2025 優惠券', async () => {
      const useCase = new AdminListCoupons()
      const result = await useCase.execute()

      const welcome = result.find((c) => c.code === 'WELCOME2025')
      expect(welcome).toBeDefined()
      expect(welcome?.status).toBe('ACTIVE')
    })

    it('應該包含 SAVE500 優惠券', async () => {
      const useCase = new AdminListCoupons()
      const result = await useCase.execute()

      const save = result.find((c) => c.code === 'SAVE500')
      expect(save).toBeDefined()
      expect(save?.status).toBe('ACTIVE')
    })

    it('應該能存取優惠券詳細資訊', async () => {
      const useCase = new AdminListCoupons()
      const result = await useCase.execute()

      const welcome = result.find((c) => c.code === 'WELCOME2025')
      const props = welcome?.unpack()

      expect(props?.name).toBe('新年歡迎禮')
      expect(props?.type).toBe('PERCENTAGE')
      expect(props?.value).toBe(10)
      expect(props?.minPurchase).toBe(0)
    })
  })
})
