import { type Container, ServiceProvider } from '@gravito/core'
import { OrderVolumeResolver } from './Application/Resolvers/OrderVolumeResolver'
import type { IAnalyticsResolver } from './Domain/Contracts/IAnalyticsResolver'

export class AnalyticsServiceProvider extends ServiceProvider {
  private resolvers: Map<string, IAnalyticsResolver> = new Map()

  register(_container: Container): void {
    // 註冊內建解析器
    this.addResolver(new OrderVolumeResolver())
  }

  private addResolver(resolver: IAnalyticsResolver) {
    this.resolvers.set(resolver.metric, resolver)
  }

  override boot(): void {
    const core = this.core
    if (!core) {
      return
    }

    core.logger.info('📊 Analytics Framework is ready for data ingestion')

    core.router.prefix('/api/admin/v1/analytics').group((router) => {
      router.get('/query', async (ctx) => {
        const metric = ctx.req.query('metric')
        const period = (ctx.req.query('period') as any) || '7d'

        if (!metric) {
          return ctx.json({ error: 'Metric is required' }, 400)
        }

        const resolver = this.resolvers.get(metric)
        if (!resolver) {
          return ctx.json({ error: `Metric ${metric} not supported` }, 404)
        }

        const result = await resolver.resolve({ metric, period })
        return ctx.json(result)
      })

      // 讓開發者查詢目前有哪些可用的指標
      router.get('/metrics', (ctx) => {
        return ctx.json(Array.from(this.resolvers.keys()))
      })
    })
  }
}
