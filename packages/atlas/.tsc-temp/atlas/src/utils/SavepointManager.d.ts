/**
 * SavepointManager - 事務 Savepoint 管理工具
 *
 * 提供巢狀事務支援，通過 savepoint 機制實現事務部分回滾。
 *
 * @example
 * ```typescript
 * const manager = new SavepointManager(connection)
 *
 * try {
 *   await manager.begin() // 開始事務
 *
 *   // 執行一些操作
 *   await connection.sql`INSERT INTO users ...`.execute()
 *
 *   const sp1 = await manager.createSavepoint('before_posts')
 *   await connection.sql`INSERT INTO posts ...`.execute()
 *
 *   // 如果出錯，回滾到 savepoint
 *   try {
 *     await connection.sql`DELETE FROM posts ...`.execute()
 *   } catch (error) {
 *     await manager.rollbackToSavepoint(sp1)
 *   }
 *
 *   await manager.commit()
 * } catch (error) {
 *   await manager.rollback()
 *   throw error
 * }
 * ```
 */
import type { ConnectionContract } from '@gravito/atlas'
export interface Savepoint {
  /** Savepoint 名稱 */
  name: string
  /** 建立時的時間戳 */
  createdAt: Date
  /** 該 savepoint 之前的操作數 */
  operationCount: number
}
export declare class SavepointManager {
  private connection
  private savepointStack
  private savepointCounter
  private inTransaction
  private operationCount
  constructor(connection: ConnectionContract)
  /**
   * 開始事務
   *
   * ✅ 初始化事務狀態與 savepoint 追蹤
   */
  begin(): Promise<void>
  /**
   * 建立 Savepoint
   *
   * ✅ 支援巢狀 savepoint，自動生成名稱
   */
  createSavepoint(name?: string): Promise<Savepoint>
  /**
   * 回滾到特定 Savepoint
   *
   * ✅ 部分回滾：只回滾到該 savepoint 之後的操作
   */
  rollbackToSavepoint(savepoint: Savepoint): Promise<void>
  /**
   * 發佈（提交）Savepoint
   *
   * ✅ 將 savepoint 之後的操作永久化
   */
  releaseSavepoint(savepoint: Savepoint): Promise<void>
  /**
   * 提交事務
   *
   * ✅ 所有操作永久化，清除 savepoint
   */
  commit(): Promise<void>
  /**
   * 回滾事務
   *
   * ✅ 撤銷所有操作，包含所有 savepoint
   */
  rollback(): Promise<void>
  /**
   * 執行在 Savepoint 範圍內的操作
   *
   * ✅ 便利函數：自動建立/回滾 savepoint
   */
  withSavepoint<T>(
    name: string,
    callback: () => Promise<T>
  ): Promise<{
    success: boolean
    result?: T
    error?: Error
  }>
  /**
   * 取得當前 Savepoint 棧
   */
  getSavepointStack(): Savepoint[]
  /**
   * 檢查是否在事務中
   */
  isInTransaction(): boolean
  /**
   * 追蹤操作數
   */
  recordOperation(): void
  /**
   * 取得操作計數
   */
  getOperationCount(): number
}
/**
 * 便利函數：執行巢狀事務
 *
 * @example
 * ```typescript
 * const result = await executeWithSavepoints(connection, async (manager) => {
 *   // 第一個操作
 *   await connection.sql`INSERT INTO users ...`.execute()
 *
 *   // 在 savepoint 內執行可能失敗的操作
 *   const result = await manager.withSavepoint('risky_operation', async () => {
 *     await connection.sql`UPDATE posts SET ...`.execute()
 *     return 'success'
 *   })
 *
 *   return result
 * })
 * ```
 */
export declare function executeWithSavepoints<T>(
  connection: ConnectionContract,
  callback: (manager: SavepointManager) => Promise<T>
): Promise<T>
