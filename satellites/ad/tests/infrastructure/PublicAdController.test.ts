import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { AdError, AdErrorCode } from '../../src/Domain/Errors/AdError'
import { PublicAdController } from '../../src/Infrastructure/Http/Controllers/PublicAdController'

// -- Mock UseCase --

function createMockDeliverUseCase() {
  return {
    execute: mock(() =>
      Promise.resolve({
        ads: [
          {
            id: 'ad-001',
            title: '促銷廣告',
            imageUrl: 'https://example.com/image.jpg',
            targetUrl: 'https://example.com/landing',
            slotSlug: 'HOME_HERO',
            weight: 5,
          },
        ],
        totalAvailable: 3,
      })
    ),
  }
}

// -- Mock Hono Context --

function createMockContext(overrides?: {
  body?: Record<string, unknown>
  params?: Record<string, string>
  query?: Record<string, string>
}) {
  const responses: Array<{ data: unknown; status: number }> = []

  return {
    req: {
      json: () => Promise.resolve(overrides?.body ?? {}),
      param: (name: string) => overrides?.params?.[name] ?? '',
      query: (name: string) => overrides?.query?.[name],
    },
    json: (data: unknown, status?: number) => {
      const response = { data, status: status ?? 200 }
      responses.push(response)
      return response
    },
    responses,
  }
}

// =====================================================
// PublicAdController
// =====================================================

describe('PublicAdController', () => {
  let deliverUseCase: ReturnType<typeof createMockDeliverUseCase>
  let controller: PublicAdController

  beforeEach(() => {
    deliverUseCase = createMockDeliverUseCase()
    controller = new PublicAdController(deliverUseCase as any)
  })

  // -- deliver --

  describe('deliver', () => {
    it('投放成功時回傳 200 和廣告資料', async () => {
      const ctx = createMockContext({
        body: { slotSlug: 'HOME_HERO', count: 1 },
      })

      await controller.deliver(ctx as any)

      expect(ctx.responses[0].status).toBe(200)
      expect((ctx.responses[0].data as any).success).toBe(true)
      expect((ctx.responses[0].data as any).data.ads).toHaveLength(1)
      expect((ctx.responses[0].data as any).data.totalAvailable).toBe(3)
    })

    it('驗證失敗時回傳 400', async () => {
      const ctx = createMockContext({
        body: { count: 15 }, // 缺少 slotSlug，count 超過上限
      })

      await controller.deliver(ctx as any)

      expect(ctx.responses[0].status).toBe(400)
      expect((ctx.responses[0].data as any).success).toBe(false)
    })

    it('版位無活躍廣告時回傳 404', async () => {
      deliverUseCase.execute = mock(() => {
        throw AdError.noActiveAds('EMPTY_SLOT')
      })

      const ctx = createMockContext({
        body: { slotSlug: 'EMPTY_SLOT' },
      })

      await controller.deliver(ctx as any)

      expect(ctx.responses[0].status).toBe(404)
      expect((ctx.responses[0].data as any).error.code).toBe(AdErrorCode.NO_ACTIVE_ADS)
    })
  })

  // -- deliverBySlot --

  describe('deliverBySlot', () => {
    it('根據路由參數投放廣告', async () => {
      const ctx = createMockContext({
        params: { slotSlug: 'HOME_HERO' },
      })

      await controller.deliverBySlot(ctx as any)

      expect(ctx.responses[0].status).toBe(200)
      expect((ctx.responses[0].data as any).success).toBe(true)
      expect(deliverUseCase.execute).toHaveBeenCalled()
    })

    it('支援 count 查詢參數', async () => {
      const ctx = createMockContext({
        params: { slotSlug: 'HOME_HERO' },
        query: { count: '3' },
      })

      await controller.deliverBySlot(ctx as any)

      expect(ctx.responses[0].status).toBe(200)
      // 確認 UseCase 收到正確的 count
      const callArgs = deliverUseCase.execute.mock.calls[0][0]
      expect(callArgs.slotSlug).toBe('HOME_HERO')
    })

    it('無效的版位時回傳 400', async () => {
      deliverUseCase.execute = mock(() => {
        throw AdError.invalidSlot('bad-slot')
      })

      const ctx = createMockContext({
        params: { slotSlug: 'bad-slot' },
      })

      await controller.deliverBySlot(ctx as any)

      expect(ctx.responses[0].status).toBe(400)
    })
  })
})
