import { type Container, ServiceProvider } from '@gravito/core'

export class AdServiceProvider extends ServiceProvider {
  register(_container: Container): void {
    // 註冊服務
  }

  override boot(): void {
    const core = this.core
    if (!core) {
      return
    }

    core.logger.info('🎯 Ad Satellite is calculating campaign weights')

    core.router.prefix('/api/admin/v1/ads').group((router) => {
      router.get('/', (ctx) =>
        ctx.json([
          {
            id: 'ad-1',
            title: '夏季大促銷',
            slotSlug: 'HOME_HERO',
            imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da',
            status: 'ACTIVE',
            weight: 5,
            startsAt: '2025-06-01',
            endsAt: '2025-08-31',
          },
          {
            id: 'ad-2',
            title: '免運優惠中',
            slotSlug: 'HOME_HERO',
            imageUrl: 'https://images.unsplash.com/photo-1557821552-17105176677c',
            status: 'ACTIVE',
            weight: 10,
            startsAt: '2025-01-01',
            endsAt: '2025-12-31',
          },
        ])
      )
    })

    // 公開 API: 根據版位獲取隨機廣告
    core.router.get('/api/v1/ads/:slot', (ctx) => {
      const slot = ctx.req.param('slot')
      // 模擬隨機投放邏輯 (這裡會根據 Weight 進行隨機抽選)
      return ctx.json({
        id: 'ad-picked',
        title: '隨機推選廣告',
        imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da',
        targetUrl: '/promotions/summer-sale',
        slot,
      })
    })
  }
}
