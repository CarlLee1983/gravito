import type { IDataPointRepository } from '../../Contracts/IAnalyticsRepository'
import type { Dimension } from '../../ValueObjects/Dimension'
import { MetricName } from '../../ValueObjects/MetricName'
import { injectDataCollector, type RecordEntry } from '../Roles/DataCollectorRole'

export interface IngestEventInput {
  eventName: string
  payload: Record<string, unknown>
  timestamp?: Date
}

interface MetricMapping {
  metric: string
  valueExtractor: (payload: Record<string, unknown>) => number
  dimensionExtractor?: (payload: Record<string, unknown>) => Dimension[]
  unit?: string
}

const EVENT_METRIC_MAP: Record<string, MetricMapping[]> = {
  'commerce:order-placed': [
    {
      metric: 'commerce.order_count',
      valueExtractor: () => 1,
    },
    {
      metric: 'commerce.revenue',
      valueExtractor: (p) => (typeof p.totalAmount === 'number' ? p.totalAmount : 0),
      unit: 'currency_cents',
    },
  ],
  'commerce:order-confirmed': [
    {
      metric: 'commerce.confirmed_orders',
      valueExtractor: () => 1,
    },
  ],
  'commerce:order-refunded': [
    {
      metric: 'commerce.refund_count',
      valueExtractor: () => 1,
    },
    {
      metric: 'commerce.refund_amount',
      valueExtractor: (p) => (typeof p.refundAmount === 'number' ? p.refundAmount : 0),
      unit: 'currency_cents',
    },
  ],
  'membership:registered': [
    {
      metric: 'membership.signups',
      valueExtractor: () => 1,
    },
  ],
  'membership:authenticated': [
    {
      metric: 'membership.logins',
      valueExtractor: () => 1,
    },
  ],
  'catalog:product-created': [
    {
      metric: 'catalog.new_products',
      valueExtractor: () => 1,
    },
  ],
  'payment:succeeded': [
    {
      metric: 'payment.successful_transactions',
      valueExtractor: () => 1,
    },
    {
      metric: 'payment.success_amount',
      valueExtractor: (p) => (typeof p.amount === 'number' ? p.amount : 0),
      unit: 'currency_cents',
    },
  ],
}

export class DataIngestionContext {
  constructor(private readonly dataPointRepo: IDataPointRepository) {}

  async ingestEvent(input: IngestEventInput): Promise<void> {
    const mappings = EVENT_METRIC_MAP[input.eventName]
    if (!mappings) {
      return
    }

    const entries: RecordEntry[] = []
    for (const mapping of mappings) {
      const metricName = MetricName.of(mapping.metric)
      const value = mapping.valueExtractor(input.payload)
      const dimensions = mapping.dimensionExtractor?.(input.payload) ?? []

      entries.push({
        metricName,
        value,
        source: input.eventName,
        dimensions,
        timestamp: input.timestamp ?? new Date(),
      })
    }

    await this.recordBatch(entries)
  }

  async ingestBatch(inputs: IngestEventInput[]): Promise<void> {
    for (const input of inputs) {
      await this.ingestEvent(input)
    }
  }

  private async recordBatch(entries: RecordEntry[]): Promise<void> {
    const collector = injectDataCollector(this.dataPointRepo)
    await collector.recordBatch(entries)
  }
}
