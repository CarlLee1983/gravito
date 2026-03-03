import type { PartitionStrategy } from '../../partitioning/PartitionStrategy'
import type { Blueprint } from '../../schema/Blueprint'
import { Factory } from '../../seed/Factory'
import type { Operator, QueryBuilderContract } from '../../types'
import type { TableSchema } from '../schema/types'
import { HasEvents, HasPersistence, HasRelationships, HasSerialization } from './concerns'
import { DirtyTracker } from './DirtyTracker'
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
  extensionTable?: string
  partitionStrategy?: PartitionStrategy
  partitionKey?: string
  partitionTemplate?: (table: Blueprint) => void
  name: string
  getTable(): string
  find(key: unknown): Promise<T | null>
  findOrFail(key: unknown): Promise<T>
  all(): Promise<T[]>
  create(attributes?: Partial<ModelAttributes>): Promise<T>
  query(connection?: import('../../types').ConnectionContract): QueryBuilderContract<T>
  partition(partitionKey?: any): QueryBuilderContract<T>
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
export interface Model extends HasPersistence, HasEvents, HasRelationships, HasSerialization {}
export declare abstract class Model {
  /**
   * Database table name associated with the model.
   */
  static table: string
  static tableName: string
  /**
   * Optional partitioning strategy for horizontal sharding by table suffix.
   */
  static partitionStrategy?: PartitionStrategy
  /**
   * Attribute name to use as the partition key (e.g. 'created_at').
   */
  static partitionKey?: string
  /**
   * Optional table for vertical partitioning (large columns).
   */
  static extensionTable?: string
  /**
   * Optional template callback for creating new partitions on the fly.
   */
  static partitionTemplate?: (table: Blueprint) => void
  /**
   * Name of the primary key column.
   */
  static primaryKey: string
  /**
   * Attributes that should be hidden from serialization.
   */
  static hidden: string[]
  /**
   * Attributes that should be visible in serialization, overriding hidden.
   */
  static visible: string[]
  /**
   * Custom accessors to append to serialized output.
   */
  static appends: string[]
  /**
   * Observer classes to monitor model lifecycle events.
   */
  static observers: unknown[]
  /**
   * Controls automatic timestamp management.
   * - `true`: Manages both created_at and updated_at.
   * - `false`: Disables timestamp management.
   * - `'created_only'`: Manages created_at but ignores updated_at.
   */
  static timestamps: boolean | 'created_only'
  static createdAtColumn: string
  static updatedAtColumn: string
  /**
   * Attribute type casting definitions.
   */
  static casts: Record<string, string>
  /**
   * Database connection name to use for this model.
   */
  static connection?: string
  /**
   * When enabled, throws an error if an attribute is set that does not exist in schema.
   */
  static strictMode: boolean
  /**
   * Caches property descriptors to avoid expensive prototype chain traversals.
   * Uses WeakMap to prevent memory leaks by keying off the prototype object.
   */
  private static _descriptorCache
  /**
   * Caches property name transformations to StudlyCase.
   * Prevents repeated regex execution for accessor/mutator lookups.
   */
  private static _studlyCache
  /**
   * Internal storage for model attribute values.
   */
  protected _attributes: ModelAttributes
  /**
   * Tracks modified attributes for efficient delta updates.
   */
  protected _dirtyTracker: DirtyTracker<ModelAttributes>
  /**
   * Cached table schema metadata.
   */
  private _schema?
  private _schemaPromise?
  constructor()
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
  private static _toStudlyCase
  /**
   * Properties that should bypass the descriptor cache.
   * Necessary for methods frequently mocked in tests (like spyOn).
   */
  private static _descriptorCacheSkip
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
  private static _getDescriptorFromPrototype
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
  static make<T extends Model>(this: ModelConstructor<T>, attributes?: Partial<ModelAttributes>): T
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
  static create<T extends Model>(
    this: ModelConstructor<T>,
    attributes?: Partial<ModelAttributes>
  ): Promise<T>
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
  static hydrate<T extends Model>(this: ModelConstructor<T>, row: ModelAttributes): T
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
  ): T
  /**
   * Sets an attribute value and marks it as dirty.
   *
   * Applies type casting automatically if defined in the model.
   *
   * @param key - The attribute name.
   * @param value - The value to set.
   * @internal
   */
  protected _setAttribute(key: string, value: unknown): void
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
  protected _validateAttribute(key: string, value: unknown): Promise<void>
  /**
   * Determines the logical JavaScript type of a value.
   *
   * Distinguishes between null, array, date, and basic types.
   *
   * @param value - The value to inspect.
   * @returns A string representing the type.
   */
  private _getJSType
  /**
   * Casts a raw value to the specified model type.
   *
   * @param _key - The attribute key (reserved for future use).
   * @param value - The raw value.
   * @param type - The target type identifier.
   * @returns The casted value.
   */
  private _castAttribute
  /**
   * Maps database column types to valid JavaScript types.
   *
   * @param columnType - The database-level type.
   * @returns An array of acceptable JavaScript types.
   */
  private _getExpectedJSTypes
  /**
   * Resolves the primary table name for the model.
   *
   * @returns The table name string.
   * @throws {Error} If no table is defined on the class.
   */
  static getTable(): string
  /**
   * Fetches the table schema from the registry.
   *
   * Includes protection against race conditions for concurrent schema lookups.
   *
   * @returns The table schema metadata.
   * @internal
   */
  protected _getSchema(): Promise<TableSchema>
  /**
   * Indicates if any model attributes have changed since the last sync.
   */
  get isDirty(): boolean
  /**
   * Retrieves a record of attributes that have been modified.
   *
   * @returns An object containing only modified keys and their current values.
   */
  getDirty(): Partial<ModelAttributes>
  /**
   * Retrieves the original values of the model attributes.
   *
   * @returns The attributes as they were when last synchronized with the database.
   */
  getOriginal(): Partial<ModelAttributes>
  /**
   * Retrieves the value of the primary key for this instance.
   *
   * @returns The primary key value.
   */
  getKey(): unknown
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
  static first<T extends Model>(this: ModelConstructor<T> & typeof Model): Promise<T | null>
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
  static find<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    key: unknown
  ): Promise<T | null>
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
  static findOrFail<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    key: unknown
  ): Promise<T>
  /**
   * Retrieves all records for the model.
   *
   * Includes an automatic safety limit of 1000 records.
   * Use `cursor()` or `lazyAll()` for larger datasets.
   *
   * @returns An array of model instances.
   */
  static all<T extends Model>(this: ModelConstructor<T> & typeof Model): Promise<T[]>
  /**
   * Alias for {@link create}.
   */
  static createAndSave<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    attributes: Partial<ModelAttributes>
  ): Promise<T>
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
  static lazyAll<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    chunkSize?: number
  ): AsyncGenerator<ModelAttributes[], void, unknown>
  /**
   * Iterates through records using a cursor-based approach.
   *
   * Yields chunks of hydrated model instances. Memory-safe for large tables.
   *
   * @param chunkSize - Number of models per chunk.
   * @yields Chunks of model instances.
   */
  static cursor<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    chunkSize?: number
  ): AsyncGenerator<T[], void, unknown>
  /**
   * Initializes a fluent query builder for the model on a specific sharded connection.
   *
   * @param key - The shard distribution key
   * @returns A proxied query builder instance connected to the right shard.
   */
  static shard<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    key: string | number
  ): import('../../types').QueryBuilderContract<T>
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
  ): QueryBuilderContract<T>
  /**
   * Start a new query builder targeted at a specific partition table or multiple partitions.
   *
   * @param partitionKey The key (or array of keys) used by the partition strategy to determine the table suffix.
   * @param connectionContract Optional specific database connection.
   * @returns A QueryBuilder tied to the calculated partitioned table(s).
   */
  static partition<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    partitionKey?: any | any[],
    connectionContract?: import('../../types').ConnectionContract
  ): QueryBuilderContract<T>
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
  ): QueryBuilderContract<T>
  /**
   * Starts a query with a WHERE IN clause.
   */
  static whereIn<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    column: string,
    values: unknown[]
  ): QueryBuilderContract<T>
  /**
   * Starts a query with a WHERE NULL clause.
   */
  static whereNull<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    column: string
  ): QueryBuilderContract<T>
  /**
   * Starts a query with a WHERE NOT NULL clause.
   */
  static whereNotNull<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    column: string
  ): QueryBuilderContract<T>
  /**
   * Configures query results ordering.
   */
  static orderBy<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    column: string,
    direction?: 'asc' | 'desc'
  ): QueryBuilderContract<T>
  /**
   * Sets a limit on the number of returned records.
   */
  static limit<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    value: number
  ): QueryBuilderContract<T>
  /**
   * Sets the number of records to skip.
   */
  static offset<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    value: number
  ): QueryBuilderContract<T>
  /**
   * Specifies the columns to retrieve.
   */
  static select<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    ...columns: string[]
  ): QueryBuilderContract<T>
  /**
   * Configures eager loading for relationships.
   *
   * @param relation - The name of the relation or an array/object of relations.
   */
  static with<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    relation: string | string[] | Record<string, (query: QueryBuilderContract<any>) => void>
  ): QueryBuilderContract<T>
  /**
   * Orders results by the creation timestamp in descending order.
   */
  static latest<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    column?: string
  ): QueryBuilderContract<T>
  /**
   * Orders results by the creation timestamp in ascending order.
   */
  static oldest<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    column?: string
  ): QueryBuilderContract<T>
  /**
   * Initializes a factory instance for model seeding and testing.
   */
  static factory<T extends Model>(
    this: ModelConstructor<T> & typeof Model,
    count?: number
  ): Factory<any>
  /**
   * Counts the number of records matching the current state.
   */
  static count(this: ModelConstructor<Model> & typeof Model): Promise<number>
  /**
   * Checks if any records exist matching the current state.
   */
  static exists(this: ModelConstructor<Model> & typeof Model): Promise<boolean>
}
