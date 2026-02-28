import { beforeEach, describe, expect, it } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import type { DeleteAdOutput } from '../../src/Application/UseCases/DeleteAdUseCase'
import { DeleteAdUseCase } from '../../src/Application/UseCases/DeleteAdUseCase'
import { AdErrorCode } from '../../src/Domain/Errors/AdError'
import { InMemoryAdRepository } from '../dci/helpers/InMemoryAdRepository'
import { createMockCore, createTestAd } from '../dci/helpers/testHelpers'

describe('DeleteAdUseCase', () => {
  let repository: InMemoryAdRepository
  let core: PlanetCore
  let useCase: DeleteAdUseCase

  beforeEach(async () => {
    repository = new InMemoryAdRepository()
    const mock = createMockCore()
    core = mock.core
    useCase = new DeleteAdUseCase(core, repository)

    // 預先建立一個測試廣告
    const ad = createTestAd({ id: 'ad-delete-001', title: '即將刪除' })
    await repository.save(ad)
  })

  it('execute() 應刪除廣告並回傳確認訊息', async () => {
    const result = await useCase.execute({ adId: 'ad-delete-001' })

    expect(result.id).toBe('ad-delete-001')
    expect(result.message).toBeDefined()
    expect(typeof result.message).toBe('string')
    expect(result.message.length).toBeGreaterThan(0)
  })

  it('execute() 廣告不存在時應拋出 AD_NOT_FOUND', async () => {
    try {
      await useCase.execute({ adId: 'non-existent' })
      expect(true).toBe(false)
    } catch (error) {
      expect((error as { code: string }).code).toBe(AdErrorCode.AD_NOT_FOUND)
    }
  })

  it('execute() 刪除後 Repository 中不應存在該廣告', async () => {
    // 先確認存在
    const before = await repository.findById('ad-delete-001')
    expect(before).not.toBeNull()

    await useCase.execute({ adId: 'ad-delete-001' })

    // 刪除後不應存在
    const after = await repository.findById('ad-delete-001')
    expect(after).toBeNull()
    expect(await repository.exists('ad-delete-001')).toBe(false)
  })
})
