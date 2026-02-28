import { beforeEach, describe, expect, it } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import type { AdCreationInput } from '../../../src/Domain/DCI/Contexts/AdCreationContext'
import { AdCreationContext } from '../../../src/Domain/DCI/Contexts/AdCreationContext'
import { AdStatus } from '../../../src/Domain/Entities/Advertisement'
import { AdErrorCode } from '../../../src/Domain/Errors/AdError'
import { InMemoryAdRepository } from '../helpers/InMemoryAdRepository'
import { createMockCore, daysAgo, daysFromNow, type HookCall } from '../helpers/testHelpers'

describe('AdCreationContext', () => {
  let repo: InMemoryAdRepository
  let core: PlanetCore
  let hookCalls: HookCall[]

  const validInput: AdCreationInput = {
    slotSlug: 'HOME_HERO',
    title: '夏季大促銷',
    imageUrl: 'https://example.com/summer.jpg',
    targetUrl: 'https://example.com/summer-sale',
    weight: 5,
    startsAt: daysAgo(1),
    endsAt: daysFromNow(30),
  }

  beforeEach(() => {
    repo = new InMemoryAdRepository()
    const mock = createMockCore()
    core = mock.core
    hookCalls = mock.hookCalls
  })

  it('execute() 應建立 DRAFT 狀態廣告', async () => {
    const ctx = new AdCreationContext(repo, core)

    const output = await ctx.execute(validInput)

    expect(output.status).toBe('draft')
  })

  it('execute() 應正確設定所有屬性', async () => {
    const ctx = new AdCreationContext(repo, core)

    const output = await ctx.execute(validInput)

    expect(output.id).toBeDefined()
    expect(output.id.length).toBeGreaterThan(0)
    expect(output.title).toBe('夏季大促銷')
    expect(output.createdAt).toBeDefined()
  })

  it('execute() 應保存到 Repository', async () => {
    const ctx = new AdCreationContext(repo, core)

    const output = await ctx.execute(validInput)

    const saved = await repo.findById(output.id)
    expect(saved).not.toBeNull()
    expect(saved!.title).toBe('夏季大促銷')
    expect(saved!.slotSlug.value).toBe('HOME_HERO')
    expect(saved!.weight.value).toBe(5)
  })

  it('execute() activateImmediately=true 且排程活躍時應建立 ACTIVE 狀態', async () => {
    const ctx = new AdCreationContext(repo, core)

    const output = await ctx.execute({
      ...validInput,
      activateImmediately: true,
    })

    expect(output.status).toBe('active')
    const saved = await repo.findById(output.id)
    expect(saved!.status).toBe(AdStatus.ACTIVE)
  })

  it('execute() activateImmediately=true 但排程已過期時應拋出錯誤', async () => {
    const ctx = new AdCreationContext(repo, core)

    try {
      await ctx.execute({
        ...validInput,
        startsAt: daysAgo(10),
        endsAt: daysAgo(1),
        activateImmediately: true,
      })
      expect.unreachable('應拋出錯誤')
    } catch (e: unknown) {
      const err = e as { code: string }
      expect(err.code).toBe(AdErrorCode.AD_EXPIRED)
    }
  })

  it('execute() 無效 SlotSlug 應拋出 AdError', async () => {
    const ctx = new AdCreationContext(repo, core)

    try {
      await ctx.execute({
        ...validInput,
        slotSlug: 'invalid-slug',
      })
      expect.unreachable('應拋出錯誤')
    } catch (e: unknown) {
      const err = e as { code: string }
      expect(err.code).toBe(AdErrorCode.INVALID_SLOT)
    }
  })

  it('execute() 無效權重應拋出 AdError', async () => {
    const ctx = new AdCreationContext(repo, core)

    try {
      await ctx.execute({
        ...validInput,
        weight: 0,
      })
      expect.unreachable('應拋出錯誤')
    } catch (e: unknown) {
      const err = e as { code: string }
      expect(err.code).toBe(AdErrorCode.INVALID_WEIGHT)
    }
  })

  it('execute() 應觸發 ad:created hook', async () => {
    const ctx = new AdCreationContext(repo, core)

    const output = await ctx.execute(validInput)

    const createdHook = hookCalls.find((h) => h.name === 'ad:created')
    expect(createdHook).toBeDefined()
    expect((createdHook!.data as { adId: string }).adId).toBe(output.id)
  })

  it('execute() activateImmediately=true 時應觸發 ad:activated hook', async () => {
    const ctx = new AdCreationContext(repo, core)

    const output = await ctx.execute({
      ...validInput,
      activateImmediately: true,
    })

    const activatedHook = hookCalls.find((h) => h.name === 'ad:activated')
    expect(activatedHook).toBeDefined()
    expect((activatedHook!.data as { adId: string }).adId).toBe(output.id)
  })
})
