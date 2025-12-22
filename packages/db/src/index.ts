import type { GravitoContext, GravitoNext, GravitoOrbit, PlanetCore } from 'gravito-core'
import { DBServiceImpl, detectDatabaseType } from './DBService'
import { ModelRegistry } from './Model'
import type { DatabaseType } from './types'

export interface OrbitDBOptions<TSchema extends Record<string, unknown> = Record<string, unknown>> {
  // biome-ignore lint/suspicious/noExplicitAny: generic db instance
  db: any
  schema?: TSchema
  exposeAs?: string
  enableQueryLogging?: boolean
  queryLogLevel?: 'debug' | 'info' | 'warn' | 'error'
  enableHealthCheck?: boolean
  healthCheckQuery?: string
  databaseType?: DatabaseType
}

/**
 * Standard Database Orbit (Class Implementation)
 */
export class OrbitDB implements GravitoOrbit {
  constructor(private options?: OrbitDBOptions) {}

  install(core: PlanetCore): void {
    // Try to resolve config from core if not provided in constructor
    const config = this.options || core.config.get('db')

    if (!config || !config.db) {
      throw new Error(
        '[OrbitDB] No database configuration found. Please provide options or set "db" in core config.'
      )
    }

    const {
      db,
      exposeAs = 'db',
      enableQueryLogging = false,
      queryLogLevel = 'debug',
      enableHealthCheck = true,
      healthCheckQuery,
      databaseType: providedDatabaseType,
    } = config

    // Detect database type.
    const databaseType =
      providedDatabaseType === 'auto' || !providedDatabaseType
        ? detectDatabaseType(db)
        : providedDatabaseType

    // Set health check query based on database type (PostgreSQL prioritized).
    const defaultHealthCheckQuery =
      healthCheckQuery || (databaseType === 'postgresql' ? 'SELECT 1' : 'SELECT 1')

    core.logger.info(
      `[OrbitDB] Initializing database integration (Exposed as: ${exposeAs}, Type: ${databaseType})`
    )

    // Create DBService.
    const dbService = new DBServiceImpl(
      db,
      core,
      databaseType,
      enableQueryLogging,
      queryLogLevel,
      enableHealthCheck,
      defaultHealthCheckQuery
    )

    // 1. Initialize all registered Models.
    ModelRegistry.initialize(dbService)

    // 2. Set core instance on all Models (for emitting events).
    if (core) {
      ModelRegistry.setCore(core)
    }

    // 3. Action: Database Connected
    core.hooks.doAction('db:connected', { db, dbService, databaseType })

    // 3. Middleware injection - inject DBService (keep backward compatibility via `raw` access).
    core.adapter.use('*', async (c: GravitoContext, next: GravitoNext) => {
      c.set(exposeAs, dbService)
      await next()
      return undefined
    })
  }
}

/**
 * Standard Database Orbit (Functional Wrapper)
 */
export default function orbitDB<TSchema extends Record<string, unknown>>(
  core: PlanetCore,
  options: OrbitDBOptions<TSchema>
) {
  const orbit = new OrbitDB(options)
  orbit.install(core)
  // Return raw db instance for backward compatibility.
  return { db: options.db }
}

export type { DBService } from './DBService'
export { DBServiceImpl, detectDatabaseType } from './DBService'
export type { MigrationDriver, MigrationResult } from './MigrationDriver'
export { DrizzleMigrationDriver } from './MigrationDriver'
export type { ModelStatic } from './Model'
export { Model, ModelRegistry } from './Model'
// Export types and services
export type {
  DatabaseType,
  DeployOptions,
  DeployResult,
  HealthCheckResult,
  MigrateResult,
  PaginateOptions,
  PaginateResult,
  QueryLogInfo,
  RelationOptions,
  SeedFunction,
  SeedResult,
} from './types'
