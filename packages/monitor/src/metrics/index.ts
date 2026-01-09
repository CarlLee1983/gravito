/**
 * @gravito/monitor - HTTP Metrics Middleware
 */

import type { GravitoContext } from '@gravito/core'
import type { MetricsRegistry } from './MetricsRegistry'

/**
 * Create middleware that collects HTTP metrics
 */
export function createHttpMetricsMiddleware(registry: MetricsRegistry) {
  const requestCounter = registry.counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labels: ['method', 'path', 'status'],
  })

  const requestDuration = registry.histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labels: ['method', 'path', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  })

  return async (c: GravitoContext, next: () => Promise<void>): Promise<Response | undefined> => {
    const method = c.req.method
    const path = normalizePath(c.req.path)
    const start = performance.now()

    await next()

    const duration = (performance.now() - start) / 1000
    const status = '200' // Default status, actual status tracking requires response interceptor

    // Update metrics
    requestCounter.inc({ method, path, status })
    requestDuration.observe(duration, { method, path, status })

    return undefined
  }
}

/**
 * Normalize path for metrics (avoid high cardinality)
 */
function normalizePath(path: string): string {
  // Replace UUIDs
  path = path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')

  // Replace numeric IDs
  path = path.replace(/\/\d+/g, '/:id')

  // Replace long alphanumeric tokens
  path = path.replace(/\/[a-zA-Z0-9]{32,}/g, '/:token')

  return path
}

export { MetricsController } from './MetricsController'
export { Counter, Gauge, Histogram, MetricsRegistry } from './MetricsRegistry'
