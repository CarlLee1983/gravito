import { describe, expect, it } from 'bun:test'
import { OrderVolumeResolver } from '../src/Application/Resolvers/OrderVolumeResolver'
import type {
  IDataPointRepository,
  IReportRepository,
} from '../src/Domain/Contracts/IAnalyticsRepository'
import type { AnalyticsReport } from '../src/Domain/Entities/AnalyticsReport'
import { DataPoint } from '../src/Domain/Entities/DataPoint'
import { DataPointValue } from '../src/Domain/ValueObjects/DataPointValue'
import { MetricName } from '../src/Domain/ValueObjects/MetricName'
import { TimePeriod } from '../src/Domain/ValueObjects/TimePeriod'

/**
 * InMemory 資料點儲存庫（測試用）
 */
class InMemoryDataPointRepository implements IDataPointRepository {
  private dataPoints: DataPoint[] = []

  setDataPoints(dps: DataPoint[]) {
    this.dataPoints = dps
  }

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

/**
 * InMemory 報告儲存庫（測試用）
 */
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

// 模擬每日訂單量數據
const orderVolumes = [120, 150, 80, 200, 170, 250, 300]

function createOrderVolumeDataPoints(): DataPoint[] {
  const metricName = MetricName.of('commerce.order_volume')
  const now = new Date()
  return orderVolumes.map((value, index) => {
    const date = new Date(now)
    date.setDate(date.getDate() - (6 - index))
    return DataPoint.create(
      `dp-${index}`,
      metricName,
      DataPointValue.of(value),
      date,
      `order-event-${index}`
    )
  })
}

describe('Analytics Satellite', () => {
  describe('OrderVolumeResolver', () => {
    it('應該有正確的 metric 名稱', () => {
      const dpRepo = new InMemoryDataPointRepository()
      const reportRepo = new InMemoryReportRepository()
      const resolver = new OrderVolumeResolver(dpRepo, reportRepo)

      expect(resolver.metricName.fullName).toBe('commerce.order_volume')
    })

    it('應該能解析訂單量數據', async () => {
      const dpRepo = new InMemoryDataPointRepository()
      const reportRepo = new InMemoryReportRepository()
      dpRepo.setDataPoints(createOrderVolumeDataPoints())
      const resolver = new OrderVolumeResolver(dpRepo, reportRepo)

      const query = {
        metric: MetricName.of('commerce.order_volume'),
        period: TimePeriod.fromPreset('7d'),
        aggregation: 'SUM' as const,
      }
      const result = await resolver.resolve(query)

      expect(result).toBeDefined()
      expect(result.chartType).toBe('TIMESERIES')
      expect(result.dataPoints).toBeDefined()
      expect(Array.isArray(result.dataPoints)).toBe(true)
    })

    it('應該回傳七天的訂單量數據', async () => {
      const dpRepo = new InMemoryDataPointRepository()
      const reportRepo = new InMemoryReportRepository()
      dpRepo.setDataPoints(createOrderVolumeDataPoints())
      const resolver = new OrderVolumeResolver(dpRepo, reportRepo)

      const query = {
        metric: MetricName.of('commerce.order_volume'),
        period: TimePeriod.fromPreset('7d'),
      }
      const result = await resolver.resolve(query)

      expect(result.dataPoints.length).toBe(7)
    })

    it('應該包含正確的資料結構', async () => {
      const dpRepo = new InMemoryDataPointRepository()
      const reportRepo = new InMemoryReportRepository()
      dpRepo.setDataPoints(createOrderVolumeDataPoints())
      const resolver = new OrderVolumeResolver(dpRepo, reportRepo)

      const query = {
        metric: MetricName.of('commerce.order_volume'),
        period: TimePeriod.fromPreset('7d'),
      }
      const result = await resolver.resolve(query)

      result.dataPoints.forEach((point) => {
        expect(point.value).toBeDefined()
        expect(point.timestamp).toBeDefined()
        expect(typeof point.value.value).toBe('number')
      })
    })

    it('應該包含摘要信息', async () => {
      const dpRepo = new InMemoryDataPointRepository()
      const reportRepo = new InMemoryReportRepository()
      dpRepo.setDataPoints(createOrderVolumeDataPoints())
      const resolver = new OrderVolumeResolver(dpRepo, reportRepo)

      const query = {
        metric: MetricName.of('commerce.order_volume'),
        period: TimePeriod.fromPreset('7d'),
      }
      const result = await resolver.resolve(query)

      expect(result.summary).toBeDefined()
      expect(typeof result.summary).toBe('string')
      expect((result.summary as string).length).toBeGreaterThan(0)
    })

    it('應該能處理不同的聚合方式', async () => {
      const dpRepo = new InMemoryDataPointRepository()
      const reportRepo = new InMemoryReportRepository()
      dpRepo.setDataPoints(createOrderVolumeDataPoints())
      const resolver = new OrderVolumeResolver(dpRepo, reportRepo)

      const querySum = {
        metric: MetricName.of('commerce.order_volume'),
        period: TimePeriod.fromPreset('7d'),
        aggregation: 'SUM' as const,
      }
      const result1 = await resolver.resolve(querySum)
      expect(result1.dataPoints).toBeDefined()

      const queryAvg = {
        metric: MetricName.of('commerce.order_volume'),
        period: TimePeriod.fromPreset('7d'),
        aggregation: 'AVG' as const,
      }
      const result2 = await resolver.resolve(queryAvg)
      expect(result2.dataPoints).toBeDefined()
    })

    it('應該能計算周訂單總和', async () => {
      const dpRepo = new InMemoryDataPointRepository()
      const reportRepo = new InMemoryReportRepository()
      dpRepo.setDataPoints(createOrderVolumeDataPoints())
      const resolver = new OrderVolumeResolver(dpRepo, reportRepo)

      const query = {
        metric: MetricName.of('commerce.order_volume'),
        period: TimePeriod.fromPreset('7d'),
        aggregation: 'SUM' as const,
      }
      const result = await resolver.resolve(query)

      expect(result.aggregatedValue).toBe(120 + 150 + 80 + 200 + 170 + 250 + 300)
    })
  })
})
