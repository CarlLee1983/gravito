import { type Container, ServiceProvider } from '@gravito/core'
import { ListMetrics } from './Application/UseCases/ListMetrics'
import { QueryMetric } from './Application/UseCases/QueryMetric'
import { MetricQueryContext } from './Domain/DCI/Contexts/MetricQueryContext'
import { ResolverManagementContext } from './Domain/DCI/Contexts/ResolverManagementContext'
import { OrderVolumeResolver } from './Infrastructure/Resolvers/OrderVolumeResolver'

export class AnalyticsServiceProvider extends ServiceProvider {
  private managementContext: ResolverManagementContext = new ResolverManagementContext([
    new OrderVolumeResolver(),
  ])

  private queryMetricUseCase: QueryMetric
  private listMetricsUseCase: ListMetrics

  constructor() {
    super()
    const queryContext = new MetricQueryContext(this.managementContext)
    this.queryMetricUseCase = new QueryMetric(queryContext)
    this.listMetricsUseCase = new ListMetrics(this.managementContext)
  }

  register(_container: Container): void {
    // 註冊內建 resolver
    // 初始化已在建構子中完成
  }

  override boot(): void {
    const core = this.core
    if (!core) {
      return
    }

    core.logger.info('📊 Analytics Framework is ready for data ingestion')

    core.router.prefix('/api/admin/v1/analytics').group((router) => {
      router.get('/query', async (ctx) => {
        try {
          const metric = ctx.req.query('metric')
          const period = ctx.req.query('period')

          if (!metric) {
            return ctx.json({ error: 'Metric is required' }, 400)
          }

          const result = await this.queryMetricUseCase.execute({
            metric,
            period,
          })

          return ctx.json(result)
        } catch (error) {
          if (error instanceof Error) {
            const statusCode =
              typeof error === 'object' && error !== null && 'statusCode' in error
                ? (error.statusCode as number)
                : 500
            return ctx.json({ error: error.message }, statusCode)
          }
          return ctx.json({ error: 'Unknown error' }, 500)
        }
      })

      // 讓開發者查詢目前有哪些可用的指標
      router.get('/metrics', (ctx) => {
        const metrics = this.listMetricsUseCase.execute()
        return ctx.json(metrics)
      })
    })
  }

  /**
   * 公開 API - 讓外部程式動態註冊新 resolver
   */
  registerResolver(resolver: Parameters<ResolverManagementContext['registerResolver']>[0]): void {
    this.managementContext.registerResolver(resolver)
  }
}
