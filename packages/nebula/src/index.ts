import type { GravitoContext, GravitoNext, GravitoOrbit, PlanetCore } from '@gravito/core'
import { StorageManager } from './StorageManager'
import type { StorageStore } from './store'
import { LocalStore } from './stores/LocalStore'
import { MemoryStore } from './stores/MemoryStore'
import { NullStore } from './stores/NullStore'
import type { OrbitNebulaOptions, StorageHooks } from './types'

export * from './StorageManager'
export * from './StorageRepository'
export * from './store'
export * from './stores/LocalStore'
export * from './stores/MemoryStore'
export * from './stores/NullStore'
export * from './types'

/** @deprecated Use StorageStore instead */
export type StorageProvider = StorageStore

/** @deprecated Use LocalStore instead */
export { LocalStore as LocalStorageProvider }

/** @deprecated Use OrbitNebulaOptions instead */
export type OrbitStorageOptions = OrbitNebulaOptions

/**
 * OrbitNebula provides a unified file storage abstraction for Gravito.
 *
 * It supports multiple backends (local, S3, etc.) via the StorageManager.
 *
 * @example
 * ```typescript
 * const nebula = new OrbitNebula({
 *   default: 'local',
 *   disks: {
 *     local: { driver: 'local', root: './uploads' }
 *   }
 * });
 * core.addOrbit(nebula);
 * ```
 *
 * @public
 * @since 3.0.0 (Refactored in 4.0.0)
 */
export class OrbitNebula implements GravitoOrbit {
  private manager?: StorageManager

  constructor(private options?: OrbitNebulaOptions) {}

  /**
   * Install storage service into PlanetCore.
   *
   * @param core - The PlanetCore instance.
   */
  install(core: PlanetCore): void {
    const config = this.options || core.config.get('storage')

    if (!config) {
      throw new Error(
        '[OrbitNebula] Configuration is required. Please provide options or set "storage" in core config.'
      )
    }

    const { exposeAs = 'storage' } = config
    core.logger.info(`[OrbitNebula] Initializing Storage (Exposed as: ${exposeAs})`)

    let defaultDisk = config.default
    if (!defaultDisk) {
      if (config.local) defaultDisk = 'local'
      else if (config.provider) defaultDisk = 'custom'
      else defaultDisk = 'local'
    }

    const managerOptions = {
      default: defaultDisk,
    }

    const storageHooks: StorageHooks = {
      applyFilter: (h, v, c) => core.hooks.applyFilters(h, v, c),
      doAction: (h, c) => core.hooks.doAction(h, c),
    }

    const storeFactory = this.createStoreFactory(config)
    this.manager = new StorageManager(storeFactory, managerOptions, storageHooks)

    // Validate default disk configuration immediately
    this.manager.disk()

    core.container.instance(exposeAs, this.manager)

    core.adapter.use('*', async (c: GravitoContext, next: GravitoNext) => {
      c.set(exposeAs, this.manager)
      await next()
      return undefined
    })

    core.hooks.doAction('storage:init', { manager: this.manager })
  }

  /**
   * Get the installed StorageManager instance.
   *
   * @returns The StorageManager instance.
   * @throws {Error} If not installed.
   */
  getStorage(): StorageManager {
    if (!this.manager) {
      throw new Error('[OrbitNebula] StorageManager not initialized. Call install() first.')
    }
    return this.manager
  }

  private createStoreFactory(options: OrbitNebulaOptions) {
    return (name: string): StorageStore => {
      const config = options.disks?.[name]

      if (config) {
        if (config.driver === 'local') {
          return new LocalStore(config.root, config.baseUrl)
        }
        if (config.driver === 'memory') {
          return new MemoryStore()
        }
        if (config.driver === 'null') {
          return new NullStore()
        }
        if (config.driver === 'custom') {
          return config.store
        }
      }

      if (name === 'local' && options.local) {
        return new LocalStore(options.local.root, options.local.baseUrl)
      }

      if (options.provider) {
        if (name === 'custom' || (!options.disks && !options.local)) {
          return options.provider
        }
      }

      throw new Error(`[OrbitNebula] Driver not configured for disk: ${name}`)
    }
  }
}

/**
 * Functional API for installing OrbitNebula.
 *
 * @param core - The PlanetCore instance.
 * @param options - Storage options.
 * @returns The StorageManager instance.
 */
export default function orbitStorage(
  core: PlanetCore,
  options: OrbitNebulaOptions
): StorageManager {
  const orbit = new OrbitNebula(options)
  orbit.install(core)
  return orbit.getStorage()
}

/** @deprecated Use OrbitNebula instead */
export const OrbitStorage = OrbitNebula

declare module '@gravito/core' {
  interface GravitoVariables {
    /** File storage service */
    storage: StorageManager
  }
}
