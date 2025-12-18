import type { PlanetCore } from 'gravito-core'
import type { DBService } from './DBService'
import { ModelCollection } from './ModelCollection'
import type { LockOptions, RelationOptions, UpsertOptions } from './types'

// biome-ignore lint/suspicious/noExplicitAny: generic table and where condition
type Table = any
// biome-ignore lint/suspicious/noExplicitAny: generic where condition
type WhereCondition = any

/**
 * 關聯定義類型
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
 * 關聯定義
 */
export interface RelationDefinition {
  type: RelationType
  model?: ModelStatic // morphTo 可能不需要 model
  foreignKey?: string
  localKey?: string
  pivotTable?: string
  pivotForeignKey?: string
  pivotRelatedKey?: string
  // 多態關聯專用欄位
  morphType?: string // 多態類型欄位名稱（如 'commentable_type'）
  morphId?: string // 多態 ID 欄位名稱（如 'commentable_id'）
  morphMap?: Map<string, ModelStatic> // 多態類型映射（如 'Post' -> PostModel）
}

/**
 * 型別轉換定義
 */
export type CastType = 'string' | 'number' | 'boolean' | 'date' | 'json' | 'array'

export interface CastsDefinition {
  [key: string]: CastType | ((value: unknown) => unknown)
}

/**
 * Model 靜態介面（用於型別推斷）
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
  localScopes?: Map<string, (query: any) => any>
  globalScopes?: Array<(query: any) => any>
  core?: PlanetCore
  setDBService(dbService: DBService): void
  setCore(core: PlanetCore): void
  setTable(table: Table, tableName: string): void
  getTable(): Table
  getDBService(): DBService
  getPrimaryKey(): string
  getRelationName(model: ModelStatic): string
  fromData(data: any): T
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
 * Model 基類（參考 Laravel Eloquent，但底層使用 Drizzle 保持效能）
 *
 * 使用範例：
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
 * // 使用
 * const user = await User.find(1);
 * const user = await User.where('email', 'john@example.com');
 * const users = await User.all();
 * ```
 */
export abstract class Model<TAttributes = Record<string, unknown>> {
  // 靜態屬性，需要在子類中設定
  protected static table?: Table
  protected static tableName?: string
  protected static primaryKey = 'id'
  protected static dbService?: DBService
  // biome-ignore lint/suspicious/noExplicitAny: relations storage
  protected static relations: Map<string, RelationDefinition> = new Map()
  // biome-ignore lint/suspicious/noExplicitAny: casts storage
  protected static casts: CastsDefinition = {}
  protected static fillable: string[] = []
  protected static guarded: string[] = []
  protected static hidden: string[] = []
  protected static visible: string[] = []
  protected static appends: string[] = []
  protected static timestamps = true
  protected static createdAtColumn = 'created_at'
  protected static updatedAtColumn = 'updated_at'
  protected static deletedAtColumn = 'deleted_at'
  protected static usesSoftDeletes = false
  // biome-ignore lint/suspicious/noExplicitAny: scopes storage
  protected static localScopes: Map<string, (query: any) => any> = new Map()
  // biome-ignore lint/suspicious/noExplicitAny: global scopes storage
  protected static globalScopes: Array<(query: any) => any> = []
  protected static core?: PlanetCore // 用於觸發事件

  // 實例屬性
  public attributes: Partial<TAttributes> = {}
  private relationsCache: Map<string, unknown> = new Map()
  private relationsLoaded: Set<string> = new Set()
  private originalAttributes: Partial<TAttributes> = {}
  private exists = false
  public wasRecentlyCreated = false

  /**
   * 設定 DBService（需要在應用啟動時設定）
   */
  static setDBService(dbService: DBService): void {
    ;(Model as unknown as typeof Model).dbService = dbService
  }

  /**
   * 設定表實例
   */
  static setTable(table: Table, tableName: string): void {
    const modelClass = Model as unknown as typeof Model
    modelClass.table = table
    modelClass.tableName = tableName
  }

  /**
   * 獲取表實例
   */
  protected static getTable(): Table {
    const modelClass = Model as unknown as typeof Model
    const table = modelClass.table
    if (!table) {
      throw new Error(`[Model] Table not set for ${Model.name}. Please set static table property.`)
    }
    return table
  }

  /**
   * 獲取 DBService
   */
  protected static getDBService(): DBService {
    const modelClass = Model as unknown as typeof Model
    const dbService = modelClass.dbService
    if (!dbService) {
      throw new Error(
        `[Model] DBService not set for ${Model.name}. Please call Model.setDBService() or ensure db:connected hook is triggered.`
      )
    }
    return dbService
  }

  /**
   * 獲取主鍵名稱
   */
  protected static getPrimaryKey(): string {
    const modelClass = Model as unknown as typeof Model
    return modelClass.primaryKey || 'id'
  }

  /**
   * 根據 ID 查詢（類似 Laravel 的 find）
   */
  static async find<T extends Model>(this: ModelStatic<T>, id: unknown): Promise<T | null> {
    const dbService = Model.getDBService()
    const table = Model.getTable()
    const data = await dbService.findById(table, id)
    if (!data) return null
    // biome-ignore lint/suspicious/noExplicitAny: generic model creation
    return (Model as any).fromData(data) as T
  }

  /**
   * 查詢單筆記錄（類似 Laravel 的 where()->first()）
   */
  static async where<T extends Model>(
    this: ModelStatic<T>,
    column: string,
    value: unknown
  ): Promise<T | null> {
    return (Model as ModelStatic<T>).whereMany({ [column]: value })
  }

  /**
   * 使用多個條件查詢單筆記錄
   */
  static async whereMany<T extends Model>(
    this: ModelStatic<T>,
    where: WhereCondition
  ): Promise<T | null> {
    const modelClass = Model as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()
    const data = await dbService.findOne(table, where)
    if (!data) return null
    // biome-ignore lint/suspicious/noExplicitAny: generic model creation
    return (Model as any).fromData(data) as T
  }

  /**
   * 開始查詢建構器（鏈式查詢）
   */
  static query<T extends Model>(this: ModelStatic<T>): QueryBuilder<T> {
    return new QueryBuilder<T>(Model as unknown as ModelStatic<T>)
  }

  /**
   * 查詢所有記錄（類似 Laravel 的 all()）
   */
  static async all<T extends Model>(
    this: ModelStatic<T>,
    options?: { limit?: number; orderBy?: unknown; orderDirection?: 'asc' | 'desc' }
  ): Promise<ModelCollection<T>> {
    return (Model as ModelStatic<T>).findAll(undefined, options)
  }

  /**
   * 查詢所有記錄（帶條件）
   */
  static async findAll<T extends Model>(
    this: ModelStatic<T>,
    where?: WhereCondition,
    options?: { limit?: number; orderBy?: unknown; orderDirection?: 'asc' | 'desc' }
  ): Promise<ModelCollection<T>> {
    const modelClass = Model as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()

    // 應用全域作用域
    let finalWhere = where || {}
    const globalScopes = modelClass.globalScopes || []
    for (const scope of globalScopes) {
      finalWhere = scope(finalWhere)
    }

    // 應用軟刪除過濾
    if (modelClass.usesSoftDeletes) {
      const deletedAtColumn = modelClass.deletedAtColumn || 'deleted_at'
      finalWhere = { ...finalWhere, [deletedAtColumn]: null }
    }

    const data = await dbService.findAll(table, finalWhere, options)
    // biome-ignore lint/suspicious/noExplicitAny: generic model creation
    const models = data.map((item: any) => (Model as any).fromData(item))
    return new ModelCollection(models)
  }

  /**
   * 計數
   */
  static async count<T extends Model>(
    this: ModelStatic<T>,
    where?: WhereCondition
  ): Promise<number> {
    const modelClass = Model as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()
    return dbService.count(table, where)
  }

  /**
   * 檢查是否存在
   */
  static async exists<T extends Model>(
    this: ModelStatic<T>,
    where: WhereCondition
  ): Promise<boolean> {
    const modelClass = Model as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()
    return dbService.exists(table, where)
  }

  /**
   * 分頁查詢
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
    const modelClass = Model as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()
    const result = await dbService.paginate(table, options)
    return {
      // biome-ignore lint/suspicious/noExplicitAny: generic model creation
      data: result.data.map((item: any) => (Model as any).fromData(item)),
      pagination: result.pagination,
    }
  }

  /**
   * 創建記錄（類似 Laravel 的 create）
   */
  static async create<T extends Model>(this: ModelStatic<T>, data: any): Promise<T> {
    const modelClass = Model as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()

    // 應用填充保護
    const fillable = modelClass.fillable || []
    const guarded = modelClass.guarded || []
    let dataToCreate: any = {}

    if (fillable.length > 0) {
      // 只允許 fillable 中的欄位
      for (const key of fillable) {
        if (data[key] !== undefined) {
          dataToCreate[key] = data[key]
        }
      }
    } else if (guarded.length > 0) {
      // 排除 guarded 中的欄位
      for (const key in data) {
        if (!guarded.includes(key)) {
          dataToCreate[key] = data[key]
        }
      }
    } else {
      // 沒有 fillable 或 guarded，允許所有屬性
      dataToCreate = { ...data }
    }

    // 自動時間戳記
    if (modelClass.timestamps) {
      const createdAtColumn = modelClass.createdAtColumn || 'created_at'
      const updatedAtColumn = modelClass.updatedAtColumn || 'updated_at'
      dataToCreate[createdAtColumn] = new Date()
      dataToCreate[updatedAtColumn] = new Date()
    }

    const created = await dbService.create(table, dataToCreate)
    // biome-ignore lint/suspicious/noExplicitAny: generic model creation
    const instance = (Model as any).fromData(created) as T
    ;(instance as any).wasRecentlyCreated = true

    // 觸發 created 事件
    if (modelClass.core) {
      await modelClass.core.hooks.doAction('model:created', { model: instance })
      await modelClass.core.hooks.doAction('model:saved', {
        model: instance,
        wasRecentlyCreated: true,
      })
    }

    return instance
  }

  /**
   * Upsert（插入或更新）
   */
  static async upsert<T extends Model>(
    this: ModelStatic<T>,
    data: any,
    options?: UpsertOptions
  ): Promise<T> {
    const modelClass = Model as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()

    // 應用填充保護
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
    return (Model as any).fromData(result) as T
  }

  /**
   * 查找或創建
   */
  static async firstOrCreate<T extends Model>(
    this: ModelStatic<T>,
    where: WhereCondition,
    data: any
  ): Promise<T> {
    const modelClass = Model as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()

    const result = await dbService.firstOrCreate(table, where, data)
    // biome-ignore lint/suspicious/noExplicitAny: generic model creation
    return (Model as any).fromData(result) as T
  }

  /**
   * 查找或新建（不保存）
   */
  static async firstOrNew<T extends Model>(
    this: ModelStatic<T>,
    where: WhereCondition,
    data: any
  ): Promise<T> {
    const modelClass = Model as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()

    const result = await dbService.firstOrNew(table, where, data)
    // biome-ignore lint/suspicious/noExplicitAny: generic model creation
    return (Model as any).fromData(result) as T
  }

  /**
   * 更新或創建
   */
  static async updateOrCreate<T extends Model>(
    this: ModelStatic<T>,
    where: WhereCondition,
    data: any
  ): Promise<T> {
    const modelClass = Model as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()

    const result = await dbService.updateOrCreate(table, where, data)
    // biome-ignore lint/suspicious/noExplicitAny: generic model creation
    return (Model as any).fromData(result) as T
  }

  /**
   * 聚合函數：求和
   */
  static async sum<T extends Model>(
    this: ModelStatic<T>,
    column: string,
    where?: WhereCondition
  ): Promise<number> {
    const modelClass = Model as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()
    return dbService.sum(table, column, where)
  }

  /**
   * 聚合函數：平均值
   */
  static async avg<T extends Model>(
    this: ModelStatic<T>,
    column: string,
    where?: WhereCondition
  ): Promise<number> {
    const modelClass = Model as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()
    return dbService.avg(table, column, where)
  }

  /**
   * 聚合函數：最小值
   */
  static async min<T extends Model>(
    this: ModelStatic<T>,
    column: string,
    where?: WhereCondition
  ): Promise<unknown> {
    const modelClass = Model as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()
    return dbService.min(table, column, where)
  }

  /**
   * 聚合函數：最大值
   */
  static async max<T extends Model>(
    this: ModelStatic<T>,
    column: string,
    where?: WhereCondition
  ): Promise<unknown> {
    const modelClass = Model as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()
    return dbService.max(table, column, where)
  }

  /**
   * 從資料建立 Model 實例
   */
  protected static fromData(this: ModelStatic, data: any): Model {
    const modelClass = Model as unknown as typeof Model
    const instance = new (Model as any)()
    // 應用型別轉換
    const casts = modelClass.casts || {}
    const processedData: any = {}

    for (const [key, value] of Object.entries(data)) {
      if (casts[key]) {
        processedData[key] = Model.castAttribute(key, value, casts[key])
      } else {
        processedData[key] = value
      }
    }

    instance.attributes = processedData
    instance.originalAttributes = { ...processedData }
    instance.exists = true
    return instance
  }

  /**
   * 型別轉換
   */
  static castAttribute(
    key: string,
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
   * 獲取屬性值（支援存取器和型別轉換）
   */
  get<K extends keyof TAttributes>(key: K): TAttributes[K] | undefined {
    // 檢查是否有存取器
    const accessor = `get${String(key).charAt(0).toUpperCase() + String(key).slice(1)}Attribute`
    if (typeof (this as any)[accessor] === 'function') {
      return (this as any)[accessor](this.attributes[key])
    }

    // 檢查是否有型別轉換
    const casts = (this.constructor as typeof Model).casts
    const value = this.attributes[key]
    if (casts[String(key)] && value !== undefined && value !== null) {
      return (this.constructor as typeof Model).castAttribute(
        String(key),
        value,
        casts[String(key)]
      ) as TAttributes[K]
    }

    return value
  }

  /**
   * 獲取關聯屬性（使用 await user.relation('posts') 或 await user.posts）
   */
  // biome-ignore lint/suspicious/noExplicitAny: dynamic relation access
  get relation(): (name: string) => Promise<any> {
    return (name: string) => this.getRelation(name)
  }

  /**
   * 設定屬性值（支援修改器）
   */
  set<K extends keyof TAttributes>(key: K, value: TAttributes[K]): this {
    // 檢查是否有修改器
    const mutator = `set${String(key).charAt(0).toUpperCase() + String(key).slice(1)}Attribute`
    if (typeof (this as any)[mutator] === 'function') {
      this.attributes[key] = (this as any)[mutator](value)
    } else {
      this.attributes[key] = value
    }
    return this
  }

  /**
   * 獲取主鍵值
   */
  getKey(): unknown {
    const pk = (this.constructor as typeof Model).getPrimaryKey()
    return this.attributes[pk as keyof TAttributes]
  }

  /**
   * 儲存（更新或創建）
   */
  async save(): Promise<this> {
    const modelClass = this.constructor as unknown as typeof Model
    const dbService = modelClass.getDBService()
    const table = modelClass.getTable()
    const pk = modelClass.getPrimaryKey()
    const id = this.getKey()
    const isCreating = !id

    // 觸發 saving 事件
    if (modelClass.core) {
      await modelClass.core.hooks.doAction(isCreating ? 'model:creating' : 'model:updating', {
        model: this,
        attributes: this.attributes,
      })
    }

    // 應用填充保護
    const fillable = modelClass.fillable || []
    const guarded = modelClass.guarded || []
    let dataToSave: any = {}

    if (fillable.length > 0) {
      // 只允許 fillable 中的欄位
      for (const key of fillable) {
        if (this.attributes[key as keyof TAttributes] !== undefined) {
          dataToSave[key] = this.attributes[key as keyof TAttributes]
        }
      }
    } else if (guarded.length > 0) {
      // 排除 guarded 中的欄位
      for (const key in this.attributes) {
        if (!guarded.includes(key)) {
          dataToSave[key] = this.attributes[key as keyof TAttributes]
        }
      }
    } else {
      // 沒有 fillable 或 guarded，允許所有屬性
      dataToSave = { ...this.attributes }
    }

    // 自動時間戳記
    if (modelClass.timestamps) {
      const createdAtColumn = modelClass.createdAtColumn || 'created_at'
      const updatedAtColumn = modelClass.updatedAtColumn || 'updated_at'

      if (!id) {
        // 創建時設定 created_at 和 updated_at
        dataToSave[createdAtColumn] = new Date()
        dataToSave[updatedAtColumn] = new Date()
      } else {
        // 更新時只設定 updated_at
        dataToSave[updatedAtColumn] = new Date()
      }
    }

    if (id) {
      // 更新
      await dbService.update(table, { [pk]: id }, dataToSave)
      // 重新查詢以獲取最新資料
      const updated = await dbService.findById(table, id)
      if (updated) {
        this.attributes = updated as Partial<TAttributes>
        this.originalAttributes = { ...(updated as Partial<TAttributes>) }
      }

      // 觸發 updated 事件
      if (modelClass.core) {
        await modelClass.core.hooks.doAction('model:updated', { model: this })
      }
    } else {
      // 創建
      const created = await dbService.create(table, dataToSave)
      this.attributes = created as Partial<TAttributes>
      this.originalAttributes = { ...(created as Partial<TAttributes>) }
      this.exists = true
      ;(this as any).wasRecentlyCreated = true

      // 觸發 created 事件
      if (modelClass.core) {
        await modelClass.core.hooks.doAction('model:created', { model: this })
      }
    }

    // 觸發 saved 事件
    if (modelClass.core) {
      await modelClass.core.hooks.doAction('model:saved', {
        model: this,
        wasRecentlyCreated: (this as any).wasRecentlyCreated,
      })
    }

    return this
  }

  /**
   * 更新記錄
   */
  async update(data: Partial<TAttributes>): Promise<this> {
    Object.assign(this.attributes, data)
    return this.save()
  }

  /**
   * 增加數值欄位（原子操作）
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

    // 重新查詢以獲取最新資料
    const updated = await dbService.findById(table, id)
    if (updated) {
      this.attributes = updated as Partial<TAttributes>
      this.originalAttributes = { ...(updated as Partial<TAttributes>) }
    }

    return this
  }

  /**
   * 減少數值欄位（原子操作）
   */
  async decrement(column: string, amount = 1): Promise<this> {
    return this.increment(column, -amount)
  }

  /**
   * 刪除（支援軟刪除）
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

    // 觸發 deleting 事件
    if (modelClass.core) {
      await modelClass.core.hooks.doAction('model:deleting', { model: this })
    }

    // 如果啟用軟刪除，則更新 deleted_at
    if (modelClass.usesSoftDeletes) {
      const deletedAtColumn = modelClass.deletedAtColumn || 'deleted_at'
      await dbService.update(table, { [pk]: id }, { [deletedAtColumn]: new Date() } as any)
      // 更新本地屬性
      ;(this.attributes as any)[deletedAtColumn] = new Date()

      // 觸發 deleted 事件（軟刪除）
      if (modelClass.core) {
        await modelClass.core.hooks.doAction('model:deleted', { model: this, soft: true })
      }

      return true
    }

    // 硬刪除
    await dbService.delete(table, { [pk]: id })

    // 觸發 deleted 事件（硬刪除）
    if (modelClass.core) {
      await modelClass.core.hooks.doAction('model:deleted', { model: this, soft: false })
    }

    return true
  }

  /**
   * 強制刪除（即使啟用軟刪除也真正刪除）
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
   * 恢復軟刪除的記錄
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
    // 更新本地屬性
    ;(this.attributes as any)[deletedAtColumn] = null
    return true
  }

  /**
   * 檢查是否被軟刪除
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
   * 獲取關聯（懶加載）
   */
  async getRelation(relationName: string): Promise<unknown> {
    // 檢查快取
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

    // 處理多態關聯
    if (relation.type === 'morphTo') {
      // morphTo: 根據 morph_type 和 morph_id 查詢對應的模型
      const morphType = relation.morphType || `${relationName}_type`
      const morphId = relation.morphId || `${relationName}_id`
      const typeValue = (this.attributes as any)[morphType]
      const idValue = (this.attributes as any)[morphId]

      if (!typeValue || !idValue) {
        return null
      }

      // 使用 morphMap 來查找對應的模型類別
      const morphMap = relation.morphMap || new Map()
      const relatedModel = morphMap.get(typeValue)

      if (!relatedModel) {
        // 如果沒有 morphMap，嘗試直接使用類型名稱
        // 這裡簡化實作，實際使用時應該通過 morphMap 配置
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
      // morphMany/morphOne: 根據當前模型的類型和 ID 查詢關聯模型
      const morphType = relation.morphType || `${relationName}_type`
      const morphId = relation.morphId || `${relationName}_id`
      const relatedModel = relation.model

      if (!relatedModel) {
        throw new Error(`[Model] Related model not defined for relation "${relationName}"`)
      }

      const relatedTable = (relatedModel as unknown as typeof Model).getTable()
      const relatedTableName = (relatedModel as unknown as typeof Model).tableName
      const currentModelName = modelClass.name

      const where: any = {
        [morphId]: id,
        [morphType]: currentModelName,
      }

      if (relation.type === 'morphOne') {
        const data = await dbService.findOne(relatedTable, where)
        if (data) {
          const instance = (relatedModel as any).fromData(data)
          this.relationsCache.set(relationName, instance)
          this.relationsLoaded.add(relationName)
          return instance
        }
        return null
      } else {
        // morphMany
        const data = await dbService.findAll(relatedTable, where)
        const instances = data.map((item: any) => (relatedModel as any).fromData(item))
        const collection = new ModelCollection(instances)
        this.relationsCache.set(relationName, collection)
        this.relationsLoaded.add(relationName)
        return collection
      }
    } else {
      // 普通關聯：使用 DBService 的關聯查詢
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
   * 載入關聯（預加載）
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
   * 定義 hasMany 關聯
   */
  static hasMany<TRelated extends Model>(
    this: ModelStatic,
    related: ModelStatic<TRelated>,
    foreignKey?: string,
    localKey?: string
  ): void {
    const modelClass = Model as unknown as typeof Model
    const relationName = modelClass.getRelationName(related)
    const relations = modelClass.relations || new Map()
    relations.set(relationName, {
      type: 'hasMany',
      model: related,
      foreignKey: foreignKey || `${modelClass.tableName}_id`,
      localKey: localKey || modelClass.getPrimaryKey(),
    })
    modelClass.relations = relations
  }

  /**
   * 定義 belongsTo 關聯
   */
  static belongsTo<TRelated extends Model>(
    this: ModelStatic,
    related: ModelStatic<TRelated>,
    foreignKey?: string,
    ownerKey?: string
  ): void {
    const modelClass = Model as unknown as typeof Model
    const relatedClass = related as unknown as typeof Model
    const relationName = modelClass.getRelationName(related)
    const relations = modelClass.relations || new Map()
    relations.set(relationName, {
      type: 'belongsTo',
      model: related,
      foreignKey: foreignKey || `${relationName}_id`,
      localKey: ownerKey || relatedClass.getPrimaryKey(),
    })
    modelClass.relations = relations
  }

  /**
   * 定義 hasOne 關聯
   */
  static hasOne<TRelated extends Model>(
    this: ModelStatic,
    related: ModelStatic<TRelated>,
    foreignKey?: string,
    localKey?: string
  ): void {
    const modelClass = Model as unknown as typeof Model
    const relationName = modelClass.getRelationName(related)
    const relations = modelClass.relations || new Map()
    relations.set(relationName, {
      type: 'hasOne',
      model: related,
      foreignKey: foreignKey || `${modelClass.tableName}_id`,
      localKey: localKey || modelClass.getPrimaryKey(),
    })
    modelClass.relations = relations
  }

  /**
   * 定義 belongsToMany 關聯（多對多）
   */
  static belongsToMany<TRelated extends Model>(
    this: ModelStatic,
    related: ModelStatic<TRelated>,
    pivotTable: string,
    foreignKey?: string,
    relatedKey?: string
  ): void {
    const modelClass = Model as unknown as typeof Model
    const relationName = modelClass.getRelationName(related)
    const relations = modelClass.relations || new Map()
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
   * 定義 morphTo 關聯（多態多對一）
   * 例如：Comment belongs to Post or Video
   *
   * @param relationName 關聯名稱（預設為 'commentable'）
   * @param morphType 多態類型欄位名稱（預設為 '{relationName}_type'）
   * @param morphId 多態 ID 欄位名稱（預設為 '{relationName}_id'）
   * @param morphMap 多態類型映射（可選，用於將類型名稱映射到模型類別）
   */
  static morphTo(
    this: ModelStatic,
    relationName?: string,
    morphType?: string,
    morphId?: string,
    morphMap?: Map<string, ModelStatic>
  ): void {
    const modelClass = Model as unknown as typeof Model
    const name = relationName || 'commentable' // 預設名稱
    const typeColumn = morphType || `${name}_type`
    const idColumn = morphId || `${name}_id`
    const relations = modelClass.relations || new Map()
    relations.set(name, {
      type: 'morphTo',
      morphType: typeColumn,
      morphId: idColumn,
      morphMap: morphMap || new Map(),
    })
    modelClass.relations = relations
  }

  /**
   * 定義 morphMany 關聯（一對多多態）
   * 例如：Post has many Comments
   *
   * @param related 關聯的模型類別
   * @param relationName 關聯名稱
   * @param morphType 多態類型欄位名稱（預設為 '{relationName}_type'）
   * @param morphId 多態 ID 欄位名稱（預設為 '{relationName}_id'）
   */
  static morphMany<TRelated extends Model>(
    this: ModelStatic,
    related: ModelStatic<TRelated>,
    relationName: string,
    morphType?: string,
    morphId?: string
  ): void {
    const modelClass = Model as unknown as typeof Model
    const typeColumn = morphType || `${relationName}_type`
    const idColumn = morphId || `${relationName}_id`
    const relations = modelClass.relations || new Map()
    relations.set(relationName, {
      type: 'morphMany',
      model: related,
      morphType: typeColumn,
      morphId: idColumn,
    })
    modelClass.relations = relations
  }

  /**
   * 定義 morphOne 關聯（一對一多態）
   * 例如：Post has one Image
   *
   * @param related 關聯的模型類別
   * @param relationName 關聯名稱
   * @param morphType 多態類型欄位名稱（預設為 '{relationName}_type'）
   * @param morphId 多態 ID 欄位名稱（預設為 '{relationName}_id'）
   */
  static morphOne<TRelated extends Model>(
    this: ModelStatic,
    related: ModelStatic<TRelated>,
    relationName: string,
    morphType?: string,
    morphId?: string
  ): void {
    const modelClass = Model as unknown as typeof Model
    const typeColumn = morphType || `${relationName}_type`
    const idColumn = morphId || `${relationName}_id`
    const relations = modelClass.relations || new Map()
    relations.set(relationName, {
      type: 'morphOne',
      model: related,
      morphType: typeColumn,
      morphId: idColumn,
    })
    modelClass.relations = relations
  }

  /**
   * 獲取關聯名稱（從 Model 類別名稱推斷）
   */
  protected static getRelationName(model: ModelStatic): string {
    const name = model.name
    // 將 User -> user, Post -> post
    // 如果是複數形式，保持複數（如 Posts -> posts）
    const lower = name.charAt(0).toLowerCase() + name.slice(1)
    // 簡單的複數處理：如果以 's' 結尾，保持；否則添加 's'
    return lower.endsWith('s') ? lower : `${lower}s`
  }

  /**
   * 設定型別轉換
   */
  static setCasts(casts: CastsDefinition): void {
    const modelClass = Model as unknown as typeof Model
    modelClass.casts = { ...(modelClass.casts || {}), ...casts }
  }

  /**
   * 轉換為 JSON（包含已載入的關聯和追加屬性）
   */
  toJSON(): Record<string, unknown> {
    const modelClass = this.constructor as unknown as typeof Model
    const json: Record<string, unknown> = { ...this.attributes } as Record<string, unknown>

    // 包含已載入的關聯
    for (const [key, value] of this.relationsCache.entries()) {
      json[key] = value
    }

    // 應用追加屬性（Appends）
    const appends = modelClass.appends || []
    for (const key of appends) {
      // 檢查是否有存取器
      const accessor = `get${key.charAt(0).toUpperCase() + key.slice(1)}Attribute`
      if (typeof (this as any)[accessor] === 'function') {
        json[key] = (this as any)[accessor](this.attributes[key as keyof TAttributes])
      } else {
        // 嘗試作為關聯
        if (this.relationsLoaded.has(key)) {
          json[key] = this.relationsCache.get(key)
        }
      }
    }

    // 應用隱藏/可見屬性
    const hidden = modelClass.hidden || []
    const visible = modelClass.visible || []

    if (visible.length > 0) {
      // 只顯示可見屬性
      const filtered: Record<string, unknown> = {}
      for (const key of visible) {
        if (json[key] !== undefined) {
          filtered[key] = json[key]
        }
      }
      return filtered
    }

    // 隱藏指定屬性
    for (const key of hidden) {
      delete json[key]
    }

    return json
  }
}

/**
 * 查詢建構器（支援鏈式調用）
 */
export class QueryBuilder<T extends Model> {
  private whereConditions: WhereCondition = {}
  private orderByColumn?: unknown
  private orderDirection: 'asc' | 'desc' = 'asc'
  private limitValue?: number
  private offsetValue?: number
  private groupByColumns: unknown[] = []

  constructor(private modelClass: ModelStatic<T>) {}

  /**
   * 添加 WHERE 條件
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
   * 添加 WHERE IN 條件
   */
  whereIn(column: string, values: unknown[]): this {
    this.whereConditions[column] = { $in: values }
    return this
  }

  /**
   * 添加 WHERE NOT IN 條件
   */
  whereNotIn(column: string, values: unknown[]): this {
    this.whereConditions[column] = { $nin: values }
    return this
  }

  /**
   * 添加 WHERE NULL 條件
   */
  whereNull(column: string): this {
    this.whereConditions[column] = null
    return this
  }

  /**
   * 添加 WHERE NOT NULL 條件
   */
  whereNotNull(column: string): this {
    this.whereConditions[column] = { $ne: null }
    return this
  }

  /**
   * 添加 WHERE BETWEEN 條件
   */
  whereBetween(column: string, min: unknown, max: unknown): this {
    this.whereConditions[column] = { $gte: min, $lte: max }
    return this
  }

  /**
   * 添加 WHERE LIKE 條件
   */
  whereLike(column: string, pattern: string): this {
    this.whereConditions[column] = { $like: pattern }
    return this
  }

  /**
   * 排序
   */
  orderBy(column: unknown, direction: 'asc' | 'desc' = 'asc'): this {
    this.orderByColumn = column
    this.orderDirection = direction
    return this
  }

  /**
   * 降序排序
   */
  orderByDesc(column: unknown): this {
    return this.orderBy(column, 'desc')
  }

  /**
   * 限制結果數量
   */
  limit(count: number): this {
    this.limitValue = count
    return this
  }

  /**
   * 跳過記錄數
   */
  offset(count: number): this {
    this.offsetValue = count
    return this
  }

  /**
   * 分組
   */
  groupBy(...columns: unknown[]): this {
    this.groupByColumns = columns
    return this
  }

  /**
   * Join（內連接）
   */
  join(table: Table, on: WhereCondition): this {
    // 注意：實際的 join 實作需要根據 Drizzle 的 API 調整
    // 這裡只是標記 join 條件，實際執行在 get() 或 first() 時
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
   * Left Join（左連接）
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
   * Right Join（右連接）
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
   * Inner Join（內連接，與 join 相同）
   */
  innerJoin(table: Table, on: WhereCondition): this {
    return this.join(table, on)
  }

  /**
   * 鎖定記錄（FOR UPDATE）
   */
  lockForUpdate(options?: LockOptions): this {
    // biome-ignore lint/suspicious/noExplicitAny: lock storage
    ;(this as any).lockType = 'update'
    // biome-ignore lint/suspicious/noExplicitAny: lock storage
    ;(this as any).lockOptions = options
    return this
  }

  /**
   * 共享鎖（FOR SHARE）
   */
  sharedLock(options?: LockOptions): this {
    // biome-ignore lint/suspicious/noExplicitAny: lock storage
    ;(this as any).lockType = 'share'
    // biome-ignore lint/suspicious/noExplicitAny: lock storage
    ;(this as any).lockOptions = options
    return this
  }

  /**
   * 獲取第一筆記錄
   */
  async first(): Promise<T | null> {
    const modelClass = this.modelClass as unknown as typeof Model
    const dbService = (modelClass as any).getDBService()
    const table = (modelClass as any).getTable()

    // 應用全域作用域和軟刪除
    const finalWhere = this.buildWhere()

    const data = await dbService.findOne(table, finalWhere)
    if (!data) return null
    return (this.modelClass as any).fromData(data) as T
  }

  /**
   * 獲取所有記錄
   */
  async get(): Promise<ModelCollection<T>> {
    const modelClass = this.modelClass as unknown as typeof Model
    const dbService = (modelClass as any).getDBService()
    const table = (modelClass as any).getTable()

    // 應用全域作用域和軟刪除
    const finalWhere = this.buildWhere()

    const options: { limit?: number; orderBy?: unknown; orderDirection?: 'asc' | 'desc' } = {}
    if (this.orderByColumn) {
      options.orderBy = this.orderByColumn
      options.orderDirection = this.orderDirection
    }
    if (this.limitValue) {
      options.limit = this.limitValue
    }

    const data = await dbService.findAll(table, finalWhere, options)
    const models = data.map((item: any) => (this.modelClass as any).fromData(item)) as T[]
    return new ModelCollection(models)
  }

  /**
   * 計數
   */
  async count(): Promise<number> {
    const modelClass = this.modelClass as unknown as typeof Model
    const dbService = (modelClass as any).getDBService()
    const table = (modelClass as any).getTable()

    const finalWhere = this.buildWhere()
    return dbService.count(table, finalWhere)
  }

  /**
   * 檢查是否存在
   */
  async exists(): Promise<boolean> {
    const modelClass = this.modelClass as unknown as typeof Model
    const dbService = (modelClass as any).getDBService()
    const table = (modelClass as any).getTable()

    const finalWhere = this.buildWhere()
    return dbService.exists(table, finalWhere)
  }

  /**
   * 聚合函數：求和
   */
  async sum(column: string): Promise<number> {
    const modelClass = this.modelClass as unknown as typeof Model
    const dbService = (modelClass as any).getDBService()
    const table = (modelClass as any).getTable()

    const finalWhere = this.buildWhere()
    return dbService.sum(table, column, finalWhere)
  }

  /**
   * 聚合函數：平均值
   */
  async avg(column: string): Promise<number> {
    const modelClass = this.modelClass as unknown as typeof Model
    const dbService = (modelClass as any).getDBService()
    const table = (modelClass as any).getTable()

    const finalWhere = this.buildWhere()
    return dbService.avg(table, column, finalWhere)
  }

  /**
   * 聚合函數：最小值
   */
  async min(column: string): Promise<unknown> {
    const modelClass = this.modelClass as unknown as typeof Model
    const dbService = (modelClass as any).getDBService()
    const table = (modelClass as any).getTable()

    const finalWhere = this.buildWhere()
    return dbService.min(table, column, finalWhere)
  }

  /**
   * 聚合函數：最大值
   */
  async max(column: string): Promise<unknown> {
    const modelClass = this.modelClass as unknown as typeof Model
    const dbService = (modelClass as any).getDBService()
    const table = (modelClass as any).getTable()

    const finalWhere = this.buildWhere()
    return dbService.max(table, column, finalWhere)
  }

  /**
   * 分頁
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

    const finalWhere = this.buildWhere()

    const options: { orderBy?: unknown; orderDirection?: 'asc' | 'desc' } = {}
    if (this.orderByColumn) {
      options.orderBy = this.orderByColumn
      options.orderDirection = this.orderDirection
    }

    const result = await dbService.paginate(table, { page, limit, ...options })
    const models = new ModelCollection(
      result.data.map((item: any) => (this.modelClass as any).fromData(item)) as T[]
    )

    return {
      data: models,
      pagination: result.pagination,
    }
  }

  /**
   * 構建最終的 WHERE 條件（應用全域作用域和軟刪除）
   */
  private buildWhere(): WhereCondition {
    const modelClass = this.modelClass as unknown as typeof Model
    let finalWhere = { ...this.whereConditions }

    // 應用全域作用域
    const globalScopes = (modelClass as any).globalScopes || []
    for (const scope of globalScopes) {
      finalWhere = scope(finalWhere)
    }

    // 應用軟刪除過濾
    if ((modelClass as any).usesSoftDeletes) {
      const deletedAtColumn = (modelClass as any).deletedAtColumn || 'deleted_at'
      finalWhere[deletedAtColumn] = null
    }

    return finalWhere
  }
}

/**
 * Model 註冊器（用於自動註冊所有 Model）
 */
export class ModelRegistry {
  private static models: Array<{ model: ModelStatic; table: Table; tableName: string }> = []

  /**
   * 註冊 Model
   */
  static register(model: ModelStatic, table: Table, tableName: string): void {
    ModelRegistry.models.push({ model, table, tableName })
  }

  /**
   * 初始化所有已註冊的 Model（設定 DBService）
   */
  static initialize(dbService: DBService): void {
    for (const { model, table, tableName } of ModelRegistry.models) {
      model.setDBService(dbService)
      model.setTable(table, tableName)
    }
  }

  /**
   * 設定所有 Model 的 core 實例（用於觸發事件）
   */
  static setCore(core: PlanetCore): void {
    if (!core) return
    for (const { model } of ModelRegistry.models) {
      // 檢查 model 是否有 setCore 方法
      if (typeof (model as any).setCore === 'function') {
        ;(model as any).setCore(core)
      }
    }
  }

  /**
   * 清除所有註冊的 Model
   */
  static clear(): void {
    ModelRegistry.models = []
  }
}
