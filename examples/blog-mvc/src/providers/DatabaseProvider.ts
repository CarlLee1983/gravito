/**
 * Database Service Provider
 *
 * Handles database initialization and seeding.
 * Encapsulates all database-related bootstrap logic.
 *
 * Lifecycle:
 * - register(): Bind database config to container
 * - boot(): Run migrations and seeders
 */

import { type Container, type PlanetCore, ServiceProvider } from '@gravito/core'
import { databaseConfig } from '../config/database'
import { initializeDatabase } from '../database/init'

export class DatabaseProvider extends ServiceProvider {
  /**
   * Register database configuration.
   */
  register(_container: Container): void {
    if (this.core?.config) {
      this.mergeConfig(this.core.config, 'database', databaseConfig)
    }
  }

  /**
   * Initialize database schema and seed data.
   */
  async boot(core: PlanetCore): Promise<void> {
    await initializeDatabase(core)
    core.logger.info('📦 Database initialized')
  }
}
