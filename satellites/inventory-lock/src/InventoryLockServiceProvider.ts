/**
 * Inventory-Lock Service Provider
 *
 * 責任：
 * 1. 註冊所有 Use Cases 到容器
 * 2. 註冊 Repository 實現
 * 3. 設置事件監聽
 * 4. 啟動超時清理定時任務
 */

import type { PlanetCore } from '@gravito/core'
import { DeductInventory } from './Application/UseCases/DeductInventory'
import { DetectDeadlock } from './Application/UseCases/DetectDeadlock'
import { LockInventory } from './Application/UseCases/LockInventory'
import { ReleaseInventory } from './Application/UseCases/ReleaseInventory'
import { MockInventoryLockRepository } from './Infrastructure/Repositories/MockInventoryLockRepository'

export class InventoryLockServiceProvider {
  static async boot(core: PlanetCore): Promise<void> {
    const { container, logger } = core

    logger.info('[Inventory-Lock] Booting service provider')

    // 1. 註冊 Repository
    container.singleton('inventoryLock.repository', () => new MockInventoryLockRepository(core))

    // 2. 註冊 Use Cases
    container.singleton('inventoryLock.usecase.lock', () => new LockInventory(core))
    container.singleton('inventoryLock.usecase.release', () => new ReleaseInventory(core))
    container.singleton('inventoryLock.usecase.deduct', () => new DeductInventory(core))
    container.singleton('inventoryLock.usecase.detectDeadlock', () => new DetectDeadlock(core))

    logger.info('[Inventory-Lock] Service provider booted successfully')
  }

  static async start(core: PlanetCore): Promise<void> {
    const { logger } = core

    logger.info('[Inventory-Lock] Starting service')

    // 1. 啟動超時清理定時任務（每 5 分鐘執行一次）
    const detectDeadlock = core.container.make('inventoryLock.usecase.detectDeadlock')
    const cleanupInterval = setInterval(
      async () => {
        try {
          const result = await detectDeadlock.execute()
          if (result.cleaned > 0) {
            logger.info(`[Inventory-Lock] Cleanup task: ${result.message}`)
          }
        } catch (error) {
          logger.error(`[Inventory-Lock] Cleanup task failed: ${String(error)}`)
        }
      },
      5 * 60 * 1000
    ) // 5 分鐘

    // 2. 在應用程式關閉時清理定時任務
    if (typeof process !== 'undefined' && process.on) {
      process.on('exit', () => {
        clearInterval(cleanupInterval)
      })
    }

    logger.info('[Inventory-Lock] Service started successfully')
  }
}
