import { DB } from '../../DB'
import { QueryBuilder } from '../../query/QueryBuilder'
import { Factory } from '../../seed/Factory'
import type { Operator, QueryBuilderContract } from '../../types'
import { SchemaRegistry } from '../schema/SchemaRegistry'
import type { ColumnType, TableSchema } from '../schema/types'
import {
  applyMixins,
  HasEvents,
  HasPersistence,
  HasRelationships,
  HasSerialization,
} from './concerns'
import { DirtyTracker } from './DirtyTracker'
import { COLUMN_KEY, SHARDED_KEY, SOFT_DELETES_KEY } from './decorators'
import {
  ColumnNotFoundError,
  ModelNotFoundError,
  NullableConstraintError,
  TypeMismatchError,
} from './errors'
import * as relationshipResolver from './relationships'
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
  tableName?: string
  primaryKey: string
  connection?: string
  name: string
  getTable(): string
  find(key: unknown): Promise<T | null>
  findOrFail(key: unknown): Promise<T>
  all(): Promise<T[]>
  create(attributes?: Partial<ModelAttributes>): Promise<T>
  query(connection?: import('../../types').ConnectionContract): QueryBuilderContract<T>
  shard(key: string | number): QueryBuilderContract<T>
  where(
    column: string | Record<string, unknown>,
    operatorOrValue?: Operator | unknown,
    value?: unknown
  ): QueryBuilderContract<T>
}

/**
 * Base Model Class providing Active Record implementation.
 *
 * Uses a Proxy-based Smart Guard to intercept property access, enabling
 * dynamic attributes, accessors, mutators, and relationship lazy loading.
 * Provides a fluent interface for database persistence and querying.
 *
 * @example
 * ```typescript
 * class User extends Model {
 *   static table = 'users'
 *
 *   declare id: number
 *   declare name: string
 * }
 *
 * // Persistence
 * const user = new User()
 * user.name = 'Carl'
 * await user.save()
 *
 * // Retrieval
 * const found = await User.find(1)
 * ```
 */
// biome-ignore lint/suspicious/noUnsafeDeclarationMerging: Intentional for Mixin pattern
export interface Model extends HasPersistence, HasEvents, HasRelationships, HasSerialization {}

// biome-ignore lint/suspicious/noUnsafeDeclarationMerging: Intentional for Mixin pattern
export abstract class Model {
  // ============================================================================
  // Static Configuration
  // ============================================================================

  /**
   * Database table name associated with the model.
   */
  static table: string
  static tableName: string

  /**
   * Name of the primary key column.
   */
  static primaryKey = 'id'

  /**
   * Attributes that should be hidden from serialization.
   */
  static hidden: string[] = []

  /**
   * Attributes that should be visible in serialization, overriding hidden.
   */
  static visible: string[] = []

  /**
   * Custom accessors to append to serialized output.
   */
  static appends: string[] = []

  /**
   * Observer classes to monitor model lifecycle events.
   */
  static observers: unknown[] = []

  /**
   * Controls automatic timestamp management.
   * - `true`: Manages both created_at and updated_at.
   * - `false`: Disables timestamp management.
   * - `'created_only'`: Manages created_at but ignores updated_at.
   */
  static timestamps: boolean | 'created_only' = true
  static createdAtColumn = 'created_at'
  static updatedAtColumn = 'updated_at'

  /**
   * Attribute type casting definitions.
   */
  static casts: Record<string, string> = {}

  /**
   * Database connection name to use for this model.
   */
  static connection?: string

  /**
   * When enabled, throws an error if an attribute is set that does not exist in schema.
   */
  static strictMode = true

  // ============================================================================
  // Performance Optimization Caches
  // ============================================================================

  /**
   * Caches property descriptors to avoid expensive prototype chain traversals.
   * Uses WeakMap to prevent memory leaks by keying off the prototype object.
   */
  private static _descriptorCache = new WeakMap<
    object,
    Map<string | symbol, PropertyDescriptor | undefined>
  >()

  /**
   * Caches property name transformations to StudlyCase.
   * Prevents repeated regex execution for accessor/mutator lookups.
   */
  private static _studlyCache = new Map<string, string>()

  // ============================================================================
  // Instance State
  // ============================================================================

  /**
   * Internal storage for model attribute values.
   */
  protected _attributes: ModelAttributes = {}

  /**
   * Tracks modified attributes for efficient delta updates.
   */
  protected _dirtyTracker: DirtyTracker<ModelAttributes>

  /**
   * Cached table schema metadata.
   */
  private _schema?: TableSchema
  private _schemaPromise?: Promise<TableSchema>

  constructor() {
    this._dirtyTracker = new DirtyTracker()
  }

  // ============================================================================
  // Performance Optimization Helpers
  // ============================================================================

  /**
   * Converts a property name to StudlyCase format with caching.
   *
   * Used primarily for resolving accessor/mutator methods (e.g., "first_name" -> "FirstName").
   * Performance-critical as it's called on every property access through the Proxy.
   *
   * @param prop - The property name to transform.
   * @returns The transformed name in StudlyCase.
   * @internal
   */
  private static _toStudlyCase(prop: string): string {
    const cached = Model._studlyCache.get(prop)
    if (cached !== undefined) {
      return cached
    }

    // Prevent memory leaks by capping cache size (LRU-lite)
    if (Model._studlyCache.size > 5000) {
      Model._studlyCache.clear()
    }

    const studly = prop.replace(/(?:^|_|(?=[A-Z]))(.)/g, (_, c) => c.toUpperCase())
    Model._studlyCache.set(prop, studly)
    return studly
  }

  /**
   * Properties that should bypass the descriptor cache.
   * Necessary for methods frequently mocked in tests (like spyOn).
   */
  private static _descriptorCacheSkip = new Set<string | symbol>(['save', 'delete', 'restore'])

  /**
   * Retrieves a property descriptor from the prototype chain with caching.
   *
   * Optimizes the Proxy 'get' trap by reducing prototype lookups for methods
   * and computed properties.
   *
   * @param proto - The prototype object to search.
   * @param prop - The property name or symbol.
   * @returns The descriptor if found, otherwise undefined.
   * @internal
   */
  private static _getDescriptorFromPrototype(
    proto: object,
    prop: string | symbol
  ): PropertyDescriptor | undefined {
    if (Model._descriptorCacheSkip.has(prop)) {
      return Object.getOwnPropertyDescriptor(proto, prop)
    }

    let protoCache = Model._descriptorCache.get(proto)
    if (protoCache?.has(prop)) {
      return protoCache.get(prop)
    }

    const descriptor = Object.getOwnPropertyDescriptor(proto, prop)

    if (!protoCache) {
      protoCache = new Map()
      Model._descriptorCache.set(proto, protoCache)
    }
    protoCache.set(prop, descriptor)

    return descriptor
  }

  // ============================================================================
  // Proxy Factory
  // ============================================================================

  /**
   * Creates a new model instance without persisting it.
   *
   * Wraps the instance in a Proxy to enable dynamic attribute handling.
   *
   * @param attributes - Initial data for the model.
   * @returns A proxied model instance.
   *
   * @example
   * ```typescript
   * const user = User.make({ name: 'Carl' });
   * ```
   */
  static make<T extends Model>(
    this: ModelConstructor<T>,
    attributes: Partial<ModelAttributes> = {}
  ): T {
    const instance = new this()
    return (instance as any)._createProxy(attributes, false)
  }

  /**
   * Creates and immediately persists a new model instance.
   *
   * @param attributes - Data for the new record.
   * @returns The saved model instance.
   * @throws {DatabaseError} If persistence fails.
   *
   * @example
   * ```typescript
   * const user = await User.create({ name: 'Carl' });
   * ```
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
   * Initializes a model instance from existing database data.
   *
   * Marks the model as existing and synchronizes the dirty tracker.
   * Triggers the 'retrieved' event.
   *
   * @param row - Raw data retrieved from the database.
   * @returns A proxied model instance ready for updates.
   *
   * @example
   * ```typescript
   * const user = User.hydrate(dbRow);
   * ```
   */
  static hydrate<T extends Model>(this: ModelConstructor<T>, row: ModelAttributes): T {
    const instance = new this()
    const proxy = instance._createProxy(row, true)

    void (proxy as any).emit?.('retrieved')

    return proxy
  }

  /**
   * Configures the Proxy wrapper for the model instance.
   *
   * Implements the Smart Guard pattern to route property access to attributes,
   * relations, methods, or accessors based on priority.
   *
   * @param attributes - Initial attribute values.
   * @param exists - Whether the model exists in the database.
   * @returns The proxied instance.
   * @internal
   */
  protected _createProxy<T extends Model>(
    this: T,
    attributes: Partial<ModelAttributes>,
    exists: boolean
  ): T {
    const modelCtor = this.constructor as typeof Model
    const castedAttributes = { ...attributes }

    if (Object.keys(modelCtor.casts).length > 0) {
      for (const [key, value] of Object.entries(attributes)) {
        if (key in modelCtor.casts) {
          castedAttributes[key] = this._castAttribute(key, value, modelCtor.casts[key]!)
        }
      }
    }

    this._attributes = castedAttributes
    ;(this as any)._exists = exists

    if (exists) {
      this._dirtyTracker.setOriginal(castedAttributes)
    }

    const model = this

    return new Proxy(this, {
      get(target, prop: string | symbol, receiver) {
        if (typeof prop === 'symbol' || (typeof prop === 'string' && prop.startsWith('_'))) {
          return Reflect.get(target, prop)
        }

        if (prop === 'constructor') {
          return target.constructor
        }

        let proto = Object.getPrototypeOf(target)
        while (proto && proto !== Object.prototype) {
          const descriptor = Model._getDescriptorFromPrototype(proto, prop)
          if (descriptor?.get) {
            return descriptor.get.call(receiver)
          }
          if (descriptor?.value && typeof descriptor.value === 'function') {
            return descriptor.value.bind(receiver)
          }
          proto = Object.getPrototypeOf(proto)
        }

        if (typeof prop === 'string') {
          const studly = Model._toStudlyCase(prop)
          const accessor = `get${studly}Attribute`
          if (typeof (target as any)[accessor] === 'function') {
            const raw = model._attributes[prop]
            return (target as any)[accessor].call(receiver, raw)
          }
        }

        if (typeof prop === 'string' && prop in model._attributes) {
          return model._attributes[prop]
        }

        const relations = getRelationships(modelCtor)
        if (typeof prop === 'string' && relations.has(prop)) {
          const builderFn = (..._args: unknown[]) => {
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
            return (receiver as any)[type](Related, meta.foreignKey, meta.localKey)
          }

          // biome-ignore lint/suspicious/noThenProperty: Intentional thenable for property-style lazy loading
          ;(builderFn as any).then = async (
            resolve: (value: unknown) => void,
            reject: (reason?: any) => void
          ) => {
            try {
              await (receiver as any).load(prop)
              resolve((receiver as any)._attributes[prop])
            } catch (err) {
              reject(err)
            }
          }

          return builderFn
        }

        if (Object.hasOwn(target, prop)) {
          const value = Reflect.get(target, prop)
          if (typeof value === 'function') {
            return value.bind(receiver)
          }
          return value
        }

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
        if (typeof prop === 'symbol' || (typeof prop === 'string' && prop.startsWith('_'))) {
          return Reflect.set(target, prop, value, receiver)
        }

        if (typeof prop === 'string') {
          const studly = Model._toStudlyCase(prop)
          const mutator = `set${studly}Attribute`
          if (typeof (target as any)[mutator] === 'function') {
            ;(target as any)[mutator].call(receiver, value)
            return true
          }
        }

        const columns = (model.constructor as any)[COLUMN_KEY]
        const isColumn = columns && typeof prop === 'string' && prop in columns

        if (
          isColumn ||
          !(prop in target) ||
          (typeof prop === 'string' && prop in model._attributes)
        ) {
          model._setAttribute(prop as string, value)
          return true
        }

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
   * Sets an attribute value and marks it as dirty.
   *
   * Applies type casting automatically if defined in the model.
   *
   * @param key - The attribute name.
   * @param value - The value to set.
   * @internal
   */
  protected _setAttribute(key: string, value: unknown): void {
    const modelCtor = this.constructor as typeof Model

    if (modelCtor.strictMode) {
      void modelCtor.table
    }

    const type = modelCtor.casts[key]
    const castedValue = type ? this._castAttribute(key, value, type) : value

    this._dirtyTracker.mark(key, castedValue)

    this._attributes[key] = castedValue
  }

  /**
   * Validates an attribute against the database schema.
   *
   * Performs nullability checks and type matching.
   *
   * @param key - The column name.
   * @param value - The value to validate.
   * @throws {ColumnNotFoundError} If the column does not exist in strict mode.
   * @throws {NullableConstraintError} If a non-nullable column is set to null.
   * @throws {TypeMismatchError} If the value type does not match schema requirements.
   * @internal
   */
  protected async _validateAttribute(key: string, value: unknown): Promise<void> {
    const modelCtor = this.constructor as typeof Model
    const table = modelCtor.getTable()
    const schema = await this._getSchema()

    const column = schema.columns.get(key)

    if (!column) {
      if (modelCtor.strictMode) {
        const availableColumns = Array.from(schema.columns.keys())
        throw new ColumnNotFoundError(table, key, availableColumns)
      }
      return
    }

    if (value === null && !column.nullable) {
      throw new NullableConstraintError(modelCtor.table, key)
    }

    if (value !== null && value !== undefined) {
      const jsType = this._getJSType(value)
      const expectedTypes = this._getExpectedJSTypes(column.type)

      if (jsType === 'object' && expectedTypes.includes('string')) {
        return
      }

      if (!expectedTypes.includes(jsType)) {
        throw new TypeMismatchError(table, key, expectedTypes.join(' | '), jsType, value)
      }
    }
  }

  /**
   * Determines the logical JavaScript type of a value.
   *
   * Distinguishes between null, array, date, and basic types.
   *
   * @param value - The value to inspect.
   * @returns A string representing the type.
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
   * Casts a raw value to the specified model type.
   *
   * @param _key - The attribute key (reserved for future use).
   * @param value - The raw value.
   * @param type - The target type identifier.
   * @returns The casted value.
   */
  private _castAttribute(_key: string, value: unknown, type: string): unknown {
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
        return typeof value === 'string' ? parseFloat(value) : (value as number)

      case 'string':
        return String(value)

      case 'bool':
      case 'boolean':
        return [true, 1, '1', 'true', 'on', 'yes'].includes(value as any)

      case 'object':
      case 'json':
        if (typeof value === 'object') {
          return value
        }
        try {
          return JSON.parse(value as string)
        } catch (_e) {
          return value
        }

      case 'collection':
        return Array.isArray(value) ? value : [value]

      case 'date':
      case 'datetime':
        if (value instanceof Date) {
          return value
        }
        return new Date(value as string | number)

      case 'timestamp':
        return value instanceof Date
          ? value.getTime()
          : new Date(value as string | number).getTime()
    }

    return value
  }

  /**
   * Maps database column types to valid JavaScript types.
   *
   * @param columnType - The database-level type.
   * @returns An array of acceptable JavaScript types.
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
   * Resolves the primary table name for the model.
   *
   * @returns The table name string.
   * @throws {Error} If no table is defined on the class.
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
   * Fetches the table schema from the registry.
   *
   * Includes protection against race conditions for concurrent schema lookups.
   *
   * @returns The table schema metadata.
   * @internal
   */
  protected async _getSchema(): Promise<TableSchema> {
    if (this._schema) {
      return this._schema
    }

    if (this._schemaPromise) {
      return this._schemaPromise
    }

    this._schemaPromise = (async () => {
      const modelCtor = this.constructor as any
      const connection = DB.connection(modelCtor.connection)
      const table = modelCtor.getTable()

      const driver = connection.getDriver()
      if (
        typeof driver.getDriverName === 'function' &&
        (driver.getDriverName() === 'mongodb' || driver.getDriverName() === 'redis')
      ) {
        this._schema = {
          table: table,
          columns: new Map(),
          primaryKey: [modelCtor.primaryKey],
          capturedAt: Date.now(),
        }
        return this._schema
      }

      this._schema = await SchemaRegistry.getInstance().get(table, modelCtor.connection)
      return this._schema
    })()

    return this._schemaPromise
  }

  // ============================================================================
  // Accessors
  // ============================================================================

  /**
   * Indicates if any model attributes have changed since the last sync.
   */
  get isDirty(): boolean {
    return this._dirtyTracker.isDirty()
  }

  /**
   * Retrieves a record of attributes that have been modified.
   *
   * @returns An object containing only modified keys and their current values.
   */
  getDirty(): Partial<ModelAttributes> {
    return this._dirtyTracker.getDirtyValues(this._attributes)
  }

  /**
   * Retrieves the original values of the model attributes.
   *
   * @returns The attributes as they were when last synchronized with the database.
   */
  getOriginal(): Partial<ModelAttributes> {
    return this._dirtyTracker.getOriginals()
  }

  /**
   * Retrieves the value of the primary key for this instance.
   *
   * @returns The primary key value.
   */
  getKey(): unknown {
    const modelCtor = this.constructor as typeof Model
    return this._attributes[modelCtor.primaryKey]
  }

  // ============================================================================
  // Static Query Methods
  // ============================================================================

  /**
   * Executes a query to find the first matching record.
   *
   * @returns The first model instance found, or null.
   *
   * @example
   * ```typescript
   * const user = await User.where('active', true).first();
   * ```
   */
  static async first<T extends Model>(this: ModelConstructor<T> & typeof Model): Promise<T | null> {
    const result = await this.query().first()
    return result as T | null
  }

  /**
   * Finds a record by its primary key.
   *
   * @param key - The primary key value.
   * @returns The matching model instance, or null.
   *
   * @example
   * ```typescript
   * const user = await User.find(1);
   * ```
   */
  static async find<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    key: unknown
  ): Promise<T | null> {
    const result = await this.query().where(this.primaryKey, key).first()

    return result as T | null
  }

  /**
   * Finds a record by its primary key or throws an error if not found.
   *
   * @param key - The primary key value.
   * @returns The matching model instance.
   * @throws {ModelNotFoundError} If no record matches the key.
   *
   * @example
   * ```typescript
   * const user = await User.findOrFail(1);
   * ```
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
   * Retrieves all records for the model.
   *
   * Includes an automatic safety limit of 1000 records.
   * Use `cursor()` or `lazyAll()` for larger datasets.
   *
   * @returns An array of model instances.
   */
  static async all<T extends Model>(this: ModelConstructor<T> & typeof Model): Promise<T[]> {
    return this.query().limit(1000).get() as Promise<T[]>
  }

  /**
   * Alias for {@link create}.
   */
  static async createAndSave<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    attributes: Partial<ModelAttributes>
  ): Promise<T> {
    return this.create<T>(attributes)
  }

  /**
   * Iterates through all records using memory-efficient lazy hydration.
   *
   * Returns an async generator that yields chunks of raw data.
   * Models are only instantiated when explicitly needed.
   *
   * @param chunkSize - Number of records to fetch per iteration.
   * @yields Chunks of raw attribute objects.
   *
   * @example
   * ```typescript
   * for await (const chunk of User.lazyAll(500)) {
   *   // process chunk
   * }
   * ```
   */
  static async *lazyAll<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    chunkSize = 1000
  ): AsyncGenerator<ModelAttributes[], void, unknown> {
    let offset = 0

    while (true) {
      const query = this.query().orderBy(this.primaryKey).limit(chunkSize).offset(offset)

      const rows = (await (query as any).getRawResults?.()) || (await query.get())

      if (rows.length === 0) {
        break
      }

      yield rows

      if (rows.length < chunkSize) {
        break
      }
      offset += chunkSize
    }
  }

  /**
   * Iterates through records using a cursor-based approach.
   *
   * Yields chunks of hydrated model instances. Memory-safe for large tables.
   *
   * @param chunkSize - Number of models per chunk.
   * @yields Chunks of model instances.
   */
  static async *cursor<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    chunkSize = 1000
  ): AsyncGenerator<T[], void, unknown> {
    let offset = 0
    let safetyCounter = 0
    const MAX_CHUNKS = 10000

    let lastFirstId: unknown = null

    while (safetyCounter < MAX_CHUNKS) {
      const rows = (await this.query()
        .orderBy(this.primaryKey)
        .limit(chunkSize)
        .offset(offset)
        .get()) as T[]

      if (rows.length === 0) {
        break
      }

      const currentFirstId = (rows[0] as any)[this.primaryKey]
      if (lastFirstId !== null && currentFirstId === lastFirstId) {
        break
      }
      lastFirstId = currentFirstId

      yield rows

      if (rows.length < chunkSize) {
        break
      }
      offset += chunkSize
      safetyCounter++
    }
  }

  /**
   * Initializes a fluent query builder for the model on a specific sharded connection.
   *
   * @param key - The shard distribution key
   * @returns A proxied query builder instance connected to the right shard.
   */
  static shard<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    key: string | number
  ): import('../../types').QueryBuilderContract<T> {
    const shardedConfig = (this as any)[SHARDED_KEY]
    if (!shardedConfig) {
      throw new Error(
        `Model ${this.name} is not configured for sharding. Add @sharded decorator to use .shard().`
      )
    }
    const manager = DB.getShardingManager(shardedConfig.manager)
    const connection = manager.getShard(key)
    return this.query(connection) as unknown as import('../../types').QueryBuilderContract<T>
  }

  /**
   * Initializes a fluent query builder for the model.
   *
   * Automatically handles model hydration, soft delete filtering, and scope application.
   *
   * @param connectionContract - Optional specific database connection
   * @returns A proxied query builder instance.
   *
   * @example
   * ```typescript
   * const users = await User.query().where('active', true).get();
   * ```
   */
  static query<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    connectionContract?: import('../../types').ConnectionContract
  ) {
    const connection = connectionContract || DB.connection(this.connection)
    const builder = connection.table<ModelAttributes>(this.getTable())

    ;(builder as any).setModel(this)

    const softDeletes = (this as any)[SOFT_DELETES_KEY]
    if (softDeletes) {
      builder.applyScope('softDeletes', (query) => {
        query.whereNull(softDeletes.column || 'deleted_at')
      })
    }

    const originalGet = builder.get.bind(builder)
    ;(builder as unknown as { get: () => Promise<T[]> }).get = async (): Promise<T[]> => {
      const rows = await originalGet()

      if ((builder as any).getIsReadOnly?.()) {
        return rows as unknown as T[]
      }

      const models = rows.map((row) => this.hydrate<T>(row)) as unknown as T[]

      const eagerLoads = (builder as any).getEagerLoads?.()
      if (eagerLoads && eagerLoads.size > 0 && models.length > 0) {
        await relationshipResolver.eagerLoadMany(models, eagerLoads)
      }

      return models
    }

    const originalFirst = builder.first.bind(builder)
    ;(builder as unknown as { first: () => Promise<T | null> }).first =
      async (): Promise<T | null> => {
        const row = await originalFirst()
        if (!row) {
          return null
        }

        if ((builder as any).getIsReadOnly?.()) {
          return row as unknown as T
        }

        const model = this.hydrate<T>(row)

        const eagerLoads = (builder as any).getEagerLoads?.()
        if (eagerLoads && eagerLoads.size > 0) {
          await relationshipResolver.eagerLoadMany([model], eagerLoads)
        }

        return model
      }

    const modelClass = this
    const proxy = new Proxy(builder, {
      get(target, prop: string | symbol) {
        if (typeof prop === 'string' && !(prop in target)) {
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
   * Starts a query with a standard WHERE clause.
   *
   * @param column - Column name or an object of key-value pairs.
   * @param operatorOrValue - Comparison operator or the value.
   * @param value - Comparison value (if operator is specified).
   * @returns The query builder.
   */
  static where<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    column: string | Record<string, unknown>,
    operatorOrValue?: Operator | unknown,
    value?: unknown
  ): QueryBuilderContract<T> {
    return (this.query() as any).where(
      column,
      operatorOrValue,
      value
    ) as unknown as QueryBuilderContract<T>
  }

  /**
   * Starts a query with a WHERE IN clause.
   */
  static whereIn<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    column: string,
    values: unknown[]
  ): QueryBuilderContract<T> {
    return this.query().whereIn(column, values) as unknown as QueryBuilderContract<T>
  }

  /**
   * Starts a query with a WHERE NULL clause.
   */
  static whereNull<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    column: string
  ): QueryBuilderContract<T> {
    return this.query().whereNull(column) as unknown as QueryBuilderContract<T>
  }

  /**
   * Starts a query with a WHERE NOT NULL clause.
   */
  static whereNotNull<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    column: string
  ): QueryBuilderContract<T> {
    return this.query().whereNotNull(column) as unknown as QueryBuilderContract<T>
  }

  /**
   * Configures query results ordering.
   */
  static orderBy<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    column: string,
    direction: 'asc' | 'desc' = 'asc'
  ): QueryBuilderContract<T> {
    return this.query().orderBy(column, direction) as unknown as QueryBuilderContract<T>
  }

  /**
   * Sets a limit on the number of returned records.
   */
  static limit<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    value: number
  ): QueryBuilderContract<T> {
    return this.query().limit(value) as unknown as QueryBuilderContract<T>
  }

  /**
   * Sets the number of records to skip.
   */
  static offset<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    value: number
  ): QueryBuilderContract<T> {
    return this.query().offset(value) as unknown as QueryBuilderContract<T>
  }

  /**
   * Specifies the columns to retrieve.
   */
  static select<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    ...columns: string[]
  ): QueryBuilderContract<T> {
    return this.query().select(...columns) as unknown as QueryBuilderContract<T>
  }

  /**
   * Configures eager loading for relationships.
   *
   * @param relation - The name of the relation or an array/object of relations.
   */
  static with<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    relation: string | string[] | Record<string, (query: QueryBuilderContract<any>) => void>
  ): QueryBuilderContract<T> {
    return this.query().with(relation) as unknown as QueryBuilderContract<T>
  }

  /**
   * Orders results by the creation timestamp in descending order.
   */
  static latest<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    column = 'created_at'
  ): QueryBuilderContract<T> {
    return this.query().orderBy(column, 'desc') as unknown as QueryBuilderContract<T>
  }

  /**
   * Orders results by the creation timestamp in ascending order.
   */
  static oldest<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    column = 'created_at'
  ): QueryBuilderContract<T> {
    return this.query().orderBy(column, 'asc') as unknown as QueryBuilderContract<T>
  }

  /**
   * Initializes a factory instance for model seeding and testing.
   */
  static factory<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    count = 1
  ): Factory<any> {
    return Factory.model(this).count(count)
  }

  /**
   * Counts the number of records matching the current state.
   */
  static async count(this: ModelConstructor<Model> & typeof Model): Promise<number> {
    return this.query().count()
  }

  /**
   * Checks if any records exist matching the current state.
   */
  static async exists(this: ModelConstructor<Model> & typeof Model): Promise<boolean> {
    return this.query().exists()
  }
}

/**
 * Applies lifecycle, persistence, relationship, and serialization concerns to the base class.
 */
applyMixins(Model as any, [HasEvents, HasPersistence, HasRelationships, HasSerialization])

// Inject relationship resolver into QueryBuilder to avoid circular dependencies
QueryBuilder.relationshipResolver = relationshipResolver as any
