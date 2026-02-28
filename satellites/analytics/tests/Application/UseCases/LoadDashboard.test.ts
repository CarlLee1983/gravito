import { describe, expect, it } from 'bun:test'
import { LoadDashboard } from '../../../../../src/Application/UseCases/LoadDashboard.ts'
import type {
  IDataPointRepository,
  IReportRepository,
} from '../../../../../src/Domain/Contracts/IAnalyticsRepository'
import type { AnalyticsReport } from '../../../../../src/Domain/Entities/AnalyticsReport'
import type { DataPoint } from '../../../../../src/Domain/Entities/DataPoint'

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

describe('LoadDashboard UseCase', () => {
  it('execute() 載入多個 widgets', async () => {
    const dpRepo = new InMemoryDataPointRepository()
    const reportRepo = new InMemoryReportRepository()
    const useCase = new LoadDashboard(dpRepo, reportRepo)

    const result = await useCase.execute({
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
      ],
    })

    expect(result).toBeArray()
    expect(result).toHaveLength(2)
    expect(result[0].metric).toBe('commerce.revenue')
    expect(result[1].metric).toBe('commerce.order_volume')
  })

  it('execute() 空 widgets', async () => {
    const dpRepo = new InMemoryDataPointRepository()
    const reportRepo = new InMemoryReportRepository()
    const useCase = new LoadDashboard(dpRepo, reportRepo)

    const result = await useCase.execute({
      widgets: [],
    })

    expect(result).toBeArray()
    expect(result).toHaveLength(0)
  })

  it('execute() 返回 DTO 格式', async () => {
    const dpRepo = new InMemoryDataPointRepository()
    const reportRepo = new InMemoryReportRepository()
    const useCase = new LoadDashboard(dpRepo, reportRepo)

    const result = await useCase.execute({
      widgets: [
        { metricName: 'test.metric', period: '7d', aggregation: 'SUM', chartType: 'TIMESERIES' },
      ],
    })

    expect(result[0]).toHaveProperty('metric')
    expect(result[0]).toHaveProperty('period')
    expect(result[0]).toHaveProperty('aggregation')
    expect(result[0]).toHaveProperty('chartType')
    expect(result[0]).toHaveProperty('dataPoints')
  })
})
