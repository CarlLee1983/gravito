/**
 * 庫存鎖定 Repository 合約
 */

import type { InventoryLock, LockStatus } from '../../Domain/Models'

/**
 * 庫存鎖定 Repository 介面
 */
export interface IInventoryLockRepository {
  /**
   * 根據 ID 查詢鎖定
   */
  findById(id: string): Promise<InventoryLock | null>

  /**
   * 根據訂單 ID 查詢鎖定
   */
  findByOrderId(orderId: string): Promise<InventoryLock | null>

  /**
   * 查詢已過期的鎖定（用於清理）
   */
  findExpired(before: Date): Promise<InventoryLock[]>

  /**
   * 建立新的鎖定
   */
  create(data: Omit<InventoryLock, 'id' | 'version'>): Promise<InventoryLock>

  /**
   * 更新鎖定狀態
   */
  updateStatus(id: string, status: LockStatus): Promise<InventoryLock>

  /**
   * 樂觀鎖更新（防止並發修改）
   */
  updateWithVersion(
    id: string,
    data: Partial<InventoryLock>,
    expectedVersion: number
  ): Promise<InventoryLock | null>

  /**
   * 刪除鎖定
   */
  delete(id: string): Promise<void>

  /**
   * 查詢特定商品的活躍鎖定數量
   */
  countActive(productId: string): Promise<number>

  /**
   * 查詢特定商品的鎖定總數量
   */
  sumLockedQuantity(productId: string): Promise<number>
}
