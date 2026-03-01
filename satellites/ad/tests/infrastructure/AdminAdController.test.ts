import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { AdError, AdErrorCode } from '../../src/Domain/Errors/AdError'
import { AdminAdController } from '../../src/Infrastructure/Http/Controllers/AdminAdController'

// -- Mock UseCase 工廠 --

function createMockUseCases() {
  return {
    createAd: { execute: mock(() => Promise.resolve(mockAdDTO())) },
    listAds: { execute: mock(() => Promise.resolve(mockListResult())) },
    updateAd: { execute: mock(() => Promise.resolve(mockAdDTO())) },
    toggleAdStatus: { execute: mock(() => Promise.resolve(mockAdDTO())) },
    deleteAd: { execute: mock(() => Promise.resolve({ id: 'ad-001', message: '已刪除' })) },
  }
}

function createMockRepo() {
  return {
    findById: mock(() => Promise.resolve(null)),
  }
}

// -- Mock 資料 --

function mockAdDTO() {
  return {
    id: 'ad-001',
    slotSlug: 'HOME_HERO',
    title: '測試廣告',
    imageUrl: 'https://example.com/image.jpg',
    targetUrl: 'https://example.com/landing',
    weight: 5,
    status: 'draft',
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: '2026-12-31T23:59:59.000Z',
    isDeliverable: false,
    daysRemaining: 365,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function mockListResult() {
  return {
    items: [mockAdDTO()],
    total: 1,
    limit: 20,
    offset: 0,
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
      queries: () => overrides?.query ?? {},
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
// AdminAdController
// =====================================================

describe('AdminAdController', () => {
  let useCases: ReturnType<typeof createMockUseCases>
  let mockRepo: ReturnType<typeof createMockRepo>
  let controller: AdminAdController

  beforeEach(() => {
    useCases = createMockUseCases()
    mockRepo = createMockRepo()
    controller = new AdminAdController(
      useCases.createAd as any,
      useCases.listAds as any,
      useCases.updateAd as any,
      useCases.toggleAdStatus as any,
      useCases.deleteAd as any,
      mockRepo as any
    )
  })

  // -- create --

  describe('create', () => {
    it('建立成功時回傳 201 和廣告資料', async () => {
      const ctx = createMockContext({
        body: {
          slotSlug: 'HOME_HERO',
          title: '新廣告',
          imageUrl: 'https://example.com/image.jpg',
          targetUrl: 'https://example.com/landing',
          weight: 5,
          startsAt: '2026-01-01T00:00:00.000Z',
          endsAt: '2026-12-31T23:59:59.000Z',
        },
      })

      await controller.create(ctx as any)

      expect(ctx.responses[0].status).toBe(201)
      expect((ctx.responses[0].data as any).success).toBe(true)
      expect((ctx.responses[0].data as any).data.id).toBe('ad-001')
    })

    it('驗證失敗時回傳 400', async () => {
      const ctx = createMockContext({
        body: { title: '' }, // 缺少必要欄位
      })

      await controller.create(ctx as any)

      expect(ctx.responses[0].status).toBe(400)
      expect((ctx.responses[0].data as any).success).toBe(false)
    })

    it('AdError 時回傳對應的 HTTP 狀態碼', async () => {
      useCases.createAd.execute = mock(() => {
        throw AdError.invalidSlot('BAD')
      })

      const ctx = createMockContext({
        body: {
          slotSlug: 'BAD',
          title: '廣告',
          imageUrl: 'https://example.com/image.jpg',
          targetUrl: 'https://example.com/landing',
          weight: 5,
          startsAt: '2026-01-01T00:00:00.000Z',
          endsAt: '2026-12-31T23:59:59.000Z',
        },
      })

      await controller.create(ctx as any)

      expect(ctx.responses[0].status).toBe(400)
      expect((ctx.responses[0].data as any).error.code).toBe(AdErrorCode.INVALID_SLOT)
    })
  })

  // -- list --

  describe('list', () => {
    it('回傳廣告列表和分頁資訊', async () => {
      const ctx = createMockContext({ query: {} })

      await controller.list(ctx as any)

      expect(ctx.responses[0].status).toBe(200)
      expect((ctx.responses[0].data as any).success).toBe(true)
      expect((ctx.responses[0].data as any).data.items).toHaveLength(1)
      expect((ctx.responses[0].data as any).data.total).toBe(1)
    })

    it('支援查詢參數篩選', async () => {
      const ctx = createMockContext({
        query: { status: 'active', slotSlug: 'HOME_HERO', limit: '10', offset: '0' },
      })

      await controller.list(ctx as any)

      expect(useCases.listAds.execute).toHaveBeenCalled()
      expect(ctx.responses[0].status).toBe(200)
    })
  })

  // -- show --

  describe('show', () => {
    it('找到廣告時回傳 200', async () => {
      // 需要回傳一個 Advertisement 實體
      const { createTestAd } = await import('../dci/helpers/testHelpers')
      const ad = createTestAd()
      mockRepo.findById = mock(() => Promise.resolve(ad))

      const ctx = createMockContext({ params: { id: 'ad-001' } })

      await controller.show(ctx as any)

      expect(ctx.responses[0].status).toBe(200)
      expect((ctx.responses[0].data as any).success).toBe(true)
    })

    it('找不到廣告時回傳 404', async () => {
      mockRepo.findById = mock(() => Promise.resolve(null))

      const ctx = createMockContext({ params: { id: 'nonexistent' } })

      await controller.show(ctx as any)

      expect(ctx.responses[0].status).toBe(404)
      expect((ctx.responses[0].data as any).success).toBe(false)
    })
  })

  // -- update --

  describe('update', () => {
    it('更新成功時回傳 200', async () => {
      const ctx = createMockContext({
        params: { id: 'ad-001' },
        body: { title: '更新後的標題' },
      })

      await controller.update(ctx as any)

      expect(ctx.responses[0].status).toBe(200)
      expect((ctx.responses[0].data as any).success).toBe(true)
    })

    it('AdError.adNotFound 時回傳 404', async () => {
      useCases.updateAd.execute = mock(() => {
        throw AdError.adNotFound('nonexistent')
      })

      const ctx = createMockContext({
        params: { id: 'nonexistent' },
        body: { title: '更新' },
      })

      await controller.update(ctx as any)

      expect(ctx.responses[0].status).toBe(404)
    })
  })

  // -- toggleStatus --

  describe('toggleStatus', () => {
    it('切換狀態成功時回傳 200', async () => {
      const ctx = createMockContext({
        params: { id: 'ad-001' },
        body: { action: 'activate' },
      })

      await controller.toggleStatus(ctx as any)

      expect(ctx.responses[0].status).toBe(200)
      expect((ctx.responses[0].data as any).success).toBe(true)
    })

    it('無效的 action 時回傳 400', async () => {
      const ctx = createMockContext({
        params: { id: 'ad-001' },
        body: { action: 'invalid' },
      })

      await controller.toggleStatus(ctx as any)

      expect(ctx.responses[0].status).toBe(400)
    })
  })

  // -- destroy --

  describe('destroy', () => {
    it('刪除成功時回傳 200', async () => {
      const ctx = createMockContext({ params: { id: 'ad-001' } })

      await controller.destroy(ctx as any)

      expect(ctx.responses[0].status).toBe(200)
      expect((ctx.responses[0].data as any).success).toBe(true)
    })

    it('刪除不存在的廣告時回傳 404', async () => {
      useCases.deleteAd.execute = mock(() => {
        throw AdError.adNotFound('nonexistent')
      })

      const ctx = createMockContext({ params: { id: 'nonexistent' } })

      await controller.destroy(ctx as any)

      expect(ctx.responses[0].status).toBe(404)
    })
  })
})
