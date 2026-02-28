import { beforeEach, describe, expect, it } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import type { ToggleAdStatusInput } from '../../src/Application/UseCases/ToggleAdStatusUseCase'
import { ToggleAdStatusUseCase } from '../../src/Application/UseCases/ToggleAdStatusUseCase'
import { AdStatus } from '../../src/Domain/Entities/Advertisement'
import { AdErrorCode } from '../../src/Domain/Errors/AdError'
import { AdSchedule } from '../../src/Domain/ValueObjects/AdSchedule'
import { InMemoryAdRepository } from '../dci/helpers/InMemoryAdRepository'
import { createMockCore, createTestAd, daysAgo, daysFromNow } from '../dci/helpers/testHelpers'

describe('ToggleAdStatusUseCase', () => {
  let repository: InMemoryAdRepository
  let core: PlanetCore
  let useCase: ToggleAdStatusUseCase

  beforeEach(async () => {
    repository = new InMemoryAdRepository()
    const mock = createMockCore()
    core = mock.core
    useCase = new ToggleAdStatusUseCase(core, repository)
  })

  it('execute() action=activate 應啟用廣告並回傳 DTO', async () => {
    // DRAFT 狀態的廣告
    const ad = createTestAd({
      id: 'ad-toggle-001',
      schedule: AdSchedule.of(daysAgo(1), daysFromNow(30)),
    })
    await repository.save(ad)

    const result = await useCase.execute({
      adId: 'ad-toggle-001',
      action: 'activate',
    })

    expect(result.status).toBe('active')
    expect(result.id).toBe('ad-toggle-001')
    expect(result.isDeliverable).toBe(true)
  })

  it('execute() action=pause 應暫停廣告並回傳 DTO', async () => {
    // ACTIVE 狀態的廣告
    const ad = createTestAd({
      id: 'ad-toggle-002',
      status: AdStatus.ACTIVE,
      schedule: AdSchedule.of(daysAgo(1), daysFromNow(30)),
    })
    await repository.save(ad)

    const result = await useCase.execute({
      adId: 'ad-toggle-002',
      action: 'pause',
    })

    expect(result.status).toBe('paused')
    expect(result.id).toBe('ad-toggle-002')
    expect(result.isDeliverable).toBe(false)
  })

  it('execute() 廣告不存在時應拋出 AD_NOT_FOUND', async () => {
    try {
      await useCase.execute({
        adId: 'non-existent',
        action: 'activate',
      })
      expect(true).toBe(false)
    } catch (error) {
      expect((error as { code: string }).code).toBe(AdErrorCode.AD_NOT_FOUND)
    }
  })

  it('execute() 無效狀態轉移應拋出 INVALID_STATUS_TRANSITION', async () => {
    // DRAFT 廣告無法 pause（只有 ACTIVE 可以 pause）
    const ad = createTestAd({
      id: 'ad-toggle-003',
    })
    await repository.save(ad)

    try {
      await useCase.execute({
        adId: 'ad-toggle-003',
        action: 'pause',
      })
      expect(true).toBe(false)
    } catch (error) {
      expect((error as { code: string }).code).toBe(AdErrorCode.INVALID_STATUS_TRANSITION)
    }
  })
})
