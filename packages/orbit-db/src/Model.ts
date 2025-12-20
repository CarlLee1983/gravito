import type { PlanetCore } from 'gravito-core'
import type { DBService } from './DBService'
import { ModelCollection } from './ModelCollection'
import type { LockOptions, RelationOptions, UpsertOptions } from './types'

// biome-ignore lint/suspicious/noExplicitAny: generic table and where condition
type Table = any
// biome-ignore lint/suspicious/noExplicitAny: generic where condition
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
  model?: ModelStatic // `morphTo` may not need a model
  foreignKey?: string
  localKey?: string
  pivotTable?: string
  pivotForeignKey?: string
  pivotRelatedKey?: string
  // Polymorphic relation fields
  morphType?: string // Polymorphic type column name (e.g. 'commentable_type')
  morphId?: string // Polymorphic id column name (e.g. 'commentable_id')
  morphMap?: Map<string, ModelStatic> // Polymorphic type map (e.g. 'Post' -> PostModel)
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
export interface ModelStatic<T extends Model<any> = Model<any>> {
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
  getRelationName(model: ModelStatic<any>): string
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
    options?: { limit?: number; orderBy?: unknown; orderDirection?: 'asc' | 'desc' }
  ): Promise<ModelCollection<T>>
  count(where?: WhereCondition): Promise<number>
  exists(where: WhereCondition): Promise<boolean>
  create(data: Partial<T['attributes']>): Promise<T>
  withTrashed(): any
  onlyTrashed(): any
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
export abstract class Model<TAttributes = any> {
  // Static properties (must be configured by subclasses)
  public static table?: Table
  public static tableName?: string
  public static primaryKey = 'id'
  public static dbService?: DBService
  public static relations: Map<string, RelationDefinition> = new Map()
  public static casts: CastsDefinition = {}
  public static fillable: string[] = []
  public static guarded: string[] = []
  public static hidden: string[] = []
  public static visible: string[] = []
  public static appends: string[] = []
  public static timestamps = true
  public static createdAtColumn = 'created_at'
  public static updatedAtColumn = 'updated_at'
  public static deletedAtColumn = 'deleted_at'
  public static usesSoftDeletes = false
  public static localScopes: Map<string, (query: unknown) => unknown> = new Map()
  public static globalScopes: Array<(query: unknown) => unknown> = []
  public static core?: PlanetCore // Used to emit events

  // Instance properties
  public attributes: Partial<TAttributes> = {}
  public originalAttributes: Partial<TAttributes> = {}
  private relationsCache: Map<string, unknown> = new Map()
  private relationsLoaded: Set<string> = new Set()
  private _exists = false
  public isExists(): boolean {
    return this._exists
  }
  public wasRecentlyCreated = false

  /**
   * Set DBService (must be set during application bootstrap).
   */
  static setDBService(dbService: DBService): void {
    const modelClass = this as unknown as typeof Model
    modelClass.dbService = dbService
  }

  /**
   * Set table instance.
   */
  static setTable(table: Table, tableName: string): void {
    const modelClass = this as unknown as typeof Model
    modelClass.table = table
    modelClass.tableName = tableName
  }

  /**
   * Get table instance.
   */
  public static getTable(): Table {
    const modelClass = this as unknown as typeof Model
    const table = modelClass.table
    if (!table) {
      throw new Error(
        `[Model] Table not set for ${modelClass.name}. Please set static table property.`
      )
    }
    return table
  }

  /**
   * Get DBService.
   */
  public static getDBService(): DBService {
    const modelClass = this as unknown as typeof Model
    const dbService = modelClass.dbService
    if (!dbService) {
      throw new Error(
        `[Model] DBService not set for ${modelClass.name}. Please call Model.setDBService() or ensure db:connected hook is triggered.`
      )
    }
    return dbService
  }

  /**
   * Get primary key name.
   */
  public static getPrimaryKey(): string {
    const modelClass = this as unknown as typeof Model
    return modelClass.primaryKey || 'id'
  }

  /**
   * Find by ID (similar to Laravel's `find`).
   */
  static async find<T extends Model>(this: ModelStatic<T>, id: unknown): Promise<T | null> {
    const modelClass = this as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()
    const data = await dbService.findById(table, id)
    if (!data) {
      return null
    }
    // biome-ignore lint/suspicious/noExplicitAny: generic model creation
    return (modelClass as any).fromData(data) as T
  }

  /**
   * Find a single record (similar to `where()->first()`).
   */
  static async where<T extends Model>(
    this: ModelStatic<T>,
    column: string,
    value: unknown
  ): Promise<T | null> {
    return (this as unknown as ModelStatic<T>).whereMany({ [column]: value })
  }

  /**
   * Find a single record with multiple conditions.
   */
  static async whereMany<T extends Model>(
    this: ModelStatic<T>,
    where: WhereCondition
  ): Promise<T | null> {
    const modelClass = this as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()
    const data = await dbService.findOne(table, where)
    if (!data) {
      return null
    }
    // biome-ignore lint/suspicious/noExplicitAny: generic model creation
    return (modelClass as any).fromData(data) as T
  }

  /**
   * Start a query builder (fluent chaining).
   */
  static query<T extends Model>(this: ModelStatic<T>): QueryBuilder<T> {
    return new QueryBuilder<T>(this)
  }

  /**
   * Start a query builder including soft deleted records.
   */
  static withTrashed<T extends Model>(this: ModelStatic<T>): QueryBuilder<T> {
    return new QueryBuilder<T>(this).withTrashed()
  }

  /**
   * Start a query builder only for soft deleted records.
   */
  static onlyTrashed<T extends Model>(this: ModelStatic<T>): QueryBuilder<T> {
    return new QueryBuilder<T>(this).onlyTrashed()
  }

  /**
   * Fetch all records (similar to Laravel's `all()`).
   */
  static async all<T extends Model>(
    this: ModelStatic<T>,
    options?: { limit?: number; orderBy?: unknown; orderDirection?: 'asc' | 'desc' }
  ): Promise<ModelCollection<T>> {
    return (this as unknown as ModelStatic<T>).findAll(undefined, options)
  }

  /**
   * Fetch records with optional conditions.
   */
  static async findAll<T extends Model>(
    this: ModelStatic<T>,
    where?: WhereCondition,
    options?: { limit?: number; orderBy?: unknown; orderDirection?: 'asc' | 'desc' }
  ): Promise<ModelCollection<T>> {
    const modelClass = this as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()

    // Apply global scopes.
    let finalWhere = where || {}
    const globalScopes = modelClass.globalScopes || []
    for (const scope of globalScopes) {
      finalWhere = scope(finalWhere)
    }

    // Apply soft delete filter.
    if (modelClass.usesSoftDeletes) {
      const deletedAtColumn = modelClass.deletedAtColumn || 'deleted_at'
      finalWhere = { ...finalWhere, [deletedAtColumn]: null }
    }

    const data = await dbService.findAll(table, finalWhere, options)
    // biome-ignore lint/suspicious/noExplicitAny: generic model creation
    const models = data.map((item: any) => (modelClass as any).fromData(item))
    return new ModelCollection(models)
  }

  /**
   * Count.
   */
  static async count<T extends Model>(
    this: ModelStatic<T>,
    where?: WhereCondition
  ): Promise<number> {
    const modelClass = this as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()
    return dbService.count(table, where)
  }

  /**
   * Check existence.
   */
  static async exists<T extends Model>(
    this: ModelStatic<T>,
    where: WhereCondition
  ): Promise<boolean> {
    const modelClass = this as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()
    return dbService.exists(table, where)
  }

  /**
   * Paginate.
   */
  static async paginate<T extends Model>(
    this: ModelStatic<T>,
    options: { page: number; limit: number; orderBy?: unknown; orderDirection?: 'asc' | 'desc' }
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
  }> {
    const modelClass = this as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()
    const result = await dbService.paginate(table, options)
    return {
      // biome-ignore lint/suspicious/noExplicitAny: generic model creation
      data: result.data.map((item: any) => (modelClass as any).fromData(item)),
      pagination: result.pagination,
    }
  }

  /**
   * Create a record (similar to Laravel's `create`).
   */
  static async create<T extends Model>(this: ModelStatic<T>, data: any): Promise<T> {
    const modelClass = this as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()

    // Apply mass assignment protection.
    const fillable = modelClass.fillable || []
    const guarded = modelClass.guarded || []
    let dataToCreate: any = {}

    if (fillable.length > 0) {
      // Only allow fields in `fillable`.
      for (const key of fillable) {
        if (data[key] !== undefined) {
          dataToCreate[key] = data[key]
        }
      }
    } else if (guarded.length > 0) {
      // Exclude fields in `guarded`.
      for (const key in data) {
        if (!guarded.includes(key)) {
          dataToCreate[key] = data[key]
        }
      }
    } else {
      // No `fillable`/`guarded` configured: allow all attributes.
      dataToCreate = { ...data }
    }

    // Auto timestamps.
    if (modelClass.timestamps) {
      const createdAtColumn = modelClass.createdAtColumn || 'created_at'
      const updatedAtColumn = modelClass.updatedAtColumn || 'updated_at'
      dataToCreate[createdAtColumn] = new Date()
      dataToCreate[updatedAtColumn] = new Date()
    }

    const created = await dbService.create(table, dataToCreate)
    // biome-ignore lint/suspicious/noExplicitAny: generic model creation
    const instance = (modelClass as any).fromData(created) as T
    instance.wasRecentlyCreated = true

    // Emit created event.
    const core = modelClass.core
    if (core) {
      await core.hooks.doAction('model:created', { model: instance })
      await core.hooks.doAction('model:saved', {
        model: instance,
        wasRecentlyCreated: true,
      })
    }

    return instance
  }

  /**
   * Upsert (insert or update).
   */
  static async upsert<T extends Model>(
    this: ModelStatic<T>,
    data: any,
    options?: UpsertOptions
  ): Promise<T> {
    const modelClass = this as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()

    // Apply mass assignment protection.
    const fillable = modelClass.fillable || []
    const guarded = modelClass.guarded || []
    let dataToUpsert: any = {}

    if (fillable.length > 0) {
      for (const key of fillable) {
        if (data[key] !== undefined) {
          dataToUpsert[key] = data[key]
        }
      }
    } else if (guarded.length > 0) {
      for (const key in data) {
        if (!guarded.includes(key)) {
          dataToUpsert[key] = data[key]
        }
      }
    } else {
      dataToUpsert = { ...data }
    }

    const result = await dbService.upsert(table, dataToUpsert, options)
    // biome-ignore lint/suspicious/noExplicitAny: generic model creation
    return (modelClass as any).fromData(result) as T
  }

  /**
   * Find or create.
   */
  static async firstOrCreate<T extends Model>(
    this: ModelStatic<T>,
    where: WhereCondition,
    data: any
  ): Promise<T> {
    const modelClass = this as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()

    const result = await dbService.firstOrCreate(table, where, data)
    // biome-ignore lint/suspicious/noExplicitAny: generic model creation
    return (modelClass as any).fromData(result) as T
  }

  /**
   * Find or instantiate (without persisting).
   */
  static async firstOrNew<T extends Model>(
    this: ModelStatic<T>,
    where: WhereCondition,
    data: any
  ): Promise<T> {
    const modelClass = this as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()

    const result = await dbService.firstOrNew(table, where, data)
    // biome-ignore lint/suspicious/noExplicitAny: generic model creation
    return (modelClass as any).fromData(result) as T
  }

  /**
   * Update or create.
   */
  static async updateOrCreate<T extends Model>(
    this: ModelStatic<T>,
    where: WhereCondition,
    data: any
  ): Promise<T> {
    const modelClass = this as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()

    const result = await dbService.updateOrCreate(table, where, data)
    // biome-ignore lint/suspicious/noExplicitAny: generic model creation
    return (modelClass as any).fromData(result) as T
  }

  /**
   * Aggregate: sum.
   */
  static async sum<T extends Model>(
    this: ModelStatic<T>,
    column: string,
    where?: WhereCondition
  ): Promise<number> {
    const modelClass = this as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()
    return dbService.sum(table, column, where)
  }

  /**
   * Aggregate: average.
   */
  static async avg<T extends Model>(
    this: ModelStatic<T>,
    column: string,
    where?: WhereCondition
  ): Promise<number> {
    const modelClass = this as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()
    return dbService.avg(table, column, where)
  }

  /**
   * Aggregate: minimum.
   */
  static async min<T extends Model>(
    this: ModelStatic<T>,
    column: string,
    where?: WhereCondition
  ): Promise<unknown> {
    const modelClass = this as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()
    return dbService.min(table, column, where)
  }

  /**
   * Aggregate: maximum.
   */
  static async max<T extends Model>(
    this: ModelStatic<T>,
    column: string,
    where?: WhereCondition
  ): Promise<unknown> {
    const modelClass = this as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()
    return dbService.max(table, column, where)
  }

  /**
   * Create a Model instance from raw data.
   */
  protected static fromData(this: ModelStatic, data: any): Model {
    const modelClass = this as unknown as typeof Model
    const instance = new (modelClass as any)()
    // Apply casts.
    const casts = modelClass.casts || {}
    const processedData: any = {}

    for (const [key, value] of Object.entries(data)) {
      if (casts[key]) {
        processedData[key] = modelClass.castAttribute(key, value, casts[key])
      } else {
        processedData[key] = value
      }
    }

    instance.attributes = processedData
    instance.originalAttributes = { ...processedData }
    instance._exists = true
    return instance
  }

  /**
   * Cast an attribute value.
   */
  static castAttribute(
    _key: string,
    value: unknown,
    cast: CastType | ((value: unknown) => unknown)
  ): unknown {
    if (typeof cast === 'function') {
      return cast(value)
    }

    if (value === null || value === undefined) {
      return value
    }

    switch (cast) {
      case 'string':
        return String(value)
      case 'number':
        return Number(value)
      case 'boolean':
        return Boolean(value)
      case 'date':
        return value instanceof Date ? value : new Date(value as string | number)
      case 'json':
        return typeof value === 'string' ? JSON.parse(value) : value
      case 'array':
        return Array.isArray(value) ? value : [value]
      default:
        return value
    }
  }

  /**
   * Get an attribute value (supports accessors and casts).
   */
  get<K extends keyof TAttributes>(key: K): TAttributes[K] | undefined {
    // Check accessor.
    const accessor = `get${String(key).charAt(0).toUpperCase() + String(key).slice(1)}Attribute`
    if (typeof (this as any)[accessor] === 'function') {
      return (this as any)[accessor](this.attributes[key])
    }

    // Check casts.
    const casts = (this.constructor as typeof Model).casts
    const value = this.attributes[key]
    if (casts[String(key)] && value !== undefined && value !== null) {
      return (this.constructor as typeof Model).castAttribute(
        String(key),
        value,
        casts[String(key)] as CastType | ((value: unknown) => unknown)
      ) as TAttributes[K]
    }

    return value
  }

  /**
   * Get relation accessor (use `await user.relation('posts')` or `await user.posts`).
   */
  // biome-ignore lint/suspicious/noExplicitAny: dynamic relation access
  get relation(): (name: string) => Promise<any> {
    return (name: string) => this.getRelation(name)
  }

  /**
   * Set an attribute value (supports mutators).
   */
  set<K extends keyof TAttributes>(key: K, value: TAttributes[K]): this {
    // Check mutator.
    const mutator = `set${String(key).charAt(0).toUpperCase() + String(key).slice(1)}Attribute`
    if (typeof (this as any)[mutator] === 'function') {
      this.attributes[key] = (this as any)[mutator](value)
    } else {
      this.attributes[key] = value
    }
    return this
  }

  /**
   * Get primary key value.
   */
  getKey(): unknown {
    const pk = (this.constructor as typeof Model).getPrimaryKey()
    return this.attributes[pk as keyof TAttributes]
  }

  /**
   * Save (update or create).
   */
  async save(): Promise<this> {
    const modelClass = this.constructor as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()
    const pk = modelClass.getPrimaryKey()
    const id = this.getKey()
    const isCreating = !id

    // Emit saving event.
    if (modelClass.core) {
      await modelClass.core.hooks.doAction(isCreating ? 'model:creating' : 'model:updating', {
        model: this,
        attributes: this.attributes,
      })
    }

    // Apply mass assignment protection.
    const fillable = modelClass.fillable || []
    const guarded = modelClass.guarded || []
    let dataToSave: any = {}

    if (fillable.length > 0) {
      // Only allow fields in `fillable`.
      for (const key of fillable) {
        if (this.attributes[key as keyof TAttributes] !== undefined) {
          dataToSave[key] = this.attributes[key as keyof TAttributes]
        }
      }
    } else if (guarded.length > 0) {
      // Exclude fields in `guarded`.
      for (const key in this.attributes) {
        if (!guarded.includes(key)) {
          dataToSave[key] = this.attributes[key as keyof TAttributes]
        }
      }
    } else {
      // No `fillable`/`guarded` configured: allow all attributes.
      dataToSave = { ...this.attributes }
    }

    // Auto timestamps.
    if (modelClass.timestamps) {
      const createdAtColumn = modelClass.createdAtColumn || 'created_at'
      const updatedAtColumn = modelClass.updatedAtColumn || 'updated_at'

      if (!id) {
        // On create: set created_at and updated_at.
        dataToSave[createdAtColumn] = new Date()
        dataToSave[updatedAtColumn] = new Date()
      } else {
        // On update: only set updated_at.
        dataToSave[updatedAtColumn] = new Date()
      }
    }

    if (id) {
      // Update
      await dbService.update(table, { [pk]: id }, dataToSave)
      // Re-fetch to get the latest data.
      const updated = await dbService.findById(table, id)
      if (updated) {
        this.attributes = updated as Partial<TAttributes>
        this.originalAttributes = { ...(updated as Partial<TAttributes>) }
      }

      // Emit updated event.
      if (modelClass.core) {
        await modelClass.core.hooks.doAction('model:updated', { model: this })
      }
    } else {
      // Create
      const created = await dbService.create(table, dataToSave)
      this.attributes = created as Partial<TAttributes>
      this.originalAttributes = { ...(created as Partial<TAttributes>) }
      this._exists = true
      ;(this as any).wasRecentlyCreated = true

      // Emit created event.
      if (modelClass.core) {
        await modelClass.core.hooks.doAction('model:created', { model: this })
      }
    }

    // Emit saved event.
    if (modelClass.core) {
      await modelClass.core.hooks.doAction('model:saved', {
        model: this,
        wasRecentlyCreated: (this as any).wasRecentlyCreated,
      })
    }

    return this
  }

  /**
   * Update record.
   */
  async update(data: Partial<TAttributes>): Promise<this> {
    Object.assign(this.attributes, data)
    return this.save()
  }

  /**
   * Increment a numeric column (atomic).
   */
  async increment(column: string, amount = 1): Promise<this> {
    const modelClass = this.constructor as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()
    const pk = modelClass.getPrimaryKey()
    const id = this.getKey()

    if (!id) {
      throw new Error('Cannot increment on unsaved model')
    }

    await dbService.increment(table, { [pk]: id }, column, amount)

    // Re-fetch to get the latest data.
    const updated = await dbService.findById(table, id)
    if (updated) {
      this.attributes = updated as Partial<TAttributes>
      this.originalAttributes = { ...(updated as Partial<TAttributes>) }
    }

    return this
  }

  /**
   * Decrement a numeric column (atomic).
   */
  async decrement(column: string, amount = 1): Promise<this> {
    return this.increment(column, -amount)
  }

  /**
   * Delete (supports soft deletes).
   */
  async delete(): Promise<boolean> {
    const modelClass = this.constructor as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()
    const pk = modelClass.getPrimaryKey()
    const id = this.getKey()
    if (!id) {
      throw new Error(`[Model] Cannot delete model without primary key value`)
    }

    // Emit deleting event.
    if (modelClass.core) {
      await modelClass.core.hooks.doAction('model:deleting', { model: this })
    }

    // If soft deletes are enabled, update `deleted_at`.
    if (modelClass.usesSoftDeletes) {
      const deletedAtColumn = modelClass.deletedAtColumn || 'deleted_at'
      await dbService.update(table, { [pk]: id }, { [deletedAtColumn]: new Date() } as any)
      // Update local attributes.
      ;(this.attributes as any)[deletedAtColumn] = new Date()

      // Emit deleted event (soft delete).
      if (modelClass.core) {
        await modelClass.core.hooks.doAction('model:deleted', { model: this, soft: true })
      }

      return true
    }

    // Hard delete
    await dbService.delete(table, { [pk]: id })

    // Emit deleted event (hard delete).
    if (modelClass.core) {
      await modelClass.core.hooks.doAction('model:deleted', { model: this, soft: false })
    }

    return true
  }

  /**
   * Force delete (physically delete even when soft deletes are enabled).
   */
  async forceDelete(): Promise<boolean> {
    const modelClass = this.constructor as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()
    const pk = modelClass.getPrimaryKey()
    const id = this.getKey()
    if (!id) {
      throw new Error(`[Model] Cannot delete model without primary key value`)
    }

    await dbService.delete(table, { [pk]: id })
    return true
  }

  /**
   * Restore a soft-deleted record.
   */
  async restore(): Promise<boolean> {
    const modelClass = this.constructor as unknown as typeof Model
    if (!modelClass.usesSoftDeletes) {
      throw new Error(`[Model] restore() can only be used on models with soft deletes enabled`)
    }

    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()
    const pk = modelClass.getPrimaryKey()
    const id = this.getKey()
    if (!id) {
      throw new Error(`[Model] Cannot restore model without primary key value`)
    }

    const deletedAtColumn = modelClass.deletedAtColumn || 'deleted_at'
    await dbService.update(table, { [pk]: id }, { [deletedAtColumn]: null } as any)
    // Update local attributes.
    ;(this.attributes as any)[deletedAtColumn] = null
    return true
  }

  /**
   * Check whether the model is soft-deleted.
   */
  trashed(): boolean {
    const modelClass = this.constructor as unknown as typeof Model
    if (!modelClass.usesSoftDeletes) {
      return false
    }

    const deletedAtColumn = modelClass.deletedAtColumn || 'deleted_at'
    const deletedAt = (this.attributes as any)[deletedAtColumn]
    return deletedAt !== null && deletedAt !== undefined
  }

  /**
   * Get a relation (lazy loading).
   */
  async getRelation(relationName: string): Promise<unknown> {
    // Check cache.
    if (this.relationsCache.has(relationName)) {
      return this.relationsCache.get(relationName)
    }

    const modelClass = this.constructor as unknown as typeof Model
    const relations = modelClass.relations
    const relation = relations.get(relationName)
    if (!relation) {
      throw new Error(`[Model] Relation "${relationName}" not defined`)
    }

    const dbService = modelClass.getDBService()
    const tableName = modelClass.tableName
    if (!tableName) {
      throw new Error(`[Model] Table name not set`)
    }

    const id = this.getKey()
    if (!id) {
      return null
    }

    // Handle polymorphic relations.
    if (relation.type === 'morphTo') {
      // morphTo: resolve model by morph_type and morph_id.
      const morphType = relation.morphType || `${relationName}_type`
      const morphId = relation.morphId || `${relationName}_id`
      const typeValue = (this.attributes as any)[morphType]
      const idValue = (this.attributes as any)[morphId]

      if (!typeValue || !idValue) {
        return null
      }

      // Use morphMap to resolve the related model class.
      const morphMap = relation.morphMap || new Map()
      const relatedModel = morphMap.get(typeValue)

      if (!relatedModel) {
        // If there is no morphMap, skip (simplified implementation).
        // In real usage, configure a proper morphMap.
        return null
      }

      const relatedTable = (relatedModel as unknown as typeof Model).getTable()
      const data = await dbService.findById(relatedTable, idValue)

      if (data) {
        const instance = (relatedModel as any).fromData(data)
        this.relationsCache.set(relationName, instance)
        this.relationsLoaded.add(relationName)
        return instance
      }

      return null
    } else if (relation.type === 'morphMany' || relation.type === 'morphOne') {
      // morphMany/morphOne: query related models by current model type and ID.
      const morphType = relation.morphType || `${relationName}_type`
      const morphId = relation.morphId || `${relationName}_id`
      const relatedModel = relation.model

      if (!relatedModel) {
        throw new Error(`[Model] Related model not defined for relation "${relationName}"`)
      }

      const _relatedTable = (relatedModel as unknown as typeof Model).getTable()
      const currentModelName = modelClass.name

      const where: any = {
        [morphId]: id,
        [morphType]: currentModelName,
      }

      if (relation.type === 'morphOne') {
        const data = await dbService.findOne(_relatedTable, where)
        if (data) {
          const instance = (relatedModel as any).fromData(data)
          this.relationsCache.set(relationName, instance)
          this.relationsLoaded.add(relationName)
          return instance
        }
        return null
      } else {
        // morphMany
        const data = await dbService.findAll(_relatedTable, where)
        const instances = data.map((item: any) => (relatedModel as any).fromData(item))
        const collection = new ModelCollection(instances)
        this.relationsCache.set(relationName, collection)
        this.relationsLoaded.add(relationName)
        return collection
      }
    } else {
      // Regular relation: use DBService relation query helpers.
      const result = await dbService.findByIdWith(tableName, id, { [relationName]: true })

      if (result && (result as any)[relationName]) {
        this.relationsCache.set(relationName, (result as any)[relationName])
        this.relationsLoaded.add(relationName)
        return (result as any)[relationName]
      }

      return null
    }
  }

  /**
   * Load relations (eager loading).
   */
  async load(relationName: string | string[]): Promise<this> {
    const relations = Array.isArray(relationName) ? relationName : [relationName]
    const modelClass = this.constructor as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const tableName = modelClass.tableName
    if (!tableName) {
      throw new Error(`[Model] Table name not set`)
    }

    const id = this.getKey()
    if (!id) {
      return this
    }

    const relationOptions: RelationOptions = {}
    for (const rel of relations) {
      relationOptions[rel] = true
    }

    const result = await dbService.findByIdWith(tableName, id, relationOptions)
    if (result) {
      for (const rel of relations) {
        if ((result as any)[rel] !== undefined) {
          this.relationsCache.set(rel, (result as any)[rel])
          this.relationsLoaded.add(rel)
        }
      }
    }

    return this
  }

  /**
   * Define a hasMany relation.
   */
  static hasMany<TRelated extends Model>(
    this: ModelStatic,
    related: ModelStatic<TRelated>,
    foreignKey?: string,
    localKey?: string
  ): void {
    const modelClass = this as unknown as typeof Model
    const relationName = modelClass.getRelationName(related)
    const relations = new Map(modelClass.relations || [])
    relations.set(relationName, {
      type: 'hasMany',
      model: related,
      foreignKey: foreignKey || `${modelClass.tableName}_id`,
      localKey: localKey || modelClass.getPrimaryKey(),
    })
    modelClass.relations = relations
  }

  /**
   * Define a belongsTo relation.
   */
  static belongsTo<TRelated extends Model>(
    this: ModelStatic,
    related: ModelStatic<TRelated>,
    foreignKey?: string,
    ownerKey?: string
  ): void {
    const modelClass = this as unknown as typeof Model
    const relatedClass = related as unknown as typeof Model
    const relationName = modelClass.getRelationName(related)
    const relations = new Map(modelClass.relations || [])
    relations.set(relationName, {
      type: 'belongsTo',
      model: related,
      foreignKey: foreignKey || `${relationName}_id`,
      localKey: ownerKey || relatedClass.getPrimaryKey(),
    })
    modelClass.relations = relations
  }

  /**
   * Define a hasOne relation.
   */
  static hasOne<TRelated extends Model>(
    this: ModelStatic,
    related: ModelStatic<TRelated>,
    foreignKey?: string,
    localKey?: string
  ): void {
    const modelClass = this as unknown as typeof Model
    const relationName = modelClass.getRelationName(related)
    const relations = new Map(modelClass.relations || [])
    relations.set(relationName, {
      type: 'hasOne',
      model: related,
      foreignKey: foreignKey || `${modelClass.tableName}_id`,
      localKey: localKey || modelClass.getPrimaryKey(),
    })
    modelClass.relations = relations
  }

  /**
   * Define a belongsToMany relation (many-to-many).
   */
  static belongsToMany<TRelated extends Model>(
    this: ModelStatic,
    related: ModelStatic<TRelated>,
    pivotTable: string,
    foreignKey?: string,
    relatedKey?: string
  ): void {
    const modelClass = this as unknown as typeof Model
    const relationName = modelClass.getRelationName(related)
    const relations = new Map(modelClass.relations || [])
    relations.set(relationName, {
      type: 'belongsToMany',
      model: related,
      pivotTable,
      pivotForeignKey: foreignKey || `${modelClass.tableName}_id`,
      pivotRelatedKey: relatedKey || `${relationName}_id`,
    })
    modelClass.relations = relations
  }

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
  ): void {
    const modelClass = this as unknown as typeof Model
    const name = relationName || 'commentable' // Default name
    const typeColumn = morphType || `${name}_type`
    const idColumn = morphId || `${name}_id`
    const relations = new Map(modelClass.relations || [])
    relations.set(name, {
      type: 'morphTo',
      morphType: typeColumn,
      morphId: idColumn,
      morphMap: morphMap || new Map(),
    })
    modelClass.relations = relations
  }

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
  ): void {
    const modelClass = this as unknown as typeof Model
    const typeColumn = morphType || `${relationName}_type`
    const idColumn = morphId || `${relationName}_id`
    const relations = new Map(modelClass.relations || [])
    relations.set(relationName, {
      type: 'morphMany',
      model: related,
      morphType: typeColumn,
      morphId: idColumn,
    })
    modelClass.relations = relations
  }

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
  ): void {
    const modelClass = this as unknown as typeof Model
    const typeColumn = morphType || `${relationName}_type`
    const idColumn = morphId || `${relationName}_id`
    const relations = new Map(modelClass.relations || [])
    relations.set(relationName, {
      type: 'morphOne',
      model: related,
      morphType: typeColumn,
      morphId: idColumn,
    })
    modelClass.relations = relations
  }

  /**
   * Infer relation name (from Model class name).
   */
  protected static getRelationName(model: ModelStatic): string {
    const name = model.name
    // User -> user, Post -> post
    // If it is already plural, keep it (e.g. Posts -> posts)
    const lower = name.charAt(0).toLowerCase() + name.slice(1)
    // Simple pluralization: keep if ends with 's', otherwise add 's'.
    return lower.endsWith('s') ? lower : `${lower}s`
  }

  /**
   * Set casts.
   */
  static setCasts(casts: CastsDefinition): void {
    const modelClass = this as unknown as typeof Model
    modelClass.casts = { ...(modelClass.casts || {}), ...casts }
  }

  /**
   * Convert to JSON (includes loaded relations and appended attributes).
   */
  toJSON(): Record<string, unknown> {
    const modelClass = this.constructor as unknown as typeof Model
    const json: Record<string, unknown> = { ...this.attributes } as Record<string, unknown>

    // Include loaded relations.
    for (const [key, value] of this.relationsCache.entries()) {
      json[key] = value
    }

    // Apply appended attributes (appends).
    const appends = modelClass.appends || []
    for (const key of appends) {
      // Check accessor.
      const accessor = `get${key.charAt(0).toUpperCase() + key.slice(1)}Attribute`
      if (typeof (this as any)[accessor] === 'function') {
        json[key] = (this as any)[accessor](this.attributes[key as keyof TAttributes])
      } else {
        // Try as relation.
        if (this.relationsLoaded.has(key)) {
          json[key] = this.relationsCache.get(key)
        }
      }
    }

    // Apply hidden/visible.
    const hidden = modelClass.hidden || []
    const visible = modelClass.visible || []

    if (visible.length > 0) {
      // Only include visible attributes.
      const filtered: Record<string, unknown> = {}
      for (const key of visible) {
        if (json[key] !== undefined) {
          filtered[key] = json[key]
        }
      }
      return filtered
    }

    // Hide attributes.
    for (const key of hidden) {
      delete json[key]
    }

    return json
  }
}

/**
 * Query builder (supports fluent chaining).
 */
export class QueryBuilder<T extends Model> {
  private whereConditions: WhereCondition = {}
  private orderByColumn?: unknown
  private orderDirection: 'asc' | 'desc' = 'asc'
  private limitValue?: number
  private offsetValue?: number
  private groupByColumns?: unknown[]
  private softDeleteMode: 'default' | 'withTrashed' | 'onlyTrashed' = 'default'

  constructor(private modelClass: ModelStatic<T>) {}

  /**
   * Include soft deleted records.
   */
  withTrashed(): this {
    this.softDeleteMode = 'withTrashed'
    return this
  }

  /**
   * Only include soft deleted records.
   */
  onlyTrashed(): this {
    this.softDeleteMode = 'onlyTrashed'
    return this
  }

  /**
   * Add WHERE conditions.
   */
  where(column: string, value: unknown): this
  where(where: WhereCondition): this
  where(columnOrWhere: string | WhereCondition, value?: unknown): this {
    if (typeof columnOrWhere === 'string') {
      this.whereConditions[columnOrWhere] = value
    } else {
      this.whereConditions = { ...this.whereConditions, ...columnOrWhere }
    }
    return this
  }

  /**
   * Add a WHERE IN condition.
   */
  whereIn(column: string, values: unknown[]): this {
    this.whereConditions[column] = { $in: values }
    return this
  }

  /**
   * Add a WHERE NOT IN condition.
   */
  whereNotIn(column: string, values: unknown[]): this {
    this.whereConditions[column] = { $nin: values }
    return this
  }

  /**
   * Add a WHERE NULL condition.
   */
  whereNull(column: string): this {
    this.whereConditions[column] = null
    return this
  }

  /**
   * Add a WHERE NOT NULL condition.
   */
  whereNotNull(column: string): this {
    this.whereConditions[column] = { $ne: null }
    return this
  }

  /**
   * Add a WHERE BETWEEN condition.
   */
  whereBetween(column: string, min: unknown, max: unknown): this {
    this.whereConditions[column] = { $gte: min, $lte: max }
    return this
  }

  /**
   * Add a WHERE LIKE condition.
   */
  whereLike(column: string, pattern: string): this {
    this.whereConditions[column] = { $like: pattern }
    return this
  }

  /**
   * Sort.
   */
  orderBy(column: unknown, direction: 'asc' | 'desc' = 'asc'): this {
    this.orderByColumn = column
    this.orderDirection = direction
    return this
  }

  /**
   * Sort descending.
   */
  orderByDesc(column: unknown): this {
    return this.orderBy(column, 'desc')
  }

  /**
   * Limit results.
   */
  limit(count: number): this {
    this.limitValue = count
    return this
  }

  /**
   * Offset results.
   */
  offset(count: number): this {
    this.offsetValue = count
    return this
  }

  /**
   * Group by.
   */
  groupBy(...columns: unknown[]): this {
    this.groupByColumns = columns
    return this
  }

  /**
   * Join (inner join).
   */
  join(table: Table, on: WhereCondition): this {
    // Note: the actual join implementation should be aligned with Drizzle APIs.
    // This only stores join conditions; real execution happens in `get()`/`first()`.
    // biome-ignore lint/suspicious/noExplicitAny: join storage
    if (!(this as any).joins) {
      // biome-ignore lint/suspicious/noExplicitAny: join storage
      ;(this as any).joins = []
    }
    // biome-ignore lint/suspicious/noExplicitAny: join storage
    ;(this as any).joins.push({ type: 'inner', table, on })
    return this
  }

  /**
   * Left join.
   */
  leftJoin(table: Table, on: WhereCondition): this {
    // biome-ignore lint/suspicious/noExplicitAny: join storage
    if (!(this as any).joins) {
      // biome-ignore lint/suspicious/noExplicitAny: join storage
      ;(this as any).joins = []
    }
    // biome-ignore lint/suspicious/noExplicitAny: join storage
    ;(this as any).joins.push({ type: 'left', table, on })
    return this
  }

  /**
   * Right join.
   */
  rightJoin(table: Table, on: WhereCondition): this {
    // biome-ignore lint/suspicious/noExplicitAny: join storage
    if (!(this as any).joins) {
      // biome-ignore lint/suspicious/noExplicitAny: join storage
      ;(this as any).joins = []
    }
    // biome-ignore lint/suspicious/noExplicitAny: join storage
    ;(this as any).joins.push({ type: 'right', table, on })
    return this
  }

  /**
   * Inner join (same as `join`).
   */
  innerJoin(table: Table, on: WhereCondition): this {
    return this.join(table, on)
  }

  /**
   * Lock rows (FOR UPDATE).
   */
  lockForUpdate(options?: LockOptions): this {
    // biome-ignore lint/suspicious/noExplicitAny: lock storage
    ;(this as any).lockType = 'update'
    // biome-ignore lint/suspicious/noExplicitAny: lock storage
    ;(this as any).lockOptions = options
    return this
  }

  /**
   * Shared lock (FOR SHARE).
   */
  sharedLock(options?: LockOptions): this {
    // biome-ignore lint/suspicious/noExplicitAny: lock storage
    ;(this as any).lockType = 'share'
    // biome-ignore lint/suspicious/noExplicitAny: lock storage
    ;(this as any).lockOptions = options
    return this
  }

  /**
   * Get the first record.
   */
  async first(): Promise<T | null> {
    const modelClass = this.modelClass as unknown as typeof Model
    const dbService = (modelClass as any).getDBService()
    const table = (modelClass as any).getTable()

    // Apply global scopes and soft delete.
    const finalWhere = this.buildWhere()

    const data = await dbService.findOne(table, finalWhere)
    if (!data) {
      return null
    }
    return (this.modelClass as any).fromData(data) as T
  }

  /**
   * Get all records.
   */
  async get(): Promise<ModelCollection<T>> {
    const modelClass = this.modelClass as unknown as typeof Model
    const dbService = (modelClass as any).getDBService()
    const table = (modelClass as any).getTable()

    // Apply global scopes and soft delete.
    const finalWhere = this.buildWhere()

    const options: {
      limit?: number
      offset?: number
      orderBy?: unknown
      orderDirection?: 'asc' | 'desc'
      groupBy?: unknown[]
    } = {}
    if (this.orderByColumn) {
      options.orderBy = this.orderByColumn
      options.orderDirection = this.orderDirection
    }
    if (this.limitValue) {
      options.limit = this.limitValue
    }
    if (this.offsetValue) {
      options.offset = this.offsetValue
    }
    if (this.groupByColumns) {
      options.groupBy = this.groupByColumns
    }

    const data = await dbService.findAll(table, finalWhere, options)
    const models = data.map((item: any) => (this.modelClass as any).fromData(item)) as T[]
    return new ModelCollection(models)
  }

  /**
   * Count.
   */
  async count(): Promise<number> {
    const modelClass = this.modelClass as unknown as typeof Model
    const dbService = (modelClass as any).getDBService()
    const table = (modelClass as any).getTable()

    const finalWhere = this.buildWhere()
    return dbService.count(table, finalWhere)
  }

  /**
   * Check existence.
   */
  async exists(): Promise<boolean> {
    const modelClass = this.modelClass as unknown as typeof Model
    const dbService = (modelClass as any).getDBService()
    const table = (modelClass as any).getTable()

    const finalWhere = this.buildWhere()
    return dbService.exists(table, finalWhere)
  }

  /**
   * Aggregate: sum.
   */
  async sum(column: string): Promise<number> {
    const modelClass = this.modelClass as unknown as typeof Model
    const dbService = (modelClass as any).getDBService()
    const table = (modelClass as any).getTable()

    const finalWhere = this.buildWhere()
    return dbService.sum(table, column, finalWhere)
  }

  /**
   * Aggregate: average.
   */
  async avg(column: string): Promise<number> {
    const modelClass = this.modelClass as unknown as typeof Model
    const dbService = (modelClass as any).getDBService()
    const table = (modelClass as any).getTable()

    const finalWhere = this.buildWhere()
    return dbService.avg(table, column, finalWhere)
  }

  /**
   * Aggregate: minimum.
   */
  async min(column: string): Promise<unknown> {
    const modelClass = this.modelClass as unknown as typeof Model
    const dbService = (modelClass as any).getDBService()
    const table = (modelClass as any).getTable()

    const finalWhere = this.buildWhere()
    return dbService.min(table, column, finalWhere)
  }

  /**
   * Aggregate: maximum.
   */
  async max(column: string): Promise<unknown> {
    const modelClass = this.modelClass as unknown as typeof Model
    const dbService = (modelClass as any).getDBService()
    const table = (modelClass as any).getTable()

    const finalWhere = this.buildWhere()
    return dbService.max(table, column, finalWhere)
  }

  /**
   * Paginate.
   */
  async paginate(
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
  }> {
    const modelClass = this.modelClass as unknown as typeof Model
    const dbService = (modelClass as any).getDBService()
    const table = (modelClass as any).getTable()

    const _finalWhere = this.buildWhere()

    const options: {
      orderBy?: unknown
      orderDirection?: 'asc' | 'desc'
      offset?: number
      groupBy?: unknown[]
    } = {}
    if (this.orderByColumn) {
      options.orderBy = this.orderByColumn
      options.orderDirection = this.orderDirection
    }

    const result = await dbService.paginate(table, {
      page,
      limit,
      ...options,
      where: _finalWhere,
    })
    const models = new ModelCollection(
      result.data.map((item: any) => (this.modelClass as any).fromData(item)) as T[]
    )

    return {
      data: models,
      pagination: result.pagination,
    }
  }

  /**
   * Build final WHERE conditions (apply global scopes and soft delete).
   */
  private buildWhere(): WhereCondition {
    const modelClass = this.modelClass as unknown as typeof Model
    let finalWhere = { ...this.whereConditions }

    // Apply global scopes.
    const globalScopes = (modelClass as any).globalScopes || []
    for (const scope of globalScopes) {
      finalWhere = scope(finalWhere)
    }

    // Apply soft delete filter.
    if ((modelClass as any).usesSoftDeletes) {
      const deletedAtColumn = (modelClass as any).deletedAtColumn || 'deleted_at'

      if (this.softDeleteMode === 'default') {
        // Exclude deleted (deleted_at IS NULL)
        finalWhere[deletedAtColumn] = null
      } else if (this.softDeleteMode === 'onlyTrashed') {
        // Only deleted (deleted_at IS NOT NULL)
        finalWhere[deletedAtColumn] = { $ne: null }
      }
      // if 'withTrashed', do nothing (include all)
    }

    return finalWhere
  }
}

/**
 * Model registry (for auto-registering Models).
 */
export class ModelRegistry {
  private static models: Array<{ model: ModelStatic; table: Table; tableName: string }> = []

  /**
   * Register a Model.
   */
  static register(model: ModelStatic, table: Table, tableName: string): void {
    ModelRegistry.models.push({ model, table, tableName })
  }

  /**
   * Initialize all registered Models (set DBService).
   */
  static initialize(dbService: DBService): void {
    for (const { model, table, tableName } of ModelRegistry.models) {
      model.setDBService(dbService)
      model.setTable(table, tableName)
    }
  }

  /**
   * Set core instance for all Models (for emitting events).
   */
  static setCore(core: PlanetCore): void {
    if (!core) {
      return
    }
    for (const { model } of ModelRegistry.models) {
      // Check whether the model has a setCore method.
      if (typeof (model as any).setCore === 'function') {
        ;(model as any).setCore(core)
      }
    }
  }

  /**
   * Clear all registered Models.
   */
  static clear(): void {
    ModelRegistry.models = []
  }
}
