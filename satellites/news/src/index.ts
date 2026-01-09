import { type Container, ServiceProvider } from '@gravito/core'

export class NewsServiceProvider extends ServiceProvider {
  register(_container: Container): void {
    // 註冊服務
  }

  override boot(): void {
    const core = this.core
    if (!core) {
      return
    }

    core.logger.info('📰 News Satellite is live')

    core.router.prefix('/api/admin/v1/news').group((router) => {
      router.get('/', (ctx) =>
        ctx.json([
          {
            id: 'news-1',
            title: 'Gravito 2.0 正式版發布：邁向全新的插件化時代',
            slug: 'gravito-2-launch',
            category: '產品更新',
            status: 'PUBLISHED',
            publishedAt: '2025-01-10',
          },
          {
            id: 'news-2',
            title: '年度開發者大會 2025 報名開始',
            slug: 'gravito-dev-conf-2025',
            category: '品牌活動',
            status: 'DRAFT',
            publishedAt: null,
          },
        ])
      )
    })

    // 公開 API
    core.router.get('/api/v1/news', (ctx) =>
      ctx.json({
        data: [
          {
            title: 'Gravito 2.0 正式版發布',
            slug: 'gravito-2-launch',
            excerpt: '我們帶來了數百項更新...',
          },
        ],
      })
    )
  }
}
