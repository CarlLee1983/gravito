/**
 * 死鎖偵測 Use Case
 *
 * 責任：
 * 1. 定期掃描過期的鎖定
 * 2. 檢測死鎖情況
 * 3. 自動清理過期鎖定
 * 4. 記錄死鎖事件
 */

import type { PlanetCore } from '@gravito/core'
import { LockStatus } from '../../Domain/Models'
import type { IInventoryLockRepository } from '../Contracts/IInventoryLockRepository'

export class DetectDeadlock {
  private core: PlanetCore

  constructor(core: PlanetCore) {
    this.core = core
  }

  async execute(beforeDate?: Date): Promise<{ cleaned: number; message: string }> {
    const { core } = this

    // 1. 使用提供的日期或預設為現在
    const scanDate = beforeDate || new Date()

    // 2. 取得 Repository
    const repository = core.container.make<IInventoryLockRepository>('inventoryLock.repository')

    try {
      // 3. 查詢所有過期的鎖定
      const expiredLocks = await repository.findExpired(scanDate)

      if (expiredLocks.length === 0) {
        core.logger.debug(`No expired locks found before ${scanDate.toISOString()}`)
        return { cleaned: 0, message: 'No expired locks detected' }
      }

      core.logger.warn(`Found ${expiredLocks.length} expired locks`)

      // 4. 清理過期的鎖定
      let cleanedCount = 0

      for (const lock of expiredLocks) {
        try {
          // 只清理 LOCKED 或 RELEASED 狀態的鎖定
          if ([LockStatus.LOCKED, LockStatus.RELEASED].includes(lock.status)) {
            // 標記為過期
            await repository.updateStatus(lock.id, LockStatus.EXPIRED)
            cleanedCount++

            core.logger.info(`Cleaned expired lock: ${lock.id}, productId: ${lock.productId}`)
          }
        } catch (error) {
          core.logger.error(
            `Failed to clean lock ${lock.id}: ${error instanceof Error ? error.message : String(error)}`
          )
        }
      }

      return {
        cleaned: cleanedCount,
        message: `Detected and cleaned ${cleanedCount} deadlocks`,
      }
    } catch (error) {
      core.logger.error(
        `Deadlock detection failed: ${error instanceof Error ? error.message : String(error)}`
      )
      throw error
    }
  }
}
