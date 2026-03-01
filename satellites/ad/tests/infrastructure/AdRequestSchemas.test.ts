import { describe, expect, it } from 'bun:test'
import {
  CreateAdSchema,
  DeliverAdSchema,
  ListAdsQuerySchema,
  ToggleStatusSchema,
  UpdateAdSchema,
} from '../../src/Infrastructure/Http/Validation/AdRequestSchemas'

// =====================================================
// CreateAdSchema
// =====================================================

describe('CreateAdSchema', () => {
  const validInput = {
    slotSlug: 'HOME_HERO',
    title: '夏季大促銷',
    imageUrl: 'https://example.com/image.jpg',
    targetUrl: 'https://example.com/landing',
    weight: 5,
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: '2026-12-31T23:59:59.000Z',
  }

  it('接受有效的建立廣告輸入', () => {
    const result = CreateAdSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('接受包含可選欄位的輸入', () => {
    const input = {
      ...validInput,
      activateImmediately: true,
      metadata: { campaign: 'summer' },
    }
    const result = CreateAdSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('拒絕缺少 title 的輸入', () => {
    const { title: _t, ...input } = validInput
    const result = CreateAdSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('拒絕無效的 weight（超出範圍）', () => {
    const result = CreateAdSchema.safeParse({ ...validInput, weight: 15 })
    expect(result.success).toBe(false)
  })

  it('拒絕無效的 weight（非整數）', () => {
    const result = CreateAdSchema.safeParse({ ...validInput, weight: 3.5 })
    expect(result.success).toBe(false)
  })

  it('拒絕空白 title', () => {
    const result = CreateAdSchema.safeParse({ ...validInput, title: '' })
    expect(result.success).toBe(false)
  })

  it('拒絕無效的日期格式', () => {
    const result = CreateAdSchema.safeParse({ ...validInput, startsAt: 'not-a-date' })
    expect(result.success).toBe(false)
  })
})

// =====================================================
// UpdateAdSchema
// =====================================================

describe('UpdateAdSchema', () => {
  it('接受部分更新（只有 title）', () => {
    const result = UpdateAdSchema.safeParse({ title: '新標題' })
    expect(result.success).toBe(true)
  })

  it('接受多個欄位更新', () => {
    const result = UpdateAdSchema.safeParse({
      title: '新標題',
      weight: 8,
      imageUrl: 'https://example.com/new.jpg',
    })
    expect(result.success).toBe(true)
  })

  it('接受空物件（無更新）', () => {
    const result = UpdateAdSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('拒絕無效的 weight', () => {
    const result = UpdateAdSchema.safeParse({ weight: 0 })
    expect(result.success).toBe(false)
  })
})

// =====================================================
// ToggleStatusSchema
// =====================================================

describe('ToggleStatusSchema', () => {
  it('接受 activate 動作', () => {
    const result = ToggleStatusSchema.safeParse({ action: 'activate' })
    expect(result.success).toBe(true)
  })

  it('接受 pause 動作', () => {
    const result = ToggleStatusSchema.safeParse({ action: 'pause' })
    expect(result.success).toBe(true)
  })

  it('拒絕無效的動作', () => {
    const result = ToggleStatusSchema.safeParse({ action: 'delete' })
    expect(result.success).toBe(false)
  })

  it('拒絕缺少 action', () => {
    const result = ToggleStatusSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

// =====================================================
// DeliverAdSchema
// =====================================================

describe('DeliverAdSchema', () => {
  it('接受有效的投放請求', () => {
    const result = DeliverAdSchema.safeParse({ slotSlug: 'HOME_HERO' })
    expect(result.success).toBe(true)
  })

  it('接受包含 count 的請求', () => {
    const result = DeliverAdSchema.safeParse({ slotSlug: 'HOME_HERO', count: 3 })
    expect(result.success).toBe(true)
  })

  it('拒絕 count 超過上限（10）', () => {
    const result = DeliverAdSchema.safeParse({ slotSlug: 'HOME_HERO', count: 15 })
    expect(result.success).toBe(false)
  })

  it('拒絕 count 小於 1', () => {
    const result = DeliverAdSchema.safeParse({ slotSlug: 'HOME_HERO', count: 0 })
    expect(result.success).toBe(false)
  })

  it('拒絕缺少 slotSlug', () => {
    const result = DeliverAdSchema.safeParse({ count: 1 })
    expect(result.success).toBe(false)
  })
})

// =====================================================
// ListAdsQuerySchema
// =====================================================

describe('ListAdsQuerySchema', () => {
  it('接受空查詢參數', () => {
    const result = ListAdsQuerySchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('接受所有篩選參數', () => {
    const result = ListAdsQuerySchema.safeParse({
      status: 'active',
      slotSlug: 'HOME_HERO',
      limit: '10',
      offset: '0',
    })
    expect(result.success).toBe(true)
  })

  it('將 limit/offset 字串轉換為數字', () => {
    const result = ListAdsQuerySchema.safeParse({ limit: '5', offset: '10' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(5)
      expect(result.data.offset).toBe(10)
    }
  })

  it('拒絕無效的 status', () => {
    const result = ListAdsQuerySchema.safeParse({ status: 'invalid' })
    expect(result.success).toBe(false)
  })
})
