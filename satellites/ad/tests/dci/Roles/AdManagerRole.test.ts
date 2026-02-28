import { beforeEach, describe, expect, it } from 'bun:test'
import { injectAdManagerRole } from '../../../src/Domain/DCI/Roles/AdManagerRole'
import { AdStatus, Advertisement } from '../../../src/Domain/Entities/Advertisement'
import { AdErrorCode } from '../../../src/Domain/Errors/AdError'
import { AdSchedule } from '../../../src/Domain/ValueObjects/AdSchedule'
import { AdWeight } from '../../../src/Domain/ValueObjects/AdWeight'
import { SlotSlug } from '../../../src/Domain/ValueObjects/SlotSlug'
import { createTestAd, daysAgo, daysFromNow } from '../helpers/testHelpers'

describe('AdManagerRole', () => {
  describe('activate()', () => {
    it('應啟用 DRAFT 狀態廣告', () => {
      const ad = createTestAd()
      const role = injectAdManagerRole(ad)

      role.activate()

      expect(ad.status).toBe(AdStatus.ACTIVE)
    })

    it('應啟用 PAUSED 狀態廣告', () => {
      const ad = createTestAd({ status: AdStatus.PAUSED })
      const role = injectAdManagerRole(ad)

      role.activate()

      expect(ad.status).toBe(AdStatus.ACTIVE)
    })

    it('排程已過期時應拋出 AD_EXPIRED', () => {
      const ad = createTestAd({
        schedule: AdSchedule.of(daysAgo(10), daysAgo(1)),
      })
      const role = injectAdManagerRole(ad)

      try {
        role.activate()
        expect.unreachable('應拋出錯誤')
      } catch (e: unknown) {
        const err = e as { code: string }
        expect(err.code).toBe(AdErrorCode.AD_EXPIRED)
      }
    })

    it('ACTIVE 狀態時應拋出 INVALID_STATUS_TRANSITION', () => {
      const ad = createTestAd({ status: AdStatus.ACTIVE })
      const role = injectAdManagerRole(ad)

      try {
        role.activate()
        expect.unreachable('應拋出錯誤')
      } catch (e: unknown) {
        const err = e as { code: string }
        expect(err.code).toBe(AdErrorCode.INVALID_STATUS_TRANSITION)
      }
    })
  })

  describe('pause()', () => {
    it('應暫停 ACTIVE 狀態廣告', () => {
      const ad = createTestAd({ status: AdStatus.ACTIVE })
      const role = injectAdManagerRole(ad)

      role.pause()

      expect(ad.status).toBe(AdStatus.PAUSED)
    })

    it('DRAFT 狀態時應拋出 INVALID_STATUS_TRANSITION', () => {
      const ad = createTestAd()
      const role = injectAdManagerRole(ad)

      try {
        role.pause()
        expect.unreachable('應拋出錯誤')
      } catch (e: unknown) {
        const err = e as { code: string }
        expect(err.code).toBe(AdErrorCode.INVALID_STATUS_TRANSITION)
      }
    })
  })

  describe('updateDetails()', () => {
    it('應更新標題', () => {
      const ad = createTestAd()
      const role = injectAdManagerRole(ad)

      role.updateDetails({ title: '新的標題' })

      expect(ad.title).toBe('新的標題')
    })

    it('應更新圖片和目標網址', () => {
      const ad = createTestAd()
      const role = injectAdManagerRole(ad)

      role.updateDetails({
        imageUrl: 'https://example.com/new-image.jpg',
        targetUrl: 'https://example.com/new-landing',
      })

      expect(ad.imageUrl).toBe('https://example.com/new-image.jpg')
      expect(ad.targetUrl).toBe('https://example.com/new-landing')
    })

    it('應更新權重和排程', () => {
      const ad = createTestAd()
      const role = injectAdManagerRole(ad)

      const newWeight = AdWeight.of(9)
      const newSchedule = AdSchedule.of(daysFromNow(1), daysFromNow(60))

      role.updateDetails({
        weight: newWeight.value,
        startsAt: newSchedule.startsAt,
        endsAt: newSchedule.endsAt,
      })

      expect(ad.weight.value).toBe(9)
      expect(ad.schedule.startsAt.getTime()).toBe(newSchedule.startsAt.getTime())
      expect(ad.schedule.endsAt.getTime()).toBe(newSchedule.endsAt.getTime())
    })

    it('只更新提供的欄位（其他不變）', () => {
      const ad = createTestAd({ title: '原始標題' })
      const originalImageUrl = ad.imageUrl
      const originalTargetUrl = ad.targetUrl
      const role = injectAdManagerRole(ad)

      role.updateDetails({ title: '只改標題' })

      expect(ad.title).toBe('只改標題')
      expect(ad.imageUrl).toBe(originalImageUrl)
      expect(ad.targetUrl).toBe(originalTargetUrl)
    })
  })
})
