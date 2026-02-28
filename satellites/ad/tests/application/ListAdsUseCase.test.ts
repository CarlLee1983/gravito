import { beforeEach, describe, expect, it } from 'bun:test'
import type { ListAdsInput, ListAdsOutput } from '../../src/Application/UseCases/ListAdsUseCase'
import { ListAdsUseCase } from '../../src/Application/UseCases/ListAdsUseCase'
import { AdStatus } from '../../src/Domain/Entities/Advertisement'
import { SlotSlug } from '../../src/Domain/ValueObjects/SlotSlug'
import { InMemoryAdRepository } from '../dci/helpers/InMemoryAdRepository'
import { createTestAd } from '../dci/helpers/testHelpers'

describe('ListAdsUseCase', () => {
  let repository: InMemoryAdRepository
  let useCase: ListAdsUseCase

  beforeEach(async () => {
    repository = new InMemoryAdRepository()
    useCase = new ListAdsUseCase(repository)

    // 預先建立多個測試廣告
    await repository.save(
      createTestAd({
        id: 'ad-list-1',
        title: '廣告一',
        status: AdStatus.ACTIVE,
        slotSlug: SlotSlug.of('HOME_HERO'),
      })
    )
    await repository.save(
      createTestAd({
        id: 'ad-list-2',
        title: '廣告二',
        status: AdStatus.DRAFT,
        slotSlug: SlotSlug.of('HOME_BANNER'),
      })
    )
    await repository.save(
      createTestAd({
        id: 'ad-list-3',
        title: '廣告三',
        status: AdStatus.ACTIVE,
        slotSlug: SlotSlug.of('HOME_HERO'),
      })
    )
    await repository.save(
      createTestAd({
        id: 'ad-list-4',
        title: '廣告四',
        status: AdStatus.PAUSED,
        slotSlug: SlotSlug.of('PRODUCT_SIDEBAR'),
      })
    )
  })

  it('execute() 無過濾應回傳所有廣告 DTO', async () => {
    const result = await useCase.execute({})

    expect(result.items).toHaveLength(4)
    expect(result.total).toBe(4)
    expect(result.limit).toBe(20)
    expect(result.offset).toBe(0)

    // 驗證 DTO 結構完整
    for (const item of result.items) {
      expect(item.id).toBeDefined()
      expect(item.title).toBeDefined()
      expect(item.slotSlug).toBeDefined()
      expect(item.status).toBeDefined()
    }
  })

  it('execute() 按 status 過濾', async () => {
    const result = await useCase.execute({ status: 'active' })

    expect(result.items).toHaveLength(2)
    expect(result.total).toBe(2)
    for (const item of result.items) {
      expect(item.status).toBe('active')
    }
  })

  it('execute() 按 slotSlug 過濾', async () => {
    const result = await useCase.execute({ slotSlug: 'HOME_HERO' })

    expect(result.items).toHaveLength(2)
    expect(result.total).toBe(2)
    for (const item of result.items) {
      expect(item.slotSlug).toBe('HOME_HERO')
    }
  })

  it('execute() 分頁 limit/offset 應正確運作', async () => {
    // 取第二頁，每頁 2 筆
    const result = await useCase.execute({ limit: 2, offset: 2 })

    expect(result.items).toHaveLength(2)
    expect(result.total).toBe(4) // 總數仍為 4
    expect(result.limit).toBe(2)
    expect(result.offset).toBe(2)
  })

  it('execute() 無結果應回傳空陣列', async () => {
    const result = await useCase.execute({ status: 'active', slotSlug: 'CHECKOUT_BOTTOM' })

    expect(result.items).toHaveLength(0)
    expect(result.total).toBe(0)
    expect(result.limit).toBe(20)
    expect(result.offset).toBe(0)
  })
})
