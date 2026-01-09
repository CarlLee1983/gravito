/**
 * @gravito/monitor - Health Controller
 *
 * HTTP handlers for health check endpoints
 */

import type { GravitoContext } from '@gravito/core'
import type { HealthRegistry } from './HealthRegistry'

/**
 * HealthController handles health check HTTP endpoints
 */
export class HealthController {
  constructor(private registry: HealthRegistry) {}

  /**
   * GET /health - Full health check with all registered checks
   */
  async health(c: GravitoContext): Promise<Response> {
    const report = await this.registry.check()

    const status = report.status === 'healthy' ? 200 : report.status === 'degraded' ? 200 : 503

    return c.json(report, status)
  }

  /**
   * GET /ready - Kubernetes readiness probe
   * Returns 200 if ready to serve traffic, 503 otherwise
   */
  async ready(c: GravitoContext): Promise<Response> {
    const result = await this.registry.readiness()

    if (result.status === 'healthy') {
      return c.json({ status: 'ready' }, 200)
    }

    return c.json({ status: 'not_ready', reason: result.reason }, 503)
  }

  /**
   * GET /live - Kubernetes liveness probe
   * Returns 200 if the process is alive
   */
  async live(c: GravitoContext): Promise<Response> {
    const result = await this.registry.liveness()
    return c.json({ status: 'alive' }, result.status === 'healthy' ? 200 : 503)
  }
}
