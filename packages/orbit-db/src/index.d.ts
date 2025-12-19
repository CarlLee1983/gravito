import type { GravitoOrbit, PlanetCore } from 'gravito-core'
import type { DatabaseType } from './types'
export interface OrbitDBOptions<TSchema extends Record<string, unknown> = Record<string, unknown>> {
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
export declare class OrbitDB implements GravitoOrbit {
  private options?
  constructor(options?: OrbitDBOptions | undefined)
  install(core: PlanetCore): void
}
/**
 * Standard Database Orbit (Functional Wrapper)
 */
export default function orbitDB<TSchema extends Record<string, unknown>>(
  core: PlanetCore,
  options: OrbitDBOptions<TSchema>
): {
  db: any
}
export type { DBService } from './DBService'
export { DBServiceImpl, detectDatabaseType } from './DBService'
export type { MigrationDriver, MigrationResult } from './MigrationDriver'
export { DrizzleMigrationDriver } from './MigrationDriver'
export type { ModelStatic } from './Model'
export { Model, ModelRegistry } from './Model'
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
//# sourceMappingURL=index.d.ts.map
