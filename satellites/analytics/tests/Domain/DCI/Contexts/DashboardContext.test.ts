import { describe, expect, it } from 'bun:test'
import type {
  IDataPointRepository,
  IReportRepository,
} from '../../../../src/Domain/Contracts/IAnalyticsRepository'
import { DashboardContext } from '../../../../src/Domain/DCI/Contexts/DashboardContext'
import { MetricQueryContext } from '../../../../src/Domain/DCI/Contexts/MetricQueryContext'
import type { AnalyticsReport } from '../../../../src/Domain/Entities/AnalyticsReport'
import type { DataPoint } from '../../../../src/Domain/Entities/DataPoint'

class InMemoryDataPointRepository implements IDataPointRepository {
  async save() {}
  async saveBatch() {}
  async findByMetric() {
    return []
  }

  async findByMetricAndDimensions() {
    return []
  }

  async count() {
    return 0
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

describe('DashboardContext', () => {
  it('loadDashboard() 載入單個 widget', async () => {
    const dpRepo = new InMemoryDataPointRepository()
    const reportRepo = new InMemoryReportRepository()
    const queryCtx = new MetricQueryContext(dpRepo, reportRepo)
    const dashboardCtx = new DashboardContext(queryCtx)

    const reports = await dashboardCtx.loadDashboard({
      widgets: [
        {
          metricName: 'commerce.revenue',
          period: '7d',
          aggregation: 'SUM',
          chartType: 'TIMESERIES',
        },
      ],
    })

    expect(reports).toHaveLength(1)
    expect(reports[0]!.metricName.fullName).toBe('commerce.revenue')
  })

  it('loadDashboard() 載入多個 widgets', async () => {
    const dpRepo = new InMemoryDataPointRepository()
    const reportRepo = new InMemoryReportRepository()
    const queryCtx = new MetricQueryContext(dpRepo, reportRepo)
    const dashboardCtx = new DashboardContext(queryCtx)

    const reports = await dashboardCtx.loadDashboard({
      widgets: [
        {
          metricName: 'commerce.revenue',
          period: '7d',
          aggregation: 'SUM',
          chartType: 'TIMESERIES',
        },
        {
          metricName: 'commerce.order_volume',
          period: '30d',
          aggregation: 'COUNT',
          chartType: 'SINGLE_VALUE',
        },
        {
          metricName: 'membership.signups',
          period: '90d',
          aggregation: 'SUM',
          chartType: 'TIMESERIES',
        },
      ],
    })

    expect(reports).toHaveLength(3)
    expect(reports[0]!.metricName.fullName).toBe('commerce.revenue')
    expect(reports[1]!.metricName.fullName).toBe('commerce.order_volume')
    expect(reports[2]!.metricName.fullName).toBe('membership.signups')
  })

  it('loadDashboard() 空 widgets', async () => {
    const dpRepo = new InMemoryDataPointRepository()
    const reportRepo = new InMemoryReportRepository()
    const queryCtx = new MetricQueryContext(dpRepo, reportRepo)
    const dashboardCtx = new DashboardContext(queryCtx)

    const reports = await dashboardCtx.loadDashboard({
      widgets: [],
    })

    expect(reports).toHaveLength(0)
  })

  it('loadDashboard() 不同的聚合方式', async () => {
    const dpRepo = new InMemoryDataPointRepository()
    const reportRepo = new InMemoryReportRepository()
    const queryCtx = new MetricQueryContext(dpRepo, reportRepo)
    const dashboardCtx = new DashboardContext(queryCtx)

    const reports = await dashboardCtx.loadDashboard({
      widgets: [
        {
          metricName: 'test.metric',
          period: '7d',
          aggregation: 'SUM',
          chartType: 'TIMESERIES',
        },
        {
          metricName: 'test.metric',
          period: '7d',
          aggregation: 'AVG',
          chartType: 'SINGLE_VALUE',
        },
        {
          metricName: 'test.metric',
          period: '7d',
          aggregation: 'MAX',
          chartType: 'SINGLE_VALUE',
        },
      ],
    })

    expect(reports).toHaveLength(3)
    expect(reports[0]!.aggregation).toBe('SUM')
    expect(reports[1]!.aggregation).toBe('AVG')
    expect(reports[2]!.aggregation).toBe('MAX')
  })

  it('loadDashboard() 不同的圖表類型', async () => {
    const dpRepo = new InMemoryDataPointRepository()
    const reportRepo = new InMemoryReportRepository()
    const queryCtx = new MetricQueryContext(dpRepo, reportRepo)
    const dashboardCtx = new DashboardContext(queryCtx)

    const reports = await dashboardCtx.loadDashboard({
      widgets: [
        {
          metricName: 'test.metric',
          period: '7d',
          aggregation: 'SUM',
          chartType: 'TIMESERIES',
        },
        {
          metricName: 'test.metric',
          period: '7d',
          aggregation: 'SUM',
          chartType: 'PIE',
        },
        {
          metricName: 'test.metric',
          period: '7d',
          aggregation: 'SUM',
          chartType: 'TABLE',
        },
      ],
    })

    expect(reports).toHaveLength(3)
    expect(reports[0]!.chartType).toBe('TIMESERIES')
    expect(reports[1]!.chartType).toBe('PIE')
    expect(reports[2]!.chartType).toBe('TABLE')
  })
})
