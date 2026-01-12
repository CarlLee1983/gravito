/**
 * Database Provider
 *
 * Handles database initialization and schema setup.
 */

import { ServiceProvider } from '@gravito/core'
import { runMigrations } from '../../database/migrations'
import { runSeeders } from '../../database/seeders'

export class DatabaseProvider extends ServiceProvider {
  register() {
    // Database services are registered by OrbitAtlas
  }

  async boot() {
    // Run migrations
    await runMigrations()

    // Run seeders (development only)
    if (process.env.NODE_ENV !== 'production') {
      await runSeeders()
    }
  }
}
