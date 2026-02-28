import type { IDataPointRepository } from '../../Contracts/IAnalyticsRepository'
import { DataPoint } from '../../Entities/DataPoint'
import { DataPointValue } from '../../ValueObjects/DataPointValue'
import type { Dimension } from '../../ValueObjects/Dimension'
import type { MetricName } from '../../ValueObjects/MetricName'

export interface RecordEntry {
  metricName: MetricName
  value: number
  source: string
  dimensions?: Dimension[]
  timestamp?: Date
}

export interface DataCollector {
  recordMetric(
    metricName: MetricName,
    value: number,
    source: string,
    dimensions?: Dimension[]
  ): Promise<void>
  recordBatch(entries: RecordEntry[]): Promise<void>
}

export function injectDataCollector(repo: IDataPointRepository): DataCollector {
  return {
    async recordMetric(metricName, value, source, dimensions = []) {
      const dataPointValue = DataPointValue.of(value)
      const dataPoint = DataPoint.create(
        `dp-${Date.now()}-${Math.random()}`,
        metricName,
        dataPointValue,
        new Date(),
        source,
        dimensions
      )
      await repo.save(dataPoint)
    },
    async recordBatch(entries) {
      const dataPoints = entries.map((entry) => {
        const dataPointValue = DataPointValue.of(entry.value)
        return DataPoint.create(
          `dp-${Date.now()}-${Math.random()}`,
          entry.metricName,
          dataPointValue,
          entry.timestamp ?? new Date(),
          entry.source,
          entry.dimensions ?? []
        )
      })
      await repo.saveBatch(dataPoints)
    },
  }
}
