import type { SeoConfig } from '../types'
import type { SeoStrategy } from './interfaces'
import { CachedStrategy } from './strategies/CachedStrategy'
import { DynamicStrategy } from './strategies/DynamicStrategy'
import { IncrementalStrategy } from './strategies/IncrementalStrategy'

export class SeoEngine {
  private strategy: SeoStrategy

  /**
   * Create a new SeoEngine instance.
   *
   * @param config - The SEO configuration object.
   * @throws {Error} If the mode specified in config is unknown.
   */
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

  /**
   * Initialize the SEO engine.
   *
   * Initializes the underlying strategy.
   *
   * @returns A promise that resolves when initialization is complete.
   */
  async init(): Promise<void> {
    await this.strategy.init()
  }

  /**
   * Shutdown the SEO engine.
   *
   * Shuts down the underlying strategy if applicable.
   *
   * @returns A promise that resolves when shutdown is complete.
   */
  async shutdown(): Promise<void> {
    if (this.strategy.shutdown) {
      await this.strategy.shutdown()
    }
  }

  /**
   * Get the strategy instance (for direct manipulation like add/remove).
   *
   * @returns The active SeoStrategy instance.
   */
  getStrategy(): SeoStrategy {
    return this.strategy
  }
}
