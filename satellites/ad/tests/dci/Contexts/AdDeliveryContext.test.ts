import { beforeEach, describe, expect, it } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { AdDeliveryContext } from '../../../src/Domain/DCI/Contexts/AdDeliveryContext'
import { AdStatus } from '../../../src/Domain/Entities/Advertisement'
import { AdErrorCode } from '../../../src/Domain/Errors/AdError'
import { AdSchedule } from '../../../src/Domain/ValueObjects/AdSchedule'
import { AdWeight } from '../../../src/Domain/ValueObjects/AdWeight'
import { SlotSlug } from '../../../src/Domain/ValueObjects/SlotSlug'
import { InMemoryAdRepository } from '../helpers/InMemoryAdRepository'
import {
  createMockCore,
  createTestAd,
  daysAgo,
  daysFromNow,
  type HookCall,
} from '../helpers/testHelpers'

describe('AdDeliveryContext', () => {
  let repo: InMemoryAdRepository
  let core: PlanetCore
  let hookCalls: HookCall[]

  beforeEach(async () => {
    repo = new InMemoryAdRepository()
    const mock = createMockCore()
    core = mock.core
    hookCalls = mock.hookCalls
  })

  /**
   * 在 repo 中建立可投放的廣告
   */
  async function seedDeliverableAds(count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      const ad = createTestAd({
        id: `ad-${i}`,
        slotSlug: SlotSlug.of('HOME_HERO'),
        title: `廣告 ${i}`,
        status: AdStatus.ACTIVE,
        weight: AdWeight.of(5),
        schedule: AdSchedule.of(daysAgo(1), daysFromNow(30)),
      })
      await repo.save(ad)
    }
  }

  it('execute() 應回傳指定版位的可投放廣告', async () => {
    await seedDeliverableAds(3)
    // 加入不同版位的廣告（不應被回傳）
    const otherAd = createTestAd({
      id: 'ad-other',
      slotSlug: SlotSlug.of('HOME_BANNER'),
      status: AdStatus.ACTIVE,
    })
    await repo.save(otherAd)

    const ctx = new AdDeliveryContext(repo, core)
    const result = await ctx.execute({ slotSlug: 'HOME_HERO' })

    expect(result.ads.length).toBeGreaterThan(0)
    for (const ad of result.ads) {
      expect(ad.slotSlug).toBe('HOME_HERO')
    }
  })

  it('execute() 預設 count=1 時應回傳 1 筆', async () => {
    await seedDeliverableAds(5)

    const ctx = new AdDeliveryContext(repo, core)
    const result = await ctx.execute({ slotSlug: 'HOME_HERO' })

    expect(result.ads).toHaveLength(1)
  })

  it('execute() count=3 時應回傳最多 3 筆不重複廣告', async () => {
    await seedDeliverableAds(5)

    const ctx = new AdDeliveryContext(repo, core)
    const result = await ctx.execute({ slotSlug: 'HOME_HERO', count: 3 })

    expect(result.ads).toHaveLength(3)
    // 確認不重複
    const ids = result.ads.map((a) => a.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(3)
  })

  it('execute() count 超過可用時應回傳所有可用的', async () => {
    await seedDeliverableAds(2)

    const ctx = new AdDeliveryContext(repo, core)
    const result = await ctx.execute({ slotSlug: 'HOME_HERO', count: 5 })

    expect(result.ads).toHaveLength(2)
  })

  it('execute() 版位無可投放廣告時應回傳空陣列', async () => {
    // 不 seed 任何廣告

    const ctx = new AdDeliveryContext(repo, core)
    const result = await ctx.execute({ slotSlug: 'HOME_HERO' })

    expect(result.ads).toHaveLength(0)
    expect(result.totalAvailable).toBe(0)
  })

  it('execute() 應正確計算 totalAvailable', async () => {
    await seedDeliverableAds(7)

    const ctx = new AdDeliveryContext(repo, core)
    const result = await ctx.execute({ slotSlug: 'HOME_HERO', count: 2 })

    expect(result.totalAvailable).toBe(7)
    expect(result.ads).toHaveLength(2)
  })

  it('execute() 無效 SlotSlug 應拋出 AdError', async () => {
    const ctx = new AdDeliveryContext(repo, core)

    try {
      await ctx.execute({ slotSlug: 'invalid-slug' })
      expect.unreachable('應拋出錯誤')
    } catch (e: unknown) {
      const err = e as { code: string }
      expect(err.code).toBe(AdErrorCode.INVALID_SLOT)
    }
  })

  it('execute() count=0 或負數應拋出 AdError', async () => {
    const ctx = new AdDeliveryContext(repo, core)

    try {
      await ctx.execute({ slotSlug: 'HOME_HERO', count: 0 })
      expect.unreachable('應拋出錯誤')
    } catch (e: unknown) {
      const err = e as { code: string }
      expect(err.code).toBe(AdErrorCode.INVALID_DELIVERY_COUNT)
    }

    try {
      await ctx.execute({ slotSlug: 'HOME_HERO', count: -1 })
      expect.unreachable('應拋出錯誤')
    } catch (e: unknown) {
      const err = e as { code: string }
      expect(err.code).toBe(AdErrorCode.INVALID_DELIVERY_COUNT)
    }
  })

  it('execute() count 超過 10 應拋出 AdError', async () => {
    const ctx = new AdDeliveryContext(repo, core)

    try {
      await ctx.execute({ slotSlug: 'HOME_HERO', count: 11 })
      expect.unreachable('應拋出錯誤')
    } catch (e: unknown) {
      const err = e as { code: string }
      expect(err.code).toBe(AdErrorCode.INVALID_DELIVERY_COUNT)
    }
  })

  it('execute() 應觸發 ad:delivered hook', async () => {
    await seedDeliverableAds(3)

    const ctx = new AdDeliveryContext(repo, core)
    await ctx.execute({ slotSlug: 'HOME_HERO', count: 2 })

    const hook = hookCalls.find((h) => h.name === 'ad:delivered')
    expect(hook).toBeDefined()
    const hookData = hook!.data as {
      slotSlug: string
      count: number
      totalAvailable: number
    }
    expect(hookData.slotSlug).toBe('HOME_HERO')
    expect(hookData.count).toBe(2)
    expect(hookData.totalAvailable).toBe(3)
  })
})
