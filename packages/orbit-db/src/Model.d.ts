import type { PlanetCore } from 'gravito-core'
import type { DBService } from './DBService'
import { ModelCollection } from './ModelCollection'
import type { LockOptions, UpsertOptions } from './types'
type Table = any
type WhereCondition = any
/**
 * Relation definition type.
 */
export type RelationType =
  | 'hasMany'
  | 'belongsTo'
  | 'hasOne'
  | 'belongsToMany'
  | 'morphTo'
  | 'morphMany'
  | 'morphOne'
/**
 * Relation definition.
 */
export interface RelationDefinition {
  type: RelationType
  model?: ModelStatic
  foreignKey?: string
  localKey?: string
  pivotTable?: string
  pivotForeignKey?: string
  pivotRelatedKey?: string
  morphType?: string
  morphId?: string
  morphMap?: Map<string, ModelStatic>
}
/**
 * Attribute cast definition.
 */
export type CastType = 'string' | 'number' | 'boolean' | 'date' | 'json' | 'array'
export interface CastsDefinition {
  [key: string]: CastType | ((value: unknown) => unknown)
}
/**
 * Model static interface (for type inference).
 */
export interface ModelStatic<T extends Model = Model> {
  new (): T
  table?: Table
  tableName?: string
  primaryKey?: string
  dbService?: DBService
  relations?: Map<string, RelationDefinition>
  casts?: CastsDefinition
  fillable?: string[]
  guarded?: string[]
  hidden?: string[]
  visible?: string[]
  appends?: string[]
  timestamps?: boolean
  createdAtColumn?: string
  updatedAtColumn?: string
  deletedAtColumn?: string
  usesSoftDeletes?: boolean
  localScopes?: Map<string, (query: unknown) => unknown>
  globalScopes?: Array<(query: unknown) => unknown>
  core?: PlanetCore
  setDBService(dbService: DBService): void
  setCore(core: PlanetCore): void
  setTable(table: Table, tableName: string): void
  getTable(): Table
  getDBService(): DBService
  getPrimaryKey(): string
  getRelationName(model: ModelStatic): string
  fromData(data: unknown): T
  castAttribute(
    key: string,
    value: unknown,
    cast: CastType | ((value: unknown) => unknown)
  ): unknown
  find(id: unknown): Promise<T | null>
  where(column: string, value: unknown): Promise<T | null>
  whereMany(where: WhereCondition): Promise<T | null>
  all(options?: {
    limit?: number
    orderBy?: unknown
    orderDirection?: 'asc' | 'desc'
  }): Promise<ModelCollection<T>>
  findAll(
    where?: WhereCondition,
    options?: {
      limit?: number
      orderBy?: unknown
      orderDirection?: 'asc' | 'desc'
    }
  ): Promise<ModelCollection<T>>
  count(where?: WhereCondition): Promise<number>
  exists(where: WhereCondition): Promise<boolean>
  create(data: Partial<T['attributes']>): Promise<T>
  withTrashed(): QueryBuilder<T>
  onlyTrashed(): QueryBuilder<T>
  paginate(options: {
    page: number
    limit: number
    orderBy?: unknown
    orderDirection?: 'asc' | 'desc'
  }): Promise<{
    data: T[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }>
}
/**
 * Base Model class (inspired by Laravel Eloquent, but built on Drizzle for performance).
 *
 * Example:
 * ```typescript
 * export class User extends Model {
 *   static table = usersTable;
 *   static tableName = 'users';
 *
 *   declare attributes: {
 *     id?: number;
 *     name: string;
 *     email: string;
 *   };
 * }
 *
 * // Usage
 * const user = await User.find(1);
 * const user = await User.where('email', 'john@example.com');
 * const users = await User.all();
 * ```
 */
export declare abstract class Model<TAttributes = Record<string, unknown>> {
  protected static table?: Table
  protected static tableName?: string
  protected static primaryKey: string
  protected static dbService?: DBService
  protected static relations: Map<string, RelationDefinition>
  protected static casts: CastsDefinition
  protected static fillable: string[]
  protected static guarded: string[]
  protected static hidden: string[]
  protected static visible: string[]
  protected static appends: string[]
  protected static timestamps: boolean
  protected static createdAtColumn: string
  protected static updatedAtColumn: string
  protected static deletedAtColumn: string
  protected static usesSoftDeletes: boolean
  protected static localScopes: Map<string, (query: unknown) => unknown>
  protected static globalScopes: Array<(query: unknown) => unknown>
  protected static core?: PlanetCore
  attributes: Partial<TAttributes>
  private relationsCache
  private relationsLoaded
  private originalAttributes
  private exists
  wasRecentlyCreated: boolean
  /**
   * Set DBService (must be set during application bootstrap).
   */
  static setDBService(dbService: DBService): void
  /**
   * Set table instance.
   */
  static setTable(table: Table, tableName: string): void
  /**
   * Get table instance.
   */
  protected static getTable(): Table
  /**
   * Get DBService.
   */
  protected static getDBService(): DBService
  /**
   * Get primary key name.
   */
  protected static getPrimaryKey(): string
  /**
   * Find by ID (similar to Laravel's `find`).
   */
  static find<T extends Model>(this: ModelStatic<T>, id: unknown): Promise<T | null>
  /**
   * Find a single record (similar to `where()->first()`).
   */
  static where<T extends Model>(
    this: ModelStatic<T>,
    column: string,
    value: unknown
  ): Promise<T | null>
  /**
   * Find a single record with multiple conditions.
   */
  static whereMany<T extends Model>(this: ModelStatic<T>, where: WhereCondition): Promise<T | null>
  /**
   * Start a query builder (fluent chaining).
   */
  static query<T extends Model>(this: ModelStatic<T>): QueryBuilder<T>
  /**
   * Start a query builder including soft deleted records.
   */
  static withTrashed<T extends Model>(this: ModelStatic<T>): QueryBuilder<T>
  /**
   * Start a query builder only for soft deleted records.
   */
  static onlyTrashed<T extends Model>(this: ModelStatic<T>): QueryBuilder<T>
  /**
   * Fetch all records (similar to Laravel's `all()`).
   */
  static all<T extends Model>(
    this: ModelStatic<T>,
    options?: {
      limit?: number
      orderBy?: unknown
      orderDirection?: 'asc' | 'desc'
    }
  ): Promise<ModelCollection<T>>
  /**
   * Fetch records with optional conditions.
   */
  static findAll<T extends Model>(
    this: ModelStatic<T>,
    where?: WhereCondition,
    options?: {
      limit?: number
      orderBy?: unknown
      orderDirection?: 'asc' | 'desc'
    }
  ): Promise<ModelCollection<T>>
  /**
   * Count.
   */
  static count<T extends Model>(this: ModelStatic<T>, where?: WhereCondition): Promise<number>
  /**
   * Check existence.
   */
  static exists<T extends Model>(this: ModelStatic<T>, where: WhereCondition): Promise<boolean>
  /**
   * Paginate.
   */
  static paginate<T extends Model>(
    this: ModelStatic<T>,
    options: {
      page: number
      limit: number
      orderBy?: unknown
      orderDirection?: 'asc' | 'desc'
    }
  ): Promise<{
    data: T[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }>
  /**
   * Create a record (similar to Laravel's `create`).
   */
  static create<T extends Model>(this: ModelStatic<T>, data: any): Promise<T>
  /**
   * Upsert (insert or update).
   */
  static upsert<T extends Model>(
    this: ModelStatic<T>,
    data: any,
    options?: UpsertOptions
  ): Promise<T>
  /**
   * Find or create.
   */
  static firstOrCreate<T extends Model>(
    this: ModelStatic<T>,
    where: WhereCondition,
    data: any
  ): Promise<T>
  /**
   * Find or instantiate (without persisting).
   */
  static firstOrNew<T extends Model>(
    this: ModelStatic<T>,
    where: WhereCondition,
    data: any
  ): Promise<T>
  /**
   * Update or create.
   */
  static updateOrCreate<T extends Model>(
    this: ModelStatic<T>,
    where: WhereCondition,
    data: any
  ): Promise<T>
  /**
   * Aggregate: sum.
   */
  static sum<T extends Model>(
    this: ModelStatic<T>,
    column: string,
    where?: WhereCondition
  ): Promise<number>
  /**
   * Aggregate: average.
   */
  static avg<T extends Model>(
    this: ModelStatic<T>,
    column: string,
    where?: WhereCondition
  ): Promise<number>
  /**
   * Aggregate: minimum.
   */
  static min<T extends Model>(
    this: ModelStatic<T>,
    column: string,
    where?: WhereCondition
  ): Promise<unknown>
  /**
   * Aggregate: maximum.
   */
  static max<T extends Model>(
    this: ModelStatic<T>,
    column: string,
    where?: WhereCondition
  ): Promise<unknown>
  /**
   * Create a Model instance from raw data.
   */
  protected static fromData(this: ModelStatic, data: any): Model
  /**
   * Cast an attribute value.
   */
  static castAttribute(
    key: string,
    value: unknown,
    cast: CastType | ((value: unknown) => unknown)
  ): unknown
  /**
   * Get an attribute value (supports accessors and casts).
   */
  get<K extends keyof TAttributes>(key: K): TAttributes[K] | undefined
  /**
   * Get relation accessor (use `await user.relation('posts')` or `await user.posts`).
   */
  get relation(): (name: string) => Promise<any>
  /**
   * Set an attribute value (supports mutators).
   */
  set<K extends keyof TAttributes>(key: K, value: TAttributes[K]): this
  /**
   * Get primary key value.
   */
  getKey(): unknown
  /**
   * Save (update or create).
   */
  save(): Promise<this>
  /**
   * Update record.
   */
  update(data: Partial<TAttributes>): Promise<this>
  /**
   * Increment a numeric column (atomic).
   */
  increment(column: string, amount?: number): Promise<this>
  /**
   * Decrement a numeric column (atomic).
   */
  decrement(column: string, amount?: number): Promise<this>
  /**
   * Delete (supports soft deletes).
   */
  delete(): Promise<boolean>
  /**
   * Force delete (physically delete even when soft deletes are enabled).
   */
  forceDelete(): Promise<boolean>
  /**
   * Restore a soft-deleted record.
   */
  restore(): Promise<boolean>
  /**
   * Check whether the model is soft-deleted.
   */
  trashed(): boolean
  /**
   * Get a relation (lazy loading).
   */
  getRelation(relationName: string): Promise<unknown>
  /**
   * Load relations (eager loading).
   */
  load(relationName: string | string[]): Promise<this>
  /**
   * Define a hasMany relation.
   */
  static hasMany<TRelated extends Model>(
    this: ModelStatic,
    related: ModelStatic<TRelated>,
    foreignKey?: string,
    localKey?: string
  ): void
  /**
   * Define a belongsTo relation.
   */
  static belongsTo<TRelated extends Model>(
    this: ModelStatic,
    related: ModelStatic<TRelated>,
    foreignKey?: string,
    ownerKey?: string
  ): void
  /**
   * Define a hasOne relation.
   */
  static hasOne<TRelated extends Model>(
    this: ModelStatic,
    related: ModelStatic<TRelated>,
    foreignKey?: string,
    localKey?: string
  ): void
  /**
   * Define a belongsToMany relation (many-to-many).
   */
  static belongsToMany<TRelated extends Model>(
    this: ModelStatic,
    related: ModelStatic<TRelated>,
    pivotTable: string,
    foreignKey?: string,
    relatedKey?: string
  ): void
  /**
   * Define a morphTo relation (polymorphic many-to-one).
   * Example: Comment belongs to Post or Video.
   *
   * @param relationName - Relation name (default: 'commentable')
   * @param morphType - Polymorphic type column name (default: '{relationName}_type')
   * @param morphId - Polymorphic id column name (default: '{relationName}_id')
   * @param morphMap - Polymorphic type map (optional, maps type name to Model class)
   */
  static morphTo(
    this: ModelStatic,
    relationName?: string,
    morphType?: string,
    morphId?: string,
    morphMap?: Map<string, ModelStatic>
  ): void
  /**
   * Define a morphMany relation (polymorphic one-to-many).
   * Example: Post has many Comments.
   *
   * @param related - Related Model class
   * @param relationName - Relation name
   * @param morphType - Polymorphic type column name (default: '{relationName}_type')
   * @param morphId - Polymorphic id column name (default: '{relationName}_id')
   */
  static morphMany<TRelated extends Model>(
    this: ModelStatic,
    related: ModelStatic<TRelated>,
    relationName: string,
    morphType?: string,
    morphId?: string
  ): void
  /**
   * Define a morphOne relation (polymorphic one-to-one).
   * Example: Post has one Image.
   *
   * @param related - Related Model class
   * @param relationName - Relation name
   * @param morphType - Polymorphic type column name (default: '{relationName}_type')
   * @param morphId - Polymorphic id column name (default: '{relationName}_id')
   */
  static morphOne<TRelated extends Model>(
    this: ModelStatic,
    related: ModelStatic<TRelated>,
    relationName: string,
    morphType?: string,
    morphId?: string
  ): void
  /**
   * Infer relation name (from Model class name).
   */
  protected static getRelationName(model: ModelStatic): string
  /**
   * Set casts.
   */
  static setCasts(casts: CastsDefinition): void
  /**
   * Convert to JSON (includes loaded relations and appended attributes).
   */
  toJSON(): Record<string, unknown>
}
/**
 * Query builder (supports fluent chaining).
 */
export declare class QueryBuilder<T extends Model> {
  private modelClass
  private whereConditions
  private orderByColumn?
  private orderDirection
  private limitValue?
  private offsetValue?
  private groupByColumns
  private softDeleteMode
  constructor(modelClass: ModelStatic<T>)
  /**
   * Include soft deleted records.
   */
  withTrashed(): this
  /**
   * Only include soft deleted records.
   */
  onlyTrashed(): this
  /**
   * Add WHERE conditions.
   */
  where(column: string, value: unknown): this
  where(where: WhereCondition): this
  /**
   * Add a WHERE IN condition.
   */
  whereIn(column: string, values: unknown[]): this
  /**
   * Add a WHERE NOT IN condition.
   */
  whereNotIn(column: string, values: unknown[]): this
  /**
   * Add a WHERE NULL condition.
   */
  whereNull(column: string): this
  /**
   * Add a WHERE NOT NULL condition.
   */
  whereNotNull(column: string): this
  /**
   * Add a WHERE BETWEEN condition.
   */
  whereBetween(column: string, min: unknown, max: unknown): this
  /**
   * Add a WHERE LIKE condition.
   */
  whereLike(column: string, pattern: string): this
  /**
   * Sort.
   */
  orderBy(column: unknown, direction?: 'asc' | 'desc'): this
  /**
   * Sort descending.
   */
  orderByDesc(column: unknown): this
  /**
   * Limit results.
   */
  limit(count: number): this
  /**
   * Offset results.
   */
  offset(count: number): this
  /**
   * Group by.
   */
  groupBy(...columns: unknown[]): this
  /**
   * Join (inner join).
   */
  join(table: Table, on: WhereCondition): this
  /**
   * Left join.
   */
  leftJoin(table: Table, on: WhereCondition): this
  /**
   * Right join.
   */
  rightJoin(table: Table, on: WhereCondition): this
  /**
   * Inner join (same as `join`).
   */
  innerJoin(table: Table, on: WhereCondition): this
  /**
   * Lock rows (FOR UPDATE).
   */
  lockForUpdate(options?: LockOptions): this
  /**
   * Shared lock (FOR SHARE).
   */
  sharedLock(options?: LockOptions): this
  /**
   * Get the first record.
   */
  first(): Promise<T | null>
  /**
   * Get all records.
   */
  get(): Promise<ModelCollection<T>>
  /**
   * Count.
   */
  count(): Promise<number>
  /**
   * Check existence.
   */
  exists(): Promise<boolean>
  /**
   * Aggregate: sum.
   */
  sum(column: string): Promise<number>
  /**
   * Aggregate: average.
   */
  avg(column: string): Promise<number>
  /**
   * Aggregate: minimum.
   */
  min(column: string): Promise<unknown>
  /**
   * Aggregate: maximum.
   */
  max(column: string): Promise<unknown>
  /**
   * Paginate.
   */
  paginate(
    page: number,
    limit: number
  ): Promise<{
    data: ModelCollection<T>
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }>
  /**
   * Build final WHERE conditions (apply global scopes and soft delete).
   */
  private buildWhere
}
/**
 * Model registry (for auto-registering Models).
 */
export declare class ModelRegistry {
  private static models
  /**
   * Register a Model.
   */
  static register(model: ModelStatic, table: Table, tableName: string): void
  /**
   * Initialize all registered Models (set DBService).
   */
  static initialize(dbService: DBService): void
  /**
   * Set core instance for all Models (for emitting events).
   */
  static setCore(core: PlanetCore): void
  /**
   * Clear all registered Models.
   */
  static clear(): void
}
//# sourceMappingURL=Model.d.ts.map
