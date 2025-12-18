import type { PlanetCore } from 'gravito-core'
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
 * 資料庫服務介面
 */
export interface DBService {
  // 原始 Drizzle 實例（保持向後相容）
  readonly raw: DrizzleDB

  // 交易支援
  transaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T>

  // 查詢輔助方法
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

  // 關聯查詢方法（使用 Drizzle 的 query API）
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

  // CRUD 操作
  create<T>(table: Table, data: Partial<T>): Promise<T>
  insert<T>(table: Table, data: Partial<T> | Partial<T>[]): Promise<T | T[]>
  update<T>(table: Table, where: WhereCondition, data: Partial<T>): Promise<T[]>
  delete(table: Table, where: WhereCondition): Promise<void>

  // 批量操作
  bulkInsert<T>(table: Table, data: Partial<T>[]): Promise<T[]>
  bulkUpdate<T>(
    table: Table,
    updates: Array<{ where: WhereCondition; data: Partial<T> }>
  ): Promise<T[]>
  bulkDelete(table: Table, whereConditions: WhereCondition[]): Promise<void>

  // Upsert 操作
  upsert<T>(table: Table, data: Partial<T>, options?: UpsertOptions): Promise<T>

  // 數值操作
  increment<T>(table: Table, where: WhereCondition, column: string, amount?: number): Promise<T[]>
  decrement<T>(table: Table, where: WhereCondition, column: string, amount?: number): Promise<T[]>

  // 條件性創建/更新
  firstOrCreate<T>(table: Table, where: WhereCondition, data: Partial<T>): Promise<T>
  firstOrNew<T>(table: Table, where: WhereCondition, data: Partial<T>): Promise<T>
  updateOrCreate<T>(table: Table, where: WhereCondition, data: Partial<T>): Promise<T>

  // 表操作
  truncate(table: Table, options?: TruncateOptions): Promise<void>

  // 聚合函數
  sum(table: Table, column: string, where?: WhereCondition): Promise<number>
  avg(table: Table, column: string, where?: WhereCondition): Promise<number>
  min(table: Table, column: string, where?: WhereCondition): Promise<unknown>
  max(table: Table, column: string, where?: WhereCondition): Promise<unknown>

  // 鎖定機制
  lockForUpdate<T>(table: Table, where: WhereCondition, options?: LockOptions): Promise<T[]>
  sharedLock<T>(table: Table, where: WhereCondition, options?: LockOptions): Promise<T[]>

  // Raw SQL 執行
  execute<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>

  // 健康檢查
  healthCheck(): Promise<HealthCheckResult>

  // 遷移功能
  migrate(): Promise<MigrateResult>
  migrateTo(targetMigration?: string): Promise<MigrateResult>

  // Seeder 功能
  seed(seedFunction: SeedFunction, seedName?: string): Promise<SeedResult>
  seedMany(seedFunctions: Array<{ name: string; seed: SeedFunction }>): Promise<SeedResult>

  // 部署功能
  deploy(options?: DeployOptions): Promise<DeployResult>
}

/**
 * 資料庫服務實作
 */
export class DBServiceImpl implements DBService {
  private queryLogs: QueryLogInfo[] = []
  private currentTransaction: { id: string; startTime: number; queries: QueryLogInfo[] } | null =
    null

  constructor(
    private db: DrizzleDB,
    private core: PlanetCore,
    private databaseType: DatabaseType,
    private enableQueryLogging: boolean,
    private queryLogLevel: 'debug' | 'info' | 'warn' | 'error',
    private enableHealthCheck: boolean,
    private healthCheckQuery: string
  ) {}

  get raw(): DrizzleDB {
    return this.db
  }

  /**
   * 執行交易
   */
  async transaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T> {
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const startTime = Date.now()

    this.currentTransaction = {
      id: transactionId,
      startTime,
      queries: [],
    }

    // 觸發交易開始 hook（帶來源追蹤）
    await this.emitEvent('db:transaction:start', {
      transactionId,
      startTime,
    })

    try {
      const result = await this.db.transaction(async (tx: Transaction) => {
        // 包裝交易實例以支援查詢日誌
        return await callback(tx)
      })

      // 觸發交易提交 hook（帶來源追蹤）
      await this.emitEvent('db:transaction:commit', {
        transactionId,
        duration: Date.now() - startTime,
      })

      this.currentTransaction = null
      return result
    } catch (error) {
      // 觸發交易錯誤 hook
      await this.core.hooks.doAction('db:transaction:error', {
        transactionId,
        error,
        duration: Date.now() - startTime,
      })

      // 觸發交易回滾 hook
      await this.core.hooks.doAction('db:transaction:rollback', {
        transactionId,
        duration: Date.now() - startTime,
      })

      this.currentTransaction = null
      throw error
    }
  }

  /**
   * 根據 ID 查詢單筆記錄
   */
  async findById<T>(table: Table, id: unknown): Promise<T | null> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      // 使用 Drizzle 的查詢 API
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
   * 查詢單筆記錄
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
   * 查詢所有記錄
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
   * 計算記錄數
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

      // 獲取所有記錄並計算長度（簡化版本）
      // 對於大型資料集，建議使用 db.raw 直接執行 COUNT 查詢
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
   * 檢查記錄是否存在
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
   * 使用關聯查詢根據 ID 查詢記錄
   * 注意：此方法使用 Drizzle 的 query API，需要先定義 relations
   */
  async findByIdWith<T>(
    tableName: string,
    id: unknown,
    relations: RelationOptions
  ): Promise<T | null> {
    const startTime = Date.now()

    try {
      // 使用 Drizzle 的 query API
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
   * 使用關聯查詢單筆記錄
   * 注意：此方法使用 Drizzle 的 query API，需要先定義 relations
   */
  async findOneWith<T>(
    tableName: string,
    where: WhereCondition,
    relations: RelationOptions
  ): Promise<T | null> {
    const startTime = Date.now()

    try {
      // 使用 Drizzle 的 query API
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
   * 使用關聯查詢所有記錄
   * 注意：此方法使用 Drizzle 的 query API，需要先定義 relations
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
      // 使用 Drizzle 的 query API
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
   * 創建單筆記錄
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
   * 插入記錄（支援單筆或多筆）
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
   * 更新記錄
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
   * 刪除記錄
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
   * 批量插入
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
   * 批量更新
   */
  async bulkUpdate<T>(
    table: Table,
    updates: Array<{ where: WhereCondition; data: Partial<T> }>
  ): Promise<T[]> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      // 在交易中執行批量更新
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
   * 批量刪除
   */
  async bulkDelete(table: Table, whereConditions: WhereCondition[]): Promise<void> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      // 在交易中執行批量刪除
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
   * 分頁查詢（針對 PostgreSQL 優化）
   * 注意：此方法需要用戶提供 count 函數，因為 Drizzle 的 count API 可能因版本而異
   */
  async paginate<T>(table: Table, options: PaginateOptions): Promise<PaginateResult<T>> {
    const { page, limit, orderBy, orderDirection = 'asc' } = options
    const offset = (page - 1) * limit
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      // 查詢資料（針對 PostgreSQL 優化）
      // biome-ignore lint/suspicious/noExplicitAny: generic query builder
      let query: any = this.db.select().from(table)

      if (orderBy) {
        // biome-ignore lint/suspicious/noExplicitAny: generic order by
        query = query.orderBy(orderBy as any, orderDirection)
      }

      // PostgreSQL 使用 LIMIT/OFFSET，這是標準且高效的方式
      // biome-ignore lint/suspicious/noExplicitAny: generic query result
      const data = await (query.limit(limit).offset(offset) as Promise<T[]>)

      // 計算總數 - 使用相同的查詢但不包含 limit/offset
      // 注意：這是一個簡化版本，實際使用中可能需要更複雜的 count 查詢
      // 用戶可以通過 raw 屬性直接使用 Drizzle 的 count 功能
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
   * 健康檢查（PostgreSQL 優化：使用 SELECT 1）
   */
  async healthCheck(): Promise<HealthCheckResult> {
    if (!this.enableHealthCheck) {
      return { healthy: false, status: 'unhealthy', error: 'Health check is disabled' }
    }

    const startTime = Date.now()

    try {
      // PostgreSQL 使用最輕量級的查詢
      const query = this.healthCheckQuery || 'SELECT 1'

      // 執行健康檢查查詢 - 使用 Drizzle 的 sql 函數
      // biome-ignore lint/suspicious/noExplicitAny: checking for sql method
      const dbAny = this.db as any

      if (typeof dbAny.execute === 'function' && typeof dbAny.sql === 'function') {
        // 使用 Drizzle 的 sql 函數
        // biome-ignore lint/suspicious/noExplicitAny: generic sql execution
        await dbAny.execute(dbAny.sql.raw(query))
      } else if (typeof dbAny.query === 'function') {
        // 備用方案：直接使用 query 方法
        // biome-ignore lint/suspicious/noExplicitAny: generic query execution
        await dbAny.query(query)
      } else {
        // 最後的備用方案：嘗試執行一個簡單的 select 查詢
        // biome-ignore lint/suspicious/noExplicitAny: generic query
        await (this.db.select().limit(1) as Promise<any[]>)
      }

      const latency = Date.now() - startTime

      // 觸發健康檢查 hook
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
   * 執行資料庫遷移（執行所有待處理的遷移）
   */
  async migrate(): Promise<MigrateResult> {
    const startTime = Date.now()

    // 觸發遷移開始 hook
    await this.core.hooks.doAction('db:migrate:start', {
      timestamp: startTime,
    })

    try {
      // 嘗試使用 Drizzle 的 migrate 功能
      // biome-ignore lint/suspicious/noExplicitAny: checking for migrate method
      const dbAny = this.db as any

      let appliedMigrations: string[] = []

      if (typeof dbAny.migrate === 'function') {
        // 使用 Drizzle 的 migrate 方法
        // biome-ignore lint/suspicious/noExplicitAny: generic migrate result
        const result = await dbAny.migrate()
        appliedMigrations = result?.migrations || []
      } else if (typeof dbAny.push === 'function') {
        // 使用 Drizzle Kit 的 push 方法（開發模式）
        // biome-ignore lint/suspicious/noExplicitAny: generic push result
        await dbAny.push()
        appliedMigrations = ['schema pushed']
      } else {
        // 如果 Drizzle 實例沒有 migrate 方法，拋出錯誤
        throw new Error(
          '[OrbitDB] Migration not available. Please ensure your Drizzle instance has a migrate() method or use db.raw to access Drizzle migration APIs directly.'
        )
      }

      const duration = Date.now() - startTime

      // 觸發遷移完成 hook
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

      // 觸發遷移錯誤 hook
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
   * 遷移到指定的遷移版本
   */
  async migrateTo(targetMigration?: string): Promise<MigrateResult> {
    const startTime = Date.now()

    // 觸發遷移開始 hook
    await this.core.hooks.doAction('db:migrate:start', {
      targetMigration,
      timestamp: startTime,
    })

    try {
      // biome-ignore lint/suspicious/noExplicitAny: checking for migrate method
      const dbAny = this.db as any

      let appliedMigrations: string[] = []

      if (typeof dbAny.migrate === 'function') {
        // 如果 Drizzle 支援指定目標遷移
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
        // 如果 Drizzle 實例沒有 migrate 方法，拋出錯誤
        throw new Error(
          '[OrbitDB] Migration not available. Please ensure your Drizzle instance has a migrate() method or use db.raw to access Drizzle migration APIs directly.'
        )
      }

      const duration = Date.now() - startTime

      // 觸發遷移完成 hook
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

      // 觸發遷移錯誤 hook
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
   * 執行 seed 資料
   */
  async seed(seedFunction: SeedFunction, seedName?: string): Promise<SeedResult> {
    const startTime = Date.now()
    const name = seedName || 'default'

    // 觸發 seed 開始 hook
    await this.core.hooks.doAction('db:seed:start', {
      seedName: name,
      timestamp: startTime,
    })

    try {
      // 執行 seed 函數
      await seedFunction(this.db)

      const duration = Date.now() - startTime

      // 觸發 seed 完成 hook
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

      // 觸發 seed 錯誤 hook
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
   * 執行多個 seed 函數
   */
  async seedMany(seedFunctions: Array<{ name: string; seed: SeedFunction }>): Promise<SeedResult> {
    const startTime = Date.now()
    const seededFiles: string[] = []
    const errors: string[] = []

    // 觸發 seed 開始 hook
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
      // 觸發 seed 錯誤 hook
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

    // 觸發 seed 完成 hook
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
   * 部署資料庫（執行遷移和 seed）
   */
  async deploy(options?: DeployOptions): Promise<DeployResult> {
    const {
      runMigrations = true,
      runSeeds = false,
      skipHealthCheck = false,
      validateBeforeDeploy = true,
    } = options || {}

    const startTime = Date.now()

    // 觸發部署開始 hook
    await this.core.hooks.doAction('db:deploy:start', {
      options,
      timestamp: startTime,
    })

    try {
      // 部署前驗證
      if (validateBeforeDeploy) {
        const healthCheck = await this.healthCheck()
        if (healthCheck.status !== 'healthy') {
          throw new Error(`Database health check failed: ${healthCheck.error || 'Unknown error'}`)
        }
      }

      let migrateResult: MigrateResult | undefined
      let seedResult: SeedResult | undefined
      let healthCheckResult: HealthCheckResult | undefined

      // 執行遷移
      if (runMigrations) {
        this.core.logger.info('[OrbitDB] Running migrations...')
        migrateResult = await this.migrate()
        if (!migrateResult.success) {
          throw new Error(`Migration failed: ${migrateResult.error}`)
        }
      }

      // 執行 seed
      if (runSeeds) {
        this.core.logger.info('[OrbitDB] Running seeds...')
        // 注意：這裡需要用戶提供 seed 函數，這裡只是示範結構
        // 實際使用時，用戶應該通過選項或配置提供 seed 函數
        this.core.logger.warn(
          '[OrbitDB] Seeds require seed functions to be provided. Use seed() or seedMany() methods directly.'
        )
      }

      // 部署後健康檢查
      if (!skipHealthCheck) {
        healthCheckResult = await this.healthCheck()
        if (healthCheckResult.status !== 'healthy') {
          this.core.logger.warn(
            `[OrbitDB] Post-deployment health check failed: ${healthCheckResult.error}`
          )
        }
      }

      const duration = Date.now() - startTime

      // 觸發部署完成 hook
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
      }
    } catch (error) {
      const duration = Date.now() - startTime

      // 觸發部署錯誤 hook
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
   * 取得表名稱（輔助方法）
   */
  private getTableName(table: Table): string {
    // biome-ignore lint/suspicious/noExplicitAny: checking table structure
    const tableAny = table as any
    return tableAny._?.name || tableAny.name || 'unknown'
  }

  /**
   * 記錄查詢日誌（非同步，不阻塞）
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

    // 添加到當前交易的查詢列表（如果有的話）
    if (this.currentTransaction) {
      this.currentTransaction.queries.push(logInfo)
    }

    // 觸發查詢 hook
    await this.core.hooks.doAction('db:query', {
      ...logInfo,
      error: error ? (error instanceof Error ? error.message : String(error)) : undefined,
    })

    // 非同步記錄到日誌（不阻塞）
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
   * Upsert（插入或更新）
   * 如果記錄存在則更新，不存在則插入
   */
  async upsert<T>(table: Table, data: Partial<T>, options?: UpsertOptions): Promise<T> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      // 使用 PostgreSQL 的 ON CONFLICT 語法
      const conflictColumns = options?.conflictColumns || ['id']
      const updateColumns = options?.updateColumns
      const excludeColumns = options?.excludeColumns || []

      // 構建更新資料（排除衝突欄位和指定排除的欄位）
      const updateData: any = { ...data }
      for (const col of conflictColumns) {
        delete updateData[col]
      }
      for (const col of excludeColumns) {
        delete updateData[col]
      }

      // 如果指定了要更新的欄位，只更新這些欄位
      if (updateColumns && updateColumns.length > 0) {
        const filteredData: any = {}
        for (const col of updateColumns) {
          if (updateData[col] !== undefined) {
            filteredData[col] = updateData[col]
          }
        }
        Object.assign(updateData, filteredData)
      }

      // 使用 Drizzle 的 onConflictDoUpdate
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
   * 增加數值欄位（原子操作）
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
      // 使用 SQL 的 UPDATE ... SET column = column + value
      // 對於 PostgreSQL，使用 Drizzle 的 SQL 函數
      const dbAny = this.db as any
      if (dbAny.sql && typeof dbAny.sql === 'function') {
        // 使用 Drizzle 的 SQL builder
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
        // 備用方案：先查詢，再更新
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
   * 減少數值欄位（原子操作）
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
   * 查找或創建
   */
  async firstOrCreate<T>(table: Table, where: WhereCondition, data: Partial<T>): Promise<T> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      // 先嘗試查找
      const existing = await this.findOne<T>(table, where)
      if (existing) {
        return existing
      }

      // 不存在則創建（合併 where 和 data）
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
   * 查找或新建（不保存）
   */
  async firstOrNew<T>(table: Table, where: WhereCondition, data: Partial<T>): Promise<T> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      // 先嘗試查找
      const existing = await this.findOne<T>(table, where)
      if (existing) {
        return existing
      }

      // 不存在則返回新實例（不保存）
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
   * 更新或創建
   */
  async updateOrCreate<T>(table: Table, where: WhereCondition, data: Partial<T>): Promise<T> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      // 先嘗試查找
      const existing = await this.findOne<T>(table, where)
      if (existing) {
        // 存在則更新
        const updated = await this.update<T>(table, where, data)
        return updated[0] as T
      }

      // 不存在則創建（合併 where 和 data）
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
   * 清空表
   */
  async truncate(table: Table, options?: TruncateOptions): Promise<void> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      const dbAny = this.db as any

      // 使用 Drizzle 的 SQL builder 或直接執行 SQL
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
          // 備用方案：使用 raw SQL
          await this.execute(
            `TRUNCATE TABLE ${tableName}${options?.restartIdentity ? ' RESTART IDENTITY' : ''}${options?.cascade ? ' CASCADE' : ''}`
          )
        }
      } else {
        // 備用方案：直接執行 SQL
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
   * 聚合函數：求和
   */
  async sum(table: Table, column: string, where?: WhereCondition): Promise<number> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      const dbAny = this.db as any

      if (dbAny.sql && typeof dbAny.sql === 'function') {
        const sql = dbAny.sql
        // 使用 SQL SUM 函數
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
        // 備用方案：查詢所有記錄並在應用層計算
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
   * 聚合函數：平均值
   */
  async avg(table: Table, column: string, where?: WhereCondition): Promise<number> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      const dbAny = this.db as any

      if (dbAny.sql && typeof dbAny.sql === 'function') {
        const sql = dbAny.sql
        // 使用 SQL AVG 函數
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
        // 備用方案：查詢所有記錄並在應用層計算
        const all = await this.findAll(table, where)
        if (all.length === 0) return 0

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
   * 聚合函數：最小值
   */
  async min(table: Table, column: string, where?: WhereCondition): Promise<unknown> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      const dbAny = this.db as any

      if (dbAny.sql && typeof dbAny.sql === 'function') {
        const sql = dbAny.sql
        // 使用 SQL MIN 函數
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
        // 備用方案：查詢所有記錄並在應用層計算
        const all = await this.findAll(table, where)
        if (all.length === 0) return null

        const values = all.map((row: any) => row[column]).filter((v: any) => v != null)
        if (values.length === 0) return null

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
   * 聚合函數：最大值
   */
  async max(table: Table, column: string, where?: WhereCondition): Promise<unknown> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      const dbAny = this.db as any

      if (dbAny.sql && typeof dbAny.sql === 'function') {
        const sql = dbAny.sql
        // 使用 SQL MAX 函數
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
        // 備用方案：查詢所有記錄並在應用層計算
        const all = await this.findAll(table, where)
        if (all.length === 0) return null

        const values = all.map((row: any) => row[column]).filter((v: any) => v != null)
        if (values.length === 0) return null

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
   * 鎖定記錄（FOR UPDATE）
   */
  async lockForUpdate<T>(table: Table, where: WhereCondition, options?: LockOptions): Promise<T[]> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      let query = this.db.select().from(table).where(where)

      // 添加鎖定選項
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
   * 共享鎖（FOR SHARE）
   */
  async sharedLock<T>(table: Table, where: WhereCondition, options?: LockOptions): Promise<T[]> {
    const startTime = Date.now()
    const tableName = this.getTableName(table)

    try {
      let query = this.db.select().from(table).where(where)

      // 添加共享鎖選項
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
   * 執行原始 SQL
   */
  async execute<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
    const startTime = Date.now()

    try {
      const dbAny = this.db as any

      let result: T[]

      if (dbAny.execute && typeof dbAny.execute === 'function') {
        // 使用 Drizzle 的 execute 方法
        if (dbAny.sql && typeof dbAny.sql === 'function' && params) {
          // 參數化查詢
          const sqlBuilder = dbAny.sql
          const paramPlaceholders = params.map((_, i) => sqlBuilder.placeholder(`param${i}`))
          // 注意：這是一個簡化版本，實際使用中需要更複雜的 SQL 構建
          result = await dbAny.execute(dbAny.sql.raw(sql, params))
        } else {
          result = await dbAny.execute(dbAny.sql?.raw?.(sql) || sql)
        }
      } else if (dbAny.query && typeof dbAny.query === 'function') {
        // 使用 query 方法
        result = await dbAny.query(sql, params || [])
      } else {
        // 最後的備用方案：嘗試直接執行
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
 * 檢測資料庫類型
 */
export function detectDatabaseType(db: DrizzleDB): DatabaseType {
  // 嘗試從 Drizzle 實例中檢測資料庫類型
  // biome-ignore lint/suspicious/noExplicitAny: checking db internals
  const dbAny = db as any

  // 檢查是否有 PostgreSQL 特定的屬性
  if (dbAny._?.dialect?.name === 'postgresql' || dbAny.dialect?.name === 'postgresql') {
    return 'postgresql'
  }

  // 檢查是否有 MySQL 特定的屬性
  if (dbAny._?.dialect?.name === 'mysql' || dbAny.dialect?.name === 'mysql') {
    return 'mysql'
  }

  // 檢查是否有 SQLite 特定的屬性
  if (dbAny._?.dialect?.name === 'sqlite' || dbAny.dialect?.name === 'sqlite') {
    return 'sqlite'
  }

  // 預設返回 auto，讓系統自動判斷
  return 'auto'
}
