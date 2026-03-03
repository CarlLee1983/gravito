/**
 * BatchUpdateBuilder - 批量更新/刪除工具
 *
 * 提供安全且高效的批量更新與刪除操作。
 *
 * @example
 * ```typescript
 * // 批量更新
 * const builder = new BatchUpdateBuilder(connection, 'posts')
 * const result = await builder
 *   .where('status', '=', 'draft')
 *   .where('createdAt', '<', sevenDaysAgo)
 *   .update({ status: 'archived' })
 *
 * // 批量刪除
 * const result = await connection
 *   .table('logs')
 *   .where('createdAt', '<', thirtyDaysAgo)
 *   .delete()
 * ```
 */
import type { ConnectionContract } from '@gravito/atlas'
export interface UpdateCondition {
  column: string
  operator: string
  value: unknown
}
export interface BatchUpdateResult {
  affectedRows: number
  conditions: UpdateCondition[]
  duration: number
}
export interface BatchDeleteResult {
  deletedRows: number
  conditions: UpdateCondition[]
  duration: number
}
export declare class BatchUpdateBuilder {
  private connection
  private tableName
  private conditions
  constructor(connection: ConnectionContract, tableName: string)
  /**
   * 新增 WHERE 條件
   *
   * ✅ 參數綁定防止 SQL Injection
   */
  where(column: string, operator: string, value: unknown): this
  /**
   * 執行批量更新
   *
   * ✅ 安全：所有條件都通過參數綁定
   * ✅ 驗證：確保至少有一個條件
   */
  update(updates: Record<string, unknown>): Promise<BatchUpdateResult>
  /**
   * 執行批量刪除
   *
   * ✅ 安全：強制要求 WHERE 條件
   * ✅ 驗證：確保至少有一個條件
   */
  delete(): Promise<BatchDeleteResult>
  /**
   * 執行批量刪除 - 帶時間戳驗證
   *
   * ✅ 安全：檢查 updatedAt 欄位以驗證記錄年齡
   */
  deleteOldRecords(olderThanDate: Date, checkColumn?: string): Promise<BatchDeleteResult>
  /**
   * 取得條件數
   */
  getConditionCount(): number
  /**
   * 重設條件
   */
  reset(): this
}
/**
 * 安全的批量刪除函數
 *
 * @example
 * ```typescript
 * const result = await safeBatchDelete(
 *   connection,
 *   'logs',
 *   { column: 'createdAt', operator: '<', value: thirtyDaysAgo },
 *   { limit: 10000 } // 最多刪除 10000 條
 * )
 * ```
 */
export declare function safeBatchDelete(
  connection: ConnectionContract,
  tableName: string,
  condition: UpdateCondition,
  options?: {
    limit?: number
    batchSize?: number
  }
): Promise<{
  totalDeleted: number
  batches: number
}>
/**
 * 安全的批量更新函數
 *
 * @example
 * ```typescript
 * const result = await safeBatchUpdate(
 *   connection,
 *   'users',
 *   { status: 'inactive' },
 *   [
 *     { column: 'lastLogin', operator: '<', value: ninetyDaysAgo },
 *     { column: 'isActive', operator: '=', value: true }
 *   ]
 * )
 * ```
 */
export declare function safeBatchUpdate(
  connection: ConnectionContract,
  tableName: string,
  updates: Record<string, unknown>,
  conditions: UpdateCondition[]
): Promise<BatchUpdateResult>
