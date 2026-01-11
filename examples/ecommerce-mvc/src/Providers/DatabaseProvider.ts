/**
 * Database Provider
 *
 * Handles database initialization and schema setup.
 */

import { type Blueprint, Schema } from '@gravito/atlas'
import { ServiceProvider } from '@gravito/core'

export class DatabaseProvider extends ServiceProvider {
  register() {
    // Database services are registered by OrbitAtlas
  }

  async boot() {
    await this.initializeSchema()
  }

  private async initializeSchema() {
    // Create products table if not exists
    if (!(await Schema.hasTable('products'))) {
      await Schema.create('products', (table: Blueprint) => {
        table.id()
        table.string('name')
        table.decimal('price')
        table.string('category').nullable()
        table.timestamps()
      })
    }
  }
}
