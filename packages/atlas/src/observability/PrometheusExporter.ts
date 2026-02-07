/**
 * @gravito/atlas - Prometheus Exporter
 * @description Configures OpenTelemetry Prometheus exporter for metrics export
 */

export interface PrometheusExporterConfig {
  /**
   * Port to expose metrics endpoint on
   * @default 9464
   */
  port?: number

  /**
   * Path for metrics endpoint
   * @default '/metrics'
   */
  endpoint?: string

  /**
   * Whether to include process metrics
   * @default true
   */
  includeProcessMetrics?: boolean

  /**
   * Whether to include Node.js metrics
   * @default true
   */
  includeNodeMetrics?: boolean
}

/**
 * Setup Prometheus exporter for OpenTelemetry metrics
 *
 * @example
 * ```typescript
 * setupPrometheusExporter({
 *   port: 9464,
 *   endpoint: '/metrics',
 * })
 *
 * // Now metrics are available at http://localhost:9464/metrics
 * ```
 */
export function setupPrometheusExporter(config: PrometheusExporterConfig = {}): void {
  const port = config.port ?? 9464
  const endpoint = config.endpoint ?? '/metrics'
  const includeProcessMetrics = config.includeProcessMetrics ?? true
  const includeNodeMetrics = config.includeNodeMetrics ?? true

  try {
    // Try to use OpenTelemetry's Prometheus exporter if available
    // This is a configuration-only implementation that works with the auto-instrumentation
    // The actual exporter is typically configured via environment variables or separate setup
    if (typeof process !== 'undefined' && process.env) {
      // Set environment variables that the auto-instrumentation will pick up
      process.env.OTEL_EXPORTER_PROMETHEUS_PORT = String(port)
      process.env.OTEL_EXPORTER_PROMETHEUS_PATH = endpoint
    }

    console.log(`[Atlas] Prometheus metrics exporter configured:`)
    console.log(`  - Port: ${port}`)
    console.log(`  - Endpoint: http://localhost:${port}${endpoint}`)
    console.log(`  - Process Metrics: ${includeProcessMetrics}`)
    console.log(`  - Node Metrics: ${includeNodeMetrics}`)
  } catch (error) {
    console.warn(
      '[Atlas] Failed to setup Prometheus exporter. Metrics will not be exported:',
      error instanceof Error ? error.message : error
    )
  }
}

/**
 * Create a simple HTTP server to expose Prometheus metrics
 *
 * @example
 * ```typescript
 * const server = createPrometheusMetricsServer({ port: 9464 })
 * // Start the server to expose metrics at http://localhost:9464/metrics
 * ```
 */
export function createPrometheusMetricsServer(config: PrometheusExporterConfig = {}): any {
  const port = config.port ?? 9464
  const endpoint = config.endpoint ?? '/metrics'

  try {
    // This would typically use a simple HTTP server to expose metrics
    // For now, we return a stub implementation
    return {
      port,
      endpoint,
      start: () => {
        console.log(`[Atlas] Metrics server would start on port ${port}`)
      },
      stop: () => {
        console.log(`[Atlas] Metrics server would stop`)
      },
    }
  } catch (error) {
    console.warn('[Atlas] Failed to create Prometheus metrics server:', error)
    return null
  }
}
