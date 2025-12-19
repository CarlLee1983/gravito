import type { PlanetCore } from 'gravito-core'
import { EventBus } from './EventBus'
import type {
  DatabaseType,
  DeployOptions,
  DeployResult,
  HealthCheckResult,
  LockOptions,
  MigrateResult,
  PaginateOptions,
  PaginateResult,
  RelationOptions,
  SeedFunction,
  SeedResult,
  TruncateOptions,
  UpsertOptions,
} from './types'
type DrizzleDB = any
type Transaction = any
type Table = any
type WhereCondition = any
/**
 * Database service interface.
 */
export interface DBService {
  readonly raw: DrizzleDB
  transaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T>
  findById<T>(table: Table, id: unknown): Promise<T | null>
  findOne<T>(table: Table, where: WhereCondition): Promise<T | null>
  findAll<T>(
    table: Table,
    where?: WhereCondition,
    options?: {
      limit?: number
      orderBy?: unknown
      orderDirection?: 'asc' | 'desc'
    }
  ): Promise<T[]>
  count(table: Table, where?: WhereCondition): Promise<number>
  exists(table: Table, where: WhereCondition): Promise<boolean>
  paginate<T>(table: Table, options: PaginateOptions): Promise<PaginateResult<T>>
  findByIdWith<T>(tableName: string, id: unknown, relations: RelationOptions): Promise<T | null>
  findOneWith<T>(
    tableName: string,
    where: WhereCondition,
    relations: RelationOptions
  ): Promise<T | null>
  findAllWith<T>(
    tableName: string,
    relations: RelationOptions,
    options?: {
      where?: WhereCondition
      limit?: number
      orderBy?: unknown
      orderDirection?: 'asc' | 'desc'
    }
  ): Promise<T[]>
  create<T>(table: Table, data: Partial<T>): Promise<T>
  insert<T>(table: Table, data: Partial<T> | Partial<T>[]): Promise<T | T[]>
  update<T>(table: Table, where: WhereCondition, data: Partial<T>): Promise<T[]>
  delete(table: Table, where: WhereCondition): Promise<void>
  bulkInsert<T>(table: Table, data: Partial<T>[]): Promise<T[]>
  bulkUpdate<T>(
    table: Table,
    updates: Array<{
      where: WhereCondition
      data: Partial<T>
    }>
  ): Promise<T[]>
  bulkDelete(table: Table, whereConditions: WhereCondition[]): Promise<void>
  upsert<T>(table: Table, data: Partial<T>, options?: UpsertOptions): Promise<T>
  increment<T>(table: Table, where: WhereCondition, column: string, amount?: number): Promise<T[]>
  decrement<T>(table: Table, where: WhereCondition, column: string, amount?: number): Promise<T[]>
  firstOrCreate<T>(table: Table, where: WhereCondition, data: Partial<T>): Promise<T>
  firstOrNew<T>(table: Table, where: WhereCondition, data: Partial<T>): Promise<T>
  updateOrCreate<T>(table: Table, where: WhereCondition, data: Partial<T>): Promise<T>
  truncate(table: Table, options?: TruncateOptions): Promise<void>
  sum(table: Table, column: string, where?: WhereCondition): Promise<number>
  avg(table: Table, column: string, where?: WhereCondition): Promise<number>
  min(table: Table, column: string, where?: WhereCondition): Promise<unknown>
  max(table: Table, column: string, where?: WhereCondition): Promise<unknown>
  lockForUpdate<T>(table: Table, where: WhereCondition, options?: LockOptions): Promise<T[]>
  sharedLock<T>(table: Table, where: WhereCondition, options?: LockOptions): Promise<T[]>
  execute<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>
  healthCheck(): Promise<HealthCheckResult>
  migrate(): Promise<MigrateResult>
  migrateTo(targetMigration?: string): Promise<MigrateResult>
  seed(seedFunction: SeedFunction, seedName?: string): Promise<SeedResult>
  seedMany(
    seedFunctions: Array<{
      name: string
      seed: SeedFunction
    }>
  ): Promise<SeedResult>
  deploy(options?: DeployOptions): Promise<DeployResult>
}
/**
 * Database service implementation.
 */
export declare class DBServiceImpl implements DBService {
  private db
  private core
  private databaseType
  private enableQueryLogging
  private queryLogLevel
  private enableHealthCheck
  private healthCheckQuery
  private queryLogs
  private currentTransaction
  private eventBus
  constructor(
    db: DrizzleDB,
    core: PlanetCore,
    databaseType: DatabaseType,
    enableQueryLogging: boolean,
    queryLogLevel: 'debug' | 'info' | 'warn' | 'error',
    enableHealthCheck: boolean,
    healthCheckQuery: string
  )
  get raw(): DrizzleDB
  /**
   * Get the EventBus instance.
   */
  get events(): EventBus
  /**
   * Emit an event (with source tracking).
   */
  protected emitEvent(event: string, payload: any): Promise<void>
  /**
   * Execute a transaction.
   */
  transaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T>
  /**
   * Find a single record by ID.
   */
  findById<T>(table: Table, id: unknown): Promise<T | null>
  /**
   * Find a single record.
   */
  findOne<T>(table: Table, where: WhereCondition): Promise<T | null>
  /**
   * Find all records.
   */
  findAll<T>(
    table: Table,
    where?: WhereCondition,
    options?: {
      limit?: number
      orderBy?: unknown
      orderDirection?: 'asc' | 'desc'
    }
  ): Promise<T[]>
  /**
   * Count records.
   */
  count(table: Table, where?: WhereCondition): Promise<number>
  /**
   * Check whether a record exists.
   */
  exists(table: Table, where: WhereCondition): Promise<boolean>
  /**
   * Find a record by ID with relations.
   * Note: this uses Drizzle's query API; relations must be defined first.
   */
  findByIdWith<T>(tableName: string, id: unknown, relations: RelationOptions): Promise<T | null>
  /**
   * Find a single record with relations.
   * Note: this uses Drizzle's query API; relations must be defined first.
   */
  findOneWith<T>(
    tableName: string,
    where: WhereCondition,
    relations: RelationOptions
  ): Promise<T | null>
  /**
   * Find all records with relations.
   * Note: this uses Drizzle's query API; relations must be defined first.
   */
  findAllWith<T>(
    tableName: string,
    relations: RelationOptions,
    options?: {
      where?: WhereCondition
      limit?: number
      orderBy?: unknown
      orderDirection?: 'asc' | 'desc'
    }
  ): Promise<T[]>
  /**
   * Create a single record.
   */
  create<T>(table: Table, data: Partial<T>): Promise<T>
  /**
   * Insert records (single or multiple).
   */
  insert<T>(table: Table, data: Partial<T> | Partial<T>[]): Promise<T | T[]>
  /**
   * Update records.
   */
  update<T>(table: Table, where: WhereCondition, data: Partial<T>): Promise<T[]>
  /**
   * Delete records.
   */
  delete(table: Table, where: WhereCondition): Promise<void>
  /**
   * Bulk insert.
   */
  bulkInsert<T>(table: Table, data: Partial<T>[]): Promise<T[]>
  /**
   * Bulk update.
   */
  bulkUpdate<T>(
    table: Table,
    updates: Array<{
      where: WhereCondition
      data: Partial<T>
    }>
  ): Promise<T[]>
  /**
   * Bulk delete.
   */
  bulkDelete(table: Table, whereConditions: WhereCondition[]): Promise<void>
  /**
   * Paginate (optimized for PostgreSQL).
   * Note: this implementation is simplified; Drizzle count APIs can vary by version.
   */
  paginate<T>(table: Table, options: PaginateOptions): Promise<PaginateResult<T>>
  /**
   * Health check (PostgreSQL optimized: `SELECT 1`).
   */
  healthCheck(): Promise<HealthCheckResult>
  /**
   * Run database migrations (apply all pending migrations).
   */
  migrate(): Promise<MigrateResult>
  /**
   * Migrate to a target migration.
   */
  migrateTo(targetMigration?: string): Promise<MigrateResult>
  /**
   * Run seed data.
   */
  seed(seedFunction: SeedFunction, seedName?: string): Promise<SeedResult>
  /**
   * Run multiple seed functions.
   */
  seedMany(
    seedFunctions: Array<{
      name: string
      seed: SeedFunction
    }>
  ): Promise<SeedResult>
  /**
   * Deploy database (migrations and seeding).
   */
  deploy(options?: DeployOptions): Promise<DeployResult>
  /**
   * Get table name (helper).
   */
  private getTableName
  /**
   * Log queries (async, non-blocking).
   */
  private logQuery
  /**
   * Upsert (insert or update).
   * If the record exists, update it; otherwise insert.
   */
  upsert<T>(table: Table, data: Partial<T>, options?: UpsertOptions): Promise<T>
  /**
   * Increment a numeric column (atomic).
   */
  increment<T>(table: Table, where: WhereCondition, column: string, amount?: number): Promise<T[]>
  /**
   * Decrement a numeric column (atomic).
   */
  decrement<T>(table: Table, where: WhereCondition, column: string, amount?: number): Promise<T[]>
  /**
   * Find or create.
   */
  firstOrCreate<T>(table: Table, where: WhereCondition, data: Partial<T>): Promise<T>
  /**
   * Find or instantiate (without persisting).
   */
  firstOrNew<T>(table: Table, where: WhereCondition, data: Partial<T>): Promise<T>
  /**
   * Update or create.
   */
  updateOrCreate<T>(table: Table, where: WhereCondition, data: Partial<T>): Promise<T>
  /**
   * Truncate table.
   */
  truncate(table: Table, options?: TruncateOptions): Promise<void>
  /**
   * Aggregate: sum.
   */
  sum(table: Table, column: string, where?: WhereCondition): Promise<number>
  /**
   * Aggregate: average.
   */
  avg(table: Table, column: string, where?: WhereCondition): Promise<number>
  /**
   * Aggregate: minimum.
   */
  min(table: Table, column: string, where?: WhereCondition): Promise<unknown>
  /**
   * Aggregate: maximum.
   */
  max(table: Table, column: string, where?: WhereCondition): Promise<unknown>
  /**
   * Lock rows (FOR UPDATE).
   */
  lockForUpdate<T>(table: Table, where: WhereCondition, options?: LockOptions): Promise<T[]>
  /**
   * Shared lock (FOR SHARE).
   */
  sharedLock<T>(table: Table, where: WhereCondition, options?: LockOptions): Promise<T[]>
  /**
   * Execute raw SQL.
   */
  execute<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>
}
/**
 * Detect database type.
 */
export declare function detectDatabaseType(db: DrizzleDB): DatabaseType
//# sourceMappingURL=DBService.d.ts.map
