import type { QuasarAgent } from '../QuasarAgent'
import { BufferPool } from '../utils/BufferPool'
import type { QuasarPlugin } from './QuasarPlugin'

/**
 * DiagnosticPlugin provides internal health and performance diagnostics for the Quasar agent.
 *
 * It monitors critical internal metrics such as object pool saturation, buffer accumulation,
 * and event loop lag. These diagnostics are vital for identifying performance bottlenecks
 * or resource leaks in high-throughput monitoring scenarios.
 *
 * @public
 * @since 10.0.0
 *
 * @example
 * ```typescript
 * agent.use(new DiagnosticPlugin());
 * ```
 */
export class DiagnosticPlugin implements QuasarPlugin {
  /**
   * Unique identifier for the diagnostic plugin.
   */
  public name = 'diagnostic'
  private agent?: QuasarAgent
  private lastLoopTick = Date.now()
  private loopLag = 0
  private timer?: Timer

  /**
   * Register the plugin with the agent instance.
   *
   * @param agent - The QuasarAgent instance.
   */
  onRegister(agent: QuasarAgent): void {
    this.agent = agent
  }

  /**
   * Start diagnostic monitoring when the agent starts.
   *
   * @param agent - The QuasarAgent instance.
   * @returns A promise that resolves when monitoring has started.
   */
  onStart(agent: QuasarAgent): Promise<void> {
    this.monitorLoopLag()
    agent.on('tick', () => {
      this.collectDiagnostics()
    })
    return Promise.resolve()
  }

  /**
   * Stop diagnostic monitoring and cleanup resources.
   *
   * @returns A promise that resolves when cleanup is complete.
   */
  onStop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer)
    }
    return Promise.resolve()
  }

  /**
   * Initialize event loop lag monitoring.
   *
   * Uses a high-frequency interval to detect delays in the Node.js/Bun event loop.
   */
  private monitorLoopLag() {
    this.lastLoopTick = Date.now()
    this.timer = setInterval(() => {
      const now = Date.now()
      this.loopLag = Math.max(0, now - this.lastLoopTick - 1000)
      this.lastLoopTick = now
    }, 1000)
    this.timer.unref?.()
  }

  /**
   * Collect and publish internal diagnostics to the metrics collector.
   *
   * Aggregates stats from BufferPool, event loop lag, and log buffers.
   */
  private collectDiagnostics() {
    const collector = (this.agent as any).metricsCollector
    if (!collector) {
      return
    }

    const poolStats = BufferPool.getStats()
    for (const [size, stats] of Object.entries(poolStats)) {
      collector.setGauge(`pool_${size}_used`, (stats as any).used)
      collector.setGauge(`pool_${size}_total`, (stats as any).total)
    }

    collector.setGauge('event_loop_lag_ms', this.loopLag)

    const bridges = (this.agent as any).bridges || []
    let totalBuffered = 0
    for (const bridge of bridges) {
      const buffer = (bridge as any).logBuffer
      if (buffer) {
        totalBuffered += (buffer as any).buffer.length
      }
    }
    collector.setGauge('bridge_buffer_size', totalBuffered)
  }
}
