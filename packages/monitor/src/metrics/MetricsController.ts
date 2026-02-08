/**
 * @gravito/monitor - Metrics Controller
 */

import type { GravitoContext } from '@gravito/core'
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
    // 更新 health cache metrics（如果已註冊）
    this.updateHealthCacheMetrics()

    const prometheusFormat = this.registry.toPrometheus()

    return new Response(prometheusFormat, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      },
    })
  }

  /**
   * 更新 health cache metrics
   *
   * 從 HealthRegistry 讀取最新的 cache 統計並更新 gauges
   */
  private updateHealthCacheMetrics(): void {
    const healthMetrics = (this.registry as any)._healthCacheMetrics
    if (!healthMetrics) {
      return
    }

    const stats = healthMetrics.registry.getCacheStats()

    // 更新 gauges
    healthMetrics.hits.set(stats.hits)
    healthMetrics.misses.set(stats.misses)
    healthMetrics.hitRate.set(stats.hitRate)
  }
}
