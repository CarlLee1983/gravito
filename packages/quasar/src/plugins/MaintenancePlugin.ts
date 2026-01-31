import { QUASAR_KEYS } from '../constants'
import type { QuasarAgent } from '../QuasarAgent'
import type { QuasarPlugin } from './QuasarPlugin'

/**
 * Plugin that handles cluster-wide maintenance and cleanup operations.
 *
 * This plugin executes tasks periodically, but ensures that only the designated
 * cluster leader performs the actual work to avoid race conditions and redundant operations.
 *
 * @class MaintenancePlugin
 * @implements QuasarPlugin
 * @public
 * @since 6.0.0
 *
 * @example
 * ```typescript
 * const agent = new QuasarAgent({ service: 'orders', coordination: { enabled: true } });
 * agent.use(new MaintenancePlugin({ interval: 300000 })); // Every 5 minutes
 * ```
 */
export class MaintenancePlugin implements QuasarPlugin {
  /**
   * Unique identifier for the plugin.
   */
  public name = 'maintenance'
  private agent?: QuasarAgent
  private timer?: Timer
  private interval: number

  constructor(options: { interval?: number } = {}) {
    this.interval = options.interval || 60000 // Default 1 minute
  }

  onRegister(agent: QuasarAgent): void {
    this.agent = agent
  }

  onStart(_agent: QuasarAgent): Promise<void> {
    this.timer = setInterval(() => this.runMaintenance(), this.interval)
    return Promise.resolve()
  }

  onStop(_agent: QuasarAgent): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = undefined
    }
    return Promise.resolve()
  }

  private async runMaintenance() {
    if (!this.agent || !this.agent.isLeader()) {
      return
    }

    const logger = (this.agent as any).logger
    logger.debug('[Quasar] Leader running maintenance tasks...')

    try {
      await this.cleanupStaleNodes()
      await this.trimGlobalHistory()
    } catch (err) {
      logger.error('[Quasar] Maintenance tasks failed', err)
    }
  }

  private async cleanupStaleNodes() {
    if (!this.agent) {
      return
    }
    // Stale nodes are currently handled by Redis TTL (EX 30).
    // Custom cleanup logic can be added here if needed.
  }

  private async trimGlobalHistory() {
    if (!this.agent) {
      return
    }
    const redis = (this.agent as any).transportRedis
    const historyKey = `${QUASAR_KEYS.ZENITH_LOG_PREFIX}logs:history`

    // Ensure the global history doesn't grow indefinitely
    // (though LogBuffer already trims, a global trim ensures consistency)
    await redis.ltrim(historyKey, 0, 999)
  }
}
