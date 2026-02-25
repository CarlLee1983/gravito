/**
 * 鎖定庫存 Use Case
 *
 * 責任：
 * 1. 驗證請求合法性
 * 2. 檢查庫存是否充足
 * 3. 建立分佈式鎖
 * 4. 記錄鎖定資訊
 * 5. 發送事件通知
 */

import type { PlanetCore } from '@gravito/core'
import {
  type InventoryLock,
  InventoryLocked,
  LockFailed,
  type LockInventoryRequest,
  LockStatus,
} from '../../Domain/Models'
import type { IInventoryLockRepository } from '../Contracts/IInventoryLockRepository'

export class LockInventory {
  constructor(_core: PlanetCore) {}

  async execute(request: LockInventoryRequest): Promise<InventoryLock | null> {
    const { core } = this

    // 1. 驗證請求
    const errors = request.validate()
    if (errors.length > 0) {
      core.logger.warn(`Lock inventory validation failed: ${errors.join(', ')}`)
      throw new Error(`Validation failed: ${errors.join(', ')}`)
    }

    // 2. 取得 Repository
    const repository = core.container.make<IInventoryLockRepository>('inventoryLock.repository')

    try {
      // 3. 檢查該訂單是否已有鎖定（避免重複鎖定）
      const existingLock = await repository.findByOrderId(request.orderId)
      if (existingLock && existingLock.status === LockStatus.LOCKED) {
        core.logger.info(`Lock already exists for order: ${request.orderId}`)
        return existingLock
      }

      // 4. 查詢活躍鎖定數量（簡單的庫存檢查）
      const lockedQuantity = await repository.sumLockedQuantity(request.productId)

      // TODO: 在實作階段 3 時，整合 Flash-Sale Satellite 以取得真實庫存
      // 這裡假設有足夠的庫存
      const availableQuantity = 1000 - lockedQuantity

      if (availableQuantity < request.quantity) {
        core.logger.warn(
          `Insufficient inventory: product=${request.productId}, requested=${request.quantity}, available=${availableQuantity}`
        )

        // 發送庫存不足事件
        await core.events.dispatch(
          new LockFailed(
            request.productId,
            request.quantity,
            availableQuantity,
            'Insufficient inventory'
          )
        )

        return null
      }

      // 5. 計算鎖定過期時間
      const now = new Date()
      const expiresAt = new Date(now.getTime() + request.timeoutSeconds * 1000)

      // 6. 建立鎖定記錄
      const lockData = {
        productId: request.productId,
        userId: request.userId,
        orderId: request.orderId,
        quantity: request.quantity,
        status: LockStatus.LOCKED,
        lockedAt: now,
        expiresAt,
      }

      const lock = await repository.create(lockData)

      core.logger.info(`Inventory locked: ${lock.id}`)

      // 7. 發送鎖定事件
      await core.events.dispatch(
        new InventoryLocked(lock.id, request.productId, request.quantity, expiresAt)
      )

      return lock
    } catch (error) {
      core.logger.error(
        `Lock inventory failed: ${error instanceof Error ? error.message : String(error)}`
      )
      throw error
    }
  }
}
