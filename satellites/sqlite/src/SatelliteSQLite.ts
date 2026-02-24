/**
 * SatelliteSQLite - PlanetCore Integration
 * Integrates SQLite service into Galaxy Architecture
 */

import { SQLiteService } from './services/SQLiteService'
import type { SQLiteServiceConfig } from './types'

export interface SatelliteSQLiteConfig extends SQLiteServiceConfig {
  /**
   * Key to expose in context (default: 'sqlite')
   */
  exposeAs?: string
}

/**
 * SQLite Satellite for PlanetCore
 */
export class SatelliteSQLite {
  name = 'satellite:sqlite'
  private service: SQLiteService | null = null
  private config: SatelliteSQLiteConfig

  constructor(config: SatelliteSQLiteConfig) {
    this.config = {
      exposeAs: 'sqlite',
      ...config,
    }
  }

  /**
   * Configure and create SatelliteSQLite
   */
  static configure(config: SatelliteSQLiteConfig): SatelliteSQLite {
    return new SatelliteSQLite(config)
  }

  /**
   * Install satellite (PlanetCore lifecycle)
   */
  async install(ctx: any): Promise<void> {
    // eslint-disable-line @typescript-eslint/no-explicit-any
    this.service = new SQLiteService(this.config)
    const key = this.config.exposeAs || 'sqlite'
    ctx[key] = this.service
  }

  /**
   * Uninstall satellite
   */
  async uninstall(): Promise<void> {
    if (this.service) {
      await this.service.closeAll()
      this.service = null
    }
  }

  /**
   * Get service instance
   */
  getService(): SQLiteService | null {
    return this.service
  }
}
