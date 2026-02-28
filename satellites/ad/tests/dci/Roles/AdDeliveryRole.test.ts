import { describe, expect, it } from 'bun:test'
import { injectAdDeliveryRole } from '../../../src/Domain/DCI/Roles/AdDeliveryRole'
import { AdStatus } from '../../../src/Domain/Entities/Advertisement'
import { AdSchedule } from '../../../src/Domain/ValueObjects/AdSchedule'
import { AdWeight } from '../../../src/Domain/ValueObjects/AdWeight'
import { createTestAd, daysAgo, daysFromNow } from '../helpers/testHelpers'

describe('AdDeliveryRole', () => {
  describe('filterDeliverable()', () => {
    it('應過濾出 ACTIVE 且排程活躍的廣告', () => {
      const role = injectAdDeliveryRole()

      const active = createTestAd({
        id: 'ad-active',
        status: AdStatus.ACTIVE,
        schedule: AdSchedule.of(daysAgo(1), daysFromNow(30)),
      })
      const draft = createTestAd({ id: 'ad-draft' })
      const paused = createTestAd({
        id: 'ad-paused',
        status: AdStatus.PAUSED,
      })

      const result = role.filterDeliverable([active, draft, paused])

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('ad-active')
    })

    it('應排除 DRAFT 和 PAUSED 狀態', () => {
      const role = injectAdDeliveryRole()

      const draft = createTestAd({ id: 'ad-draft' })
      const paused = createTestAd({
        id: 'ad-paused',
        status: AdStatus.PAUSED,
      })

      const result = role.filterDeliverable([draft, paused])

      expect(result).toHaveLength(0)
    })

    it('應排除排程已過期的廣告', () => {
      const role = injectAdDeliveryRole()

      const expired = createTestAd({
        id: 'ad-expired',
        status: AdStatus.ACTIVE,
        schedule: AdSchedule.of(daysAgo(10), daysAgo(1)),
      })

      const result = role.filterDeliverable([expired])

      expect(result).toHaveLength(0)
    })

    it('空陣列應回傳空陣列', () => {
      const role = injectAdDeliveryRole()

      const result = role.filterDeliverable([])

      expect(result).toHaveLength(0)
    })

    it('應支援自訂 now 參數', () => {
      const role = injectAdDeliveryRole()

      const ad = createTestAd({
        id: 'ad-future',
        status: AdStatus.ACTIVE,
        schedule: AdSchedule.of(new Date('2025-06-01'), new Date('2025-06-30')),
      })

      // 在排程範圍內
      const inRange = role.filterDeliverable([ad], new Date('2025-06-15'))
      expect(inRange).toHaveLength(1)

      // 在排程範圍外
      const outOfRange = role.filterDeliverable([ad], new Date('2025-07-15'))
      expect(outOfRange).toHaveLength(0)
    })
  })

  describe('selectByWeight()', () => {
    it('空候選陣列應回傳 null', () => {
      const role = injectAdDeliveryRole()

      const result = role.selectByWeight([])

      expect(result).toBeNull()
    })

    it('單一候選應直接回傳', () => {
      const role = injectAdDeliveryRole()

      const ad = createTestAd({ id: 'ad-only', status: AdStatus.ACTIVE })

      const result = role.selectByWeight([ad])

      expect(result).not.toBeNull()
      expect(result!.id).toBe('ad-only')
    })

    it('多個候選應回傳其中一個', () => {
      const role = injectAdDeliveryRole()

      const ad1 = createTestAd({
        id: 'ad-1',
        status: AdStatus.ACTIVE,
        weight: AdWeight.of(3),
      })
      const ad2 = createTestAd({
        id: 'ad-2',
        status: AdStatus.ACTIVE,
        weight: AdWeight.of(7),
      })

      const result = role.selectByWeight([ad1, ad2])

      expect(result).not.toBeNull()
      expect(['ad-1', 'ad-2']).toContain(result!.id)
    })

    it('相同權重時應能正常選取', () => {
      const role = injectAdDeliveryRole()

      const ads = Array.from({ length: 5 }, (_, i) =>
        createTestAd({
          id: `ad-${i}`,
          status: AdStatus.ACTIVE,
          weight: AdWeight.of(5),
        })
      )

      const result = role.selectByWeight(ads)

      expect(result).not.toBeNull()
      expect(ads.map((a) => a.id)).toContain(result!.id)
    })

    it('高權重廣告應有更高被選中概率（統計測試 1000 次）', () => {
      const role = injectAdDeliveryRole()

      const lowWeight = createTestAd({
        id: 'ad-low',
        status: AdStatus.ACTIVE,
        weight: AdWeight.of(1),
      })
      const highWeight = createTestAd({
        id: 'ad-high',
        status: AdStatus.ACTIVE,
        weight: AdWeight.of(10),
      })

      let highCount = 0
      const iterations = 1000

      for (let i = 0; i < iterations; i++) {
        const result = role.selectByWeight([lowWeight, highWeight])
        if (result?.id === 'ad-high') {
          highCount++
        }
      }

      // 權重 10:1，高權重應被選超過 70%（容錯空間）
      const ratio = highCount / iterations
      expect(ratio).toBeGreaterThan(0.7)
    })
  })
})
