/**
 * BulkInsertBuilder - 批量插入優化工具
 *
 * 提供高效的批量插入操作，具有自動分批、參數綁定與錯誤恢復。
 *
 * @example
 * ```typescript
 * const builder = new BulkInsertBuilder(connection, 'users', 1000)
 *
 * for (const user of userList) {
 *   await builder.add({
 *     name: user.name,
 *     email: user.email,
 *     createdAt: new Date()
 *   })
 * }
 *
 * const result = await builder.execute()
 * console.log(`Inserted ${result.totalInserted} records`)
 * ```
 */
import type { ConnectionContract } from '@gravito/atlas'
export interface BulkInsertOptions {
  /** 每批的記錄數（預設: 1000） */
  batchSize?: number
  /** 插入失敗時是否繼續 */
  continueOnError?: boolean
  /** 進度回調 */
  onProgress?: (inserted: number, total: number) => void
  /** 錯誤回調 */
  onError?: (error: Error, batchIndex: number) => void
}
export interface BulkInsertResult {
  /** 總共插入的記錄數 */
  totalInserted: number
  /** 總共的記錄數 */
  totalRecords: number
  /** 失敗的記錄數 */
  failedRecords: number
  /** 執行時間（毫秒） */
  duration: number
  /** 失敗的詳情 */
  errors: Array<{
    batchIndex: number
    error: Error
  }>
}
export declare class BulkInsertBuilder {
  private connection
  private tableName
  private records
  private batchSize
  private continueOnError
  private onProgress?
  private onError?
  constructor(connection: ConnectionContract, tableName: string, options?: BulkInsertOptions)
  /**
   * 新增記錄到批次
   *
   * ✅ 自動管理記憶體：達到 batchSize 時自動執行
   */
  add(record: Record<string, unknown>): Promise<void>
  /**
   * 新增多個記錄
   */
  addMany(records: Record<string, unknown>[]): Promise<void>
  /**
   * 執行當前批次的插入
   *
   * ✅ 參數綁定：所有值都被正確綁定
   */
  private flush
  /**
   * 執行完整的批量插入
   *
   * ✅ 進度追蹤：定期回調進度
   * ✅ 錯誤恢復：支援繼續或中止
   */
  execute(): Promise<BulkInsertResult>
  /**
   * 取得當前待插入的記錄數
   */
  getPendingCount(): number
}
/**
 * 便利函數：一次性批量插入
 *
 * @example
 * ```typescript
 * const result = await bulkInsert(connection, 'users', users, {
 *   batchSize: 5000,
 *   onProgress: (inserted, total) => {
 *     console.log(`Progress: ${inserted}/${total}`)
 *   }
 * })
 * ```
 */
export declare function bulkInsert(
  connection: ConnectionContract,
  tableName: string,
  records: Record<string, unknown>[],
  options?: BulkInsertOptions
): Promise<BulkInsertResult>
