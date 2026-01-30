import { type Counter, type Histogram, type Meter, metrics } from '@opentelemetry/api'

export interface AtlasMetricsConfig {
  enabled: boolean
}

export class AtlasMetrics {
  private meter: Meter | null = null
  private config: AtlasMetricsConfig

  public readonly operationDuration?: Histogram
  public readonly operationErrors?: Counter

  constructor(config: AtlasMetricsConfig) {
    this.config = config
    if (this.config.enabled) {
      this.meter = metrics.getMeter('gravito-atlas', '1.5.1')

      this.operationDuration = this.meter.createHistogram('db.client.operation.duration', {
        description: 'Duration of database operations',
        unit: 'ms',
      })

      this.operationErrors = this.meter.createCounter('db.client.operation.errors', {
        description: 'Number of database operation errors',
      })
    }
  }
}
