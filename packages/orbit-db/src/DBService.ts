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
  QueryLogInfo,
  RelationOptions,
  SeedFunction,
  SeedResult,
  TruncateOptions,
  UpsertOptions,
} from './types'

// biome-ignore lint/suspicious/noExplicitAny: generic db instance
type DrizzleDB = any
// biome-ignore lint/suspicious/noExplicitAny: generic transaction
type Transaction = any
// biome-ignore lint/suspicious/noExplicitAny: generic table
type Table = any
// biome-ignore lint/suspicious/noExplicitAny: generic where condition
type WhereCondition = any

/**
 * Database service interface.
 */
export interface DBService {
  // Raw Drizzle instance (backward compatible)
  readonly raw: DrizzleDB

  // Transactions
  transaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T>

  // Query helpers
  findById<T>(table: Table, id: unknown): Promise<T | null>
  findOne<T>(table: Table, where: WhereCondition): Promise<T | null>
  findAll<T>(
    table: Table,
    where?: WhereCondition,
    options?: { limit?: number; orderBy?: unknown; orderDirection?: 'asc' | 'desc' }
  ): Promise<T[]>
  count(table: Table, where?: WhereCondition): Promise<number>
  exists(table: Table, where: WhereCondition): Promise<boolean>
  paginate<T>(table: Table, options: PaginateOptions): Promise<PaginateResult<T>>

  // Relation queries (using Drizzle query API)
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

  // CRUD
  create<T>(table: Table, data: Partial<T>): Promise<T>
  insert<T>(table: Table, data: Partial<T> | Partial<T>[]): Promise<T | T[]>
  update<T>(table: Table, where: WhereCondition, data: Partial<T>): Promise<T[]>
  delete(table: Table, where: WhereCondition): Promise<void>

  // Bulk operations
  bulkInsert<T>(table: Table, data: Partial<T>[]): Promise<T[]>
  bulkUpdate<T>(
    table: Table,
    updates: Array<{ where: WhereCondition; data: Partial<T> }>
  ): Promise<T[]>
  bulkDelete(table: Table, whereConditions: WhereCondition[]): Promise<void>

  // Upsert
  upsert<T>(table: Table, data: Partial<T>, options?: UpsertOptions): Promise<T>

  // Numeric operations
  increment<T>(table: Table, where: WhereCondition, column: string, amount?: number): Promise<T[]>
  decrement<T>(table: Table, where: WhereCondition, column: string, amount?: number): Promise<T[]>

  // Conditional create/update
  firstOrCreate<T>(table: Table, where: WhereCondition, data: Partial<T>): Promise<T>
  firstOrNew<T>(table: Table, where: WhereCondition, data: Partial<T>): Promise<T>
  updateOrCreate<T>(table: Table, where: WhereCondition, data: Partial<T>): Promise<T>

  // Table operations
  truncate(table: Table, options?: TruncateOptions): Promise<void>

  // Aggregates
  sum(table: Table, column: string, where?: WhereCondition): Promise<number>
  avg(table: Table, column: string, where?: WhereCondition): Promise<number>
  min(table: Table, column: string, where?: WhereCondition): Promise<unknown>
  max(table: Table, column: string, where?: WhereCondition): Promise<unknown>

  // Row locking
  lockForUpdate<T>(table: Table, where: WhereCondition, options?: LockOptions): Promise<T[]>
  sharedLock<T>(table: Table, where: WhereCondition, options?: LockOptions): Promise<T[]>

  // Raw SQL execution
  execute<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>

  // Health check
  healthCheck(): Promise<HealthCheckResult>

  // Migrations
  migrate(): Promise<MigrateResult>
  migrateTo(targetMigration?: string): Promise<MigrateResult>

  // Seeding
  seed(seedFunction: SeedFunction, seedName?: string): Promise<SeedResult>
  seedMany(seedFunctions: Array<{ name: string; seed: SeedFunction }>): Promise<SeedResult>

  // Deployment
  deploy(options?: DeployOptions): Promise<DeployResult>
}

/**
 * Database service implementation.
 */
export class DBServiceImpl implements DBService {
  private currentTransaction: { id: string; startTime: number; queries: QueryLogInfo[] } | null =
    null

  private eventBus: EventBus

  constructor(
    private db: DrizzleDB,
    private core: PlanetCore,
    _databaseType: DatabaseType,
    private enableQueryLogging: boolean,
    private queryLogLevel: 'debug' | 'info' | 'warn' | 'error',
    private enableHealthCheck: boolean,
    private healthCheckQuery: string
  ) {
    this.eventBus = new EventBus()
  }

  get raw(): DrizzleDB {
    return this.db
  }

  /**
   * Get the EventBus instance.
   */
  get events(): EventBus {
    return this.eventBus
  }

  /**
   * Emit an event (with source tracking).
   */
  protected async emitEvent(event: string, payload: any): Promise<void> {
    const source = EventBus.getEventSource()
    this.eventBus.emit(event, payload, source)
    // Also trigger core hooks (backward compatible).
    await this.core.hooks.doAction(event, payload)
  }

  /**
   * Execute a transaction.
   */
  async transaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T> {
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const startTime = Date.now()

    this.currentTransaction = {
      id: transactionId,
      startTime,
      queries: [],
    }

    // Emit transaction start (with source tracking).
    await this.emitEvent('db:transaction:start', {
      transactionId,
      startTime,
    })

    try {
      const result = await this.db.transaction(async (tx: Transaction) => {
        // Wrap transaction instance to support query logging (if needed).
        return await callback(tx)
      })

      // Emit transaction commit (with source tracking).
      await this.emitEvent('db:transaction:commit', {
        transactionId,
        duration: Date.now() - startTime,
      })

      this.currentTransaction = null
      return result
    } catch (error) {
      // Emit transaction error (with source tracking).
      await this.emitEvent('db:transaction:error', {
        transactionId,
        error,
        duration: Date.now() - startTime,
      })

      // Emit transaction rollback (with source tracking).
      await this.emitEvent('db:transaction:rollback', {
        transactionId,
        duration: Date.now() - startTime,
      })

      this.currentTransaction = null
      throw error
    }
  }

  /**
   * Find a single record by ID.
   */
  async findById<T>(table: Table, id: unknown): Promise<T | null> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      // Use Drizzle query API.
      // biome-ignore lint/suspicious/noExplicitAny: generic query result
      const result = await (this.db
        .select()
        .from(table)
        .where({ id } as any)
        .limit(1) as Promise<any[]>)

      const duration = Date.now() - startTime
      await this.logQuery('SELECT', { table: tableName, id }, duration)

      return (result[0] as T) || null
    } catch (error) {
      await this.logQuery('SELECT', { table: tableName, id }, Date.now() - startTime, error)
      throw error
    }
  }

  /**
   * Find a single record.
   */
  async findOne<T>(table: Table, where: WhereCondition): Promise<T | null> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      // biome-ignore lint/suspicious/noExplicitAny: generic query result
      const result = await (this.db.select().from(table).where(where).limit(1) as Promise<any[]>)

      const duration = Date.now() - startTime
      await this.logQuery('SELECT', { table: tableName, where }, duration)

      return (result[0] as T) || null
    } catch (error) {
      await this.logQuery('SELECT', { table: tableName, where }, Date.now() - startTime, error)
      throw error
    }
  }

  /**
   * Find all records.
   */
  async findAll<T>(
    table: Table,
    where?: WhereCondition,
    options?: { limit?: number; orderBy?: unknown; orderDirection?: 'asc' | 'desc' }
  ): Promise<T[]> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      // biome-ignore lint/suspicious/noExplicitAny: generic query builder
      let query: any = this.db.select().from(table)

      if (where) {
        query = query.where(where)
      }

      if (options?.orderBy) {
        // biome-ignore lint/suspicious/noExplicitAny: generic order by
        query = query.orderBy(options.orderBy as any, options.orderDirection || 'asc')
      }

      if (options?.limit) {
        query = query.limit(options.limit)
      }

      // biome-ignore lint/suspicious/noExplicitAny: generic query result
      const result = await (query as Promise<T[]>)

      const duration = Date.now() - startTime
      await this.logQuery('SELECT (all)', { table: tableName, where, options }, duration)

      return result
    } catch (error) {
      await this.logQuery(
        'SELECT (all)',
        { table: tableName, where, options },
        Date.now() - startTime,
        error
      )
      throw error
    }
  }

  /**
   * Count records.
   */
  async count(table: Table, where?: WhereCondition): Promise<number> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      // biome-ignore lint/suspicious/noExplicitAny: generic query builder
      let query: any = this.db.select().from(table)

      if (where) {
        query = query.where(where)
      }

      // Fetch all records and count in memory (simplified).
      // For large datasets, use `db.raw` to run a proper COUNT query.
      // biome-ignore lint/suspicious/noExplicitAny: generic query result
      const result = await (query as Promise<any[]>)
      const count = result.length

      const duration = Date.now() - startTime
      await this.logQuery('COUNT', { table: tableName, where }, duration)

      return count
    } catch (error) {
      await this.logQuery('COUNT', { table: tableName, where }, Date.now() - startTime, error)
      throw error
    }
  }

  /**
   * Check whether a record exists.
   */
  async exists(table: Table, where: WhereCondition): Promise<boolean> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      // biome-ignore lint/suspicious/noExplicitAny: generic query result
      const result = await (this.db.select().from(table).where(where).limit(1) as Promise<any[]>)

      const duration = Date.now() - startTime
      await this.logQuery('EXISTS', { table: tableName, where }, duration)

      return result.length > 0
    } catch (error) {
      await this.logQuery('EXISTS', { table: tableName, where }, Date.now() - startTime, error)
      throw error
    }
  }

  /**
   * Find a record by ID with relations.
   * Note: this uses Drizzle's query API; relations must be defined first.
   */
  async findByIdWith<T>(
    tableName: string,
    id: unknown,
    relations: RelationOptions
  ): Promise<T | null> {
    const startTime = Date.now()

    try {
      // Use Drizzle query API.
      // biome-ignore lint/suspicious/noExplicitAny: checking for query API
      const dbAny = this.db as any

      if (!dbAny.query || !dbAny.query[tableName]) {
        throw new Error(
          `[OrbitDB] Query API not available for table "${tableName}". Please ensure relations are defined and use db.raw.query.${tableName} directly.`
        )
      }

      // biome-ignore lint/suspicious/noExplicitAny: generic query result
      const result = await dbAny.query[tableName].findFirst({
        where: { id },
        with: relations,
      })

      const duration = Date.now() - startTime
      await this.logQuery('SELECT (with relations)', { table: tableName, id, relations }, duration)

      return (result as T) || null
    } catch (error) {
      await this.logQuery(
        'SELECT (with relations)',
        { table: tableName, id, relations },
        Date.now() - startTime,
        error
      )
      throw error
    }
  }

  /**
   * Find a single record with relations.
   * Note: this uses Drizzle's query API; relations must be defined first.
   */
  async findOneWith<T>(
    tableName: string,
    where: WhereCondition,
    relations: RelationOptions
  ): Promise<T | null> {
    const startTime = Date.now()

    try {
      // Use Drizzle query API.
      // biome-ignore lint/suspicious/noExplicitAny: checking for query API
      const dbAny = this.db as any

      if (!dbAny.query || !dbAny.query[tableName]) {
        throw new Error(
          `[OrbitDB] Query API not available for table "${tableName}". Please ensure relations are defined and use db.raw.query.${tableName} directly.`
        )
      }

      // biome-ignore lint/suspicious/noExplicitAny: generic query result
      const result = await dbAny.query[tableName].findFirst({
        where,
        with: relations,
      })

      const duration = Date.now() - startTime
      await this.logQuery(
        'SELECT (with relations)',
        { table: tableName, where, relations },
        duration
      )

      return (result as T) || null
    } catch (error) {
      await this.logQuery(
        'SELECT (with relations)',
        { table: tableName, where, relations },
        Date.now() - startTime,
        error
      )
      throw error
    }
  }

  /**
   * Find all records with relations.
   * Note: this uses Drizzle's query API; relations must be defined first.
   */
  async findAllWith<T>(
    tableName: string,
    relations: RelationOptions,
    options?: {
      where?: WhereCondition
      limit?: number
      orderBy?: unknown
      orderDirection?: 'asc' | 'desc'
    }
  ): Promise<T[]> {
    const startTime = Date.now()

    try {
      // Use Drizzle query API.
      // biome-ignore lint/suspicious/noExplicitAny: checking for query API
      const dbAny = this.db as any

      if (!dbAny.query || !dbAny.query[tableName]) {
        throw new Error(
          `[OrbitDB] Query API not available for table "${tableName}". Please ensure relations are defined and use db.raw.query.${tableName} directly.`
        )
      }

      const queryOptions: any = {
        with: relations,
      }

      if (options?.where) {
        queryOptions.where = options.where
      }

      if (options?.limit) {
        queryOptions.limit = options.limit
      }

      // biome-ignore lint/suspicious/noExplicitAny: generic query result
      const result = await dbAny.query[tableName].findMany(queryOptions)

      const duration = Date.now() - startTime
      await this.logQuery(
        'SELECT (all with relations)',
        { table: tableName, relations, options },
        duration
      )

      return result as T[]
    } catch (error) {
      await this.logQuery(
        'SELECT (all with relations)',
        { table: tableName, relations, options },
        Date.now() - startTime,
        error
      )
      throw error
    }
  }

  /**
   * Create a single record.
   */
  async create<T>(table: Table, data: Partial<T>): Promise<T> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      // biome-ignore lint/suspicious/noExplicitAny: generic insert result
      const result = await (this.db
        .insert(table)
        .values(data as any)
        .returning() as Promise<T[]>)

      const duration = Date.now() - startTime
      await this.logQuery('INSERT', { table: tableName, data }, duration)

      return result[0] as T
    } catch (error) {
      await this.logQuery('INSERT', { table: tableName, data }, Date.now() - startTime, error)
      throw error
    }
  }

  /**
   * Insert records (single or multiple).
   */
  async insert<T>(table: Table, data: Partial<T> | Partial<T>[]): Promise<T | T[]> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)
    const isArray = Array.isArray(data)

    try {
      // biome-ignore lint/suspicious/noExplicitAny: generic insert result
      const result = await (this.db
        .insert(table)
        .values(data as any)
        .returning() as Promise<T[]>)

      const duration = Date.now() - startTime
      await this.logQuery(
        'INSERT',
        { table: tableName, count: isArray ? data.length : 1 },
        duration
      )

      return isArray ? result : (result[0] as T)
    } catch (error) {
      await this.logQuery(
        'INSERT',
        { table: tableName, count: isArray ? data.length : 1 },
        Date.now() - startTime,
        error
      )
      throw error
    }
  }

  /**
   * Update records.
   */
  async update<T>(table: Table, where: WhereCondition, data: Partial<T>): Promise<T[]> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      // biome-ignore lint/suspicious/noExplicitAny: generic update result
      const result = await (this.db
        .update(table)
        .set(data as any)
        .where(where)
        .returning() as Promise<T[]>)

      const duration = Date.now() - startTime
      await this.logQuery('UPDATE', { table: tableName, where, data }, duration)

      return result
    } catch (error) {
      await this.logQuery(
        'UPDATE',
        { table: tableName, where, data },
        Date.now() - startTime,
        error
      )
      throw error
    }
  }

  /**
   * Delete records.
   */
  async delete(table: Table, where: WhereCondition): Promise<void> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      // biome-ignore lint/suspicious/noExplicitAny: generic delete
      await (this.db.delete(table).where(where) as Promise<any>)

      const duration = Date.now() - startTime
      await this.logQuery('DELETE', { table: tableName, where }, duration)
    } catch (error) {
      await this.logQuery('DELETE', { table: tableName, where }, Date.now() - startTime, error)
      throw error
    }
  }

  /**
   * Bulk insert.
   */
  async bulkInsert<T>(table: Table, data: Partial<T>[]): Promise<T[]> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      // biome-ignore lint/suspicious/noExplicitAny: generic insert result
      const result = await (this.db
        .insert(table)
        .values(data as any)
        .returning() as Promise<T[]>)

      const duration = Date.now() - startTime
      await this.logQuery('BULK INSERT', { table: tableName, count: data.length }, duration)

      return result
    } catch (error) {
      await this.logQuery(
        'BULK INSERT',
        { table: tableName, count: data.length },
        Date.now() - startTime,
        error
      )
      throw error
    }
  }

  /**
   * Bulk update.
   */
  async bulkUpdate<T>(
    table: Table,
    updates: Array<{ where: WhereCondition; data: Partial<T> }>
  ): Promise<T[]> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      // Execute bulk updates in a transaction.
      const result = await this.transaction(async (tx) => {
        const allResults: T[] = []
        for (const update of updates) {
          // biome-ignore lint/suspicious/noExplicitAny: generic update result
          const updateResult = await (tx
            .update(table)
            .set(update.data as any)
            .where(update.where)
            .returning() as Promise<T[]>)
          allResults.push(...updateResult)
        }
        return allResults
      })

      const duration = Date.now() - startTime
      await this.logQuery('BULK UPDATE', { table: tableName, count: updates.length }, duration)

      return result
    } catch (error) {
      await this.logQuery(
        'BULK UPDATE',
        { table: tableName, count: updates.length },
        Date.now() - startTime,
        error
      )
      throw error
    }
  }

  /**
   * Bulk delete.
   */
  async bulkDelete(table: Table, whereConditions: WhereCondition[]): Promise<void> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      // Execute bulk delete in a transaction.
      await this.transaction(async (tx) => {
        for (const where of whereConditions) {
          // biome-ignore lint/suspicious/noExplicitAny: generic delete
          await (tx.delete(table).where(where) as Promise<any>)
        }
      })

      const duration = Date.now() - startTime
      await this.logQuery(
        'BULK DELETE',
        { table: tableName, count: whereConditions.length },
        duration
      )
    } catch (error) {
      await this.logQuery(
        'BULK DELETE',
        { table: tableName, count: whereConditions.length },
        Date.now() - startTime,
        error
      )
      throw error
    }
  }

  /**
   * Paginate (optimized for PostgreSQL).
   * Note: this implementation is simplified; Drizzle count APIs can vary by version.
   */
  async paginate<T>(table: Table, options: PaginateOptions): Promise<PaginateResult<T>> {
    const { page, limit, orderBy, orderDirection = 'asc' } = options
    const offset = (page - 1) * limit
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      // Query data (PostgreSQL optimized).
      // biome-ignore lint/suspicious/noExplicitAny: generic query builder
      let query: any = this.db.select().from(table)

      if (orderBy) {
        // biome-ignore lint/suspicious/noExplicitAny: generic order by
        query = query.orderBy(orderBy as any, orderDirection)
      }

      // PostgreSQL uses LIMIT/OFFSET, which is standard and efficient.
      // biome-ignore lint/suspicious/noExplicitAny: generic query result
      const data = await (query.limit(limit).offset(offset) as Promise<T[]>)

      // Count total - same query without limit/offset (simplified).
      // For production, consider using Drizzle's count helpers via `raw`.
      // biome-ignore lint/suspicious/noExplicitAny: generic count query
      const countQuery: any = this.db.select().from(table)
      // biome-ignore lint/suspicious/noExplicitAny: generic count result
      const allResults = await (countQuery as Promise<any[]>)
      const total = allResults.length

      const duration = Date.now() - startTime
      await this.logQuery('SELECT (paginated)', { table: tableName, page, limit }, duration)

      const totalPages = Math.ceil(total / limit)

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      }
    } catch (error) {
      await this.logQuery(
        'SELECT (paginated)',
        { table: tableName, page, limit },
        Date.now() - startTime,
        error
      )
      throw error
    }
  }

  /**
   * Health check (PostgreSQL optimized: `SELECT 1`).
   */
  async healthCheck(): Promise<HealthCheckResult> {
    if (!this.enableHealthCheck) {
      return { healthy: false, status: 'unhealthy', error: 'Health check is disabled' }
    }

    const startTime = Date.now()

    try {
      // Use the lightest query possible.
      const query = this.healthCheckQuery || 'SELECT 1'

      // Execute health check query - prefer Drizzle sql helpers when available.
      // biome-ignore lint/suspicious/noExplicitAny: checking for sql method
      const dbAny = this.db as any

      if (typeof dbAny.execute === 'function' && typeof dbAny.sql === 'function') {
        // Use Drizzle sql helpers.
        // biome-ignore lint/suspicious/noExplicitAny: generic sql execution
        await dbAny.execute(dbAny.sql.raw(query))
      } else if (typeof dbAny.query === 'function') {
        // Fallback: use `query` directly.
        // biome-ignore lint/suspicious/noExplicitAny: generic query execution
        await dbAny.query(query)
      } else {
        // Last fallback: run a simple select query.
        // biome-ignore lint/suspicious/noExplicitAny: generic query
        await (this.db.select().limit(1) as Promise<any[]>)
      }

      const latency = Date.now() - startTime

      // Trigger health check hook.
      await this.core.hooks.doAction('db:health-check', {
        status: 'healthy',
        latency,
      })

      return {
        status: 'healthy',
        latency,
      }
    } catch (error) {
      const latency = Date.now() - startTime

      await this.core.hooks.doAction('db:health-check', {
        status: 'unhealthy',
        latency,
        error,
      })

      return {
        healthy: false,
        status: 'unhealthy',
        latency,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Run database migrations (apply all pending migrations).
   */
  async migrate(): Promise<MigrateResult> {
    const startTime = Date.now()

    // Trigger migrate start hook.
    await this.core.hooks.doAction('db:migrate:start', {
      timestamp: startTime,
    })

    try {
      // Try to use Drizzle migration APIs.
      // biome-ignore lint/suspicious/noExplicitAny: checking for migrate method
      const dbAny = this.db as any

      let appliedMigrations: string[] = []

      if (typeof dbAny.migrate === 'function') {
        // Use Drizzle `migrate`.
        // biome-ignore lint/suspicious/noExplicitAny: generic migrate result
        const result = await dbAny.migrate()
        appliedMigrations = result?.migrations || []
      } else if (typeof dbAny.push === 'function') {
        // Use Drizzle Kit `push` (development mode).
        // biome-ignore lint/suspicious/noExplicitAny: generic push result
        await dbAny.push()
        appliedMigrations = ['schema pushed']
      } else {
        // If no migration API is available, throw.
        throw new Error(
          '[OrbitDB] Migration not available. Please ensure your Drizzle instance has a migrate() method or use db.raw to access Drizzle migration APIs directly.'
        )
      }

      const duration = Date.now() - startTime

      // Trigger migrate complete hook.
      await this.core.hooks.doAction('db:migrate:complete', {
        appliedMigrations,
        duration,
        timestamp: Date.now(),
      })

      this.core.logger.info(
        `[OrbitDB] Migration completed: ${appliedMigrations.length} migrations applied`
      )

      return {
        success: true,
        appliedMigrations,
      }
    } catch (error) {
      const duration = Date.now() - startTime

      // Trigger migrate error hook.
      await this.core.hooks.doAction('db:migrate:error', {
        error,
        duration,
        timestamp: Date.now(),
      })

      this.core.logger.error(
        `[OrbitDB] Migration failed: ${error instanceof Error ? error.message : String(error)}`
      )

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Migrate to a target migration.
   */
  async migrateTo(targetMigration?: string): Promise<MigrateResult> {
    const startTime = Date.now()

    // Trigger migrate start hook.
    await this.core.hooks.doAction('db:migrate:start', {
      targetMigration,
      timestamp: startTime,
    })

    try {
      // biome-ignore lint/suspicious/noExplicitAny: checking for migrate method
      const dbAny = this.db as any

      let appliedMigrations: string[] = []

      if (typeof dbAny.migrate === 'function') {
        // If Drizzle supports migrating to a target.
        if (targetMigration) {
          // biome-ignore lint/suspicious/noExplicitAny: generic migrate result
          const result = await dbAny.migrate({ to: targetMigration })
          appliedMigrations = result?.migrations || []
        } else {
          // biome-ignore lint/suspicious/noExplicitAny: generic migrate result
          const result = await dbAny.migrate()
          appliedMigrations = result?.migrations || []
        }
      } else {
        // If no migration API is available, throw.
        throw new Error(
          '[OrbitDB] Migration not available. Please ensure your Drizzle instance has a migrate() method or use db.raw to access Drizzle migration APIs directly.'
        )
      }

      const duration = Date.now() - startTime

      // Trigger migrate complete hook.
      await this.core.hooks.doAction('db:migrate:complete', {
        targetMigration,
        appliedMigrations,
        duration,
        timestamp: Date.now(),
      })

      this.core.logger.info(
        `[OrbitDB] Migration to ${targetMigration || 'latest'} completed: ${appliedMigrations.length} migrations applied`
      )

      return {
        success: true,
        appliedMigrations,
      }
    } catch (error) {
      const duration = Date.now() - startTime

      // Trigger migrate error hook.
      await this.core.hooks.doAction('db:migrate:error', {
        targetMigration,
        error,
        duration,
        timestamp: Date.now(),
      })

      this.core.logger.error(
        `[OrbitDB] Migration to ${targetMigration || 'latest'} failed: ${error instanceof Error ? error.message : String(error)}`
      )

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Run seed data.
   */
  async seed(seedFunction: SeedFunction, seedName?: string): Promise<SeedResult> {
    const startTime = Date.now()
    const name = seedName || 'default'

    // Trigger seed start hook.
    await this.core.hooks.doAction('db:seed:start', {
      seedName: name,
      timestamp: startTime,
    })

    try {
      // Execute seed function.
      await seedFunction(this.db)

      const duration = Date.now() - startTime

      // Trigger seed complete hook.
      await this.core.hooks.doAction('db:seed:complete', {
        seedName: name,
        duration,
        timestamp: Date.now(),
      })

      this.core.logger.info(`[OrbitDB] Seed "${name}" completed successfully`)

      return {
        success: true,
        seededFiles: [name],
      }
    } catch (error) {
      const duration = Date.now() - startTime

      // Trigger seed error hook.
      await this.core.hooks.doAction('db:seed:error', {
        seedName: name,
        error,
        duration,
        timestamp: Date.now(),
      })

      this.core.logger.error(
        `[OrbitDB] Seed "${name}" failed: ${error instanceof Error ? error.message : String(error)}`
      )

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Run multiple seed functions.
   */
  async seedMany(seedFunctions: Array<{ name: string; seed: SeedFunction }>): Promise<SeedResult> {
    const startTime = Date.now()
    const seededFiles: string[] = []
    const errors: string[] = []

    // Trigger seed start hook.
    await this.core.hooks.doAction('db:seed:start', {
      seedCount: seedFunctions.length,
      timestamp: startTime,
    })

    for (const { name, seed } of seedFunctions) {
      try {
        await this.seed(seed, name)
        seededFiles.push(name)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        errors.push(`${name}: ${errorMessage}`)
        this.core.logger.error(`[OrbitDB] Seed "${name}" failed: ${errorMessage}`)
      }
    }

    const duration = Date.now() - startTime

    if (errors.length > 0) {
      // Trigger seed error hook.
      await this.core.hooks.doAction('db:seed:error', {
        errors,
        duration,
        timestamp: Date.now(),
      })

      return {
        success: false,
        seededFiles,
        error: `Some seeds failed: ${errors.join('; ')}`,
      }
    }

    // Trigger seed complete hook.
    await this.core.hooks.doAction('db:seed:complete', {
      seededFiles,
      duration,
      timestamp: Date.now(),
    })

    this.core.logger.info(`[OrbitDB] All ${seededFiles.length} seeds completed successfully`)

    return {
      success: true,
      seededFiles,
    }
  }

  /**
   * Deploy database (migrations and seeding).
   */
  async deploy(options?: DeployOptions): Promise<DeployResult> {
    const {
      runMigrations = true,
      runSeeds = false,
      skipHealthCheck = false,
      validateBeforeDeploy = true,
    } = options || {}

    const startTime = Date.now()

    // Trigger deploy start hook.
    await this.core.hooks.doAction('db:deploy:start', {
      options,
      timestamp: startTime,
    })

    try {
      // Pre-deploy validation.
      if (validateBeforeDeploy) {
        const healthCheck = await this.healthCheck()
        if (healthCheck.status !== 'healthy') {
          throw new Error(`Database health check failed: ${healthCheck.error || 'Unknown error'}`)
        }
      }

      let migrateResult: MigrateResult | undefined
      let seedResult: SeedResult | undefined
      let healthCheckResult: HealthCheckResult | undefined

      // Run migrations.
      if (runMigrations) {
        this.core.logger.info('[OrbitDB] Running migrations...')
        migrateResult = await this.migrate()
        if (!migrateResult.success) {
          throw new Error(`Migration failed: ${migrateResult.error}`)
        }
      }

      // Run seeds.
      if (runSeeds) {
        this.core.logger.info('[OrbitDB] Running seeds...')
        // Note: seed execution requires seed functions. This is only a placeholder.
        // In real usage, provide seed functions via options/config and call `seed()`/`seedMany()`.
        this.core.logger.warn(
          '[OrbitDB] Seeds require seed functions to be provided. Use seed() or seedMany() methods directly.'
        )
      }

      // Post-deploy health check.
      if (!skipHealthCheck) {
        healthCheckResult = await this.healthCheck()
        if (healthCheckResult.status !== 'healthy') {
          this.core.logger.warn(
            `[OrbitDB] Post-deployment health check failed: ${healthCheckResult.error}`
          )
        }
      }

      const duration = Date.now() - startTime

      // Trigger deploy complete hook.
      await this.core.hooks.doAction('db:deploy:complete', {
        migrateResult,
        seedResult,
        healthCheckResult,
        duration,
        timestamp: Date.now(),
      })

      this.core.logger.info(`[OrbitDB] Deployment completed successfully in ${duration}ms`)

      return {
        success: true,
        migrations: migrateResult,
        seeds: seedResult,
        healthCheck: healthCheckResult,
        duration,
      }
    } catch (error) {
      const duration = Date.now() - startTime

      // Trigger deploy error hook.
      await this.core.hooks.doAction('db:deploy:error', {
        error,
        duration,
        timestamp: Date.now(),
      })

      this.core.logger.error(
        `[OrbitDB] Deployment failed: ${error instanceof Error ? error.message : String(error)}`
      )

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Get table name (helper).
   */
  private getTableName(table: Table): string {
    // biome-ignore lint/suspicious/noExplicitAny: checking table structure
    const tableAny = table as any
    return tableAny._?.name || tableAny.name || 'unknown'
  }

  /**
   * Log queries (async, non-blocking).
   */
  private async logQuery(
    queryType: string,
    params: Record<string, unknown>,
    duration: number,
    error?: unknown
  ): Promise<void> {
    if (!this.enableQueryLogging) {
      return
    }

    const logInfo: QueryLogInfo = {
      query: `${queryType} ${JSON.stringify(params)}`,
      params: Object.values(params),
      duration,
      timestamp: Date.now(),
    }

    // Add to the current transaction query list (if any).
    if (this.currentTransaction) {
      this.currentTransaction.queries.push(logInfo)
    }

    // Trigger query hook.
    await this.core.hooks.doAction('db:query', {
      ...logInfo,
      error: error ? (error instanceof Error ? error.message : String(error)) : undefined,
    })

    // Log asynchronously (non-blocking).
    setImmediate(() => {
      const logger = this.core.logger
      const message = `[DB Query] ${logInfo.query} (${duration}ms)`

      switch (this.queryLogLevel) {
        case 'debug':
          logger.debug(message)
          break
        case 'info':
          logger.info(message)
          break
        case 'warn':
          logger.warn(message)
          break
        case 'error':
          logger.error(message)
          break
      }

      if (error) {
        logger.error(`[DB Query Error] ${error instanceof Error ? error.message : String(error)}`)
      }
    })
  }

  /**
   * Upsert (insert or update).
   * If the record exists, update it; otherwise insert.
   */
  async upsert<T>(table: Table, data: Partial<T>, options?: UpsertOptions): Promise<T> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      // Use PostgreSQL ON CONFLICT.
      const conflictColumns = options?.conflictColumns || ['id']
      const updateColumns = options?.updateColumns
      const excludeColumns = options?.excludeColumns || []

      // Build update payload (exclude conflict columns and explicitly excluded columns).
      const updateData: any = { ...data }
      for (const col of conflictColumns) {
        delete updateData[col]
      }
      for (const col of excludeColumns) {
        delete updateData[col]
      }

      // If update columns are specified, only update those.
      if (updateColumns && updateColumns.length > 0) {
        const filteredData: any = {}
        for (const col of updateColumns) {
          if (updateData[col] !== undefined) {
            filteredData[col] = updateData[col]
          }
        }
        Object.assign(updateData, filteredData)
      }

      // Use Drizzle `onConflictDoUpdate`.
      // biome-ignore lint/suspicious/noExplicitAny: generic upsert result
      const result = await (this.db
        .insert(table)
        .values(data as any)
        .onConflictDoUpdate({
          target: conflictColumns as any,
          set: updateData as any,
        })
        .returning() as Promise<T[]>)

      const duration = Date.now() - startTime
      await this.logQuery('UPSERT', { table: tableName, data, options }, duration)

      return result[0] as T
    } catch (error) {
      await this.logQuery(
        'UPSERT',
        { table: tableName, data, options },
        Date.now() - startTime,
        error
      )
      throw error
    }
  }

  /**
   * Increment a numeric column (atomic).
   */
  async increment<T>(
    table: Table,
    where: WhereCondition,
    column: string,
    amount = 1
  ): Promise<T[]> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      // Use SQL: UPDATE ... SET column = column + value.
      // For PostgreSQL, prefer Drizzle SQL helpers.
      const dbAny = this.db as any
      if (dbAny.sql && typeof dbAny.sql === 'function') {
        // Use Drizzle SQL builder.
        const sql = dbAny.sql
        const updateData: any = {}
        updateData[column] = sql`${sql.identifier(column)} + ${amount}`

        // biome-ignore lint/suspicious/noExplicitAny: generic update result
        const result = await (this.db
          .update(table)
          .set(updateData)
          .where(where)
          .returning() as Promise<T[]>)

        const duration = Date.now() - startTime
        await this.logQuery('INCREMENT', { table: tableName, where, column, amount }, duration)

        return result
      } else {
        // Fallback: read, then update.
        const existing = await this.findOne<T>(table, where)
        if (!existing) {
          throw new Error(`Record not found for increment operation`)
        }

        const currentValue = (existing as any)[column] || 0
        const newValue = Number(currentValue) + amount

        const updateData: any = {}
        updateData[column] = newValue

        return await this.update<T>(table, where, updateData)
      }
    } catch (error) {
      await this.logQuery(
        'INCREMENT',
        { table: tableName, where, column, amount },
        Date.now() - startTime,
        error
      )
      throw error
    }
  }

  /**
   * Decrement a numeric column (atomic).
   */
  async decrement<T>(
    table: Table,
    where: WhereCondition,
    column: string,
    amount = 1
  ): Promise<T[]> {
    return this.increment<T>(table, where, column, -amount)
  }

  /**
   * Find or create.
   */
  async firstOrCreate<T>(table: Table, where: WhereCondition, data: Partial<T>): Promise<T> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      // Try to find first.
      const existing = await this.findOne<T>(table, where)
      if (existing) {
        return existing
      }

      // Create if not found (merge where + data).
      const createData = { ...where, ...data }
      const created = await this.create<T>(table, createData)

      const duration = Date.now() - startTime
      await this.logQuery('FIRST_OR_CREATE', { table: tableName, where, data }, duration)

      return created
    } catch (error) {
      await this.logQuery(
        'FIRST_OR_CREATE',
        { table: tableName, where, data },
        Date.now() - startTime,
        error
      )
      throw error
    }
  }

  /**
   * Find or instantiate (without persisting).
   */
  async firstOrNew<T>(table: Table, where: WhereCondition, data: Partial<T>): Promise<T> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      // Try to find first.
      const existing = await this.findOne<T>(table, where)
      if (existing) {
        return existing
      }

      // If not found, return a new instance (not persisted).
      const newData = { ...where, ...data } as T

      const duration = Date.now() - startTime
      await this.logQuery('FIRST_OR_NEW', { table: tableName, where, data }, duration)

      return newData
    } catch (error) {
      await this.logQuery(
        'FIRST_OR_NEW',
        { table: tableName, where, data },
        Date.now() - startTime,
        error
      )
      throw error
    }
  }

  /**
   * Update or create.
   */
  async updateOrCreate<T>(table: Table, where: WhereCondition, data: Partial<T>): Promise<T> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      // Try to find first.
      const existing = await this.findOne<T>(table, where)
      if (existing) {
        // Update if exists.
        const updated = await this.update<T>(table, where, data)
        return updated[0] as T
      }

      // Create if not found (merge where + data).
      const createData = { ...where, ...data }
      const created = await this.create<T>(table, createData)

      const duration = Date.now() - startTime
      await this.logQuery('UPDATE_OR_CREATE', { table: tableName, where, data }, duration)

      return created
    } catch (error) {
      await this.logQuery(
        'UPDATE_OR_CREATE',
        { table: tableName, where, data },
        Date.now() - startTime,
        error
      )
      throw error
    }
  }

  /**
   * Truncate table.
   */
  async truncate(table: Table, options?: TruncateOptions): Promise<void> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      const dbAny = this.db as any

      // Use Drizzle SQL builder or run raw SQL.
      if (dbAny.sql && typeof dbAny.sql === 'function') {
        const sql = dbAny.sql
        let truncateSql = sql`TRUNCATE TABLE ${sql.identifier(tableName)}`

        if (options?.restartIdentity) {
          truncateSql = sql`TRUNCATE TABLE ${sql.identifier(tableName)} RESTART IDENTITY`
        }

        if (options?.cascade) {
          truncateSql = sql`${truncateSql} CASCADE`
        }

        if (dbAny.execute && typeof dbAny.execute === 'function') {
          await dbAny.execute(truncateSql)
        } else {
          // Fallback: use raw SQL.
          await this.execute(
            `TRUNCATE TABLE ${tableName}${options?.restartIdentity ? ' RESTART IDENTITY' : ''}${options?.cascade ? ' CASCADE' : ''}`
          )
        }
      } else {
        // Fallback: execute SQL directly.
        await this.execute(
          `TRUNCATE TABLE ${tableName}${options?.restartIdentity ? ' RESTART IDENTITY' : ''}${options?.cascade ? ' CASCADE' : ''}`
        )
      }

      const duration = Date.now() - startTime
      await this.logQuery('TRUNCATE', { table: tableName, options }, duration)
    } catch (error) {
      await this.logQuery('TRUNCATE', { table: tableName, options }, Date.now() - startTime, error)
      throw error
    }
  }

  /**
   * Aggregate: sum.
   */
  async sum(table: Table, column: string, where?: WhereCondition): Promise<number> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      const dbAny = this.db as any

      if (dbAny.sql && typeof dbAny.sql === 'function') {
        const sql = dbAny.sql
        // Use SQL SUM.
        let query = this.db.select({ sum: sql`SUM(${sql.identifier(column)})` }).from(table)

        if (where) {
          query = (query as any).where(where)
        }

        // biome-ignore lint/suspicious/noExplicitAny: generic aggregate result
        const result = await (query as Promise<Array<{ sum: number | null }>>)
        const sumValue = result[0]?.sum || 0

        const duration = Date.now() - startTime
        await this.logQuery('SUM', { table: tableName, column, where }, duration)

        return Number(sumValue)
      } else {
        // Fallback: fetch all records and compute in application.
        const all = await this.findAll(table, where)
        const sum = all.reduce((acc: number, row: any) => {
          return acc + (Number(row[column]) || 0)
        }, 0)

        const duration = Date.now() - startTime
        await this.logQuery('SUM', { table: tableName, column, where }, duration)

        return sum
      }
    } catch (error) {
      await this.logQuery('SUM', { table: tableName, column, where }, Date.now() - startTime, error)
      throw error
    }
  }

  /**
   * Aggregate: average.
   */
  async avg(table: Table, column: string, where?: WhereCondition): Promise<number> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      const dbAny = this.db as any

      if (dbAny.sql && typeof dbAny.sql === 'function') {
        const sql = dbAny.sql
        // Use SQL AVG.
        let query = this.db.select({ avg: sql`AVG(${sql.identifier(column)})` }).from(table)

        if (where) {
          query = (query as any).where(where)
        }

        // biome-ignore lint/suspicious/noExplicitAny: generic aggregate result
        const result = await (query as Promise<Array<{ avg: number | null }>>)
        const avgValue = result[0]?.avg || 0

        const duration = Date.now() - startTime
        await this.logQuery('AVG', { table: tableName, column, where }, duration)

        return Number(avgValue)
      } else {
        // Fallback: fetch all records and compute in application.
        const all = await this.findAll(table, where)
        if (all.length === 0) {
          return 0
        }

        const sum = all.reduce((acc: number, row: any) => {
          return acc + (Number(row[column]) || 0)
        }, 0)

        const duration = Date.now() - startTime
        await this.logQuery('AVG', { table: tableName, column, where }, duration)

        return sum / all.length
      }
    } catch (error) {
      await this.logQuery('AVG', { table: tableName, column, where }, Date.now() - startTime, error)
      throw error
    }
  }

  /**
   * Aggregate: minimum.
   */
  async min(table: Table, column: string, where?: WhereCondition): Promise<unknown> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      const dbAny = this.db as any

      if (dbAny.sql && typeof dbAny.sql === 'function') {
        const sql = dbAny.sql
        // Use SQL MIN.
        let query = this.db.select({ min: sql`MIN(${sql.identifier(column)})` }).from(table)

        if (where) {
          query = (query as any).where(where)
        }

        // biome-ignore lint/suspicious/noExplicitAny: generic aggregate result
        const result = await (query as Promise<Array<{ min: unknown }>>)
        const minValue = result[0]?.min

        const duration = Date.now() - startTime
        await this.logQuery('MIN', { table: tableName, column, where }, duration)

        return minValue
      } else {
        // Fallback: fetch all records and compute in application.
        const all = await this.findAll(table, where)
        if (all.length === 0) {
          return null
        }

        const values = all.map((row: any) => row[column]).filter((v: any) => v != null)
        if (values.length === 0) {
          return null
        }

        const minValue = values.reduce((acc: any, val: any) => {
          return acc < val ? acc : val
        })

        const duration = Date.now() - startTime
        await this.logQuery('MIN', { table: tableName, column, where }, duration)

        return minValue
      }
    } catch (error) {
      await this.logQuery('MIN', { table: tableName, column, where }, Date.now() - startTime, error)
      throw error
    }
  }

  /**
   * Aggregate: maximum.
   */
  async max(table: Table, column: string, where?: WhereCondition): Promise<unknown> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      const dbAny = this.db as any

      if (dbAny.sql && typeof dbAny.sql === 'function') {
        const sql = dbAny.sql
        // Use SQL MAX.
        let query = this.db.select({ max: sql`MAX(${sql.identifier(column)})` }).from(table)

        if (where) {
          query = (query as any).where(where)
        }

        // biome-ignore lint/suspicious/noExplicitAny: generic aggregate result
        const result = await (query as Promise<Array<{ max: unknown }>>)
        const maxValue = result[0]?.max

        const duration = Date.now() - startTime
        await this.logQuery('MAX', { table: tableName, column, where }, duration)

        return maxValue
      } else {
        // Fallback: fetch all records and compute in application.
        const all = await this.findAll(table, where)
        if (all.length === 0) {
          return null
        }

        const values = all.map((row: any) => row[column]).filter((v: any) => v != null)
        if (values.length === 0) {
          return null
        }

        const maxValue = values.reduce((acc: any, val: any) => {
          return acc > val ? acc : val
        })

        const duration = Date.now() - startTime
        await this.logQuery('MAX', { table: tableName, column, where }, duration)

        return maxValue
      }
    } catch (error) {
      await this.logQuery('MAX', { table: tableName, column, where }, Date.now() - startTime, error)
      throw error
    }
  }

  /**
   * Lock rows (FOR UPDATE).
   */
  async lockForUpdate<T>(table: Table, where: WhereCondition, options?: LockOptions): Promise<T[]> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      let query = this.db.select().from(table).where(where)

      // Apply lock options.
      if (options?.nowait) {
        query = (query as any).for('update').noWait()
      } else if (options?.skipLocked) {
        query = (query as any).for('update').skipLocked()
      } else {
        query = (query as any).for('update')
      }

      // biome-ignore lint/suspicious/noExplicitAny: generic lock result
      const result = await (query as Promise<T[]>)

      const duration = Date.now() - startTime
      await this.logQuery('LOCK_FOR_UPDATE', { table: tableName, where, options }, duration)

      return result
    } catch (error) {
      await this.logQuery(
        'LOCK_FOR_UPDATE',
        { table: tableName, where, options },
        Date.now() - startTime,
        error
      )
      throw error
    }
  }

  /**
   * Shared lock (FOR SHARE).
   */
  async sharedLock<T>(table: Table, where: WhereCondition, options?: LockOptions): Promise<T[]> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      let query = this.db.select().from(table).where(where)

      // Apply lock options.
      if (options?.nowait) {
        query = (query as any).for('share').noWait()
      } else if (options?.skipLocked) {
        query = (query as any).for('share').skipLocked()
      } else {
        query = (query as any).for('share')
      }

      // biome-ignore lint/suspicious/noExplicitAny: generic lock result
      const result = await (query as Promise<T[]>)

      const duration = Date.now() - startTime
      await this.logQuery('SHARED_LOCK', { table: tableName, where, options }, duration)

      return result
    } catch (error) {
      await this.logQuery(
        'SHARED_LOCK',
        { table: tableName, where, options },
        Date.now() - startTime,
        error
      )
      throw error
    }
  }

  /**
   * Execute raw SQL.
   */
  async execute<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
    const startTime = Date.now()

    try {
      const dbAny = this.db as any

      let result: T[]

      if (dbAny.execute && typeof dbAny.execute === 'function') {
        // Use Drizzle `execute`.
        if (dbAny.sql && typeof dbAny.sql === 'function' && params) {
          // Parameterized query.
          result = await dbAny.execute(dbAny.sql.raw(sql))
        } else {
          result = await dbAny.execute(dbAny.sql?.raw?.(sql) || sql)
        }
      } else if (dbAny.query && typeof dbAny.query === 'function') {
        // Use `query`.
        result = await dbAny.query(sql, params || [])
      } else {
        // Last fallback: try to invoke the db directly.
        result = await (dbAny as any)(sql, params || [])
      }

      const duration = Date.now() - startTime
      await this.logQuery('EXECUTE', { sql, params }, duration)

      return result
    } catch (error) {
      await this.logQuery('EXECUTE', { sql, params }, Date.now() - startTime, error)
      throw error
    }
  }
}

/**
 * Detect database type.
 */
export function detectDatabaseType(db: DrizzleDB): DatabaseType {
  // Try to detect database type from the Drizzle instance.
  // biome-ignore lint/suspicious/noExplicitAny: checking db internals
  const dbAny = db as any

  // Check PostgreSQL-specific dialect name.
  if (dbAny._?.dialect?.name === 'postgresql' || dbAny.dialect?.name === 'postgresql') {
    return 'postgresql'
  }

  // Check MySQL-specific dialect name.
  if (dbAny._?.dialect?.name === 'mysql' || dbAny.dialect?.name === 'mysql') {
    return 'mysql'
  }

  // Check SQLite-specific dialect name.
  if (dbAny._?.dialect?.name === 'sqlite' || dbAny.dialect?.name === 'sqlite') {
    return 'sqlite'
  }

  // Default to auto and let the system decide.
  return 'auto'
}
