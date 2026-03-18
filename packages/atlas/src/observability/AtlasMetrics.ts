import { type Counter, type Histogram, type Meter, metrics } from '@opentelemetry/api'
import type { PoolStats } from '../types'

interface ObservableResult {
  observe(value: number, attributes?: Record<string, string>): void
}

interface ObservableGaugeLike {
  addCallback(callback: (result: ObservableResult) => void): void
  removeCallback?(callback: (result: ObservableResult) => void): void
}

type ObservableGaugeMeter = Meter & {
  createObservableGauge?(
    name: string,
    options?: { description?: string; unit?: string }
  ): ObservableGaugeLike
}

export interface AtlasMetricsConfig {
  enabled: boolean
}

export class AtlasMetrics {
  private meter: Meter | null = null
  private config: AtlasMetricsConfig
  private poolCallbacks = new Map<string, () => void>()

  public readonly operationDuration?: Histogram
  public readonly operationErrors?: Counter

  // Connection pool metrics
  public readonly poolSize?: ObservableGaugeLike
  public readonly poolUtilization?: ObservableGaugeLike
  public readonly poolWaitTime?: Histogram
  public readonly poolAcquisitionErrors?: Counter

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

      // Connection pool metrics
      try {
        const meterAny = this.meter as ObservableGaugeMeter
        if (meterAny.createObservableGauge) {
          this.poolSize = meterAny.createObservableGauge('db.client.connections.usage', {
            description: 'Number of connections in various states',
            unit: '{connection}',
          })

          this.poolUtilization = meterAny.createObservableGauge(
            'db.client.connections.utilization',
            {
              description: 'Connection pool utilization ratio',
              unit: '1',
            }
          )
        }
      } catch {
        // ObservableGauge not available in this version
      }

      this.poolWaitTime = this.meter.createHistogram('db.client.connections.wait_time', {
        description: 'Time spent waiting for a connection',
        unit: 'ms',
      })

      this.poolAcquisitionErrors = this.meter.createCounter(
        'db.client.connections.acquisition_errors',
        {
          description: 'Number of connection acquisition errors',
        }
      )
    }
  }

  /**
   * Register pool statistics callback for ObservableGauge
   */
  registerPoolStatsCallback(connectionName: string, getStats: () => PoolStats | null): void {
    if (!this.poolSize || !this.poolUtilization) {
      return
    }

    const callback = () => {
      const stats = getStats()
      if (!stats) {
        return
      }

      // Record idle, active, and pending connections
      if (this.poolSize) {
        this.poolSize.addCallback((result) => {
          result.observe(stats.idle, {
            'db.connection.name': connectionName,
            state: 'idle',
          })
          result.observe(stats.active, {
            'db.connection.name': connectionName,
            state: 'used',
          })
          result.observe(stats.pending, {
            'db.connection.name': connectionName,
            state: 'pending',
          })
        })
      }

      // Record utilization ratio
      const utilization = stats.active / stats.max
      if (this.poolUtilization) {
        this.poolUtilization.addCallback((result) => {
          result.observe(utilization, {
            'db.connection.name': connectionName,
          })
        })
      }
    }

    this.poolCallbacks.set(connectionName, callback)
  }

  /**
   * Record connection wait time
   */
  recordConnectionWaitTime(connectionName: string, duration: number): void {
    if (!this.poolWaitTime) {
      return
    }

    this.poolWaitTime.record(duration, {
      'db.connection.name': connectionName,
    })
  }

  /**
   * Record connection acquisition error
   */
  recordConnectionAcquisitionError(connectionName: string, error: string): void {
    if (!this.poolAcquisitionErrors) {
      return
    }

    this.poolAcquisitionErrors.add(1, {
      'db.connection.name': connectionName,
      'error.type': error,
    })
  }
}
