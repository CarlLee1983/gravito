import { type Counter, type Histogram, type Meter, metrics } from '@opentelemetry/api'

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
  public readonly poolSize?: any // ObservableGauge
  public readonly poolUtilization?: any // ObservableGauge
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
        const meterAny = this.meter as any
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
  registerPoolStatsCallback(
    connectionName: string,
    getStats: () => { idle: number; active: number; pending: number; max: number } | null
  ): void {
    if (!this.poolSize || !this.poolUtilization) {
      return
    }

    const callback = () => {
      const stats = getStats()
      if (!stats) {
        return
      }

      // Record idle, active, and pending connections
      const poolSizeAny = this.poolSize as any
      if (poolSizeAny?.addCallback) {
        poolSizeAny.addCallback((result: any) => {
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
      const poolUtilizationAny = this.poolUtilization as any
      if (poolUtilizationAny?.addCallback) {
        poolUtilizationAny.addCallback((result: any) => {
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
