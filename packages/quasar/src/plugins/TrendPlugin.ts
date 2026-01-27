import type { QuasarAgent } from '../QuasarAgent'
import type { QuasarPlugin } from './QuasarPlugin'

/**
 * TrendPlugin calculates moving averages for queue metrics.
 *
 * It uses Exponential Moving Average (EMA) to smooth out fluctuations
 * and provide a more stable view of queue trends. This is useful for
 * anomaly detection and long-term capacity planning.
 *
 * @class TrendPlugin
 * @implements QuasarPlugin
 * @public
 * @since 8.0.0
 */
export class TrendPlugin implements QuasarPlugin {
  /**
   * Unique identifier for the plugin.
   */
  public name = 'trend'
  private agent?: QuasarAgent
  private emaAlpha: number
  private trends: Map<string, number> = new Map()

  /**
   * @param options - Configuration options
   * @param options.emaAlpha - The smoothing factor for EMA (0 < alpha <= 1). @default 0.3
   */
  constructor(options: { emaAlpha?: number } = {}) {
    this.emaAlpha = options.emaAlpha || 0.3
  }

  onRegister(agent: QuasarAgent): void {
    this.agent = agent
  }

  onStart(agent: QuasarAgent): Promise<void> {
    agent.on('tick', (payload: any) => {
      this.calculateTrends(payload)
    })
    return Promise.resolve()
  }

  onStop(_agent: QuasarAgent): Promise<void> {
    return Promise.resolve()
  }

  /**
   * React to configuration updates at runtime.
   *
   * Allows adjusting the EMA alpha smoothing factor without a plugin restart.
   *
   * @param _agent - The QuasarAgent instance.
   * @param options - Partial configuration options.
   * @since 9.0.0
   */
  onConfigUpdate(_agent: QuasarAgent, options: any): void {
    if (options.plugins?.trend?.emaAlpha) {
      this.emaAlpha = options.plugins.trend.emaAlpha
    }
  }

  private calculateTrends(payload: any) {
    if (!payload.queues || !Array.isArray(payload.queues)) return

    const collector = (this.agent as any).metricsCollector
    if (!collector) return

    for (const queue of payload.queues) {
      const qName = queue.name
      if (!queue.counts) continue

      for (const [key, value] of Object.entries(queue.counts)) {
        if (typeof value !== 'number') continue

        const trendKey = `queue_${qName}_${key}_ema`
        const currentTrend = this.trends.get(trendKey) ?? value

        // EMA Formula: alpha * current + (1 - alpha) * previous_ema
        const newTrend = this.emaAlpha * value + (1 - this.emaAlpha) * currentTrend

        this.trends.set(trendKey, newTrend)

        // Store in metrics collector as a custom gauge
        if (typeof collector.setGauge === 'function') {
          collector.setGauge(trendKey, Math.round(newTrend * 100) / 100)
        }
      }
    }
  }
}
