/**
 * @gravito/monitor - Metrics Controller
 */

import type { GravitoContext } from 'gravito-core'
import type { MetricsRegistry } from './MetricsRegistry'

/**
 * MetricsController handles the /metrics endpoint
 */
export class MetricsController {
  constructor(private registry: MetricsRegistry) {}

  /**
   * GET /metrics - Prometheus metrics endpoint
   */
  async metrics(_c: GravitoContext): Promise<Response> {
    const prometheusFormat = this.registry.toPrometheus()

    return new Response(prometheusFormat, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      },
    })
  }
}
