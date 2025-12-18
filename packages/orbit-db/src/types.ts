/**
 * Database type.
 */
export type DatabaseType = 'postgresql' | 'sqlite' | 'mysql' | 'auto'

/**
 * Pagination options.
 */
export interface PaginateOptions {
  page: number
  limit: number
  orderBy?: unknown
  orderDirection?: 'asc' | 'desc'
}

/**
 * Pagination result.
 */
export interface PaginateResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

/**
 * Health check result.
 */
export interface HealthCheckResult {
  healthy?: boolean
  status?: string
  message?: string
  duration?: number
  latency?: number
  error?: string
}

/**
 * Query log info.
 */
export interface QueryLogInfo {
  query: string
  params: unknown[]
  duration: number
  timestamp: number
  error?: string
}

/**
 * Migration result.
 */
export interface MigrateResult {
  success: boolean
  migrationsApplied?: number
  appliedMigrations?: string[]
  message?: string
  error?: string
}

/**
 * Seed function.
 */
export type SeedFunction = (db: any) => Promise<void>

/**
 * Seed result.
 */
export interface SeedResult {
  success: boolean
  seedName?: string
  seededFiles?: string[]
  message?: string
  error?: string
}

/**
 * Deployment options.
 */
export interface DeployOptions {
  skipHealthCheck?: boolean
  skipMigrations?: boolean
  skipSeeding?: boolean
  runMigrations?: boolean
  runSeeds?: boolean
  validateBeforeDeploy?: boolean
}

/**
 * Deployment result.
 */
export interface DeployResult {
  success: boolean
  healthCheck?: HealthCheckResult
  migrations?: MigrateResult
  seeding?: SeedResult[]
  seeds?: SeedResult | SeedResult[]
  message?: string
  duration?: number
  error?: string
}

/**
 * Relation query options.
 */
export interface RelationOptions {
  [relationName: string]: boolean | RelationOptions
}

/**
 * Upsert options.
 */
export interface UpsertOptions {
  conflictColumns?: string[]
  updateColumns?: string[]
  excludeColumns?: string[]
}

/**
 * Increment/Decrement options.
 */
export interface IncrementOptions {
  amount?: number
}

/**
 * Truncate options.
 */
export interface TruncateOptions {
  cascade?: boolean
  restartIdentity?: boolean
}

/**
 * Lock options.
 */
export interface LockOptions {
  nowait?: boolean
  skipLocked?: boolean
}

/**
 * Execute options.
 */
export interface ExecuteOptions {
  params?: unknown[]
}

/**
 * Event source info.
 */
export interface EventSource {
  file?: string
  line?: number
  method?: string
  stack?: string
}
