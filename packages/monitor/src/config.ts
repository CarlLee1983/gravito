/**
 * @gravito/monitor - Configuration Types
 */

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded'
  message?: string
  latency?: number
  details?: Record<string, unknown>
}

/**
 * Health check function signature
 */
export type HealthCheckFn = () => Promise<HealthCheckResult> | HealthCheckResult

/**
 * Health configuration
 */
export interface HealthConfig {
  /** Enable health endpoints (default: true) */
  enabled?: boolean
  /** Path for full health check (default: /health) */
  path?: string
  /** Path for Kubernetes readiness probe (default: /ready) */
  readyPath?: string
  /** Path for Kubernetes liveness probe (default: /live) */
  livePath?: string
  /** Timeout for individual health checks in ms (default: 5000) */
  timeout?: number
  /** Cache health check results for ms (default: 0 = no cache) */
  cacheTtl?: number
}

/**
 * Metric types
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary'

/**
 * Metric definition options
 */
export interface MetricOptions {
  name: string
  help: string
  labels?: string[]
  buckets?: number[] // For histograms
  percentiles?: number[] // For summaries
}

/**
 * Metrics configuration
 */
export interface MetricsConfig {
  /** Enable metrics endpoint (default: true) */
  enabled?: boolean
  /** Path for metrics endpoint (default: /metrics) */
  path?: string
  /** Collect default runtime metrics (default: true) */
  defaultMetrics?: boolean
  /** Prefix for all metric names (default: gravito_) */
  prefix?: string
  /** Custom labels to add to all metrics */
  defaultLabels?: Record<string, string>
}

/**
 * Tracing configuration
 */
export interface TracingConfig {
  /** Enable tracing (default: false) */
  enabled?: boolean
  /** Service name for tracing */
  serviceName?: string
  /** Service version */
  serviceVersion?: string
  /** OTLP endpoint URL (default: http://localhost:4318/v1/traces) */
  endpoint?: string
  /** Sample rate 0.0 - 1.0 (default: 1.0) */
  sampleRate?: number
  /** Additional resource attributes */
  resourceAttributes?: Record<string, string>
  /** Trace HTTP requests automatically (default: true) */
  traceHttp?: boolean
  /** Headers to propagate in traces */
  propagateHeaders?: string[]
}

/**
 * Monitor configuration
 */
export interface MonitorConfig {
  /** Health check configuration */
  health?: HealthConfig
  /** Metrics configuration */
  metrics?: MetricsConfig
  /** Tracing configuration */
  tracing?: TracingConfig
}

/**
 * Default configuration values
 */
export const defaultConfig: Required<MonitorConfig> = {
  health: {
    enabled: true,
    path: '/health',
    readyPath: '/ready',
    livePath: '/live',
    timeout: 5000,
    cacheTtl: 10000, // 預設 10 秒快取，防止高頻 Probe 造成雪崩
  },
  metrics: {
    enabled: true,
    path: '/metrics',
    defaultMetrics: true,
    prefix: 'gravito_',
    defaultLabels: {},
  },
  tracing: {
    enabled: false,
    serviceName: 'gravito-app',
    serviceVersion: '1.0.0',
    endpoint: 'http://localhost:4318/v1/traces',
    sampleRate: 1.0,
    resourceAttributes: {},
    traceHttp: true,
    propagateHeaders: ['x-request-id', 'x-correlation-id'],
  },
}

/**
 * Helper to merge config with defaults
 */
export function resolveConfig(config: MonitorConfig): Required<MonitorConfig> {
  return {
    health: { ...defaultConfig.health, ...config.health },
    metrics: { ...defaultConfig.metrics, ...config.metrics },
    tracing: { ...defaultConfig.tracing, ...config.tracing },
  }
}

/**
 * Define monitor configuration (type helper)
 */
export function defineMonitorConfig(config: MonitorConfig): MonitorConfig {
  return config
}
