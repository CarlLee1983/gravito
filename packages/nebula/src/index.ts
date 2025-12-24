import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { GravitoOrbit, PlanetCore } from 'gravito-core'

export interface StorageProvider {
  put(key: string, data: Blob | Buffer | string): Promise<void>
  get(key: string): Promise<Blob | null>
  delete(key: string): Promise<void>
  getUrl(key: string): string
}

/**
 * Local storage provider implementation.
 */
export class LocalStorageProvider implements StorageProvider {
  private rootDir: string
  private baseUrl: string

  /**
   * Create a new LocalStorageProvider.
   *
   * @param rootDir - The root directory for storage.
   * @param baseUrl - The base URL for accessing stored files.
   */
  constructor(rootDir: string, baseUrl = '/storage') {
    this.rootDir = rootDir
    this.baseUrl = baseUrl
  }

  /**
   * Store data in a file.
   *
   * @param key - The storage key (path).
   * @param data - The data to store.
   */
  async put(key: string, data: Blob | Buffer | string): Promise<void> {
    const path = join(this.rootDir, key)
    // Ensure dir exists
    const dir = path.substring(0, path.lastIndexOf('/'))
    if (dir && dir !== this.rootDir) {
      await mkdir(dir, { recursive: true })
    }
    await Bun.write(path, data)
  }

  /**
   * Retrieve a file.
   *
   * @param key - The storage key.
   * @returns A promise resolving to the file Blob or null if not found.
   */
  async get(key: string): Promise<Blob | null> {
    const file = Bun.file(join(this.rootDir, key))
    if (!(await file.exists())) {
      return null
    }
    return file
  }

  /**
   * Delete a file.
   *
   * @param key - The storage key.
   */
  async delete(key: string): Promise<void> {
    // Bun currently lacks a direct 'unlink' API in Bun.file, using fs/promises is safer for checking
    // But actually, Node COMPAT layer is preferred.
    // Or just use shell for "rm"? No, unsafe.
    // Let's use simple node:fs for deletion.
    const fs = await import('node:fs/promises')
    try {
      await fs.unlink(join(this.rootDir, key))
    } catch {
      // Ignore if not found
    }
  }

  /**
   * Get the public URL for a file.
   *
   * @param key - The storage key.
   * @returns The public URL string.
   */
  getUrl(key: string): string {
    return `${this.baseUrl}/${key}`
  }
}

export interface OrbitNebulaOptions {
  provider?: StorageProvider
  exposeAs?: string // Default: 'storage'
  local?: {
    root: string
    baseUrl?: string
  }
}

/** @deprecated Use OrbitNebulaOptions instead */
export type OrbitStorageOptions = OrbitNebulaOptions

/**
 * OrbitNebula - Storage Orbit
 *
 * Provides file storage functionality for Gravito applications.
 */
export class OrbitNebula implements GravitoOrbit {
  constructor(private options?: OrbitNebulaOptions) { }

  /**
   * Install storage service into PlanetCore.
   *
   * @param core - The PlanetCore instance.
   * @throws {Error} If configuration or provider is missing.
   */
  install(core: PlanetCore): void {
    const config = this.options || core.config.get('storage')

    if (!config) {
      throw new Error(
        '[OrbitNebula] Configuration is required. Please provide options or set "storage" in core config.'
      )
    }

    const { exposeAs = 'storage' } = config
    const logger = core.logger

    logger.info(`[OrbitNebula] Initializing Storage (Exposed as: ${exposeAs})`)

    let provider = config.provider

    // Default to LocalStorage if not provided and local options are present
    if (!provider && config.local) {
      logger.info(`[OrbitNebula] Using LocalStorageProvider at ${config.local.root}`)
      provider = new LocalStorageProvider(config.local.root, config.local.baseUrl)
    }

    if (!provider) {
      throw new Error(
        '[OrbitNebula] No provider configured. Please provide a provider instance or local configuration.'
      )
    }

    const storageService: StorageProvider = {
      put: async (key: string, data: Blob | Buffer | string) => {
        // Hook: storage:upload
        const finalData = await core.hooks.applyFilters('storage:upload', data, { key })
        await provider?.put(key, finalData)
        // Action: storage:uploaded
        await core.hooks.doAction('storage:uploaded', { key })
      },
      get: (key: string) => provider?.get(key),
      delete: (key: string) => provider?.delete(key),
      getUrl: (key: string) => provider?.getUrl(key),
    }

    // Inject helper into context
    core.adapter.use('*', async (c: any, next: any) => {
      c.set(exposeAs, storageService)
      await next()
      return undefined
    })

    // Action: Storage Initialized
    core.hooks.doAction('storage:init', storageService)
  }
}

/**
 * Functional API for installing OrbitNebula.
 *
 * @param core - The PlanetCore instance.
 * @param options - Storage options.
 * @returns The configured storage provider wrapper.
 * @throws {Error} If provider is not configured.
 */
export default function orbitStorage(core: PlanetCore, options: OrbitNebulaOptions) {
  const orbit = new OrbitNebula(options)
  orbit.install(core)

  // NOTE: Functional wrapper requires specific return implementation which can't be easily extracted from void install()
  // Re-implementing minimal return logic for backward compatibility
  // This duplicates the service creation/wrapping logic - acceptable for legacy support
  let provider = options.provider
  if (!provider && options.local) {
    provider = new LocalStorageProvider(options.local.root, options.local.baseUrl)
  }

  // Notice: The class version adds hooks wrapper, we should probably do the same here to be consistent
  // Or simply rely on the fact that hooks/actions were registered inside install()
  // But wait, user gets the RETURNED object. If we return the raw provider, hooks in 'put' won't fire
  // unless user calls c.get('storage').
  // If user calls returnedService.put(), it bypasses the hooks wrapper created inside install().

  // To fix this without massive duplication, let's just return a proxy that delegates to Context?
  // No, context is per request.

  // Let's accept that the "Returned Object" from functional API is the raw provider wrapped.
  // We duplicate the wrapper logic here for safety.

  if (!provider) {
    throw new Error('[OrbitNebula] No provider configured.')
  }

  return {
    put: async (key: string, data: Blob | Buffer | string) => {
      const finalData = await core.hooks.applyFilters('storage:upload', data, { key })
      await provider?.put(key, finalData)
      await core.hooks.doAction('storage:uploaded', { key })
    },
    get: (key: string) => provider?.get(key),
    delete: (key: string) => provider?.delete(key),
    getUrl: (key: string) => provider?.getUrl(key),
  }
}

/** @deprecated Use OrbitNebula instead */
export const OrbitStorage = OrbitNebula

