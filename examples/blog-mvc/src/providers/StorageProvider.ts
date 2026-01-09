/**
 * Storage Service Provider
 *
 * Registers storage drivers and injects storage service into context.
 *
 * Lifecycle:
 * - register(): Bind storage configuration
 * - boot(): Initialize drivers and middleware
 */

import {
  type Container,
  type GravitoContext,
  type GravitoNext,
  type PlanetCore,
  ServiceProvider,
} from '@gravito/core'
import { storageConfig } from '../config/storage'
import { LocalDriver } from '../services/storage/drivers/LocalDriver'
import { MockCloudDriver } from '../services/storage/drivers/MockCloudDriver'
import { StorageManager } from '../services/storage/StorageManager'

export class StorageProvider extends ServiceProvider {
  private storage!: StorageManager

  /**
   * Register storage bindings.
   */
  register(container: Container): void {
    this.storage = new StorageManager(storageConfig.default)

    // Register drivers
    const drivers: Record<string, any> = {
      local: LocalDriver,
      's3-mock': MockCloudDriver,
    }

    for (const [name, diskConfig] of Object.entries(storageConfig.disks)) {
      const DriverClass = drivers[diskConfig.driver]
      if (DriverClass) {
        this.storage.register(name, new DriverClass(diskConfig))
      }
    }

    // Bind to container for DI
    container.singleton('storage', () => this.storage)
  }

  /**
   * Inject storage into request context.
   */
  boot(core: PlanetCore): void {
    core.adapter.use('*', async (c: GravitoContext, next: GravitoNext) => {
      c.set('storage', this.storage)
      return (await next()) as any
    })

    core.logger.info('💾 Storage initialized')
  }
}
