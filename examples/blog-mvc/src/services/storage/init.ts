import type { GravitoContext, GravitoNext, PlanetCore } from '@gravito/core'
import { storageConfig } from '../../config/storage'
import { LocalDriver } from './drivers/LocalDriver'
import { MockCloudDriver } from './drivers/MockCloudDriver'
import { StorageManager } from './StorageManager'

export async function initializeStorage(core: PlanetCore) {
  const storage = new StorageManager(storageConfig.default)

  // Driver Registry
  const drivers: Record<string, any> = {
    local: LocalDriver,
    's3-mock': MockCloudDriver,
  }

  // Register configured disks
  for (const [name, diskConfig] of Object.entries(storageConfig.disks)) {
    const DriverClass = drivers[diskConfig.driver]
    if (DriverClass) {
      storage.register(name, new DriverClass(diskConfig))
    }
  }

  // Inject storage service into context
  core.adapter.use('*', async (c: GravitoContext, next: GravitoNext) => {
    c.set('storage', storage)
    return (await next()) as any
  })
}
