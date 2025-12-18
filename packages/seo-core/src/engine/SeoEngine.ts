import type { SeoConfig } from '../types'
import type { SeoStrategy } from './interfaces'
import { CachedStrategy } from './strategies/CachedStrategy'
import { DynamicStrategy } from './strategies/DynamicStrategy'
import { IncrementalStrategy } from './strategies/IncrementalStrategy'

export class SeoEngine {
  private strategy: SeoStrategy

  constructor(config: SeoConfig) {
    switch (config.mode) {
      case 'dynamic':
        this.strategy = new DynamicStrategy(config)
        break
      case 'cached':
        this.strategy = new CachedStrategy(config)
        break
      case 'incremental':
        this.strategy = new IncrementalStrategy(config)
        break
      default:
        throw new Error(`[GravitoSeo] Unknown mode: ${config.mode}`)
    }
  }

  async init(): Promise<void> {
    await this.strategy.init()
  }

  async shutdown(): Promise<void> {
    if (this.strategy.shutdown) {
      await this.strategy.shutdown()
    }
  }

  /**
   * Get the strategy instance (for direct manipulation like add/remove)
   */
  getStrategy(): SeoStrategy {
    return this.strategy
  }
}
