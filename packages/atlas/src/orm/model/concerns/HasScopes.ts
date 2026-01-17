import { DB } from '../../../DB'
import type { QueryBuilderContract } from '../../../types'
import { SOFT_DELETES_KEY } from '../decorators'
import { ModelNotFoundError } from '../errors'
import type { Model, ModelAttributes } from '../Model'

/**
 * Trait for managing model query scopes and static querying.
 *
 * @public
 * @since 3.0.0
 */
export abstract class HasScopes {
  /**
   * Get the first record
   */
  static async first<T extends Model>(this: any): Promise<T | null> {
    return this.query().first()
  }

  /**
   * Find a model by primary key
   */
  static async find<T extends Model>(this: any, key: unknown): Promise<T | null> {
    const row = await this.query().where(this.primaryKey, key).first()

    return row as T | null
  }

  /**
   * Find a model or throw
   */
  static async findOrFail<T extends Model>(this: any, key: unknown): Promise<T> {
    const model = await this.find(key)
    if (!model) {
      throw new ModelNotFoundError(this.getTable(), key)
    }
    return model
  }

  /**
   * Get all models
   */
  static async all<T extends Model>(this: any): Promise<T[]> {
    return this.query().get()
  }

  /**
   * Alias for create()
   */
  static async createAndSave<T extends Model>(
    this: any,
    attributes: Partial<ModelAttributes>
  ): Promise<T> {
    return this.create(attributes)
  }

  /**
   * Lazy hydration: returns an async generator that yields raw data
   */
  static async *lazyAll<T extends Model>(
    this: any,
    chunkSize = 1000
  ): AsyncGenerator<ModelAttributes[], void, unknown> {
    const connection = DB.connection(this.connection)
    let offset = 0

    while (true) {
      const builder = connection.table<ModelAttributes>(this.getTable())

      // Soft deletes for raw lazy loading
      const softDeletes = this[SOFT_DELETES_KEY]
      if (softDeletes) {
        builder.whereNull(softDeletes.column || 'deleted_at')
      }

      const rows = await builder.orderBy(this.primaryKey).limit(chunkSize).offset(offset).get()

      if (rows.length === 0) break
      yield rows
      if (rows.length < chunkSize) break
      offset += chunkSize
    }
  }

  /**
   * Cursor-based iteration for memory-safe processing
   */
  static async *cursor<T extends Model>(
    this: any,
    chunkSize = 1000
  ): AsyncGenerator<T[], void, unknown> {
    for await (const rows of (this as any).lazyAll(chunkSize)) {
      yield rows.map((row: ModelAttributes) => (this as any).hydrate(row))
    }
  }

  /**
   * Get query builder for this model
   */
  static query<T extends Model>(this: any) {
    const connection = DB.connection(this.connection)
    const builder = connection.table<ModelAttributes>(this.getTable())

    // Pass model reference to builder
    if (typeof (builder as any).setModel === 'function') {
      ;(builder as any).setModel(this)
    }

    // Apply SoftDeletes via global scope system
    const softDeletes = this[SOFT_DELETES_KEY]
    if (softDeletes && typeof (builder as any).applyScope === 'function') {
      ;(builder as any).applyScope('softDeletes', (q: any) => {
        q.whereNull(softDeletes.column || 'deleted_at')
      })
    }

    // Wrap get() to hydrate results and handle eager loading
    const originalGet = builder.get.bind(builder)
    ;(builder as any).get = async (): Promise<T[]> => {
      const rows = await originalGet()

      // Fast Path: Skip hydration if read-only
      if (
        typeof (builder as any).getIsReadOnly === 'function' &&
        (builder as any).getIsReadOnly()
      ) {
        return rows as any
      }

      const models = rows.map((row: ModelAttributes) => (this as any).hydrate(row))

      // Handle eager loading
      const eagerLoads = (builder as any).eagerLoads
      if (eagerLoads && eagerLoads.size > 0 && models.length > 0) {
        const { eagerLoadMany } = await import('../relationships')
        await eagerLoadMany(models, eagerLoads)
      }

      return models
    }

    // Wrap first() to hydrate result and handle eager loading
    const originalFirst = builder.first.bind(builder)
    ;(builder as any).first = (async (): Promise<T | null> => {
      const row = await originalFirst()
      if (!row) return null

      // Fast Path: Skip hydration if read-only
      if (
        typeof (builder as any).getIsReadOnly === 'function' &&
        (builder as any).getIsReadOnly()
      ) {
        return row as any
      }

      const model = (this as any).hydrate(row)

      // Handle eager loading
      const eagerLoads = (builder as any).eagerLoads
      if (eagerLoads && eagerLoads.size > 0) {
        const { eagerLoadMany } = await import('../relationships')
        await eagerLoadMany([model], eagerLoads)
      }

      return model
    }) as any

    return builder as unknown as QueryBuilderContract<T>
  }

  /**
   * Start a query with a where clause
   */
  static where<T extends Model>(
    this: any,
    column: any,
    operatorOrValue?: any,
    value?: unknown
  ): QueryBuilderContract<T> {
    return this.query().where(column, operatorOrValue, value)
  }

  /**
   * Start a query with a whereIn clause
   */
  static whereIn<T extends Model>(
    this: any,
    column: string,
    values: unknown[]
  ): QueryBuilderContract<T> {
    return this.query().whereIn(column, values)
  }

  /**
   * Start a query with a whereNull clause
   */
  static whereNull<T extends Model>(this: any, column: string): QueryBuilderContract<T> {
    return this.query().whereNull(column)
  }

  /**
   * Start a query with a whereNotNull clause
   */
  static whereNotNull<T extends Model>(this: any, column: string): QueryBuilderContract<T> {
    return this.query().whereNotNull(column)
  }

  /**
   * Start a query with an orderBy clause
   */
  static orderBy<T extends Model>(
    this: any,
    column: string,
    direction: 'asc' | 'desc' = 'asc'
  ): QueryBuilderContract<T> {
    return this.query().orderBy(column, direction)
  }

  /**
   * Start a query with a limit
   */
  static limit<T extends Model>(this: any, value: number): QueryBuilderContract<T> {
    return this.query().limit(value)
  }

  /**
   * Start a query with an offset
   */
  static offset<T extends Model>(this: any, value: number): QueryBuilderContract<T> {
    return this.query().offset(value)
  }

  /**
   * Start a query with selected columns
   */
  static select<T extends Model>(this: any, ...columns: string[]): QueryBuilderContract<T> {
    return this.query().select(...columns)
  }

  /**
   * Start a query with eager loading
   */
  static with<T extends Model>(
    this: any,
    relation: string | string[] | Record<string, (query: QueryBuilderContract<any>) => void>
  ): QueryBuilderContract<T> {
    return this.query().with(relation)
  }

  /**
   * Start a query ordered by created_at desc
   */
  static latest<T extends Model>(this: any, column = 'created_at'): QueryBuilderContract<T> {
    return this.query().latest(column)
  }

  /**
   * Start a query ordered by created_at asc
   */
  static oldest<T extends Model>(this: any, column = 'created_at'): QueryBuilderContract<T> {
    return this.query().oldest(column)
  }

  /**
   * Get a factory instance for this model
   */
  static factory<T extends Model>(this: any, count = 1): any {
    const { Factory } = require('../../seed/Factory')
    return new Factory(this, count)
  }

  /**
   * Count records
   */
  static async count(this: any): Promise<number> {
    return this.query().count()
  }

  /**
   * Check if any records exist
   */
  static async exists(this: any): Promise<boolean> {
    return (await this.count()) > 0
  }
}
