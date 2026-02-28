import { beforeEach, describe, expect, it } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import type { CreateAdInput } from '../../src/Application/UseCases/CreateAdUseCase'
import { CreateAdUseCase } from '../../src/Application/UseCases/CreateAdUseCase'
import type { IAdRepository } from '../../src/Domain/Contracts/IAdRepository'
import { AdErrorCode } from '../../src/Domain/Errors/AdError'
import { InMemoryAdRepository } from '../dci/helpers/InMemoryAdRepository'
import { createMockCore, daysAgo, daysFromNow } from '../dci/helpers/testHelpers'

describe('CreateAdUseCase', () => {
  let repository: InMemoryAdRepository
  let core: PlanetCore
  let useCase: CreateAdUseCase

  beforeEach(() => {
    repository = new InMemoryAdRepository()
    const mock = createMockCore()
    core = mock.core
    useCase = new CreateAdUseCase(core, repository)
  })

  const validInput: CreateAdInput = {
    slotSlug: 'HOME_HERO',
    title: '新廣告',
    imageUrl: 'https://example.com/image.jpg',
    targetUrl: 'https://example.com/landing',
    weight: 5,
    startsAt: daysAgo(1).toISOString(),
    endsAt: daysFromNow(30).toISOString(),
  }

  it('execute() 應建立廣告並回傳完整 AdDTO', async () => {
    const result = await useCase.execute(validInput)

    expect(result.id).toBeDefined()
    expect(result.title).toBe('新廣告')
    expect(result.slotSlug).toBe('HOME_HERO')
    expect(result.imageUrl).toBe('https://example.com/image.jpg')
    expect(result.targetUrl).toBe('https://example.com/landing')
    expect(result.weight).toBe(5)
    expect(result.startsAt).toBeDefined()
    expect(result.endsAt).toBeDefined()
    expect(result.createdAt).toBeDefined()
    expect(result.updatedAt).toBeDefined()

    // 驗證 Repository 中存在
    const saved = await repository.findById(result.id)
    expect(saved).not.toBeNull()
  })

  it('execute() 預設建立 DRAFT 狀態', async () => {
    const result = await useCase.execute(validInput)

    expect(result.status).toBe('draft')
  })

  it('execute() activateImmediately=true 應回傳 ACTIVE 狀態 DTO', async () => {
    const result = await useCase.execute({
      ...validInput,
      activateImmediately: true,
    })

    expect(result.status).toBe('active')
    expect(result.isDeliverable).toBe(true)
  })

  it('execute() 應正確解析 ISO 8601 日期字串', async () => {
    const startsAt = '2026-06-01T00:00:00.000Z'
    const endsAt = '2026-12-31T23:59:59.000Z'

    const result = await useCase.execute({
      ...validInput,
      startsAt,
      endsAt,
    })

    expect(result.startsAt).toBe(startsAt)
    expect(result.endsAt).toBe(endsAt)
  })

  it('execute() 輸入驗證失敗時應傳播 AdError', async () => {
    // 無效的 slotSlug 格式
    try {
      await useCase.execute({
        ...validInput,
        slotSlug: 'invalid-slug',
      })
      expect(true).toBe(false) // 不應到這裡
    } catch (error) {
      expect((error as { code: string }).code).toBe(AdErrorCode.INVALID_SLOT)
    }

    // 無效的 URL
    try {
      await useCase.execute({
        ...validInput,
        imageUrl: 'not-a-url',
      })
      expect(true).toBe(false)
    } catch (error) {
      expect((error as { code: string }).code).toBe(AdErrorCode.INVALID_URL)
    }
  })
})
