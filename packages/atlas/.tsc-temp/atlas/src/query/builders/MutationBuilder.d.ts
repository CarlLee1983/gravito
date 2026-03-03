import type { ConnectionContract, GrammarContract } from '../../types'
/**
 * 寫入操作建構器。
 *
 * 封裝所有資料庫寫入方法（insert, update, delete, upsert, truncate
 * 以及 increment/decrement 原子操作），
 * 由 QueryBuilder 透過組合模式持有並委派呼叫。
 *
 * @template T - 查詢結果記錄型別。
 */
export declare class MutationBuilder<T = Record<string, unknown>> {
  private readonly connection
  private readonly grammar
  private readonly getTableName
  private readonly getCompiledQuery
  private readonly getBindings
  private readonly updateFn
  constructor(
    connection: ConnectionContract,
    grammar: GrammarContract,
    getTableName: () => string,
    getCompiledQuery: () => import('../../types').CompiledQuery,
    getBindings: () => unknown[],
    updateFn: (data: Partial<T>) => Promise<number>
  )
  /**
   * 將資料插入資料表。
   *
   * 自動處理批次分割（chunking）以保持在綁定參數限制內。
   *
   * @param data - 單一物件或物件陣列
   * @returns 已插入的物件陣列（若驅動支援則含生成的 ID）
   */
  insert(data: Partial<T> | Partial<T>[]): Promise<T[]>
  /**
   * 插入資料並回傳主鍵值。
   *
   * @param data - 記錄資料
   * @param primaryKey - 自動遞增欄位名稱
   * @returns 生成的 ID
   * @throws {QueryBuilderError} 若 ID 取得失敗
   */
  insertGetId(data: Partial<T>, primaryKey?: string): Promise<number | bigint>
  /**
   * 更新符合當前查詢條件的記錄。
   *
   * @param data - 更新值
   * @returns 受影響的行數
   */
  update(data: Partial<T>): Promise<number>
  /**
   * 更新 JSON 欄位的特殊方法。
   *
   * @param column - 目標 JSON 欄位名稱
   * @param value - 新的 JSON 值
   */
  updateJson(column: string, value: unknown): Promise<number>
  /**
   * 刪除符合查詢條件的記錄。
   *
   * 注意：此為硬刪除。軟刪除請使用 Model 層。
   */
  delete(): Promise<number>
  /**
   * 清空所有記錄並重設自動遞增狀態。
   */
  truncate(): Promise<void>
  /**
   * 原子性地遞增數值欄位。
   *
   * @param column - 目標欄位名稱
   * @param amount - 遞增量（預設 1）
   * @param extra - 同時更新的其他欄位
   */
  increment(column: string, amount?: number, extra?: Partial<T>): Promise<number>
  /**
   * 原子性地遞減數值欄位。
   *
   * @param column - 目標欄位名稱
   * @param amount - 遞減量（預設 1）
   * @param extra - 同時更新的其他欄位
   */
  decrement(column: string, amount?: number, extra?: Partial<T>): Promise<number>
  /**
   * 插入記錄，若唯一性衝突則更新。
   *
   * @param data - 要處理的記錄
   * @param uniqueBy - 識別唯一性的欄位
   * @param update - 衝突時要更新的欄位（省略則更新所有非唯一欄位）
   * @returns 受影響的行數
   */
  upsert(
    data: Partial<T> | Partial<T>[],
    uniqueBy: string | string[],
    update?: string[]
  ): Promise<number>
  /**
   * 最佳化批次大小以避免超出驅動的綁定參數限制。
   * @internal
   */
  private calculateOptimalChunkSize
}
