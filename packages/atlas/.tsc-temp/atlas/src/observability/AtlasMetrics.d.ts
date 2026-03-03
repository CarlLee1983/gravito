import { type Counter, type Histogram } from '@opentelemetry/api'
export interface AtlasMetricsConfig {
  enabled: boolean
}
export declare class AtlasMetrics {
  private meter
  private config
  private poolCallbacks
  readonly operationDuration?: Histogram
  readonly operationErrors?: Counter
  readonly poolSize?: any
  readonly poolUtilization?: any
  readonly poolWaitTime?: Histogram
  readonly poolAcquisitionErrors?: Counter
  constructor(config: AtlasMetricsConfig)
  /**
   * Register pool statistics callback for ObservableGauge
   */
  registerPoolStatsCallback(
    connectionName: string,
    getStats: () => {
      idle: number
      active: number
      pending: number
      max: number
    } | null
  ): void
  /**
   * Record connection wait time
   */
  recordConnectionWaitTime(connectionName: string, duration: number): void
  /**
   * Record connection acquisition error
   */
  recordConnectionAcquisitionError(connectionName: string, error: string): void
}
