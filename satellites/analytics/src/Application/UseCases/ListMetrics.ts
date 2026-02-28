import { UseCase } from '@gravito/enterprise'
import type { MetricName } from '../../Domain/ValueObjects/MetricName'

export type ListMetricsInput = {}

export interface ListMetricsOutput {
  metrics: string[]
}

export class ListMetrics extends UseCase<ListMetricsInput, ListMetricsOutput> {
  private supportedMetrics: MetricName[]

  constructor(supportedMetrics: MetricName[] = []) {
    super()
    this.supportedMetrics = supportedMetrics
  }

  async execute(): Promise<ListMetricsOutput> {
    return {
      metrics: this.supportedMetrics.map((m) => m.fullName),
    }
  }
}
