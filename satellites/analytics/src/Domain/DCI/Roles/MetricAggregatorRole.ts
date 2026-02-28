import type { AggregationType } from '../../Entities/AnalyticsReport'
import type { DataPoint } from '../../Entities/DataPoint'

export interface MetricAggregator {
  sum(dataPoints: DataPoint[]): number
  average(dataPoints: DataPoint[]): number
  count(dataPoints: DataPoint[]): number
  min(dataPoints: DataPoint[]): number
  max(dataPoints: DataPoint[]): number
  aggregate(dataPoints: DataPoint[], type: AggregationType): number
  groupByInterval(
    dataPoints: DataPoint[],
    intervalMs: number,
    type: AggregationType
  ): Array<{ timestamp: Date; value: number }>
}

export function createMetricAggregator(): MetricAggregator {
  return {
    sum(dataPoints) {
      return dataPoints.reduce((sum, dp) => sum + dp.value.value, 0)
    },

    average(dataPoints) {
      if (dataPoints.length === 0) return 0
      return this.sum(dataPoints) / dataPoints.length
    },

    count(dataPoints) {
      return dataPoints.length
    },

    min(dataPoints) {
      if (dataPoints.length === 0) return 0
      return Math.min(...dataPoints.map((dp) => dp.value.value))
    },

    max(dataPoints) {
      if (dataPoints.length === 0) return 0
      return Math.max(...dataPoints.map((dp) => dp.value.value))
    },

    aggregate(dataPoints, type) {
      switch (type) {
        case 'SUM':
          return this.sum(dataPoints)
        case 'AVG':
          return this.average(dataPoints)
        case 'COUNT':
          return this.count(dataPoints)
        case 'MIN':
          return this.min(dataPoints)
        case 'MAX':
          return this.max(dataPoints)
      }
    },

    groupByInterval(dataPoints, intervalMs, type) {
      if (dataPoints.length === 0) return []

      const groups = new Map<number, DataPoint[]>()
      for (const dp of dataPoints) {
        const bucket = Math.floor(dp.timestamp.getTime() / intervalMs)
        const key = bucket * intervalMs
        if (!groups.has(key)) {
          groups.set(key, [])
        }
        groups.get(key)!.push(dp)
      }

      const result: Array<{ timestamp: Date; value: number }> = []
      for (const [key, points] of Array.from(groups.entries()).sort((a, b) => a[0] - b[0])) {
        result.push({
          timestamp: new Date(key),
          value: this.aggregate(points, type),
        })
      }
      return result
    },
  }
}
