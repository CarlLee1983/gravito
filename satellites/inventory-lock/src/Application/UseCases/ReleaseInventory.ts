/**
 * 釋放鎖定庫存 Use Case
 *
 * 責任：
 * 1. 驗證鎖定存在
 * 2. 更新鎖定狀態為 RELEASED
 * 3. 記錄釋放時間
 * 4. 發送事件通知
 */

import type { PlanetCore } from '@gravito/core'
import {
  type InventoryLock,
  InventoryReleased,
  LockStatus,
  type ReleaseLockRequest,
} from '../../Domain/Models'
import type { IInventoryLockRepository } from '../Contracts/IInventoryLockRepository'

export class ReleaseInventory {
  constructor(private core: PlanetCore) {}

  async execute(request: ReleaseLockRequest): Promise<InventoryLock | null> {
    const { core } = this

    // 1. 驗證請求
    const errors = request.validate()
    if (errors.length > 0) {
      core.logger.warn(`Release inventory validation failed: ${errors.join(', ')}`)
      throw new Error(`Validation failed: ${errors.join(', ')}`)
    }

    // 2. 取得 Repository
    const repository = core.container.make<IInventoryLockRepository>('inventoryLock.repository')

    try {
      // 3. 查詢鎖定
      const lock = await repository.findById(request.lockId)
      if (!lock) {
        core.logger.warn(`Lock not found: ${request.lockId}`)
        return null
      }

      // 4. 檢查鎖定狀態（只能釋放 LOCKED 狀態的鎖）
      if (lock.status !== LockStatus.LOCKED) {
        core.logger.warn(`Cannot release lock with status ${lock.status}: ${request.lockId}`)
        throw new Error(`Cannot release lock with status ${lock.status}`)
      }

      // 5. 更新鎖定狀態
      const releasedLock = await repository.updateStatus(request.lockId, LockStatus.RELEASED)

      core.logger.info(`Inventory released: ${request.lockId}, reason: ${request.reason}`)

      // 6. 發送釋放事件
      await core.events.dispatch(
        new InventoryReleased(lock.id, lock.productId, lock.quantity, request.reason)
      )

      return releasedLock
    } catch (error) {
      core.logger.error(
        `Release inventory failed: ${error instanceof Error ? error.message : String(error)}`
      )
      throw error
    }
  }
}
