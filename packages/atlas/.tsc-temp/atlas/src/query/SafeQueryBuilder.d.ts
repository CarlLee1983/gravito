/**
 * Safe Query Builder - Tagged Template Literal API
 * @description 使用 JavaScript tagged template 語法自動防止 SQL 注入
 *
 * 將模板字串與插值分離為 SQL + bindings，根本性防止 SQL 注入。
 *
 * @example
 * ```typescript
 * const userId = 123
 * const name = "Robert'; DROP TABLE users;--"
 * const result = await DB.sql`
 *   SELECT * FROM users
 *   WHERE id = ${userId} AND name = ${name}
 * `.all()
 *
 * // 安全執行：SQL 模板保持 SQL 結構，惡意輸入在 bindings 中
 * ```
 */
import type { ConnectionContract, QueryResult } from '../types'
import { Expression } from './Expression'
/**
 * Safe Identifier - 用於表名/列名的白名單驗證
 *
 * 防止識別符中的 SQL 注入（如表名、列名、別名等）
 *
 * @example
 * ```typescript
 * const tableName = identifier('users')
 * const result = await db.sql`SELECT * FROM ${tableName}`.all()
 * ```
 */
export declare class SafeIdentifier {
  private readonly name
  constructor(identifierName: string)
  toString(): string
}
/**
 * 建立安全識別符
 *
 * @param name - 識別符名稱（表名、列名等）
 * @returns SafeIdentifier 實例
 *
 * @example
 * ```typescript
 * identifier('users')          // ✓
 * identifier('user_profiles')  // ✓
 * identifier('db.users')       // ✓ (schema.table)
 * identifier('users; DROP')    // ✗ 拋出錯誤
 * ```
 */
export declare function identifier(name: string): SafeIdentifier
/**
 * Safe Query Builder - 使用 tagged template literal 構建安全查詢
 *
 * 自動將使用者輸入分離為 SQL 模板和綁定參數，防止 SQL 注入。
 *
 * @template T - 查詢結果行的類型
 *
 * @example
 * ```typescript
 * const users = await new SafeQueryBuilder(
 *   ['SELECT * FROM users WHERE id = ', ''],
 *   [123]
 * ).using(connection).all()
 * ```
 */
export declare class SafeQueryBuilder<T = Record<string, unknown>> {
  private readonly sqlParts
  private readonly values
  private connection?
  /**
   * 建構查詢建構器
   *
   * @param strings - Template literal 的字串部分
   * @param values - Template literal 的插值部分
   */
  constructor(strings: TemplateStringsArray, values: unknown[])
  /**
   * 綁定連線
   *
   * @param conn - 資料庫連線實例
   * @returns 此建構器實例（用於方法鏈）
   *
   * @example
   * ```typescript
   * const builder = new SafeQueryBuilder(strings, values)
   * const results = await builder.using(connection).all()
   * ```
   */
  using(conn: ConnectionContract): this
  /**
   * 編譯為帶佔位符的 SQL 與 bindings
   *
   * @param dialect - 資料庫方言（postgres | mysql | sqlite）
   * @returns { sql, bindings } 物件
   *
   * @internal
   */
  compile(dialect?: 'postgres' | 'mysql' | 'sqlite'): {
    sql: string
    bindings: unknown[]
  }
  /**
   * 執行查詢並返回完整結果物件
   *
   * @returns QueryResult 包含 rows、rowCount、insertId 等
   *
   * @example
   * ```typescript
   * const result = await db.sql`SELECT ...`.execute()
   * console.log(result.rows)  // [{ id: 1, ... }]
   * ```
   */
  execute(): Promise<QueryResult<T>>
  /**
   * 執行查詢並返回所有行
   *
   * @returns 行陣列
   *
   * @example
   * ```typescript
   * const users = await db.sql`SELECT * FROM users`.all()
   * ```
   */
  all(): Promise<T[]>
  /**
   * 執行查詢並返回第一行
   *
   * @returns 第一行或 null
   *
   * @example
   * ```typescript
   * const user = await db.sql`SELECT * FROM users WHERE id = ${id}`.first()
   * ```
   */
  first(): Promise<T | null>
  /**
   * 轉換為 Expression 供 QueryBuilder 使用
   *
   * 允許將 SafeQueryBuilder 結果作為子查詢或條件嵌入 QueryBuilder
   *
   * @returns Expression 實例
   *
   * @example
   * ```typescript
   * const subquery = db.sql`SELECT * FROM users WHERE active = ${true}`
   * db.table('posts')
   *   .whereIn('user_id', subquery.toExpression())
   * ```
   */
  toExpression(): Expression
  /**
   * 從驅動偵測方言
   *
   * @private
   */
  private detectDialect
}
