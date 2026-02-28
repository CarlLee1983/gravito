import { describe, expect, it } from 'bun:test'
import type { AdDTO } from '../../src/Application/DTOs/AdDTO'
import { AdMapper } from '../../src/Application/DTOs/AdMapper'
import { AdStatus } from '../../src/Domain/Entities/Advertisement'
import { AdSchedule } from '../../src/Domain/ValueObjects/AdSchedule'
import { AdWeight } from '../../src/Domain/ValueObjects/AdWeight'
import { SlotSlug } from '../../src/Domain/ValueObjects/SlotSlug'
import { createTestAd, daysAgo, daysFromNow } from '../dci/helpers/testHelpers'

describe('AdMapper', () => {
  describe('toDTO()', () => {
    it('應正確映射所有基本欄位', () => {
      const ad = createTestAd({
        id: 'ad-mapper-001',
        title: '映射測試廣告',
        status: AdStatus.ACTIVE,
      })

      const dto = AdMapper.toDTO(ad)

      expect(dto.id).toBe('ad-mapper-001')
      expect(dto.title).toBe('映射測試廣告')
      expect(dto.slotSlug).toBe('HOME_HERO')
      expect(dto.imageUrl).toBe('https://example.com/image.jpg')
      expect(dto.targetUrl).toBe('https://example.com/landing')
      expect(dto.weight).toBe(5)
      expect(dto.status).toBe('active')
    })

    it('應正確計算 isDeliverable', () => {
      // ACTIVE + 排程活躍中 => isDeliverable = true
      const activeAd = createTestAd({
        id: 'ad-deliverable',
        status: AdStatus.ACTIVE,
        schedule: AdSchedule.of(daysAgo(1), daysFromNow(30)),
      })
      const activeDto = AdMapper.toDTO(activeAd)
      expect(activeDto.isDeliverable).toBe(true)

      // DRAFT => isDeliverable = false
      const draftAd = createTestAd({
        id: 'ad-draft',
        schedule: AdSchedule.of(daysAgo(1), daysFromNow(30)),
      })
      const draftDto = AdMapper.toDTO(draftAd)
      expect(draftDto.isDeliverable).toBe(false)

      // ACTIVE 但已過期 => isDeliverable = false
      const expiredAd = createTestAd({
        id: 'ad-expired',
        status: AdStatus.ACTIVE,
        schedule: AdSchedule.of(daysAgo(30), daysAgo(1)),
      })
      const expiredDto = AdMapper.toDTO(expiredAd)
      expect(expiredDto.isDeliverable).toBe(false)
    })

    it('應正確計算 daysRemaining', () => {
      const ad = createTestAd({
        id: 'ad-days',
        schedule: AdSchedule.of(daysAgo(1), daysFromNow(15)),
      })

      const dto = AdMapper.toDTO(ad)

      // daysFromNow(15) 代表大約 15 天後，floor 後應為 14 或 15
      expect(dto.daysRemaining).toBeGreaterThanOrEqual(14)
      expect(dto.daysRemaining).toBeLessThanOrEqual(15)
    })

    it('應將日期格式化為 ISO 8601 字串', () => {
      const ad = createTestAd({ id: 'ad-date' })

      const dto = AdMapper.toDTO(ad)

      // ISO 8601 格式驗證
      const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      expect(dto.startsAt).toMatch(isoPattern)
      expect(dto.endsAt).toMatch(isoPattern)
      expect(dto.createdAt).toMatch(isoPattern)
      expect(dto.updatedAt).toMatch(isoPattern)
    })

    it('metadata 為空時應為 undefined', () => {
      // 預設 createTestAd 的 metadata 為空物件 {}
      const ad = createTestAd({ id: 'ad-no-meta' })

      const dto = AdMapper.toDTO(ad)

      // 空物件應映射為 undefined
      expect(dto.metadata).toBeUndefined()
    })
  })

  describe('toListDTO()', () => {
    it('應批量轉換', () => {
      const ads = [
        createTestAd({ id: 'ad-list-1', title: '廣告一' }),
        createTestAd({ id: 'ad-list-2', title: '廣告二' }),
        createTestAd({ id: 'ad-list-3', title: '廣告三' }),
      ]

      const dtos = AdMapper.toListDTO(ads)

      expect(dtos).toHaveLength(3)
      expect(dtos[0].id).toBe('ad-list-1')
      expect(dtos[0].title).toBe('廣告一')
      expect(dtos[1].id).toBe('ad-list-2')
      expect(dtos[2].id).toBe('ad-list-3')

      // 每個 DTO 都應有完整欄位
      for (const dto of dtos) {
        expect(dto.slotSlug).toBeDefined()
        expect(dto.status).toBeDefined()
        expect(dto.startsAt).toBeDefined()
        expect(dto.endsAt).toBeDefined()
      }
    })
  })
})
