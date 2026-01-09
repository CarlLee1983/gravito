import { type Container, ServiceProvider } from '@gravito/core'

export class AnnouncementServiceProvider extends ServiceProvider {
  register(_container: Container): void {
    // 注入解析器或 Repository
  }

  override boot(): void {
    const core = this.core
    if (!core) {
      return
    }

    core.logger.info('📢 Announcement Satellite initialized')

    core.router.prefix('/api/admin/v1/announcements').group((router) => {
      router.get('/', (ctx) =>
        ctx.json([
          {
            id: '1',
            title: '春季購物節開跑',
            type: 'PROMOTION',
            status: 'PUBLISHED',
            startsAt: '2025-03-01',
            endsAt: '2025-03-31',
            priority: 10,
          },
          {
            id: '2',
            title: '系統例行維護通知',
            type: 'MAINTENANCE',
            status: 'DRAFT',
            startsAt: '2025-04-15',
            priority: 100,
          },
        ])
      )

      router.post('/', async (ctx) => {
        const body = await ctx.req.json<Record<string, any>>()
        return ctx.json({ message: 'Created', id: 'new-id', ...body }, 201)
      })
    })

    // 公開 API: 客戶端獲取公告
    core.router.get('/api/v1/announcements/active', (ctx) =>
      ctx.json([
        {
          id: '1',
          title: '春季購物節開跑',
          content: '全站 8 折起...',
          type: 'PROMOTION',
          displayType: 'BANNER',
        },
      ])
    )
  }
}
