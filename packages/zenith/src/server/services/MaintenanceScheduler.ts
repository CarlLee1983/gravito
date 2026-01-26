import type { Redis } from 'ioredis'

export interface MaintenanceConfig {
  autoCleanup: boolean
  retentionDays: number
  lastRun?: number
}

export class MaintenanceScheduler {
  private static readonly ONE_DAY = 24 * 60 * 60 * 1000
  private static readonly CHECK_INTERVAL = 3600000 // 1 hour

  constructor(
    private redis: Redis,
    private cleanupCallback: (retentionDays: number) => Promise<number>
  ) {}

  /**
   * Start the maintenance loop
   */
  start(initialDelay = 30000): void {
    setTimeout(() => {
      const loop = async () => {
        try {
          await this.checkMaintenance()
        } catch (err) {
          console.error('[Maintenance] Task Error:', err)
        }
        setTimeout(loop, MaintenanceScheduler.CHECK_INTERVAL)
      }
      loop()
    }, initialDelay)
  }

  /**
   * Check and run maintenance if needed
   */
  private async checkMaintenance(): Promise<void> {
    const config = await this.getConfig()
    if (!config.autoCleanup) {
      return
    }

    const now = Date.now()
    const lastRun = config.lastRun || 0

    if (now - lastRun >= MaintenanceScheduler.ONE_DAY) {
      console.log(
        `[Maintenance] Starting Auto-Cleanup (Retention: ${config.retentionDays} days)...`
      )
      const deleted = await this.cleanupCallback(config.retentionDays)
      console.log(`[Maintenance] Cleanup Complete. Removed ${deleted} records.`)

      await this.saveConfig({
        ...config,
        lastRun: now,
      })
    }
  }

  /**
   * Get maintenance configuration
   */
  async getConfig(): Promise<MaintenanceConfig> {
    const data = await this.redis.get('gravito:zenith:maintenance:config')
    if (data) {
      return JSON.parse(data)
    }
    return { autoCleanup: false, retentionDays: 30 }
  }

  /**
   * Save maintenance configuration
   */
  async saveConfig(config: MaintenanceConfig): Promise<void> {
    await this.redis.set('gravito:zenith:maintenance:config', JSON.stringify(config))
  }
}
