/**
 * Model Base Class
 * @description Active Record style ORM with Proxy-based Smart Guard
 */

import { DB } from '../../DB'
import { SchemaRegistry } from '../schema/SchemaRegistry'
import type { ColumnType, TableSchema } from '../schema/types'
import { DirtyTracker } from './DirtyTracker'
import {
  ColumnNotFoundError,
  ModelNotFoundError,
  NullableConstraintError,
  TypeMismatchError,
} from './errors'

/**
 * Model attributes type
 */
export type ModelAttributes = Record<string, unknown>

/**
 * Model constructor type
 */
export type ModelConstructor<T extends Model> = new () => T

/**
 * Model static interface
 */
export interface ModelStatic<T extends Model> {
  new(): T
  table: string
  primaryKey: string
  connection?: string
}

/**
 * Base Model Class
 * Active Record implementation with Proxy-based Smart Guard
 *
 * @example
 * ```typescript
 * class User extends Model {
 *   static table = 'users'
 *
 *   declare id: number
 *   declare name: string
 *   declare email: string
 * }
 *
 * // Create
 * const user = new User()
 * user.name = 'Carl'
 * await user.save()
 *
 * // Find
 * const found = await User.find(1)
 *
 * // Update
 * found.name = 'Updated'
 * await found.save()
 *
 * // Delete
 * await found.delete()
 * ```
 */
export abstract class Model {
  // ============================================================================
  // Static Configuration
  // ============================================================================

  /** Table name */
  static table: string

  /** Primary key column */
  static primaryKey = 'id'

  /** Database connection name */
  static connection?: string

  /** Enable strict mode (throw on unknown columns) */
  static strictMode = true

  // ============================================================================
  // Instance State
  // ============================================================================

  /** Model attributes */
  protected _attributes: ModelAttributes = {}

  /** Dirty tracker */
  protected _dirtyTracker: DirtyTracker<ModelAttributes>

  /** Whether the model exists in database */
  protected _exists = false

  /** Cached schema */
  private _schema?: TableSchema

  constructor() {
    this._dirtyTracker = new DirtyTracker()
  }

  // ============================================================================
  // Proxy Factory
  // ============================================================================

  /**
   * Create a new model instance with Proxy
   */
  static create<T extends Model>(
    this: ModelConstructor<T>,
    attributes: Partial<ModelAttributes> = {}
  ): T {
    const instance = new this()
    return instance._createProxy(attributes, false)
  }

  /**
   * Hydrate a model from database row
   */
  static hydrate<T extends Model>(this: ModelConstructor<T>, row: ModelAttributes): T {
    const instance = new this()
    return instance._createProxy(row, true)
  }

  /**
   * Create proxy wrapper for Smart Guard
   */
  protected _createProxy<T extends Model>(
    this: T,
    attributes: Partial<ModelAttributes>,
    exists: boolean
  ): T {
    // Set initial state
    this._attributes = { ...attributes }
    this._exists = exists

    if (exists) {
      this._dirtyTracker.setOriginal(attributes)
    }

    const model = this
    const constructor = this.constructor as typeof Model

    return new Proxy(this, {
      get(target, prop: string | symbol) {
        // Return internal properties
        if (typeof prop === 'symbol' || (typeof prop === 'string' && prop.startsWith('_'))) {
          return Reflect.get(target, prop)
        }

        // Check for instance properties/getters first (exists, isDirty, etc.)
        // Traverse prototype chain to find getters
        let proto = Object.getPrototypeOf(target)
        while (proto) {
          const descriptor = Object.getOwnPropertyDescriptor(proto, prop)
          if (descriptor?.get) {
            return descriptor.get.call(target)
          }
          proto = Object.getPrototypeOf(proto)
        }

        // Return methods from prototype
        const value = Reflect.get(target, prop)
        if (typeof value === 'function') {
          return value.bind(target)
        }

        // Check attributes first before static properties
        if (typeof prop === 'string' && prop in model._attributes) {
          return model._attributes[prop]
        }

        // Return static properties (but not for common attribute names)
        if (prop in constructor && !['name', 'email', 'id'].includes(prop as string)) {
          return Reflect.get(constructor, prop)
        }

        // Return attribute (fallback)
        return typeof prop === 'string' ? model._attributes[prop] : undefined
      },

      set(target, prop: string | symbol, value) {
        // Allow internal property setting
        if (typeof prop === 'symbol' || prop.startsWith('_')) {
          return Reflect.set(target, prop, value)
        }

        // Validate and set attribute
        model._setAttribute(prop, value)
        return true
      },

      has(target, prop) {
        if (typeof prop === 'symbol') return false
        return prop in model._attributes || Reflect.has(target, prop)
      },

      ownKeys(target) {
        return [...Object.keys(model._attributes), ...Reflect.ownKeys(target)]
      },

      getOwnPropertyDescriptor(target, prop) {
        if (typeof prop === 'string' && prop in model._attributes) {
          return {
            value: model._attributes[prop],
            writable: true,
            enumerable: true,
            configurable: true,
          }
        }
        return Reflect.getOwnPropertyDescriptor(target, prop)
      },
    }) as T
  }

  // ============================================================================
  // Attribute Management
  // ============================================================================

  /**
   * Set attribute with validation (Smart Guard)
   */
  protected _setAttribute(key: string, value: unknown): void {
    const constructor = this.constructor as typeof Model

    if (constructor.strictMode) {
      // Asynchronously validate - for now, skip schema check in sync setter
      // Real validation happens in save()
      // This allows setting attributes that will be validated before persist
      void constructor.table // Referenced to avoid unused warning
    }

    // Mark dirty
    this._dirtyTracker.mark(key, value)

    // Set value
    this._attributes[key] = value
  }

  /**
   * Validate attribute against schema
   */
  protected async _validateAttribute(key: string, value: unknown): Promise<void> {
    const constructor = this.constructor as typeof Model
    const schema = await this._getSchema()

    const column = schema.columns.get(key)

    if (!column) {
      if (constructor.strictMode) {
        throw new ColumnNotFoundError(constructor.table, key)
      }
      return
    }

    // Null check
    if (value === null && !column.nullable) {
      throw new NullableConstraintError(constructor.table, key)
    }

    // Type check (only if value is not null)
    if (value !== null && value !== undefined) {
      const jsType = this._getJSType(value)
      const expectedTypes = this._getExpectedJSTypes(column.type)

      if (!expectedTypes.includes(jsType)) {
        throw new TypeMismatchError(constructor.table, key, expectedTypes.join(' | '), jsType)
      }
    }
  }

  /**
   * Get JavaScript type of value
   */
  private _getJSType(value: unknown): string {
    if (value === null) return 'null'
    if (Array.isArray(value)) return 'array'
    if (value instanceof Date) return 'date'
    return typeof value
  }

  /**
   * Get expected JavaScript types for column type
   */
  private _getExpectedJSTypes(columnType: ColumnType): string[] {
    const typeMap: Record<ColumnType, string[]> = {
      string: ['string'],
      text: ['string'],
      integer: ['number'],
      bigint: ['number', 'bigint'],
      smallint: ['number'],
      decimal: ['number', 'string'],
      float: ['number'],
      boolean: ['boolean'],
      date: ['string', 'date'],
      time: ['string'],
      datetime: ['string', 'date'],
      timestamp: ['string', 'date', 'number'],
      json: ['object', 'array', 'string'],
      jsonb: ['object', 'array', 'string'],
      uuid: ['string'],
      binary: ['string', 'object'],
      enum: ['string'],
      unknown: ['string', 'number', 'boolean', 'object'],
    }

    return typeMap[columnType] ?? typeMap.unknown
  }

  /**
   * Get cached schema
   */
  protected async _getSchema(): Promise<TableSchema> {
    if (!this._schema) {
      const constructor = this.constructor as typeof Model
      this._schema = await SchemaRegistry.getInstance().get(constructor.table)
    }
    return this._schema
  }

  // ============================================================================
  // Accessors
  // ============================================================================

  /**
   * Check if model exists in database
   */
  get exists(): boolean {
    return this._exists
  }

  /**
   * Check if model is dirty
   */
  get isDirty(): boolean {
    return this._dirtyTracker.isDirty()
  }

  /**
   * Get dirty attributes
   */
  getDirty(): Partial<ModelAttributes> {
    return this._dirtyTracker.getDirtyValues(this._attributes)
  }

  /**
   * Get original values
   */
  getOriginal(): Partial<ModelAttributes> {
    return this._dirtyTracker.getOriginals()
  }

  /**
   * Get all attributes
   */
  getAttributes(): ModelAttributes {
    return { ...this._attributes }
  }

  /**
   * Get primary key value
   */
  getKey(): unknown {
    const constructor = this.constructor as typeof Model
    return this._attributes[constructor.primaryKey]
  }

  // ============================================================================
  // Queryable Relations (P2)
  // ============================================================================

  /**
   * Define a hasMany relationship that returns a QueryBuilder
   * @example
   * ```typescript
   * const posts = await user.hasMany(Post, 'user_id').where('published', true).get()
   * ```
   */
  hasMany<R extends Model>(
    related: ModelConstructor<R> & typeof Model,
    foreignKey?: string,
    localKey?: string
  ) {
    const constructor = this.constructor as typeof Model
    const fk = foreignKey ?? `${constructor.table.replace(/s$/, '')}_id`
    const lk = localKey ?? constructor.primaryKey
    const localValue = this._attributes[lk]

    const connection = DB.connection(related.connection)
    const builder = connection.table<ModelAttributes>(related.table).where(fk, localValue)

    // Wrap get to hydrate
    const originalGet = builder.get.bind(builder)
      ; (builder as unknown as { get: () => Promise<R[]> }).get = async (): Promise<R[]> => {
        const rows = await originalGet()
        return rows.map((row) => related.hydrate<R>(row)) as R[]
      }

    return builder
  }

  /**
   * Define a hasOne relationship that returns a QueryBuilder
   */
  hasOne<R extends Model>(
    related: ModelConstructor<R> & typeof Model,
    foreignKey?: string,
    localKey?: string
  ) {
    return this.hasMany(related, foreignKey, localKey).limit(1)
  }

  /**
   * Define a belongsTo relationship that returns a QueryBuilder
   * @example
   * ```typescript
   * const author = await post.belongsTo(User, 'user_id').first()
   * ```
   */
  belongsTo<R extends Model>(
    related: ModelConstructor<R> & typeof Model,
    foreignKey?: string,
    ownerKey?: string
  ) {
    const fk = foreignKey ?? `${related.table.replace(/s$/, '')}_id`
    const ok = ownerKey ?? related.primaryKey
    const foreignValue = this._attributes[fk]

    const connection = DB.connection(related.connection)
    const builder = connection.table<ModelAttributes>(related.table).where(ok, foreignValue)

    // Wrap first to hydrate
    const originalFirst = builder.first.bind(builder)
    builder.first = (async (): Promise<R | null> => {
      const row = await originalFirst()
      return row ? related.hydrate<R>(row) : null
    }) as typeof builder.first

    return builder
  }

  /**
   * Define a belongsToMany relationship (through pivot table)
   * @example
   * ```typescript
   * const roles = await user.belongsToMany(Role, 'user_roles', 'user_id', 'role_id').get()
   * ```
   */
  async belongsToMany<R extends Model>(
    related: ModelConstructor<R> & typeof Model,
    pivotTable: string,
    foreignPivotKey?: string,
    relatedPivotKey?: string,
    localKey?: string,
    relatedKey?: string
  ): Promise<R[]> {
    const constructor = this.constructor as typeof Model
    const fpk = foreignPivotKey ?? `${constructor.table.replace(/s$/, '')}_id`
    const rpk = relatedPivotKey ?? `${related.table.replace(/s$/, '')}_id`
    const lk = localKey ?? constructor.primaryKey
    const rk = relatedKey ?? related.primaryKey
    const localValue = this._attributes[lk]

    const connection = DB.connection(related.connection)

    // Get related IDs from pivot table
    const pivots = await connection
      .table<Record<string, unknown>>(pivotTable)
      .where(fpk, localValue)
      .pluck<unknown>(rpk)

    if (pivots.length === 0) return []

    // Get related models
    const rows = await connection.table<ModelAttributes>(related.table).whereIn(rk, pivots).get()

    return rows.map((row) => related.hydrate<R>(row)) as R[]
  }

  /**
   * Stream hasMany relationship with cursor-based iteration
   * Memory-safe for large relationship sets
   * 
   * @example
   * ```typescript
   * for await (const posts of user.hasManyStream(Post, 'user_id', 100)) {
   *   for (const post of posts) {
   *     await processPost(post)
   *   }
   * }
   * ```
   */
  async *hasManyStream<R extends Model>(
    related: ModelConstructor<R> & typeof Model,
    foreignKey?: string,
    chunkSize = 1000,
    localKey?: string
  ): AsyncGenerator<R[], void, unknown> {
    const constructor = this.constructor as typeof Model
    const fk = foreignKey ?? `${constructor.table.replace(/s$/, '')}_id`
    const lk = localKey ?? constructor.primaryKey
    const localValue = this._attributes[lk]

    const connection = DB.connection(related.connection)
    let offset = 0

    while (true) {
      const rows = await connection
        .table<ModelAttributes>(related.table)
        .where(fk, localValue)
        .orderBy(related.primaryKey)
        .limit(chunkSize)
        .offset(offset)
        .get()

      if (rows.length === 0) break

      yield rows.map(row => related.hydrate<R>(row)) as R[]

      if (rows.length < chunkSize) break
      offset += chunkSize
    }
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /**
   * Save the model (insert or update)
   */
  async save(): Promise<this> {
    // Validate all dirty attributes
    for (const key of this._dirtyTracker.getDirty()) {
      await this._validateAttribute(key as string, this._attributes[key as string])
    }

    if (this._exists) {
      return await this._performUpdate()
    } else {
      return await this._performInsert()
    }
  }

  /**
   * Perform insert
   */
  protected async _performInsert(): Promise<this> {
    const constructor = this.constructor as typeof Model
    const connection = DB.connection(constructor.connection)

    const result = await connection
      .table<ModelAttributes>(constructor.table)
      .insert(this._attributes)

    // Set primary key from result
    if (Array.isArray(result) && result.length > 0) {
      const pk = result[0]
      if (typeof pk === 'object' && pk !== null) {
        this._attributes[constructor.primaryKey] = (pk as Record<string, unknown>)[
          constructor.primaryKey
        ]
      } else {
        this._attributes[constructor.primaryKey] = pk
      }
    }

    this._exists = true
    this._dirtyTracker.sync(this._attributes)

    return this
  }

  /**
   * Perform update
   */
  protected async _performUpdate(): Promise<this> {
    const constructor = this.constructor as typeof Model
    const connection = DB.connection(constructor.connection)

    const dirty = this.getDirty()
    if (Object.keys(dirty).length === 0) {
      return this // Nothing to update
    }

    await connection
      .table(constructor.table)
      .where(constructor.primaryKey, this.getKey())
      .update(dirty)

    this._dirtyTracker.sync(this._attributes)

    return this
  }

  /**
   * Delete the model
   */
  async delete(): Promise<void> {
    if (!this._exists) return

    const constructor = this.constructor as typeof Model
    const connection = DB.connection(constructor.connection)

    await connection.table(constructor.table).where(constructor.primaryKey, this.getKey()).delete()

    this._exists = false
  }

  /**
   * Refresh the model from database
   */
  async refresh(): Promise<this> {
    if (!this._exists) return this

    const constructor = this.constructor as typeof Model
    const connection = DB.connection(constructor.connection)

    const row = await connection
      .table<ModelAttributes>(constructor.table)
      .where(constructor.primaryKey, this.getKey())
      .first()

    if (row) {
      this._attributes = row
      this._dirtyTracker.sync(row)
    }

    return this
  }

  // ============================================================================
  // Static Query Methods
  // ============================================================================

  /**
   * Find a model by primary key
   */
  static async find<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    key: unknown
  ): Promise<T | null> {
    const connection = DB.connection(this.connection)

    const row = await connection
      .table<ModelAttributes>(this.table)
      .where(this.primaryKey, key)
      .first()

    if (!row) return null

    return this.hydrate<T>(row)
  }

  /**
   * Find a model or throw
   */
  static async findOrFail<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    key: unknown
  ): Promise<T> {
    const model = await this.find<T>(key)
    if (!model) {
      throw new ModelNotFoundError(this.name, key)
    }
    return model
  }

  /**
   * Get all models
   */
  static async all<T extends Model>(this: ModelConstructor<T> & typeof Model): Promise<T[]> {
    const connection = DB.connection(this.connection)

    const rows = await connection
      .table<ModelAttributes>(this.table)
      .limit(1000) // Auto-chunking defense
      .get()

    return rows.map((row) => this.hydrate<T>(row))
  }

  /**
   * Create a new model and save
   */
  static async createAndSave<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    attributes: Partial<ModelAttributes>
  ): Promise<T> {
    const model = this.create<T>(attributes)
    await model.save()
    return model
  }

  /**
   * Lazy hydration: returns an async generator that yields raw data
   * Models are only instantiated when explicitly transformed
   * 
   * @example
   * ```typescript
   * // Memory efficient - rows stay as raw data until needed
   * for await (const rawRows of User.lazyAll(100)) {
   *   // Process raw data
   *   const ids = rawRows.map(r => r.id)
   *   
   *   // Hydrate only when needed
   *   for (const row of rawRows) {
   *     if (shouldProcess(row)) {
   *       const user = User.hydrate(row)
   *       await user.save()
   *     }
   *   }
   * }
   * ```
   */
  static async *lazyAll<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    chunkSize = 1000
  ): AsyncGenerator<ModelAttributes[], void, unknown> {
    const connection = DB.connection(this.connection)
    let offset = 0

    while (true) {
      const rows = await connection
        .table<ModelAttributes>(this.table)
        .orderBy(this.primaryKey)
        .limit(chunkSize)
        .offset(offset)
        .get()

      if (rows.length === 0) break

      // Yield raw data - not hydrated yet
      yield rows

      if (rows.length < chunkSize) break
      offset += chunkSize
    }
  }

  /**
   * Cursor-based iteration for memory-safe processing
   * Yields chunks of models without loading all into memory
   *
   * @param chunkSize - Number of rows per chunk (default: 1000)
   * @example
   * ```typescript
   * for await (const users of User.cursor(100)) {
   *   for (const user of users) {
   *     await processUser(user)
   *   }
   * }
   * ```
   */
  static async *cursor<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    chunkSize = 1000
  ): AsyncGenerator<T[], void, unknown> {
    const connection = DB.connection(this.connection)
    let offset = 0

    while (true) {
      const rows = await connection
        .table<ModelAttributes>(this.table)
        .orderBy(this.primaryKey) // Deterministic ordering
        .limit(chunkSize)
        .offset(offset)
        .get()

      if (rows.length === 0) break

      yield rows.map((row) => this.hydrate<T>(row))

      if (rows.length < chunkSize) break
      offset += chunkSize
    }
  }

  /**
   * Get query builder for this model
   * Allows fluent query building with model hydration
   *
   * @example
   * ```typescript
   * const activeUsers = await User.query()
   *   .where('active', true)
   *   .orderBy('created_at', 'desc')
   *   .limit(10)
   *   .get()
   * ```
   */
  static query<T extends Model>(this: ModelConstructor<T> & typeof Model) {
    const connection = DB.connection(this.connection)
    const builder = connection.table<ModelAttributes>(this.table)

    // Wrap get() to hydrate results
    const originalGet = builder.get.bind(builder)
      ; (builder as unknown as { get: () => Promise<T[]> }).get = async (): Promise<T[]> => {
        const rows = await originalGet()
        return rows.map((row) => this.hydrate<T>(row)) as unknown as T[]
      }

    // Wrap first() to hydrate result
    const originalFirst = builder.first.bind(builder)
    builder.first = (async (): Promise<T | null> => {
      const row = await originalFirst()
      return row ? this.hydrate<T>(row) : null
    }) as typeof builder.first

    return builder
  }

  /**
   * Count records
   */
  static async count(this: ModelConstructor<Model> & typeof Model): Promise<number> {
    const connection = DB.connection(this.connection)
    const result = await connection.table(this.table).count()
    return typeof result === 'number' ? result : 0
  }

  /**
   * Check if any records exist
   */
  static async exists(this: ModelConstructor<Model> & typeof Model): Promise<boolean> {
    return (await this.count()) > 0
  }

  // ============================================================================
  // JSON Serialization
  // ============================================================================

  /**
   * Convert to JSON
   */
  toJSON(): ModelAttributes {
    return this.getAttributes()
  }
}
