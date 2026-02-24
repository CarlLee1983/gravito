/**
 * @gravito/atlas - 合約介面類型
 * @description 驅動合約、連線合約、Grammar 合約及 Cache 介面
 */

import type { AtlasTracer } from '../observability'
import type { ConnectionConfig } from './connection'
import type { PoolHealth, PoolStats } from './connection'
import type {
  CompiledQuery,
  ExecuteResult,
  QueryBuilderContract,
  QueryResult,
  SafeQueryBuilderContract,
} from './query'

// SafeQueryBuilderContract 的 using() 方法在 query.ts 中使用 unknown 型別以避免循環依賴
// 在 ConnectionContract.sql() 方法的回傳值中，使用者可以鏈式調用 .using(connection)

// ============================================================================
// 驅動合約
// ============================================================================

/**
 * 資料庫驅動合約
 */
export interface DriverContract {
  /**
   * 取得驅動名稱
   */
  getDriverName(): import('./common').DriverType

  /**
   * 連線至資料庫
   */
  connect(): Promise<void>

  /**
   * 從資料庫斷線
   */
  disconnect(): Promise<void>

  /**
   * 檢查是否已連線
   */
  isConnected(): boolean

  /**
   * 執行查詢並回傳結果
   */
  query<T = Record<string, unknown>>(sql: string, bindings?: unknown[]): Promise<QueryResult<T>>

  /**
   * 執行語句（INSERT/UPDATE/DELETE）
   */
  execute(sql: string, bindings?: unknown[]): Promise<ExecuteResult>

  /**
   * 開始交易
   */
  beginTransaction(): Promise<void>

  /**
   * 提交目前交易
   */
  commit(): Promise<void>

  /**
   * 回滾目前交易
   */
  rollback(): Promise<void>

  /**
   * 檢查是否在交易中
   */
  inTransaction(): boolean

  // ============================================================================
  // 進階功能（可選 - 支援該功能的驅動才需實作）
  // ============================================================================

  /**
   * 預備重複執行的語句
   * @optional 僅由支援預備語句的驅動實作
   * @param sql - 要預備的 SQL 查詢
   * @returns 預備語句識別符
   */
  prepare?(sql: string): Promise<string>

  /**
   * 執行預備語句
   * @optional 僅由支援預備語句的驅動實作
   * @param name - 預備語句識別符
   * @param bindings - 查詢參數
   * @returns 查詢結果
   */
  executePrepared?<T = Record<string, unknown>>(
    name: string,
    bindings?: unknown[]
  ): Promise<QueryResult<T>>

  /**
   * 清除快取中的所有預備語句
   * @optional 僅由支援預備語句的驅動實作
   */
  clearPreparedStatements?(): Promise<void>

  /**
   * 串流查詢結果以處理大型資料集
   * @optional 僅由支援串流的驅動實作
   * @param sql - SQL 查詢
   * @param bindings - 查詢參數
   * @returns 逐一產生結果列的非同步迭代器
   */
  stream?<T = Record<string, unknown>>(sql: string, bindings?: unknown[]): AsyncIterable<T>

  /**
   * 取得連線池統計資訊
   * @optional 僅由支援連線池的驅動實作
   * @returns 池統計資訊，不支援時回傳 null
   */
  getPoolStats?(): PoolStats | null

  /**
   * 取得連線池健康狀態
   * @optional 僅由支援連線池的驅動實作
   * @returns 池健康資訊
   */
  getPoolHealth?(): PoolHealth

  /**
   * 動態調整連線池大小
   * @optional 僅由支援池調整大小的驅動實作
   * @param targetSize - 目標連線數
   */
  adjustPoolSize?(targetSize: number): Promise<void>
}

// ============================================================================
// 連線合約
// ============================================================================

/**
 * 連線合約
 */
export interface ConnectionContract {
  /**
   * 取得連線名稱
   */
  getName(): string

  /**
   * 取得底層驅動
   */
  getDriver(): DriverContract

  /**
   * 取得連線配置
   */
  getConfig(): ConnectionConfig

  /**
   * 取得此連線的追蹤器實例
   */
  getTracer(): AtlasTracer | undefined

  /**
   * 為指定資料表建立新的查詢建構器
   */
  table<T = Record<string, unknown>>(tableName: string): QueryBuilderContract<T>

  /**
   * 執行原始 SQL 查詢並回傳結果
   */
  raw<T = Record<string, unknown>>(sql: string, bindings?: unknown[]): Promise<QueryResult<T>>

  /**
   * 執行原始 SQL 語句（INSERT/UPDATE/DELETE）
   */
  execute(sql: string, bindings?: unknown[]): Promise<ExecuteResult>

  /**
   * 在資料庫交易中執行回呼函式
   */
  transaction<T>(callback: (connection: ConnectionContract) => Promise<T>): Promise<T>

  /**
   * 從資料庫斷線
   */
  disconnect(): Promise<void>

  /**
   * 取得此連線的 Grammar 實例
   */
  getGrammar(): GrammarContract

  /**
   * 使用標籤模板字面量的安全查詢建構器
   * 透過參數綁定自動防止 SQL 注入
   *
   * @example
   * ```typescript
   * const users = await db.sql`SELECT * FROM users WHERE id = ${userId}`.all()
   * const tableName = identifier('posts')
   * const posts = await db.sql`SELECT * FROM ${tableName} WHERE author = ${authorId}`.all()
   * ```
   */
  sql<T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): SafeQueryBuilderContract<T>
}

// ============================================================================
// Grammar 合約
// ============================================================================

/**
 * Grammar 合約
 */
export interface GrammarContract {
  /**
   * 編譯 SELECT 語句
   */
  compileSelect(query: CompiledQuery): string

  /**
   * 編譯 INSERT 語句
   */
  compileInsert(query: CompiledQuery, values: Record<string, unknown>[]): string

  /**
   * 編譯 INSERT 並取得 ID 語句
   */
  compileInsertGetId(
    query: CompiledQuery,
    values: Record<string, unknown>,
    primaryKey: string
  ): string

  /**
   * 編譯 UPDATE 語句
   */
  compileUpdate(query: CompiledQuery, values: Record<string, unknown>): string

  /**
   * 編譯 DELETE 語句
   */
  compileDelete(query: CompiledQuery): string

  /**
   * 編譯 TRUNCATE 語句
   */
  compileTruncate(query: CompiledQuery): string

  /**
   * 編譯聚合查詢
   */
  compileAggregate(query: CompiledQuery, aggregate: { function: string; column: string }): string

  /**
   * 編譯 EXISTS 查詢
   */
  compileExists(query: CompiledQuery): string

  /**
   * 取得綁定佔位符
   */
  getPlaceholder(index: number): string

  /**
   * 包裝欄位名稱
   */
  wrapColumn(column: string): string

  /**
   * 包裝資料表名稱
   */
  wrapTable(table: string): string

  /**
   * 引用值
   */
  quoteValue(value: unknown): string

  /**
   * 編譯橫向預先載入查詢
   */
  compileLateralEagerLoad(
    table: string,
    foreignKey: string,
    parentKeys: unknown[],
    query: CompiledQuery
  ): { sql: string; bindings: unknown[] }

  getStructuralKey(query: CompiledQuery): string

  /**
   * 編譯 JSON 路徑查詢
   */
  compileJsonPath(column: string, value: unknown): string

  /**
   * 編譯 JSON contains 查詢
   */
  compileJsonContains(column: string, value: unknown): string

  /**
   * 編譯 JSON 更新語句
   */
  compileUpdateJson(query: CompiledQuery, column: string, value: unknown): string

  /**
   * 編譯 UPSERT 語句
   */
  compileUpsert(
    query: CompiledQuery,
    values: Record<string, unknown>[],
    uniqueBy: string[],
    update: string[]
  ): string
}

// ============================================================================
// 快取介面
// ============================================================================

/**
 * 快取介面
 */
export interface CacheInterface {
  get<T = unknown>(key: string): Promise<T | null>
  set(key: string, value: unknown, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
}

