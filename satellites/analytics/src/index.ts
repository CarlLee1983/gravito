import { type Container, ServiceProvider } from '@gravito/core'
import { OrderVolumeResolver } from './Application/Resolvers/OrderVolumeResolver'
import { EventIngestionSubscriber } from './Application/Subscribers/EventIngestionSubscriber'
import { IngestData } from './Application/UseCases/IngestData'
import { ListMetrics } from './Application/UseCases/ListMetrics'
import { LoadDashboard } from './Application/UseCases/LoadDashboard'
import { QueryMetric } from './Application/UseCases/QueryMetric'
import type { IAnalyticsResolver } from './Domain/Contracts/IAnalyticsResolver'
import { DataIngestionContext } from './Domain/DCI/Contexts/DataIngestionContext'
import { MetricName } from './Domain/ValueObjects/MetricName'
import { InMemoryDataPointRepository } from './Infrastructure/Persistence/InMemoryDataPointRepository'
import { InMemoryReportRepository } from './Infrastructure/Persistence/InMemoryReportRepository'

export class AnalyticsServiceProvider extends ServiceProvider {
  private resolvers: Map<string, IAnalyticsResolver> = new Map()

  register(container: Container): void {
    // 註冊 Repositories
    container.singleton('analytics.repo.datapoint', () => new InMemoryDataPointRepository())
    container.singleton('analytics.repo.report', () => new InMemoryReportRepository())

    // 註冊 Contexts
    container.singleton('analytics.ctx.ingestion', () => {
      const dpRepo = container.make('analytics.repo.datapoint') as any
      return new DataIngestionContext(dpRepo)
    })

    // 註冊 UseCases
    container.singleton('analytics.usecase.query-metric', () => {
      const dpRepo = container.make('analytics.repo.datapoint') as any
      const reportRepo = container.make('analytics.repo.report') as any
      return new QueryMetric(dpRepo, reportRepo)
    })

    container.singleton('analytics.usecase.ingest-data', () => {
      const dpRepo = container.make('analytics.repo.datapoint') as any
      return new IngestData(dpRepo)
    })

    container.singleton('analytics.usecase.load-dashboard', () => {
      const dpRepo = container.make('analytics.repo.datapoint') as any
      const reportRepo = container.make('analytics.repo.report') as any
      return new LoadDashboard(dpRepo, reportRepo)
    })

    container.singleton('analytics.usecase.list-metrics', () => {
      const metrics = [MetricName.of('commerce.order_volume'), MetricName.of('commerce.revenue')]
      return new ListMetrics(metrics)
    })

    // 註冊內建解析器
    const dpRepo = container.make('analytics.repo.datapoint') as any
    const reportRepo = container.make('analytics.repo.report') as any
    const resolver = new OrderVolumeResolver(dpRepo, reportRepo)
    this.addResolver(resolver)
  }

  private addResolver(resolver: IAnalyticsResolver) {
    this.resolvers.set(resolver.metricName.fullName, resolver)
  }

  override boot(): void {
    const core = this.core
    if (!core) {
      return
    }

    // 設定路由
    core.router.prefix('/api/admin/v1/analytics').group((router) => {
      router.get('/query', async (ctx) => {
        try {
          const metricName = ctx.req.query('metric')
          const period = ctx.req.query('period') || '7d'

          if (!metricName) {
            return ctx.json({ error: 'Metric is required' }, 400)
          }

          const resolver = this.resolvers.get(metricName)
          if (!resolver) {
            return ctx.json({ error: `Metric ${metricName} not supported` }, 404)
          }

          const result = await resolver.resolve({
            metric: resolver.metricName,
            period: period as any,
            aggregation: (ctx.req.query('aggregation') as any) || 'SUM',
          } as any)
          return ctx.json(result)
        } catch (error) {
          core.logger.error('Query error', error)
          return ctx.json({ error: 'Query failed' }, 500)
        }
      })

      router.get('/metrics', (ctx) => {
        return ctx.json(Array.from(this.resolvers.keys()))
      })

      router.post('/ingest', async (ctx) => {
        try {
          const useCase = core.container.make('analytics.usecase.ingest-data') as any
          const body = (await ctx.req.json()) as any
          const result = await useCase.execute(body)
          return ctx.json(result)
        } catch (error) {
          core.logger.error('Ingest error', error)
          return ctx.json({ error: 'Ingest failed' }, 500)
        }
      })
    })

    // 訂閱跨域事件
    const ingestionCtx = core.container.make('analytics.ctx.ingestion') as any
    const subscriber = new EventIngestionSubscriber(ingestionCtx)

    core.hooks.addAction('commerce:order-placed', (p: any) => subscriber.onOrderPlaced(p))
    core.hooks.addAction('commerce:order-confirmed', (p: any) => subscriber.onOrderConfirmed(p))
    core.hooks.addAction('commerce:order-refunded', (p: any) => subscriber.onOrderRefunded(p))
    core.hooks.addAction('membership:registered', (p: any) => subscriber.onMemberRegistered(p))
    core.hooks.addAction('membership:authenticated', (p: any) =>
      subscriber.onMemberAuthenticated(p)
    )
    core.hooks.addAction('catalog:product-created', (p: any) => subscriber.onProductCreated(p))
    core.hooks.addAction('payment:succeeded', (p: any) => subscriber.onPaymentSucceeded(p))

    core.logger.info('📊 Analytics Framework booted with DDD+DCI architecture')
  }
}

export type { AnalyticsReportDTO, DataPointDTO } from './Application/DTOs/AnalyticsDTO'
export { AnalyticsMapper } from './Application/DTOs/AnalyticsDTO'
// 匯出公開 API
export { OrderVolumeResolver } from './Application/Resolvers/OrderVolumeResolver'
export { IngestData } from './Application/UseCases/IngestData'
export { ListMetrics } from './Application/UseCases/ListMetrics'
export { LoadDashboard } from './Application/UseCases/LoadDashboard'
export { QueryMetric, type QueryMetricInput } from './Application/UseCases/QueryMetric'
