import type { StorageDriver } from './types'

export class StorageManager {
  private drivers: Map<string, StorageDriver> = new Map()
  private defaultDriverName: string

  constructor(defaultDriver: string) {
    this.defaultDriverName = defaultDriver
  }

  register(name: string, driver: StorageDriver) {
    this.drivers.set(name, driver)
  }

  disk(name?: string): StorageDriver {
    const driverName = name || this.defaultDriverName
    const driver = this.drivers.get(driverName)

    if (!driver) {
      throw new Error(`Storage driver [${driverName}] not found.`)
    }

    return driver
  }
}
