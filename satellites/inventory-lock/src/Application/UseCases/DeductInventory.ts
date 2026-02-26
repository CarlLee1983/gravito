/**
 * 真正扣減庫存 Use Case（Inventory-Lock 版本）
 *
 * 責任：
 * 1. 驗證鎖定存在且有效
 * 2. 檢查版本號（樂觀鎖）
 * 3. 執行庫存扣減
 * 4. 更新鎖定狀態
 * 5. 發送事件通知
 */

import type { PlanetCore } from '@gravito/core'
import { InventoryDeducted, LockStatus } from '../../Domain/Models'
import type { IInventoryLockRepository } from '../Contracts/IInventoryLockRepository'

export class DeductInventory {
  private core: PlanetCore

  constructor(core: PlanetCore) {
    this.core = core
  }

  async execute(
    lockId: string,
    expectedVersion: number
  ): Promise<{ success: boolean; message: string }> {
    const { core } = this

    // 1. 驗證參數
    if (!lockId?.trim()) {
      throw new Error('lockId is required')
    }

    // 2. 取得 Repository
    const repository = core.container.make<IInventoryLockRepository>('inventoryLock.repository')

    try {
      // 3. 查詢鎖定
      const lock = await repository.findById(lockId)
      if (!lock) {
        core.logger.warn(`Lock not found for deduction: ${lockId}`)
        return { success: false, message: 'Lock not found' }
      }

      // 4. 檢查鎖定狀態
      if (lock.status !== LockStatus.LOCKED) {
        core.logger.warn(`Cannot deduct with lock status ${lock.status}: ${lockId}`)
        return { success: false, message: `Invalid lock status: ${lock.status}` }
      }

      // 5. 檢查過期時間
      if (new Date() > lock.expiresAt) {
        core.logger.warn(`Lock has expired: ${lockId}`)
        await repository.updateStatus(lockId, LockStatus.EXPIRED)
        return { success: false, message: 'Lock has expired' }
      }

      // 6. 樂觀鎖更新：嘗試扣減庫存（同時檢查版本號）
      const updatedLock = await repository.updateWithVersion(
        lockId,
        { status: LockStatus.RELEASED },
        expectedVersion
      )

      if (!updatedLock) {
        core.logger.warn(
          `Optimistic lock conflict: ${lockId}, expected version: ${expectedVersion}`
        )
        return { success: false, message: 'Version conflict - concurrent modification detected' }
      }

      core.logger.info(`Inventory deducted: ${lockId}`)

      // 7. 發送扣減成功事件
      await core.events.dispatch(
        new InventoryDeducted(lock.orderId, lock.productId, lock.quantity, true)
      )

      return {
        success: true,
        message: `Inventory deducted successfully for order ${lock.orderId}`,
      }
    } catch (error) {
      core.logger.error(
        `Deduct inventory failed: ${error instanceof Error ? error.message : String(error)}`
      )
      throw error
    }
  }
}
