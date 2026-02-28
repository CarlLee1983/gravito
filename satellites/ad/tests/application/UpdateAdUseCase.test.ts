import { beforeEach, describe, expect, it } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import type { UpdateAdInput } from '../../src/Application/UseCases/UpdateAdUseCase'
import { UpdateAdUseCase } from '../../src/Application/UseCases/UpdateAdUseCase'
import { AdErrorCode } from '../../src/Domain/Errors/AdError'
import { InMemoryAdRepository } from '../dci/helpers/InMemoryAdRepository'
import { createMockCore, createTestAd, daysAgo, daysFromNow } from '../dci/helpers/testHelpers'

describe('UpdateAdUseCase', () => {
  let repository: InMemoryAdRepository
  let core: PlanetCore
  let useCase: UpdateAdUseCase

  beforeEach(async () => {
    repository = new InMemoryAdRepository()
    const mock = createMockCore()
    core = mock.core
    useCase = new UpdateAdUseCase(core, repository)

    // 預先建立一個測試廣告
    const ad = createTestAd({
      id: 'ad-update-001',
      title: '原始標題',
    })
    await repository.save(ad)
  })

  it('execute() 應部分更新並回傳完整 DTO', async () => {
    const input: UpdateAdInput = {
      adId: 'ad-update-001',
      title: '更新後的標題',
    }

    const result = await useCase.execute(input)

    expect(result.id).toBe('ad-update-001')
    expect(result.title).toBe('更新後的標題')
    // 其他欄位應保持不變
    expect(result.imageUrl).toBe('https://example.com/image.jpg')
    expect(result.targetUrl).toBe('https://example.com/landing')
    expect(result.weight).toBe(5)
  })

  it('execute() 應完整更新所有欄位', async () => {
    const newStartsAt = daysFromNow(1).toISOString()
    const newEndsAt = daysFromNow(60).toISOString()

    const input: UpdateAdInput = {
      adId: 'ad-update-001',
      title: '全新標題',
      imageUrl: 'https://example.com/new-image.jpg',
      targetUrl: 'https://example.com/new-landing',
      weight: 8,
      startsAt: newStartsAt,
      endsAt: newEndsAt,
    }

    const result = await useCase.execute(input)

    expect(result.title).toBe('全新標題')
    expect(result.imageUrl).toBe('https://example.com/new-image.jpg')
    expect(result.targetUrl).toBe('https://example.com/new-landing')
    expect(result.weight).toBe(8)
  })

  it('execute() 廣告不存在時應拋出 AD_NOT_FOUND', async () => {
    const input: UpdateAdInput = {
      adId: 'non-existent-id',
      title: '不存在',
    }

    try {
      await useCase.execute(input)
      expect(true).toBe(false) // 不應到這裡
    } catch (error) {
      expect((error as { code: string }).code).toBe(AdErrorCode.AD_NOT_FOUND)
    }
  })

  it('execute() 無效 URL 應拋出 AdError', async () => {
    const input: UpdateAdInput = {
      adId: 'ad-update-001',
      imageUrl: 'not-a-url',
    }

    try {
      await useCase.execute(input)
      expect(true).toBe(false)
    } catch (error) {
      expect((error as { code: string }).code).toBe(AdErrorCode.INVALID_URL)
    }
  })
})
