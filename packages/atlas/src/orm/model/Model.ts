/**
 * Model Base Class
 * @description Active Record style ORM with Proxy-based Smart Guard
 */

import { DB } from '../../DB'
import { Factory } from '../../seed/Factory'
import type { QueryBuilderContract } from '../../types'
import { SchemaRegistry } from '../schema/SchemaRegistry'
import type { ColumnType, TableSchema } from '../schema/types'
import { DirtyTracker } from './DirtyTracker'
import { COLUMN_KEY, SOFT_DELETES_KEY } from './decorators'
import {
  ColumnNotFoundError,
  ModelNotFoundError,
  NullableConstraintError,
  TypeMismatchError,
} from './errors'
import { ModelRegistry } from './ModelRegistry'
import { getRelationships } from './relationships'

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
  new (): T
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
  static tableName: string

  /** Primary key column */
  static primaryKey = 'id'
  static hidden: string[] = []
  static visible: string[] = []
  static appends: string[] = []
  static observers: any[] = []

  /** Enable automatic timestamps */
  static timestamps = true
  static createdAtColumn = 'created_at'
  static updatedAtColumn = 'updated_at'

  /** Attribute casting definition */
  static casts: Record<string, string> = {}

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
   * Instantiate a new model instance (non-saving)
   */
  static make<T extends Model>(
    this: ModelConstructor<T>,
    attributes: Partial<ModelAttributes> = {}
  ): T {
    const instance = new this()
    return (instance as any)._createProxy(attributes, false)
  }

  /**
   * Create a new model and save it to the database
   */
  static async create<T extends Model>(
    this: ModelConstructor<T>,
    attributes: Partial<ModelAttributes> = {}
  ): Promise<T> {
    const model = (this as any).make(attributes)
    await model.save()
    return model
  }

  /**
   * Hydrate a model from database row
   */
  static hydrate<T extends Model>(this: ModelConstructor<T>, row: ModelAttributes): T {
    const instance = new this()
    const proxy = instance._createProxy(row, true)

    // Trigger retrieved event (async)
    void (proxy as any).emit?.('retrieved')

    return proxy
  }

  /**
   * Create proxy wrapper for Smart Guard
   */
  protected _createProxy<T extends Model>(
    this: T,
    attributes: Partial<ModelAttributes>,
    exists: boolean
  ): T {
    // Cast initial attributes if they exist
    const modelCtor = this.constructor as typeof Model
    const castedAttributes = { ...attributes }

    if (Object.keys(modelCtor.casts).length > 0) {
      for (const [key, value] of Object.entries(attributes)) {
        if (key in modelCtor.casts) {
          castedAttributes[key] = this._castAttribute(key, value, modelCtor.casts[key]!)
        }
      }
    }

    // Set initial state
    this._attributes = castedAttributes
    this._exists = exists

    if (exists) {
      this._dirtyTracker.setOriginal(attributes)
    }

    const model = this

    return new Proxy(this, {
      get(target, prop: string | symbol, receiver) {
        // 1. Return internal properties (including _attributes, _exists, etc.)
        if (typeof prop === 'symbol' || (typeof prop === 'string' && prop.startsWith('_'))) {
          return Reflect.get(target, prop)
        }

        // 2. Explicitly handle constructor to preserve class identity
        if (prop === 'constructor') {
          return target.constructor
        }

        // 3. Check for instance getters/methods first
        // We prioritize methods like save(), delete(), find() etc. from the prototype
        let proto = Object.getPrototypeOf(target)
        while (proto && proto !== Object.prototype) {
          const descriptor = Object.getOwnPropertyDescriptor(proto, prop)
          if (descriptor?.get) {
            return descriptor.get.call(receiver)
          }
          if (descriptor?.value && typeof descriptor.value === 'function') {
            return descriptor.value.bind(receiver)
          }
          proto = Object.getPrototypeOf(proto)
        }

        // 4. Check for Accessors (get[Name]Attribute)
        if (typeof prop === 'string') {
          const studly = prop.replace(/(?:^|_|(?=[A-Z]))(.)/g, (_, c) => c.toUpperCase())
          const accessor = `get${studly}Attribute`
          // Check if accessor exists on the instance (prototype)
          if (typeof (target as any)[accessor] === 'function') {
            const raw = model._attributes[prop]
            // Bind to receiver (the proxy) to allow access to other attributes
            return (target as any)[accessor].call(receiver, raw)
          }
        }

        // 5. Return from attributes if it exists
        if (typeof prop === 'string' && prop in model._attributes) {
          return model._attributes[prop]
        }

        const relations = getRelationships(modelCtor)
        if (typeof prop === 'string' && relations.has(prop)) {
          const builderFn = (..._args: any[]) => {
            const meta = relations.get(prop)!
            const type = meta.type

            if (type === 'morphTo') {
              return (receiver as any).morphTo(
                meta.morphName,
                meta.morphTypeField,
                meta.morphIdField
              )
            }

            if (type === 'morphOne' || type === 'morphMany') {
              const Related = meta.related?.()
              return (receiver as any)[type](
                Related,
                meta.morphName,
                meta.foreignKey,
                meta.localKey
              )
            }

            const Related = meta.related?.()
            // Call hasOne, hasMany, belongsTo, or belongsToMany
            return (receiver as any)[type](Related, meta.foreignKey, meta.localKey)
          }

          // Make it thenable for property-style lazy loading: await user.posts
          // biome-ignore lint/suspicious/noThenProperty: Intentional thenable for property-style lazy loading
          ;(builderFn as any).then = async (resolve: any, reject: any) => {
            try {
              await (receiver as any).load(prop)
              resolve((receiver as any)._attributes[prop])
            } catch (err) {
              reject(err)
            }
          }

          return builderFn
        }

        // 6. Return instance values
        if (Object.hasOwn(target, prop)) {
          const value = Reflect.get(target, prop)
          if (typeof value === 'function') {
            return value.bind(receiver)
          }
          return value
        }

        // 7. Return static properties from the model constructor
        if (prop in modelCtor && !['name', 'prototype', 'length'].includes(prop as string)) {
          const value = Reflect.get(modelCtor, prop)
          if (typeof value === 'function') {
            return value.bind(modelCtor)
          }
          return value
        }

        return undefined
      },

      set(target, prop: string | symbol, value, receiver) {
        // 1. Allow internal property setting
        if (typeof prop === 'symbol' || (typeof prop === 'string' && prop.startsWith('_'))) {
          return Reflect.set(target, prop, value, receiver)
        }

        // 2. Check for Mutators (set[Name]Attribute)
        if (typeof prop === 'string') {
          const studly = prop.replace(/(?:^|_|(?=[A-Z]))(.)/g, (_, c) => c.toUpperCase())
          const mutator = `set${studly}Attribute`
          if (typeof (target as any)[mutator] === 'function') {
            ;(target as any)[mutator].call(receiver, value)
            return true
          }
        }

        // 3. Prioritize setting attributes/relations
        // If it's already an attribute, or if it's not in the target (instance), treat as attribute
        if (!(prop in target) || (typeof prop === 'string' && prop in model._attributes)) {
          model._setAttribute(prop as string, value)
          return true
        }

        // 3. Set on instance (for non-attribute properties like events array)
        return Reflect.set(target, prop, value)
      },

      has(target, prop) {
        if (typeof prop === 'symbol') {
          return false
        }
        return prop in model._attributes || Reflect.has(target, prop)
      },

      ownKeys(target) {
        return [...new Set([...Object.keys(model._attributes), ...Reflect.ownKeys(target)])]
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
    const modelCtor = this.constructor as typeof Model

    if (modelCtor.strictMode) {
      // Asynchronously validate - for now, skip schema check in sync setter
      // Real validation happens in save()
      // This allows setting attributes that will be validated before persist
      void modelCtor.table // Referenced to avoid unused warning
    }

    // Mark dirty
    this._dirtyTracker.mark(key, value)

    // Cast value before setting
    const type = modelCtor.casts[key]
    const castedValue = type ? this._castAttribute(key, value, type) : value

    // Set value
    this._attributes[key] = castedValue
  }

  /**
   * Validate attribute against schema
   */
  protected async _validateAttribute(key: string, value: unknown): Promise<void> {
    const modelCtor = this.constructor as typeof Model
    const table = modelCtor.getTable()
    const schema = await this._getSchema()

    const column = schema.columns.get(key)

    if (!column) {
      if (modelCtor.strictMode) {
        throw new ColumnNotFoundError(table, key)
      }
      return
    }

    // Null check
    if (value === null && !column.nullable) {
      throw new NullableConstraintError(modelCtor.table, key)
    }

    // Type check (only if value is not null)
    if (value !== null && value !== undefined) {
      const jsType = this._getJSType(value)
      const expectedTypes = this._getExpectedJSTypes(column.type)

      // SQLite specific: if column is string but we get an object, check if it might be JSON
      if (jsType === 'object' && expectedTypes.includes('string')) {
        // Allow it - the driver will handle serialization
        return
      }

      if (!expectedTypes.includes(jsType)) {
        throw new TypeMismatchError(table, key, expectedTypes.join(' | '), jsType)
      }
    }
  }

  /**
   * Get JavaScript type of value
   */
  private _getJSType(value: unknown): string {
    if (value === null) {
      return 'null'
    }
    if (Array.isArray(value)) {
      return 'array'
    }
    if (value instanceof Date) {
      return 'date'
    }
    return typeof value
  }

  /**
   * Cast attribute value to its type
   */
  private _castAttribute(_key: string, value: any, type: string): any {
    if (value === null || value === undefined) {
      return value
    }

    switch (type) {
      case 'int':
      case 'integer':
      case 'number':
        return typeof value === 'string' ? parseFloat(value) : Number(value)

      case 'real':
      case 'float':
      case 'double':
        return parseFloat(value)

      case 'string':
        return String(value)

      case 'bool':
      case 'boolean':
        return [true, 1, '1', 'true', 'on', 'yes'].includes(value)

      case 'object':
      case 'json':
        if (typeof value === 'object') {
          return value
        }
        try {
          return JSON.parse(value)
        } catch (_e) {
          return value
        }

      case 'collection':
        // Placeholder for Collection support
        return Array.isArray(value) ? value : [value]

      case 'date':
      case 'datetime':
        if (value instanceof Date) {
          return value
        }
        return new Date(value)

      case 'timestamp':
        return value instanceof Date ? value.getTime() : new Date(value).getTime()
    }

    return value
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
   * Get the table name for this model
   */
  static getTable(): string {
    const self = this as any
    const table = self.tableName || self.table
    if (!table) {
      throw new Error(`Model ${this.name} has no table defined.`)
    }
    return table
  }

  /**
   * Get cached schema
   */
  protected async _getSchema(): Promise<TableSchema> {
    if (!this._schema) {
      const modelCtor = this.constructor as any
      const connection = DB.connection(modelCtor.connection)
      const table = modelCtor.getTable()

      // Fast path for non-SQL drivers
      const driver = connection.getDriver()
      if (
        typeof driver.getDriverName === 'function' &&
        (driver.getDriverName() === 'mongodb' || driver.getDriverName() === 'redis')
      ) {
        return {
          table: table,
          columns: new Map(),
          primaryKey: [modelCtor.primaryKey],
          capturedAt: Date.now(),
        }
      }

      this._schema = await SchemaRegistry.getInstance().get(table)
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
    const modelCtor = this.constructor as typeof Model
    return this._attributes[modelCtor.primaryKey]
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
    const modelCtor = this.constructor as typeof Model
    const table = modelCtor.getTable()
    const fk = foreignKey ?? `${table.replace(/s$/, '')}_id`
    const lk = localKey ?? modelCtor.primaryKey
    const localValue = this._attributes[lk]

    const connection = DB.connection(related.connection)
    const builder = connection.table<ModelAttributes>(related.getTable()).where(fk, localValue)

    // Wrap get to hydrate
    const originalGet = builder.get.bind(builder)
    ;(builder as unknown as { get: () => Promise<R[]> }).get = async (): Promise<R[]> => {
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
    const table = related.getTable()
    const fk = foreignKey ?? `${table.replace(/s$/, '')}_id`
    const ok = ownerKey ?? related.primaryKey
    const foreignValue = this._attributes[fk]

    const connection = DB.connection(related.connection)
    const builder = connection.table<ModelAttributes>(table).where(ok, foreignValue)

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
    const modelCtor = this.constructor as typeof Model
    const table = modelCtor.getTable()
    const relatedTable = related.getTable()
    const fpk = foreignPivotKey ?? `${table.replace(/s$/, '')}_id`
    const rpk = relatedPivotKey ?? `${relatedTable.replace(/s$/, '')}_id`
    const lk = localKey ?? modelCtor.primaryKey
    const rk = relatedKey ?? related.primaryKey
    const localValue = this._attributes[lk]

    const connection = DB.connection(related.connection)

    // Get related IDs from pivot table
    const pivots = await connection
      .table<Record<string, unknown>>(pivotTable)
      .where(fpk, localValue)
      .pluck<unknown>(rpk)

    if (pivots.length === 0) {
      return []
    }

    // Get related models
    const rows = await connection.table<ModelAttributes>(relatedTable).whereIn(rk, pivots).get()

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
    const modelCtor = this.constructor as typeof Model
    const table = modelCtor.getTable()
    const fk = foreignKey ?? `${table.replace(/s$/, '')}_id`
    const lk = localKey ?? modelCtor.primaryKey
    const localValue = this._attributes[lk]

    const connection = DB.connection(related.connection)
    let offset = 0

    while (true) {
      const rows = await connection
        .table<ModelAttributes>(related.getTable())
        .where(fk, localValue)
        .orderBy(related.primaryKey)
        .limit(chunkSize)
        .offset(offset)
        .get()

      if (rows.length === 0) {
        break
      }

      yield rows.map((row) => related.hydrate<R>(row)) as R[]

      if (rows.length < chunkSize) {
        break
      }
      offset += chunkSize
    }
  }

  /**
   * Define a polymorphic hasOne relationship
   */
  morphOne<R extends Model>(
    related: ModelConstructor<R> & typeof Model,
    name: string,
    foreignKey?: string,
    localKey?: string
  ) {
    const fk = foreignKey ?? `${name}_id`
    const typeField = `${name}_type`
    const modelCtor = this.constructor as typeof Model

    return this.hasMany(related, fk, localKey).where(typeField, modelCtor.name).limit(1)
  }

  /**
   * Define a polymorphic hasMany relationship
   */
  morphMany<R extends Model>(
    related: ModelConstructor<R> & typeof Model,
    name: string,
    foreignKey?: string,
    localKey?: string
  ) {
    const fk = foreignKey ?? `${name}_id`
    const typeField = `${name}_type`
    const modelCtor = this.constructor as typeof Model

    return this.hasMany(related, fk, localKey).where(typeField, modelCtor.name)
  }

  /**
   * Define a polymorphic belongsTo relationship
   */
  morphTo<R extends Model>(name: string, typeField?: string, idField?: string) {
    const tf = typeField ?? `${name}_type`
    const ifld = idField ?? `${name}_id`

    const typeValue = (this as any)[tf]
    const idValue = (this as any)[ifld]

    if (!typeValue || !idValue) {
      return null
    }

    const RelatedModel = ModelRegistry.get(typeValue)
    if (!RelatedModel) {
      return null
    }

    const builder = (RelatedModel as any).query().where(RelatedModel.primaryKey, idValue)

    // Wrap first to hydrate (similar to belongsTo)
    const originalFirst = builder.first.bind(builder)
    builder.first = (async (): Promise<R | null> => {
      const row = await originalFirst()
      return row ? (RelatedModel as any).hydrate(row) : null
    }) as any

    return builder
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /**
   * Save the model (insert or update)
   */
  async save(): Promise<this> {
    // Trigger saving event
    await this.emit('saving')

    // Validate all dirty attributes
    for (const key of this._dirtyTracker.getDirty()) {
      await this._validateAttribute(key as string, this._attributes[key as string])
    }

    let result: this
    if (this._exists) {
      result = await this._performUpdate()
    } else {
      result = await this._performInsert()
    }

    // Trigger saved event
    await this.emit('saved')
    return result
  }

  /**
   * Perform insert
   */
  protected async _performInsert(): Promise<this> {
    const modelCtor = this.constructor as typeof Model
    const connection = DB.connection(modelCtor.connection)

    // Trigger creating event
    await this.emit('creating')

    // Handle Timestamps
    if (modelCtor.timestamps) {
      const now = new Date()
      if (!this._attributes[modelCtor.createdAtColumn]) {
        this._setAttribute(modelCtor.createdAtColumn, now)
      }
      if (!this._attributes[modelCtor.updatedAtColumn]) {
        this._setAttribute(modelCtor.updatedAtColumn, now)
      }
    }

    // Handle @column(autoCreate)
    const columns = (modelCtor as any)[COLUMN_KEY]
    if (columns) {
      for (const [prop, options] of Object.entries(columns)) {
        if ((options as any).autoCreate && !this._attributes[prop]) {
          this._setAttribute(prop, new Date())
        }
      }
    }

    const result = await connection
      .table<ModelAttributes>(modelCtor.getTable())
      .insert(this._attributes)

    // Set primary key from result
    if (Array.isArray(result) && result.length > 0) {
      const pk = result[0]
      if (typeof pk === 'object' && pk !== null) {
        this._attributes[modelCtor.primaryKey] = (pk as Record<string, unknown>)[
          modelCtor.primaryKey
        ]
      } else {
        this._attributes[modelCtor.primaryKey] = pk
      }
    }

    this._exists = true
    this._dirtyTracker.sync(this._attributes)

    // Trigger created event
    await this.emit('created')

    return this
  }

  /**
   * Perform update
   */
  protected async _performUpdate(): Promise<this> {
    const modelCtor = this.constructor as typeof Model
    const connection = DB.connection(modelCtor.connection)

    // Trigger updating event
    await this.emit('updating')

    // Handle Timestamps
    if (modelCtor.timestamps) {
      this._setAttribute(modelCtor.updatedAtColumn, new Date())
    }

    // Handle @column(autoUpdate)
    const columns = (modelCtor as any)[COLUMN_KEY]
    if (columns) {
      for (const [prop, options] of Object.entries(columns)) {
        if ((options as any).autoUpdate) {
          this._setAttribute(prop, new Date())
        }
      }
    }

    const dirty = this.getDirty()
    if (Object.keys(dirty).length === 0) {
      return this // Nothing to update
    }

    await connection
      .table(modelCtor.getTable())
      .where(modelCtor.primaryKey, this.getKey())
      .update(dirty)

    this._dirtyTracker.sync(this._attributes)

    // Trigger updated event
    await this.emit('updated')

    return this
  }

  /**
   * Delete the model
   */
  async delete(): Promise<boolean> {
    if (!this._exists) {
      return false
    }

    await this.emit('deleting')

    const modelCtor = this.constructor as any
    const softDeletes = modelCtor[SOFT_DELETES_KEY]
    let result: boolean

    if (softDeletes) {
      const column = softDeletes.column || 'deleted_at'
      this._setAttribute(column, new Date())
      await this.save()
      result = true
    } else {
      const connection = DB.connection(modelCtor.connection)
      const affected = await connection
        .table(modelCtor.getTable())
        .where(modelCtor.primaryKey, this.getKey())
        .delete()
      result = affected > 0
    }
    if (result) {
      this._exists = !softDeletes
      await this.emit('deleted')
    }

    return result
  }

  /**
   * Restore a soft deleted model
   */
  async restore(): Promise<boolean> {
    const modelCtor = this.constructor as any
    const softDeletes = modelCtor[SOFT_DELETES_KEY]
    if (!softDeletes) {
      return false
    }

    const column = softDeletes.column || 'deleted_at'
    this._setAttribute(column, null)
    await this.save()
    return true
  }

  /**
   * Force delete a soft deleted model physically
   */
  async forceDelete(): Promise<boolean> {
    const modelCtor = this.constructor as any
    const connection = DB.connection(modelCtor.connection)
    const affected = await connection
      .table(modelCtor.getTable())
      .where(modelCtor.primaryKey, this.getKey())
      .forceDelete()

    if (affected > 0) {
      this._exists = false
      await this.emit('deleted')
      return true
    }

    return false
  }

  /**
   * Lazy load relationships for the current model
   * @example await user.load('posts')
   */
  async load(relation: string | string[]): Promise<this> {
    const { eagerLoadMany } = await import('./relationships')
    const relations = Array.isArray(relation) ? relation : [relation]
    await eagerLoadMany([this], relations)
    return this
  }

  /**
   * Register a model observer
   */
  static observe(observer: any) {
    if (!Object.hasOwn(this, 'observers')) {
      this.observers = []
    }
    this.observers.push(observer)
  }

  /**
   * Emit a model event
   */
  protected async emit(event: string): Promise<void> {
    const modelCtor = this.constructor as typeof Model

    // 1. Instance method hooks (existing logic)
    const methodName = `on${event.charAt(0).toUpperCase()}${event.slice(1)}`
    if (typeof (this as any)[methodName] === 'function') {
      await (this as any)[methodName]()
    }

    // 2. Observers
    if (modelCtor.observers && modelCtor.observers.length > 0) {
      for (const observer of modelCtor.observers) {
        if (typeof observer[event] === 'function') {
          await observer[event](this)
        }
      }
    }
  }

  /**
   * Refresh the model from database
   */
  async refresh(): Promise<this> {
    if (!this._exists) {
      return this
    }

    const modelCtor = this.constructor as typeof Model
    const connection = DB.connection(modelCtor.connection)

    const row = await connection
      .table<ModelAttributes>(modelCtor.getTable())
      .where(modelCtor.primaryKey, this.getKey())
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
   * Get the first record
   */
  static async first<T extends Model>(this: ModelConstructor<T> & typeof Model): Promise<T | null> {
    const result = await this.query().first()
    return result as T | null
  }

  /**
   * Find a model by primary key
   */
  static async find<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    key: unknown
  ): Promise<T | null> {
    const connection = DB.connection(this.connection)

    const row = await connection
      .table<ModelAttributes>(this.getTable())
      .where(this.primaryKey, key)
      .first()

    if (!row) {
      return null
    }

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
      .table<ModelAttributes>(this.getTable())
      .limit(1000) // Auto-chunking defense
      .get()

    return rows.map((row) => this.hydrate<T>(row))
  }

  /**
   * Alias for create()
   */
  static async createAndSave<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    attributes: Partial<ModelAttributes>
  ): Promise<T> {
    return this.create<T>(attributes)
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
        .table<ModelAttributes>(this.getTable())
        .orderBy(this.primaryKey)
        .limit(chunkSize)
        .offset(offset)
        .get()

      if (rows.length === 0) {
        break
      }

      // Yield raw data - not hydrated yet
      yield rows

      if (rows.length < chunkSize) {
        break
      }
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
        .table<ModelAttributes>(this.getTable())
        .orderBy(this.primaryKey) // Deterministic ordering
        .limit(chunkSize)
        .offset(offset)
        .get()

      if (rows.length === 0) {
        break
      }

      // Log progress for large streams
      if (offset > 0 && offset % 5000 === 0) {
        process.stdout.write(` [${offset}...] `)
      }

      yield rows.map((row) => this.hydrate<T>(row))

      if (rows.length < chunkSize) {
        break
      }
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
    const builder = connection.table<ModelAttributes>(this.getTable())

    // Attach model context
    ;(builder as any).setModel(this)

    // Check for Soft Deletes
    const softDeletes = (this as any)[SOFT_DELETES_KEY]
    if (softDeletes) {
      builder.applyScope('softDeletes', (query) => {
        query.whereNull(softDeletes.column || 'deleted_at')
      })
    }

    // Wrap get() to hydrate results and handle eager loading
    const originalGet = builder.get.bind(builder)
    ;(builder as unknown as { get: () => Promise<T[]> }).get = async (): Promise<T[]> => {
      const rows = await originalGet()

      // Fast Path: Skip hydration if read-only
      if ((builder as any).getIsReadOnly?.()) {
        return rows as unknown as T[]
      }

      const models = rows.map((row) => this.hydrate<T>(row)) as unknown as T[]

      // Handle eager loading
      const eagerLoads = (builder as any).getEagerLoads?.()
      if (eagerLoads && eagerLoads.size > 0 && models.length > 0) {
        const { eagerLoadMany } = await import('./relationships')
        await eagerLoadMany(models, eagerLoads)
      }

      return models
    }

    // Wrap first() to hydrate result and handle eager loading
    const originalFirst = builder.first.bind(builder)
    ;(builder as unknown as { first: () => Promise<T | null> }).first =
      async (): Promise<T | null> => {
        const row = await originalFirst()
        if (!row) {
          return null
        }

        // Fast Path: Skip hydration if read-only
        if ((builder as any).getIsReadOnly?.()) {
          return row as unknown as T
        }

        const model = this.hydrate<T>(row)

        // Handle eager loading for a single model
        const eagerLoads = (builder as any).getEagerLoads?.()
        if (eagerLoads && eagerLoads.size > 0) {
          const { eagerLoadMany } = await import('./relationships')
          await eagerLoadMany([model], eagerLoads)
        }

        return model
      }

    // Support Local Scopes via Proxy
    const modelClass = this
    const proxy = new Proxy(builder, {
      get(target, prop: string | symbol) {
        if (typeof prop === 'string' && !(prop in target)) {
          // Check for local scope: active -> scopeActive
          const scopeMethod = `scope${prop.charAt(0).toUpperCase()}${prop.slice(1)}`
          if (typeof (modelClass as any)[scopeMethod] === 'function') {
            return (...args: any[]) => {
              ;(modelClass as any)[scopeMethod](target, ...args)
              return proxy
            }
          }
        }

        const value = Reflect.get(target, prop)
        if (typeof value === 'function') {
          return value.bind(target)
        }
        return value
      },
    })

    return proxy as unknown as QueryBuilderContract<T>
  }

  /**
   * Start a query with a where clause
   */
  static where<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    column: string | Record<string, unknown>,
    operatorOrValue?: any,
    value?: unknown
  ): QueryBuilderContract<T> {
    return (this.query() as any).where(
      column,
      operatorOrValue,
      value
    ) as unknown as QueryBuilderContract<T>
  }

  /**
   * Start a query with a whereIn clause
   */
  static whereIn<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    column: string,
    values: unknown[]
  ): QueryBuilderContract<T> {
    return this.query().whereIn(column, values) as unknown as QueryBuilderContract<T>
  }

  /**
   * Start a query with a whereNull clause
   */
  static whereNull<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    column: string
  ): QueryBuilderContract<T> {
    return this.query().whereNull(column) as unknown as QueryBuilderContract<T>
  }

  /**
   * Start a query with a whereNotNull clause
   */
  static whereNotNull<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    column: string
  ): QueryBuilderContract<T> {
    return this.query().whereNotNull(column) as unknown as QueryBuilderContract<T>
  }

  /**
   * Start a query with an orderBy clause
   */
  static orderBy<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    column: string,
    direction: 'asc' | 'desc' = 'asc'
  ): QueryBuilderContract<T> {
    return this.query().orderBy(column, direction) as unknown as QueryBuilderContract<T>
  }

  /**
   * Start a query with a limit
   */
  static limit<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    value: number
  ): QueryBuilderContract<T> {
    return this.query().limit(value) as unknown as QueryBuilderContract<T>
  }

  /**
   * Start a query with an offset
   */
  static offset<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    value: number
  ): QueryBuilderContract<T> {
    return this.query().offset(value) as unknown as QueryBuilderContract<T>
  }

  /**
   * Start a query with selected columns
   */
  static select<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    ...columns: string[]
  ): QueryBuilderContract<T> {
    return this.query().select(...columns) as unknown as QueryBuilderContract<T>
  }

  /**
   * Start a query with eager loading
   */
  static with<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    relation: string | string[] | Record<string, (query: QueryBuilderContract<any>) => void>
  ): QueryBuilderContract<T> {
    return this.query().with(relation) as unknown as QueryBuilderContract<T>
  }

  /**
   * Start a query ordered by created_at desc
   */
  static latest<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    column = 'created_at'
  ): QueryBuilderContract<T> {
    return this.query().orderBy(column, 'desc') as unknown as QueryBuilderContract<T>
  }

  /**
   * Start a query ordered by created_at asc
   */
  static oldest<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    column = 'created_at'
  ): QueryBuilderContract<T> {
    return this.query().orderBy(column, 'asc') as unknown as QueryBuilderContract<T>
  }

  /**
   * Get a factory instance for this model
   */
  static factory<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    count = 1
  ): Factory<any> {
    return Factory.model(this).count(count)
  }

  /**
   * Count records
   */
  static async count(this: ModelConstructor<Model> & typeof Model): Promise<number> {
    const connection = DB.connection(this.connection)
    const table = this.getTable()
    const result = await connection.table(table).count()
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
  /**
   * Convert model to plain object via toJSON
   */
  toJSON(): any {
    const modelCtor = this.constructor as typeof Model
    const attributes = { ...this._attributes }
    const result: any = {}

    // 1. Process attributes (trigger accessors)
    for (const key of Object.keys(attributes)) {
      if (key.startsWith('_')) {
        continue
      }
      result[key] = (this as any)[key]
    }

    // 2. Process appends
    for (const key of modelCtor.appends) {
      result[key] = (this as any)[key]
    }

    // 3. Process relations (eager loaded on instance)
    const instanceKeys = Object.keys(this)
    for (const key of instanceKeys) {
      if (key.startsWith('_')) {
        continue
      }
      if (key in result) {
        continue // already processed
      }

      const value = (this as any)[key]
      // Check if it's a Model or Array of Models (simple heuristic)
      if (
        value instanceof Model ||
        (Array.isArray(value) && value.length > 0 && value[0] instanceof Model) ||
        (Array.isArray(value) && value.length === 0) // Empty relation array
      ) {
        result[key] = value
      }
    }

    // 4. Filter visible/hidden
    if (modelCtor.visible.length > 0) {
      const filtered: any = {}
      for (const key of modelCtor.visible) {
        if (key in result) {
          filtered[key] = result[key]
        }
      }
      return filtered
    }

    if (modelCtor.hidden.length > 0) {
      for (const key of modelCtor.hidden) {
        delete result[key]
      }
    }

    return result
  }
}
