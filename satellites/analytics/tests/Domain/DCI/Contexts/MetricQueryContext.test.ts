import { describe, expect, it } from 'bun:test'
import type {
  IDataPointRepository,
  IReportRepository,
} from '../../../../src/Domain/Contracts/IAnalyticsRepository'
import { MetricQueryContext } from '../../../../src/Domain/DCI/Contexts/MetricQueryContext'
import type { AnalyticsReport } from '../../../../src/Domain/Entities/AnalyticsReport'
import type { DataPoint } from '../../../../src/Domain/Entities/DataPoint'
import { DataPoint as DataPointClass } from '../../../../src/Domain/Entities/DataPoint'
import { DataPointValue } from '../../../../src/Domain/ValueObjects/DataPointValue'
import { MetricName } from '../../../../src/Domain/ValueObjects/MetricName'

class InMemoryDataPointRepository implements IDataPointRepository {
  private dataPoints: DataPoint[] = []

  async save(dataPoint: DataPoint): Promise<void> {
    this.dataPoints.push(dataPoint)
  }

  async saveBatch(dataPoints: DataPoint[]): Promise<void> {
    this.dataPoints.push(...dataPoints)
  }

  async findByMetric(metricName: MetricName): Promise<DataPoint[]> {
    return this.dataPoints.filter((dp) => dp.metricName.equals(metricName))
  }

  async findByMetricAndDimensions(): Promise<DataPoint[]> {
    return this.dataPoints
  }

  async count(): Promise<number> {
    return this.dataPoints.length
  }

  async deleteByMetric() {}
}

class InMemoryReportRepository implements IReportRepository {
  private reports: Map<string, AnalyticsReport> = new Map()

  async save(report: AnalyticsReport): Promise<void> {
    this.reports.set(report.id, report)
  }

  async findById(id: string): Promise<AnalyticsReport | null> {
    return this.reports.get(id) ?? null
  }

  async findRecent(): Promise<AnalyticsReport[]> {
    return Array.from(this.reports.values())
  }

  async delete(id: string): Promise<void> {
    this.reports.delete(id)
  }
}

describe('MetricQueryContext', () => {
  it('queryMetric() 查詢指標', async () => {
    const dpRepo = new InMemoryDataPointRepository()
    const reportRepo = new InMemoryReportRepository()
    const ctx = new MetricQueryContext(dpRepo, reportRepo)

    const metricName = MetricName.of('commerce.revenue')
    const dp = DataPointClass.create(
      'dp-1',
      metricName,
      DataPointValue.of(1000),
      new Date(),
      'event'
    )
    await dpRepo.save(dp)

    const report = await ctx.queryMetric({
      metricName: 'commerce.revenue',
      period: '7d',
      aggregation: 'SUM',
    })

    expect(report).toBeDefined()
    expect(report.metricName.fullName).toBe('commerce.revenue')
    expect(report.aggregation).toBe('SUM')
  })

  it('queryMetric() 支援自定義時間範圍', async () => {
    const dpRepo = new InMemoryDataPointRepository()
    const reportRepo = new InMemoryReportRepository()
    const ctx = new MetricQueryContext(dpRepo, reportRepo)

    const report = await ctx.queryMetric({
      metricName: 'commerce.revenue',
      period: {
        start: '2026-02-01T00:00:00Z',
        end: '2026-02-28T23:59:59Z',
      },
      aggregation: 'SUM',
    })

    expect(report).toBeDefined()
  })

  it('queryMetric() 預設 aggregation 為 SUM', async () => {
    const dpRepo = new InMemoryDataPointRepository()
    const reportRepo = new InMemoryReportRepository()
    const ctx = new MetricQueryContext(dpRepo, reportRepo)

    const report = await ctx.queryMetric({
      metricName: 'commerce.revenue',
      period: '7d',
    })

    expect(report.aggregation).toBe('SUM')
  })

  it('queryMetric() 預設 chartType 為 TIMESERIES', async () => {
    const dpRepo = new InMemoryDataPointRepository()
    const reportRepo = new InMemoryReportRepository()
    const ctx = new MetricQueryContext(dpRepo, reportRepo)

    const report = await ctx.queryMetric({
      metricName: 'commerce.revenue',
      period: '7d',
    })

    expect(report.chartType).toBe('TIMESERIES')
  })

  it('queryTimeSeries() 查詢時間序列', async () => {
    const dpRepo = new InMemoryDataPointRepository()
    const reportRepo = new InMemoryReportRepository()
    const ctx = new MetricQueryContext(dpRepo, reportRepo)

    const metricName = MetricName.of('commerce.revenue')
    const dp1 = DataPointClass.create(
      'dp-1',
      metricName,
      DataPointValue.of(100),
      new Date('2026-02-28T10:00:00Z'),
      'event'
    )
    const dp2 = DataPointClass.create(
      'dp-2',
      metricName,
      DataPointValue.of(200),
      new Date('2026-02-28T14:00:00Z'),
      'event'
    )
    await dpRepo.save(dp1)
    await dpRepo.save(dp2)

    const report = await ctx.queryTimeSeries({
      metricName: 'commerce.revenue',
      period: '7d',
    })

    expect(report.chartType).toBe('TIMESERIES')
    expect(report.dataPointCount).toBe(2)
  })

  it('queryMetric() 帶維度過濾', async () => {
    const dpRepo = new InMemoryDataPointRepository()
    const reportRepo = new InMemoryReportRepository()
    const ctx = new MetricQueryContext(dpRepo, reportRepo)

    const report = await ctx.queryMetric({
      metricName: 'commerce.revenue',
      period: '7d',
      dimensions: [{ key: 'category', value: 'electronics' }],
    })

    expect(report).toBeDefined()
  })

  it('queryMetric() 多重聚合方式', async () => {
    const dpRepo = new InMemoryDataPointRepository()
    const reportRepo = new InMemoryReportRepository()
    const ctx = new MetricQueryContext(dpRepo, reportRepo)

    const aggregations = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'] as const
    for (const agg of aggregations) {
      const report = await ctx.queryMetric({
        metricName: 'test.metric',
        period: '7d',
        aggregation: agg,
      })
      expect(report.aggregation).toBe(agg)
    }
  })
})
