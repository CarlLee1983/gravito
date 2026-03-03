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
export declare function setupPrometheusExporter(config?: PrometheusExporterConfig): void
/**
 * Create a simple HTTP server to expose Prometheus metrics
 *
 * @example
 * ```typescript
 * const server = createPrometheusMetricsServer({ port: 9464 })
 * // Start the server to expose metrics at http://localhost:9464/metrics
 * ```
 */
export declare function createPrometheusMetricsServer(config?: PrometheusExporterConfig): any
