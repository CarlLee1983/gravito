import type { IDataPointRepository } from '../../Domain/Contracts/IAnalyticsRepository'
import type { DataPoint } from '../../Domain/Entities/DataPoint'
import type { Dimension } from '../../Domain/ValueObjects/Dimension'
import type { MetricName } from '../../Domain/ValueObjects/MetricName'
import type { TimePeriod } from '../../Domain/ValueObjects/TimePeriod'

export class InMemoryDataPointRepository implements IDataPointRepository {
  private dataPoints: Map<string, DataPoint[]> = new Map()

  async save(dataPoint: DataPoint): Promise<void> {
    const key = dataPoint.metricName.fullName
    if (!this.dataPoints.has(key)) {
      this.dataPoints.set(key, [])
    }
    this.dataPoints.get(key)!.push(dataPoint)
  }

  async saveBatch(dataPoints: DataPoint[]): Promise<void> {
    for (const dp of dataPoints) {
      await this.save(dp)
    }
  }

  async findByMetric(metricName: MetricName, period: TimePeriod): Promise<DataPoint[]> {
    const key = metricName.fullName
    const all = this.dataPoints.get(key) ?? []
    return all.filter((dp) => period.contains(dp.timestamp))
  }

  async findByMetricAndDimensions(
    metricName: MetricName,
    period: TimePeriod,
    dimensions: Dimension[]
  ): Promise<DataPoint[]> {
    const key = metricName.fullName
    const all = this.dataPoints.get(key) ?? []
    return all.filter((dp) => {
      if (!period.contains(dp.timestamp)) return false
      if (dimensions.length === 0) return true
      return dimensions.every((dim) => dp.getDimensionValue(dim.key) === dim.value)
    })
  }

  async count(metricName: MetricName, period: TimePeriod): Promise<number> {
    const points = await this.findByMetric(metricName, period)
    return points.length
  }

  async deleteByMetric(metricName: MetricName): Promise<void> {
    this.dataPoints.delete(metricName.fullName)
  }

  clear(): void {
    this.dataPoints.clear()
  }
}
