/**
 * @gravito/atlas - 查詢建構器類型
 * @description WHERE 子句、JOIN、ORDER BY、查詢合約及結果類型
 */

import type { BooleanOperator, JoinType, Operator, OrderDirection } from './common'

// ============================================================================
// 查詢子句結構
// ============================================================================

/**
 * WHERE 子句結構
 */
export interface WhereClause {
  /**
   * WHERE 子句類型
   */
  type: 'basic' | 'nested' | 'in' | 'null' | 'between' | 'raw' | 'exists' | 'column'

  /**
   * 欄位名稱
   */
  column?: string

  /**
   * 比較運算子
   */
  operator?: Operator

  /**
   * 基本比較的值
   */
  value?: unknown

  /**
   * IN 或 BETWEEN 子句的值陣列
   */
  values?: unknown[]

  /**
   * 布林運算子（AND/OR）
   */
  boolean: BooleanOperator

  /**
   * 是否否定子句（NOT）
   */
  not?: boolean

  /**
   * 子查詢的巢狀查詢建構器
   */
  query?: QueryBuilderContract

  /**
   * 原始子句的 SQL
   */
  sql?: string

  /**
   * 原始子句的綁定參數
   */
  bindings?: unknown[]
}

/**
 * ORDER BY 子句結構
 */
export interface OrderClause {
  /**
   * 欄位名稱
   */
  column: string

  /**
   * 排序方向
   */
  direction: OrderDirection
}

/**
 * JOIN 子句結構
 */
export interface JoinClause {
  /**
   * JOIN 類型
   */
  type: JoinType

  /**
   * 要 JOIN 的資料表
   */
  table: string

  /**
   * JOIN 條件的第一個欄位
   */
  first: string

  /**
   * JOIN 條件的運算子
   */
  operator: string

  /**
   * JOIN 條件的第二個欄位
   */
  second: string
}

/**
 * HAVING 子句結構
 */
export interface HavingClause {
  /**
   * HAVING 子句類型
   */
  type: 'basic' | 'raw'

  /**
   * 欄位名稱
   */
  column?: string

  /**
   * 比較運算子
   */
  operator?: Operator

  /**
   * 比較值
   */
  value?: unknown

  /**
   * 布林運算子（AND/OR）
   */
  boolean: BooleanOperator

  /**
   * 原始子句的 SQL
   */
  sql?: string

  /**
   * 原始子句的綁定參數
   */
  bindings?: unknown[]
}

// ============================================================================
// 編譯查詢結構（Grammar 使用）
// ============================================================================

/**
 * 編譯後的查詢結構（由 Grammar 使用）
 */
export interface CompiledQuery {
  table: string
  columns: string[]
  distinct: boolean
  wheres: WhereClause[]
  orders: OrderClause[]
  groups: string[]
  havings: HavingClause[]
  joins: JoinClause[]
  unions: { query: CompiledQuery; all: boolean }[]
  limit?: number | undefined
  offset?: number | undefined
  bindings: unknown[]
  bindingCounts?: {
    select: number
    where: number
    join: number
    having: number
    order: number
  }
}

// ============================================================================
// 結果類型
// ============================================================================

/**
 * 查詢執行結果
 */
export interface QueryResult<T = Record<string, unknown>> {
  /**
   * 結果列
   */
  rows: T[]

  /**
   * 回傳的列數
   */
  rowCount: number

  /**
   * 最後插入的 ID（如果可用）
   */
  insertId?: number | bigint | string | undefined

  /**
   * 欄位中繼資料
   */
  fields?: FieldInfo[]
}

/**
 * 查詢結果的欄位資訊
 */
export interface FieldInfo {
  /**
   * 欄位名稱
   */
  name: string

  /**
   * 資料類型名稱
   */
  dataType?: string | undefined

  /**
   * 資料表 ID（如果可用）
   */
  tableId?: number | undefined
}

/**
 * 執行結果（INSERT/UPDATE/DELETE）
 */
export interface ExecuteResult {
  /**
   * 受影響的列數
   */
  affectedRows: number

  /**
   * 最後插入的 ID（用於 INSERT）
   */
  insertId?: number | bigint | string | undefined

  /**
   * 變更的列數（用於 UPDATE）
   */
  changedRows?: number | undefined
}

/**
 * 批次插入結果（多值 INSERT）
 */
export interface BatchInsertResult {
  /**
   * 所有分塊中受影響的總列數
   */
  totalAffectedRows: number

  /**
   * 第一筆插入列的 ID
   */
  firstInsertId?: number | bigint | undefined

  /**
   * 最後插入列的 ID
   */
  lastInsertId?: number | bigint | undefined

  /**
   * 處理的分塊數量
   */
  chunkCount: number

  /**
   * 各分塊的結果
   */
  chunks: Array<{ affectedRows: number; insertId?: number | bigint | undefined }>
}

/**
 * 批次執行結果（多個語句）
 */
export interface BatchExecuteResult {
  /**
   * 所有語句中受影響的總列數
   */
  totalAffectedRows: number

  /**
   * 各語句的結果
   */
  results: ExecuteResult[]
}

/**
 * 分頁結果
 */
export interface PaginateResult<T> {
  /**
   * 分頁資料
   */
  data: T[]

  /**
   * 分頁中繼資料
   */
  pagination: {
    /**
     * 當前頁碼
     */
    page: number

    /**
     * 每頁項目數
     */
    perPage: number

    /**
     * 總項目數
     */
    total: number

    /**
     * 總頁數
     */
    totalPages: number

    /**
     * 是否有下一頁
     */
    hasNext: boolean

    /**
     * 是否有上一頁
     */
    hasPrev: boolean
  }
}

/**
 * 游標分頁結果
 * 無論資料集大小都提供 O(1) 效能。
 * 非常適合無限滾動和大型資料集。
 */
export interface CursorPaginateResult<T> {
  /**
   * 當前頁面資料
   */
  data: T[]

  /**
   * 指向下一頁的不透明游標（無更多資料時為 null）
   */
  nextCursor: string | null

  /**
   * 指向上一頁的不透明游標（第一頁時為 null）
   */
  prevCursor: string | null

  /**
   * 是否有超出當前頁面的更多記錄
   */
  hasMore: boolean

  /**
   * 回傳的記錄數
   */
  count: number
}

// ============================================================================
// 查詢建構器合約
// ============================================================================

/**
 * Model 基礎類別（前向宣告，避免循環依賴）
 * 實際實作在 src/orm/model/Model.ts
 */
export type Model = import('../orm/model/Model').Model

/**
 * Model 建構子類型（前向宣告）
 */
export type ModelConstructor<T extends Model> = import('../orm/model/Model').ModelConstructor<T>

/**
 * Expression - 用於 QueryBuilder 動態 SQL 組合
 */
export interface Expression {
  /**
   * 取得 SQL 字串
   */
  toString(): string
}

/**
 * 安全查詢建構器合約 - 標籤模板 API
 * 透過參數綁定提供 SQL 注入防護
 */
export interface SafeQueryBuilderContract<T = Record<string, unknown>> {
  /**
   * 綁定連線以執行查詢
   * TConn 泛型參數用於避免循環依賴；實際應傳入 ConnectionContract
   */
  using(conn: unknown): SafeQueryBuilderContract<T>

  /**
   * 執行查詢並回傳完整結果物件
   */
  execute(): Promise<QueryResult<T>>

  /**
   * 執行查詢並回傳所有列
   */
  all(): Promise<T[]>

  /**
   * 執行查詢並回傳第一列
   */
  first(): Promise<T | null>

  /**
   * 轉換為 Expression 以在 QueryBuilder 中使用
   */
  toExpression(): Expression
}

/**
 * 查詢建構器合約
 */
export interface QueryBuilderContract<T = Record<string, unknown>> {
  // 設定
  /**
   * 設定用於水合的 Model
   */
  setModel<M extends Model = Model>(model: ModelConstructor<M>): this

  /**
   * 取得目前的 Model
   */
  getModel<M extends Model = Model>(): ModelConstructor<M> | undefined

  // SELECT
  /**
   * 選擇查詢欄位
   */
  select(...columns: string[]): this

  /**
   * 設定查詢的資料表
   */
  from(table: string): this

  /**
   * 添加原始 SELECT 表達式
   */
  selectRaw(sql: string, bindings?: unknown[]): this

  /**
   * 強制查詢回傳不重複結果
   */
  distinct(): this

  // WHERE
  /**
   * 添加基本 WHERE 子句
   */
  where(column: string, value: unknown | QueryBuilderContract<any>): this
  where(column: string, operator: Operator, value: unknown | QueryBuilderContract<any>): this
  where(callback: (query: QueryBuilderContract<T>) => void): this
  where(conditions: Record<string, unknown | QueryBuilderContract<any>>): this

  /**
   * 添加 "or where" 子句
   */
  orWhere(column: string, value: unknown | QueryBuilderContract<any>): this
  orWhere(column: string, operator: Operator, value: unknown | QueryBuilderContract<any>): this
  orWhere(callback: (query: QueryBuilderContract<T>) => void): this

  /**
   * 添加 "where in" 子句
   */
  whereIn(column: string, values: unknown[] | QueryBuilderContract<any>): this

  /**
   * 添加 "where not in" 子句
   */
  whereNotIn(column: string, values: unknown[] | QueryBuilderContract<any>): this

  /**
   * 添加 "or where in" 子句
   */
  orWhereIn(column: string, values: unknown[] | QueryBuilderContract<any>): this

  /**
   * 添加 "or where not in" 子句
   */
  orWhereNotIn(column: string, values: unknown[] | QueryBuilderContract<any>): this

  /**
   * 添加 "where null" 子句
   */
  whereNull(column: string): this

  /**
   * 添加 "where not null" 子句
   */
  whereNotNull(column: string): this

  /**
   * 添加 "or where null" 子句
   */
  orWhereNull(column: string): this

  /**
   * 添加 "or where not null" 子句
   */
  orWhereNotNull(column: string): this

  /**
   * 添加 "where between" 子句
   */
  whereBetween(column: string, values: [unknown, unknown]): this

  /**
   * 添加 "where not between" 子句
   */
  whereNotBetween(column: string, values: [unknown, unknown]): this

  /**
   * 添加原始 WHERE 子句
   */
  whereRaw(sql: string, bindings?: unknown[]): this

  /**
   * 添加原始 "or where" 子句
   */
  orWhereRaw(sql: string, bindings?: unknown[]): this

  /**
   * 添加 "where column" 子句（比較兩個欄位）
   */
  whereColumn(first: string, operator: Operator, second: string): this

  /**
   * 添加 "where exists" 子句
   */
  whereExists(callback: (query: QueryBuilderContract<unknown>) => void): this

  /**
   * 添加 "where not exists" 子句
   */
  whereNotExists(callback: (query: QueryBuilderContract<unknown>) => void): this

  // JSON
  /**
   * 添加 JSON 欄位的 WHERE 子句
   */
  whereJson(column: string, value: unknown): this

  /**
   * 添加 JSON 欄位的 "or where" 子句
   */
  orWhereJson(column: string, value: unknown): this

  /**
   * 添加 "where json contains" 子句
   */
  whereJsonContains(column: string, value: unknown): this

  /**
   * 添加 JSON 欄位的 "or where json contains" 子句
   */
  orWhereJsonContains(column: string, value: unknown): this

  // UNION
  /**
   * 合併另一個查詢結果
   */
  union(query: QueryBuilderContract<any>, all?: boolean): this

  /**
   * 使用 UNION ALL 合併另一個查詢結果
   */
  unionAll(query: QueryBuilderContract<any>): this

  // JOIN
  /**
   * 添加 INNER JOIN 子句
   */
  join(table: string, first: string, operator: string, second: string): this

  /**
   * 添加 LEFT JOIN 子句
   */
  leftJoin(table: string, first: string, operator: string, second: string): this

  /**
   * 添加 RIGHT JOIN 子句
   */
  rightJoin(table: string, first: string, operator: string, second: string): this

  /**
   * 添加 CROSS JOIN 子句
   */
  crossJoin(table: string): this

  // GROUP BY & HAVING
  /**
   * 添加 GROUP BY 子句
   */
  groupBy(...columns: string[]): this

  /**
   * 添加 HAVING 子句
   */
  having(column: string, operator: Operator, value: unknown): this

  /**
   * 添加原始 HAVING 子句
   */
  havingRaw(sql: string, bindings?: unknown[]): this

  // ORDER BY
  /**
   * 添加 ORDER BY 子句
   */
  orderBy(column: string, direction?: OrderDirection): this

  /**
   * 添加遞減排序子句
   */
  orderByDesc(column: string): this

  /**
   * 添加原始 ORDER BY 子句
   */
  orderByRaw(sql: string, bindings?: unknown[]): this

  /**
   * 按最新記錄排序（預設為 created_at）
   */
  latest(column?: string): this

  /**
   * 按最舊記錄排序（預設為 created_at）
   */
  oldest(column?: string): this

  // LIMIT & OFFSET
  /**
   * 設定查詢的限制數量
   */
  limit(value: number): this

  /**
   * 設定查詢的偏移量
   */
  offset(value: number): this

  /**
   * offset 的別名
   */
  skip(value: number): this

  /**
   * limit 的別名
   */
  take(value: number): this

  // 執行 - 讀取
  /**
   * 執行查詢並取得所有結果
   */
  get(): Promise<T[]>

  /**
   * 串流查詢結果以處理大型資料集
   * 回傳逐一產生記錄的非同步迭代器
   *
   * @example
   * ```typescript
   * for await (const user of User.query().where('active', true).stream()) {
   *   await processUser(user)
   * }
   * ```
   */
  stream(): AsyncIterable<T>

  /**
   * 取得第一筆結果
   */
  first(): Promise<T | null>

  /**
   * 取得第一筆結果，否則拋出錯誤
   */
  firstOrFail(): Promise<T>

  /**
   * 透過主鍵查找記錄
   */
  find(id: unknown, primaryKey?: string): Promise<T | null>

  /**
   * 透過主鍵查找記錄，否則拋出錯誤
   */
  findOrFail(id: unknown, primaryKey?: string): Promise<T>

  /**
   * 從第一筆記錄取得單一欄位值
   */
  value<V = unknown>(column: string): Promise<V | null>

  /**
   * 從單一欄位取得值陣列
   */
  pluck<V = unknown>(column: string): Promise<V[]>

  /**
   * 檢查是否存在符合查詢的記錄
   */
  exists(): Promise<boolean>

  /**
   * 檢查是否不存在符合查詢的記錄
   */
  doesntExist(): Promise<boolean>

  // 執行 - 聚合
  /**
   * 取得記錄計數
   */
  count(column?: string): Promise<number>

  /**
   * 取得欄位的最大值
   */
  max<V = number>(column: string): Promise<V | null>

  /**
   * 取得欄位的最小值
   */
  min<V = number>(column: string): Promise<V | null>

  /**
   * 取得欄位的平均值
   */
  avg(column: string): Promise<number | null>

  /**
   * 取得欄位的總和
   */
  sum(column: string): Promise<number>

  // 執行 - 寫入
  /**
   * 插入新記錄
   */
  insert(data: Partial<T> | Partial<T>[]): Promise<T[]>

  /**
   * 插入記錄並取得其 ID
   */
  insertGetId(data: Partial<T>, primaryKey?: string): Promise<number | bigint>

  /**
   * 更新現有記錄
   */
  update(data: Partial<T>): Promise<number>

  /**
   * 更新 JSON 欄位
   */
  updateJson(column: string, value: unknown): Promise<number>

  /**
   * 刪除記錄
   */
  delete(): Promise<number>

  /**
   * 截斷資料表
   */
  truncate(): Promise<void>

  // 執行 - 遞增/遞減
  /**
   * 遞增欄位值
   */
  increment(column: string, amount?: number, extra?: Partial<T>): Promise<number>

  /**
   * 遞減欄位值
   */
  decrement(column: string, amount?: number, extra?: Partial<T>): Promise<number>

  // 執行 - Upsert
  /**
   * 插入或更新記錄
   */
  upsert(
    data: Partial<T> | Partial<T>[],
    uniqueBy: string | string[],
    update?: string[]
  ): Promise<number>

  // 分頁
  /**
   * 分頁查詢結果
   */
  paginate(perPage?: number, page?: number): Promise<PaginateResult<T>>

  /**
   * 簡單分頁（不含總計數）
   */
  simplePaginate(perPage?: number, page?: number): Promise<PaginateResult<T>>

  // 分塊
  /**
   * 分塊查詢結果以處理大型資料集
   */
  chunk(size: number, callback: (results: T[]) => Promise<undefined | boolean>): Promise<void>

  // 除錯
  /**
   * 取得編譯後的 SQL 字串
   */
  toSql(): string

  /**
   * 取得查詢綁定參數
   */
  getBindings(): unknown[]

  /**
   * 輸出查詢 SQL 和綁定參數
   */
  dump(): this

  /**
   * 輸出查詢 SQL 和綁定參數並終止執行
   */
  dd(): never

  // 複製
  /**
   * 複製查詢建構器實例
   */
  clone(): QueryBuilderContract<T>

  /**
   * 設定查詢為唯讀模式以跳過 Model 水合的開銷
   */
  readonly(value?: boolean): this

  // 內部/進階
  /**
   * 取得編譯後的查詢結構
   */
  getCompiledQuery(): CompiledQuery

  /**
   * 檢查查詢是否有 limit 或 offset
   */
  hasLimitOrOffset(): boolean

  /**
   * 預先載入關聯
   */
  with(
    relation: string | string[] | Record<string, (query: QueryBuilderContract<unknown>) => void>
  ): this

  /**
   * 添加 WHERE HAS 關聯存在性子句
   */
  whereHas(relation: string, callback?: (query: QueryBuilderContract<unknown>) => void): this

  // 軟刪除
  /**
   * 在查詢中包含軟刪除的記錄
   */
  withTrashed(): this

  /**
   * 只在查詢中包含軟刪除的記錄
   */
  onlyTrashed(): this

  /**
   * 還原軟刪除的記錄
   */
  restore(): Promise<number>

  /**
   * 永久刪除記錄（略過軟刪除）
   */
  forceDelete(): Promise<number>

  // 範疇
  /**
   * 套用查詢範疇
   */
  applyScope(name: string, callback: (query: QueryBuilderContract<T>) => void): this

  /**
   * 移除全域範疇
   */
  withoutGlobalScope(name: string): this

  // 快取
  /**
   * 快取查詢結果
   */
  cache(ttl: number, key?: string): this
}
