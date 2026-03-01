import { describe, expect, it } from 'bun:test'
import { AdStatus, Advertisement } from '../../src/Domain/Entities/Advertisement'
import {
  type AdvertisementRow,
  isAdvertisementRow,
  reconstituteAdvertisement,
} from '../../src/Infrastructure/Persistence/AdDbTypes'

// -- 測試用資料 --

function validRow(): AdvertisementRow {
  return {
    id: 'ad-001',
    slot_slug: 'HOME_HERO',
    title: '測試廣告',
    image_url: 'https://example.com/image.jpg',
    target_url: 'https://example.com/landing',
    weight: 5,
    status: 'active',
    starts_at: '2026-01-01T00:00:00.000Z',
    ends_at: '2026-12-31T23:59:59.000Z',
    metadata: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-15T12:00:00.000Z',
  }
}

// =====================================================
// isAdvertisementRow 型別守衛
// =====================================================

describe('isAdvertisementRow', () => {
  it('對完整有效的資料列回傳 true', () => {
    const row = validRow()
    expect(isAdvertisementRow(row)).toBe(true)
  })

  it('對含有 Date 物件的時間欄位也回傳 true', () => {
    const row = {
      ...validRow(),
      starts_at: new Date('2026-01-01'),
      ends_at: new Date('2026-12-31'),
      created_at: new Date('2026-01-01'),
      updated_at: new Date('2026-01-15'),
    }
    expect(isAdvertisementRow(row)).toBe(true)
  })

  it('對 null 回傳 false', () => {
    expect(isAdvertisementRow(null)).toBe(false)
  })

  it('對 undefined 回傳 false', () => {
    expect(isAdvertisementRow(undefined)).toBe(false)
  })

  it('對非物件型別回傳 false', () => {
    expect(isAdvertisementRow('string')).toBe(false)
    expect(isAdvertisementRow(42)).toBe(false)
    expect(isAdvertisementRow(true)).toBe(false)
  })

  it('缺少必要欄位時回傳 false', () => {
    const { id: _id, ...withoutId } = validRow()
    expect(isAdvertisementRow(withoutId)).toBe(false)
  })

  it('id 為非字串型別時回傳 false', () => {
    const row = { ...validRow(), id: 123 }
    expect(isAdvertisementRow(row)).toBe(false)
  })

  it('weight 為非數字型別時回傳 false', () => {
    const row = { ...validRow(), weight: 'high' }
    expect(isAdvertisementRow(row)).toBe(false)
  })

  it('metadata 可以是 null 或字串', () => {
    const rowNull = { ...validRow(), metadata: null }
    const rowStr = { ...validRow(), metadata: '{"key":"value"}' }
    expect(isAdvertisementRow(rowNull)).toBe(true)
    expect(isAdvertisementRow(rowStr)).toBe(true)
  })
})

// =====================================================
// reconstituteAdvertisement 重建實體
// =====================================================

describe('reconstituteAdvertisement', () => {
  it('從有效 DB 行重建 Advertisement 實體', () => {
    const row = validRow()
    const ad = reconstituteAdvertisement(row)

    expect(ad).toBeInstanceOf(Advertisement)
    expect(ad.id).toBe('ad-001')
    expect(ad.slotSlug.value).toBe('HOME_HERO')
    expect(ad.title).toBe('測試廣告')
    expect(ad.imageUrl).toBe('https://example.com/image.jpg')
    expect(ad.targetUrl).toBe('https://example.com/landing')
    expect(ad.weight.value).toBe(5)
    expect(ad.status).toBe(AdStatus.ACTIVE)
  })

  it('正確解析 ISO 8601 字串時間欄位', () => {
    const row = validRow()
    const ad = reconstituteAdvertisement(row)

    expect(ad.schedule.startsAt).toBeInstanceOf(Date)
    expect(ad.schedule.endsAt).toBeInstanceOf(Date)
    expect(ad.createdAt).toBeInstanceOf(Date)
    expect(ad.updatedAt).toBeInstanceOf(Date)
  })

  it('正確處理 Date 物件時間欄位', () => {
    const row = {
      ...validRow(),
      starts_at: new Date('2026-01-01T00:00:00.000Z'),
      ends_at: new Date('2026-12-31T23:59:59.000Z'),
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-15T12:00:00.000Z'),
    }
    const ad = reconstituteAdvertisement(row)

    expect(ad.schedule.startsAt.getTime()).toBe(new Date('2026-01-01T00:00:00.000Z').getTime())
    expect(ad.schedule.endsAt.getTime()).toBe(new Date('2026-12-31T23:59:59.000Z').getTime())
  })

  it('正確解析 metadata JSON 字串', () => {
    const row = {
      ...validRow(),
      metadata: JSON.stringify({ campaign: 'summer', priority: 1 }),
    }
    const ad = reconstituteAdvertisement(row)

    expect(ad.metadata).toEqual({ campaign: 'summer', priority: 1 })
  })

  it('metadata 為 null 時回傳空物件', () => {
    const row = { ...validRow(), metadata: null }
    const ad = reconstituteAdvertisement(row)

    expect(ad.metadata).toEqual({})
  })

  it('支援所有三種狀態的重建', () => {
    for (const status of ['draft', 'active', 'paused']) {
      const row = { ...validRow(), status }
      const ad = reconstituteAdvertisement(row)
      expect(ad.status).toBe(status)
    }
  })

  it('使用 reconstitute 跳過驗證（不會拋出錯誤）', () => {
    // 使用極端權重值（超出正常範圍），reconstitute 不應驗證
    const row = { ...validRow(), weight: 999 }
    const ad = reconstituteAdvertisement(row)
    expect(ad.weight.value).toBe(999)
  })
})
