import { beforeEach, describe, expect, it } from 'bun:test'
import type { IDataPointRepository } from '../../../../src/Domain/Contracts/IAnalyticsRepository'
import { injectDataCollector } from '../../../../src/Domain/DCI/Roles/DataCollectorRole'
import type { DataPoint } from '../../../../src/Domain/Entities/DataPoint'
import { Dimension } from '../../../../src/Domain/ValueObjects/Dimension'
import { MetricName } from '../../../../src/Domain/ValueObjects/MetricName'

class InMemoryDataPointRepository implements IDataPointRepository {
  private dataPoints: DataPoint[] = []

  async save(dataPoint: DataPoint): Promise<void> {
    this.dataPoints.push(dataPoint)
  }

  async saveBatch(dataPoints: DataPoint[]): Promise<void> {
    this.dataPoints.push(...dataPoints)
  }

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

  getAll(): DataPoint[] {
    return this.dataPoints
  }
}

describe('DataCollectorRole', () => {
  let repo: InMemoryDataPointRepository

  beforeEach(() => {
    repo = new InMemoryDataPointRepository()
  })

  it('recordMetric() 記錄單筆指標', async () => {
    const collector = injectDataCollector(repo)
    const metricName = MetricName.of('commerce.revenue')
    await collector.recordMetric(metricName, 1000, 'commerce:order-placed')
    expect(repo.getAll()).toHaveLength(1)
  })

  it('recordMetric() 帶維度', async () => {
    const collector = injectDataCollector(repo)
    const metricName = MetricName.of('commerce.revenue')
    const dims = [Dimension.of('category', 'electronics')]
    await collector.recordMetric(metricName, 1000, 'event', dims)
    const points = repo.getAll()
    expect(points).toHaveLength(1)
    expect(points[0]!.dimensions).toHaveLength(1)
  })

  it('recordBatch() 批次記錄', async () => {
    const collector = injectDataCollector(repo)
    const m1 = MetricName.of('commerce.revenue')
    const entries = [
      { metricName: m1, value: 1000, source: 'event1' },
      { metricName: m1, value: 2000, source: 'event2' },
      { metricName: m1, value: 3000, source: 'event3' },
    ]
    await collector.recordBatch(entries)
    expect(repo.getAll()).toHaveLength(3)
  })

  it('recordMetric() 使用當前時間', async () => {
    const collector = injectDataCollector(repo)
    const metricName = MetricName.of('commerce.revenue')
    const before = Date.now()
    await collector.recordMetric(metricName, 1000, 'event')
    const after = Date.now()
    const points = repo.getAll()
    const timestamp = points[0]!.timestamp.getTime()
    expect(timestamp).toBeGreaterThanOrEqual(before)
    expect(timestamp).toBeLessThanOrEqual(after)
  })

  it('recordBatch() 使用自定義時間戳', async () => {
    const collector = injectDataCollector(repo)
    const m = MetricName.of('test.metric')
    const customTime = new Date('2026-02-15T10:00:00Z')
    const entries = [{ metricName: m, value: 100, source: 'event', timestamp: customTime }]
    await collector.recordBatch(entries)
    expect(repo.getAll()[0]!.timestamp.getTime()).toBe(customTime.getTime())
  })
})
