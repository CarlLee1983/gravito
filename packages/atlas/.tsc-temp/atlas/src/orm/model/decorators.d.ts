/**
 * Options for the SoftDeletes decorator.
 */
export interface SoftDeletesOptions {
  /**
   * The name of the column used to store the deletion timestamp.
   * @default 'deleted_at'
   */
  column?: string
}
/**
 * Meta keys for decorators
 */
/**
 * Metadata key for Soft Deletes configuration.
 * @internal
 */
export declare const SOFT_DELETES_KEY: unique symbol
/**
 * Metadata key for Column definitions.
 * @internal
 */
export declare const COLUMN_KEY: unique symbol
/**
 * Metadata key for Version column.
 * @internal
 */
export declare const VERSION_KEY: unique symbol
/**
 * Metadata key for Sharded configuration.
 * @internal
 */
export declare const SHARDED_KEY: unique symbol
/**
 * Options for the Sharded decorator.
 */
export interface ShardedOptions {
  /**
   * The name of the ShardingManager to use.
   * @default 'default'
   */
  manager?: string
  /**
   * The property name of the shard key (e.g. 'tenantId').
   */
  key: string
}
/**
 * Sharded Decorator
 *
 * Marks a model as being horizontally sharded across multiple databases.
 * Active Record operations will automatically route to the correct connection
 * based on the shard key provided.
 *
 * @param options - Configuration for sharding containing the distribution key
 */
export declare function sharded(options: ShardedOptions): ClassDecorator
/**
 * Soft Deletes Decorator
 *
 * Automatically adds a global scope to filter out deleted records.
 * When applied to a Model class, it ensures that queries only return records
 * where the deletion column (default 'deleted_at') is null.
 *
 * @param options - Configuration for soft deletes
 *
 * @example
 * ```typescript
 * @SoftDeletes({ column: 'deleted_at' })
 * class User extends Model {
 *   @column()
 *   declare deletedAt: Date | null
 * }
 * ```
 */
export declare function SoftDeletes(options?: SoftDeletesOptions): ClassDecorator
/**
 * Options for the Column decorator.
 */
export interface ColumnOptions {
  /**
   * Whether the column is a primary key.
   * @default false
   */
  isPrimary?: boolean
  /**
   * Whether the column should be automatically populated with a timestamp on creation.
   * @default false
   */
  autoCreate?: boolean
  /**
   * Whether the column should be automatically updated with a timestamp on every update.
   * @default false
   */
  autoUpdate?: boolean
  /**
   * The name of the column in the database.
   * If not provided, the property name will be used.
   */
  name?: string
  /**
   * The name to use when serializing the model to JSON.
   * Set to null to hide the column from JSON output.
   */
  serializeAs?: string | null
  /**
   * Whether the column should be loaded lazily (deferred).
   * Typically used for vertical partitioning of large columns.
   * @default false
   */
  deferred?: boolean
}
/**
 * Column Decorator
 *
 * Marks a property as a database column. This decorator also triggers
 * the registration of the model in the global ModelRegistry.
 *
 * @param options - Configuration for the column
 *
 * @example
 * ```typescript
 * class User extends Model {
 *   @column({ isPrimary: true })
 *   declare id: number
 *
 *   @column({ name: 'email_address' })
 *   declare email: string
 *
 *   @column.dateTime({ autoCreate: true })
 *   declare createdAt: Date
 * }
 * ```
 */
export declare function column(options?: ColumnOptions): PropertyDecorator
/**
 * Version Decorator for Optimistic Locking
 *
 * Marks a property as a version column for optimistic locking.
 * When a model updates, it checks if the version matches the one in the database.
 *
 * @param options - Configuration for the column (same as @column)
 */
export declare function version(options?: ColumnOptions): PropertyDecorator
/**
 * Deferred Decorator for Vertical Partitioning
 *
 * Marks a column as being deferred, meaning it won't be loaded by default.
 * This is useful for large columns like TEXT or JSONB that should reside
 * in an extension table or just be excluded from collection queries.
 *
 * @param options - Configuration for the column
 */
export declare function deferred(options?: ColumnOptions): PropertyDecorator
