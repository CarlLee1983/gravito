import { beforeEach, describe, expect, it } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { AdManagementContext } from '../../../src/Domain/DCI/Contexts/AdManagementContext'
import { AdStatus } from '../../../src/Domain/Entities/Advertisement'
import { AdErrorCode } from '../../../src/Domain/Errors/AdError'
import { AdSchedule } from '../../../src/Domain/ValueObjects/AdSchedule'
import { InMemoryAdRepository } from '../helpers/InMemoryAdRepository'
import {
  createMockCore,
  createTestAd,
  daysAgo,
  daysFromNow,
  type HookCall,
} from '../helpers/testHelpers'

describe('AdManagementContext', () => {
  let repo: InMemoryAdRepository
  let core: PlanetCore
  let hookCalls: HookCall[]

  beforeEach(() => {
    repo = new InMemoryAdRepository()
    const mock = createMockCore()
    core = mock.core
    hookCalls = mock.hookCalls
  })

  describe('action=activate', () => {
    it('應啟用廣告並保存', async () => {
      const ad = createTestAd({ id: 'ad-draft' })
      await repo.save(ad)
      const ctx = new AdManagementContext(repo, core)
      const output = await ctx.execute({ adId: 'ad-draft', action: 'activate' })
      expect(output.status).toBe('active')
      expect(output.action).toBe('activate')
      const saved = await repo.findById('ad-draft')
      expect(saved!.status).toBe(AdStatus.ACTIVE)
    })

    it('應觸發 ad:activated hook', async () => {
      const ad = createTestAd({ id: 'ad-hook' })
      await repo.save(ad)
      const ctx = new AdManagementContext(repo, core)
      await ctx.execute({ adId: 'ad-hook', action: 'activate' })
      const hook = hookCalls.find((h) => h.name === 'ad:activated')
      expect(hook).toBeDefined()
      expect((hook!.data as { adId: string }).adId).toBe('ad-hook')
    })

    it('排程過期時應拋出錯誤', async () => {
      const ad = createTestAd({
        id: 'ad-expired',
        schedule: AdSchedule.of(daysAgo(10), daysAgo(1)),
      })
      await repo.save(ad)
      const ctx = new AdManagementContext(repo, core)
      try {
        await ctx.execute({ adId: 'ad-expired', action: 'activate' })
        expect.unreachable('應拋出錯誤')
      } catch (e: unknown) {
        expect((e as { code: string }).code).toBe(AdErrorCode.AD_EXPIRED)
      }
    })
  })

  describe('action=pause', () => {
    it('應暫停廣告並保存', async () => {
      const ad = createTestAd({ id: 'ad-active', status: AdStatus.ACTIVE })
      await repo.save(ad)
      const ctx = new AdManagementContext(repo, core)
      const output = await ctx.execute({ adId: 'ad-active', action: 'pause' })
      expect(output.status).toBe('paused')
      expect(output.action).toBe('pause')
      const saved = await repo.findById('ad-active')
      expect(saved!.status).toBe(AdStatus.PAUSED)
    })

    it('應觸發 ad:paused hook', async () => {
      const ad = createTestAd({ id: 'ad-pause', status: AdStatus.ACTIVE })
      await repo.save(ad)
      const ctx = new AdManagementContext(repo, core)
      await ctx.execute({ adId: 'ad-pause', action: 'pause' })
      const hook = hookCalls.find((h) => h.name === 'ad:paused')
      expect(hook).toBeDefined()
      expect((hook!.data as { adId: string }).adId).toBe('ad-pause')
    })

    it('DRAFT 狀態時應拋出錯誤', async () => {
      const ad = createTestAd({ id: 'ad-draft' })
      await repo.save(ad)
      const ctx = new AdManagementContext(repo, core)
      try {
        await ctx.execute({ adId: 'ad-draft', action: 'pause' })
        expect.unreachable('應拋出錯誤')
      } catch (e: unknown) {
        expect((e as { code: string }).code).toBe(AdErrorCode.INVALID_STATUS_TRANSITION)
      }
    })
  })

  describe('action=update', () => {
    it('應更新廣告屬性', async () => {
      const ad = createTestAd({ id: 'ad-update' })
      await repo.save(ad)
      const ctx = new AdManagementContext(repo, core)
      const output = await ctx.execute({
        adId: 'ad-update',
        action: 'update',
        updateData: { title: '更新後的標題', imageUrl: 'https://example.com/new.jpg' },
      })
      expect(output.action).toBe('update')
      const saved = await repo.findById('ad-update')
      expect(saved!.title).toBe('更新後的標題')
      expect(saved!.imageUrl).toBe('https://example.com/new.jpg')
    })

    it('應觸發 ad:updated hook', async () => {
      const ad = createTestAd({ id: 'ad-upd-hook' })
      await repo.save(ad)
      const ctx = new AdManagementContext(repo, core)
      await ctx.execute({
        adId: 'ad-upd-hook',
        action: 'update',
        updateData: { title: '新標題' },
      })
      const hook = hookCalls.find((h) => h.name === 'ad:updated')
      expect(hook).toBeDefined()
      expect((hook!.data as { adId: string }).adId).toBe('ad-upd-hook')
    })
  })

  describe('action=delete', () => {
    it('應刪除廣告', async () => {
      const ad = createTestAd({ id: 'ad-delete' })
      await repo.save(ad)
      const ctx = new AdManagementContext(repo, core)
      const output = await ctx.execute({ adId: 'ad-delete', action: 'delete' })
      expect(output.action).toBe('delete')
      const saved = await repo.findById('ad-delete')
      expect(saved).toBeNull()
    })

    it('應觸發 ad:deleted hook', async () => {
      const ad = createTestAd({ id: 'ad-del-hook' })
      await repo.save(ad)
      const ctx = new AdManagementContext(repo, core)
      await ctx.execute({ adId: 'ad-del-hook', action: 'delete' })
      const hook = hookCalls.find((h) => h.name === 'ad:deleted')
      expect(hook).toBeDefined()
      expect((hook!.data as { adId: string }).adId).toBe('ad-del-hook')
    })
  })

  describe('AD_NOT_FOUND', () => {
    it('廣告不存在時應拋出 AD_NOT_FOUND', async () => {
      const ctx = new AdManagementContext(repo, core)
      try {
        await ctx.execute({ adId: 'non-existent', action: 'activate' })
        expect.unreachable('應拋出錯誤')
      } catch (e: unknown) {
        expect((e as { code: string }).code).toBe(AdErrorCode.AD_NOT_FOUND)
      }
    })

    it('所有 action 廣告不存在都應拋出 AD_NOT_FOUND', async () => {
      const ctx = new AdManagementContext(repo, core)
      for (const action of ['activate', 'pause', 'update', 'delete'] as const) {
        try {
          await ctx.execute({ adId: 'missing', action })
          expect.unreachable(`action=${action} 應拋出錯誤`)
        } catch (e: unknown) {
          expect((e as { code: string }).code).toBe(AdErrorCode.AD_NOT_FOUND)
        }
      }
    })
  })
})
