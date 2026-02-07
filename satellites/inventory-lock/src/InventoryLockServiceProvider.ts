/**
 * Inventory-Lock Service Provider
 *
 * 責任：
 * 1. 註冊所有 Use Cases 到容器
 * 2. 註冊 Repository 實現
 * 3. 設置事件監聽
 * 4. 啟動超時清理定時任務
 */

import type { Container, PlanetCore } from '@gravito/core'
import { ServiceProvider } from '@gravito/core'
import { DeductInventory } from './Application/UseCases/DeductInventory'
import { DetectDeadlock } from './Application/UseCases/DetectDeadlock'
import { LockInventory } from './Application/UseCases/LockInventory'
import { ReleaseInventory } from './Application/UseCases/ReleaseInventory'
import { MockInventoryLockRepository } from './Infrastructure/Repositories/MockInventoryLockRepository'

export class InventoryLockServiceProvider extends ServiceProvider {
  /**
   * 註冊階段：綁定所有服務到容器
   */
  register(container: Container): void {
    // 1. 註冊 Repository
    container.singleton('inventoryLock.repository', () => {
      const core = this.core
      if (!core) throw new Error('Core not initialized')
      return new MockInventoryLockRepository(core)
    })

    // 2. 註冊 Use Cases
    container.singleton('inventoryLock.usecase.lock', () => {
      const core = this.core
      if (!core) throw new Error('Core not initialized')
      return new LockInventory(core)
    })
    container.singleton('inventoryLock.usecase.release', () => {
      const core = this.core
      if (!core) throw new Error('Core not initialized')
      return new ReleaseInventory(core)
    })
    container.singleton('inventoryLock.usecase.deduct', () => {
      const core = this.core
      if (!core) throw new Error('Core not initialized')
      return new DeductInventory(core)
    })
    container.singleton('inventoryLock.usecase.detectDeadlock', () => {
      const core = this.core
      if (!core) throw new Error('Core not initialized')
      return new DetectDeadlock(core)
    })
  }

  /**
   * 啟動階段：初始化服務和啟動定時任務
   */
  override boot(): void {
    const core = this.core
    if (!core) return

    core.logger.info('[Inventory-Lock] Booting service provider')

    // 1. 啟動超時清理定時任務（每 5 分鐘執行一次）
    const detectDeadlock = core.container.make<DetectDeadlock>(
      'inventoryLock.usecase.detectDeadlock'
    )
    const cleanupInterval = setInterval(
      async () => {
        try {
          const result = await detectDeadlock.execute()
          if (result.cleaned > 0) {
            core.logger.info(`[Inventory-Lock] Cleanup task: ${result.message}`)
          }
        } catch (error) {
          core.logger.error(`[Inventory-Lock] Cleanup task failed: ${String(error)}`)
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

    core.logger.info('[Inventory-Lock] Service provider booted successfully')
  }
}
