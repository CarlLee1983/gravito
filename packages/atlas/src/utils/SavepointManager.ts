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

export class SavepointManager {
  private savepointStack: Savepoint[] = []
  private savepointCounter = 0
  private inTransaction = false
  private operationCount = 0

  constructor(private connection: ConnectionContract) {}

  /**
   * 開始事務
   *
   * ✅ 初始化事務狀態與 savepoint 追蹤
   */
  async begin(): Promise<void> {
    if (this.inTransaction) {
      throw new Error('Transaction already started')
    }

    await this.connection.raw('BEGIN')
    this.inTransaction = true
    this.savepointCounter = 0
    this.operationCount = 0
    this.savepointStack = []
  }

  /**
   * 建立 Savepoint
   *
   * ✅ 支援巢狀 savepoint，自動生成名稱
   */
  async createSavepoint(name?: string): Promise<Savepoint> {
    if (!this.inTransaction) {
      throw new Error('No transaction in progress')
    }

    const savepointName = name || `sp_${++this.savepointCounter}`

    // 執行 SAVEPOINT 命令
    await this.connection.raw(`SAVEPOINT ${savepointName}`)

    const savepoint: Savepoint = {
      name: savepointName,
      createdAt: new Date(),
      operationCount: this.operationCount,
    }

    this.savepointStack.push(savepoint)
    return savepoint
  }

  /**
   * 回滾到特定 Savepoint
   *
   * ✅ 部分回滾：只回滾到該 savepoint 之後的操作
   */
  async rollbackToSavepoint(savepoint: Savepoint): Promise<void> {
    if (!this.inTransaction) {
      throw new Error('No transaction in progress')
    }

    // 驗證 savepoint 是否存在於棧中
    const index = this.savepointStack.findIndex((sp) => sp.name === savepoint.name)
    if (index === -1) {
      throw new Error(`Savepoint ${savepoint.name} not found`)
    }

    // 執行回滾
    await this.connection.raw(`ROLLBACK TO SAVEPOINT ${savepoint.name}`)

    // 移除該 savepoint 之後的所有 savepoint
    this.savepointStack = this.savepointStack.slice(0, index + 1)
    this.operationCount = savepoint.operationCount
  }

  /**
   * 發佈（提交）Savepoint
   *
   * ✅ 將 savepoint 之後的操作永久化
   */
  async releaseSavepoint(savepoint: Savepoint): Promise<void> {
    if (!this.inTransaction) {
      throw new Error('No transaction in progress')
    }

    // 執行釋放
    await this.connection.raw(`RELEASE SAVEPOINT ${savepoint.name}`)

    // 從棧中移除該 savepoint
    this.savepointStack = this.savepointStack.filter((sp) => sp.name !== savepoint.name)
  }

  /**
   * 提交事務
   *
   * ✅ 所有操作永久化，清除 savepoint
   */
  async commit(): Promise<void> {
    if (!this.inTransaction) {
      throw new Error('No transaction in progress')
    }

    try {
      await this.connection.raw('COMMIT')
    } finally {
      this.inTransaction = false
      this.savepointStack = []
      this.operationCount = 0
    }
  }

  /**
   * 回滾事務
   *
   * ✅ 撤銷所有操作，包含所有 savepoint
   */
  async rollback(): Promise<void> {
    if (!this.inTransaction) {
      throw new Error('No transaction in progress')
    }

    try {
      await this.connection.raw('ROLLBACK')
    } finally {
      this.inTransaction = false
      this.savepointStack = []
      this.operationCount = 0
    }
  }

  /**
   * 執行在 Savepoint 範圍內的操作
   *
   * ✅ 便利函數：自動建立/回滾 savepoint
   */
  async withSavepoint<T>(
    name: string,
    callback: () => Promise<T>
  ): Promise<{ success: boolean; result?: T; error?: Error }> {
    if (!this.inTransaction) {
      throw new Error('No transaction in progress')
    }

    const savepoint = await this.createSavepoint(name)

    try {
      const result = await callback()
      await this.releaseSavepoint(savepoint)
      return { success: true, result }
    } catch (error) {
      await this.rollbackToSavepoint(savepoint)
      return { success: false, error: error as Error }
    }
  }

  /**
   * 取得當前 Savepoint 棧
   */
  getSavepointStack(): Savepoint[] {
    return [...this.savepointStack]
  }

  /**
   * 檢查是否在事務中
   */
  isInTransaction(): boolean {
    return this.inTransaction
  }

  /**
   * 追蹤操作數
   */
  recordOperation(): void {
    if (this.inTransaction) {
      this.operationCount++
    }
  }

  /**
   * 取得操作計數
   */
  getOperationCount(): number {
    return this.operationCount
  }
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
export async function executeWithSavepoints<T>(
  connection: ConnectionContract,
  callback: (manager: SavepointManager) => Promise<T>
): Promise<T> {
  const manager = new SavepointManager(connection)

  await manager.begin()

  try {
    const result = await callback(manager)
    await manager.commit()
    return result
  } catch (error) {
    await manager.rollback()
    throw error
  }
}
