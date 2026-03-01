import { describe, expect, it } from 'bun:test'
import { QueryMetric } from '../../../src/Application/UseCases/QueryMetric'
import type {
  IDataPointRepository,
  IReportRepository,
} from '../../../src/Domain/Contracts/IAnalyticsRepository'
import type { AnalyticsReport } from '../../../src/Domain/Entities/AnalyticsReport'
import type { DataPoint } from '../../../src/Domain/Entities/DataPoint'

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

describe('QueryMetric UseCase', () => {
  it('execute() 返回 DTO', async () => {
    const dpRepo = new InMemoryDataPointRepository()
    const reportRepo = new InMemoryReportRepository()
    const useCase = new QueryMetric(dpRepo, reportRepo)

    const result = await useCase.execute({
      metricName: 'commerce.revenue',
      period: '7d',
      aggregation: 'SUM',
    })

    expect(result.metric).toBe('commerce.revenue')
    expect(result.aggregation).toBe('SUM')
    expect(result.dataPoints).toBeArray()
  })

  it('execute() 支援自定義時間範圍', async () => {
    const dpRepo = new InMemoryDataPointRepository()
    const reportRepo = new InMemoryReportRepository()
    const useCase = new QueryMetric(dpRepo, reportRepo)

    const result = await useCase.execute({
      metricName: 'test.metric',
      period: { start: '2026-02-01T00:00:00Z', end: '2026-02-28T23:59:59Z' },
    })

    expect(result.metric).toBe('test.metric')
  })

  it('execute() 返回正確的 aggregatedValue', async () => {
    const dpRepo = new InMemoryDataPointRepository()
    const reportRepo = new InMemoryReportRepository()
    const useCase = new QueryMetric(dpRepo, reportRepo)

    const result = await useCase.execute({
      metricName: 'commerce.order_volume',
      period: '7d',
      aggregation: 'COUNT',
    })

    expect(typeof result.aggregatedValue).toBe('number')
  })
})
