import { beforeEach, describe, expect, it } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import type { DeliverAdInput } from '../../src/Application/UseCases/DeliverAdUseCase'
import { DeliverAdUseCase } from '../../src/Application/UseCases/DeliverAdUseCase'
import { AdStatus } from '../../src/Domain/Entities/Advertisement'
import { AdErrorCode } from '../../src/Domain/Errors/AdError'
import { AdSchedule } from '../../src/Domain/ValueObjects/AdSchedule'
import { SlotSlug } from '../../src/Domain/ValueObjects/SlotSlug'
import { InMemoryAdRepository } from '../dci/helpers/InMemoryAdRepository'
import { createMockCore, createTestAd, daysAgo, daysFromNow } from '../dci/helpers/testHelpers'

describe('DeliverAdUseCase', () => {
  let repository: InMemoryAdRepository
  let core: PlanetCore
  let useCase: DeliverAdUseCase

  beforeEach(async () => {
    repository = new InMemoryAdRepository()
    const mock = createMockCore()
    core = mock.core
    useCase = new DeliverAdUseCase(core, repository)

    // 建立可投放的廣告（ACTIVE + 排程活躍）
    await repository.save(
      createTestAd({
        id: 'ad-deliver-1',
        title: '可投放廣告一',
        status: AdStatus.ACTIVE,
        slotSlug: SlotSlug.of('HOME_HERO'),
        schedule: AdSchedule.of(daysAgo(1), daysFromNow(30)),
      })
    )
    await repository.save(
      createTestAd({
        id: 'ad-deliver-2',
        title: '可投放廣告二',
        status: AdStatus.ACTIVE,
        slotSlug: SlotSlug.of('HOME_HERO'),
        schedule: AdSchedule.of(daysAgo(1), daysFromNow(30)),
      })
    )
    // 不可投放：DRAFT 狀態
    await repository.save(
      createTestAd({
        id: 'ad-deliver-3',
        title: 'Draft 廣告',
        slotSlug: SlotSlug.of('HOME_HERO'),
        schedule: AdSchedule.of(daysAgo(1), daysFromNow(30)),
      })
    )
  })

  it('execute() 應回傳指定版位的可投放廣告', async () => {
    const result = await useCase.execute({
      slotSlug: 'HOME_HERO',
      count: 2,
    })

    expect(result.ads.length).toBeGreaterThanOrEqual(1)
    expect(result.ads.length).toBeLessThanOrEqual(2)
    expect(result.totalAvailable).toBe(2) // 只有 2 個 ACTIVE

    for (const ad of result.ads) {
      expect(ad.slotSlug).toBe('HOME_HERO')
      expect(ad.id).toBeDefined()
      expect(ad.title).toBeDefined()
    }
  })

  it('execute() 預設 count=1 時應回傳 1 筆', async () => {
    const result = await useCase.execute({
      slotSlug: 'HOME_HERO',
    })

    expect(result.ads).toHaveLength(1)
    expect(result.totalAvailable).toBe(2)
  })

  it('execute() 無可投放廣告時應回傳空陣列', async () => {
    const result = await useCase.execute({
      slotSlug: 'PRODUCT_SIDEBAR',
    })

    expect(result.ads).toHaveLength(0)
    expect(result.totalAvailable).toBe(0)
  })

  it('execute() 無效 slotSlug 應拋出 AdError', async () => {
    try {
      await useCase.execute({
        slotSlug: 'invalid-slug',
      })
      expect(true).toBe(false)
    } catch (error) {
      expect((error as { code: string }).code).toBe(AdErrorCode.INVALID_SLOT)
    }
  })
})
