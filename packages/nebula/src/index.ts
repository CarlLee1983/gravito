import { mkdir } from 'node:fs/promises'
import { isAbsolute, normalize, resolve, sep } from 'node:path'
import {
  type GravitoContext,
  type GravitoNext,
  type GravitoOrbit,
  getRuntimeAdapter,
  type PlanetCore,
} from '@gravito/core'

/**
 * Interface for a file storage provider.
 *
 * All storage backends (Local, S3, Cloudinary, etc.) must implement this interface.
 * It provides a consistent API for file operations across different runtimes
 * and cloud providers.
 *
 * @public
 * @since 3.0.0
 */
export interface StorageProvider {
  /**
   * Save data to the storage backend.
   *
   * @param key - Unique identifier or path for the file (e.g., 'avatars/user1.jpg').
   * @param data - The file content as a Blob, Buffer, or string.
   * @returns A promise that resolves when the file is successfully saved.
   */
  put(key: string, data: Blob | Buffer | string): Promise<void>

  /**
   * Retrieve a file from the storage backend.
   *
   * @param key - The file identifier or path.
   * @returns The file as a Blob, or null if the file does not exist.
   */
  get(key: string): Promise<Blob | null>

  /**
   * Remove a file from the storage backend.
   *
   * @param key - The file identifier or path to delete.
   * @returns A promise that resolves when the file is deleted.
   */
  delete(key: string): Promise<void>

  /**
   * Get a publicly accessible URL for the given file key.
   *
   * Note: This may return a relative URL for local storage or a full URL
   * for cloud storage providers.
   *
   * @param key - The file identifier or path.
   * @returns The public URL string.
   */
  getUrl(key: string): string
}

/**
 * Local file system storage provider.
 *
 * Stores files on the local disk using the configured root directory and
 * resolves URLs using a provided base URL prefix.
 *
 * @example
 * ```typescript
 * const local = new LocalStorageProvider('./storage', '/files');
 * await local.put('hello.txt', 'Hello World');
 * console.log(local.getUrl('hello.txt')); // "/files/hello.txt"
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class LocalStorageProvider implements StorageProvider {
  private rootDir: string
  private baseUrl: string
  private runtime = getRuntimeAdapter()

  /**
   * Create a new LocalStorageProvider.
   *
   * @param rootDir - The absolute path to the local storage directory.
   * @param baseUrl - The public URL path for accessing stored files (e.g., '/storage').
   */
  constructor(rootDir: string, baseUrl = '/storage') {
    this.rootDir = rootDir
    this.baseUrl = baseUrl
  }

  /**
   * Write data to the local disk.
   */
  async put(key: string, data: Blob | Buffer | string): Promise<void> {
    const path = this.resolveKeyPath(key)
    // Ensure dir exists
    const dir = path.substring(0, path.lastIndexOf('/'))
    if (dir && dir !== this.rootDir) {
      await mkdir(dir, { recursive: true })
    }
    await this.runtime.writeFile(path, data)
  }

  /**
   * Read data from the local disk.
   */
  async get(key: string): Promise<Blob | null> {
    const path = this.resolveKeyPath(key)
    if (!(await this.runtime.exists(path))) {
      return null
    }
    return await this.runtime.readFileAsBlob(path)
  }

  /**
   * Delete a file from the local disk.
   */
  async delete(key: string): Promise<void> {
    await this.runtime.deleteFile(this.resolveKeyPath(key))
  }

  /**
   * Resolve the public URL for a locally stored file.
   */
  getUrl(key: string): string {
    const safeKey = this.normalizeKey(key)
    return `${this.baseUrl}/${safeKey}`
  }

  private normalizeKey(key: string): string {
    if (!key || key.includes('\0')) {
      throw new Error('Invalid storage key.')
    }
    const normalized = normalize(key).replace(/^[/\\]+/, '')
    if (
      normalized === '.' ||
      normalized === '..' ||
      normalized.startsWith(`..${sep}`) ||
      isAbsolute(normalized)
    ) {
      throw new Error('Invalid storage key.')
    }
    return normalized.replace(/\\/g, '/')
  }

  private resolveKeyPath(key: string): string {
    const normalized = this.normalizeKey(key)
    const root = resolve(this.rootDir)
    const resolved = resolve(root, normalized)
    const rootPrefix = root.endsWith(sep) ? root : `${root}${sep}`
    if (!resolved.startsWith(rootPrefix) && resolved !== root) {
      throw new Error('Invalid storage key.')
    }
    return resolved
  }
}

/**
 * Configuration options for the Nebula Storage Orbit.
 *
 * @public
 * @since 3.0.0
 */
export interface OrbitNebulaOptions {
  /**
   * Custom storage provider instance (e.g., S3Provider).
   * If not provided, a LocalStorageProvider will be created if `local` options are set.
   */
  provider?: StorageProvider

  /**
   * The key used to expose the storage service in the request context.
   * @default 'storage'
   */
  exposeAs?: string

  /** Configuration for the default LocalStorageProvider. */
  local?: {
    /** Absolute or relative path to the root directory on disk. */
    root: string
    /** Base URL prefix for serving files (e.g., '/public/storage'). @default '/storage' */
    baseUrl?: string
  }
}

/** @deprecated Use OrbitNebulaOptions instead */
export type OrbitStorageOptions = OrbitNebulaOptions

/**
 * OrbitNebula provides a unified file storage abstraction for Gravito.
 *
 * It supports multiple backends (local, S3, etc.) and provides a consistent API
 * for file operations. It also integrates with Gravito's hook system for
 * filtering uploads (`storage:upload`) and reacting to events (`storage:uploaded`).
 *
 * @example
 * ```typescript
 * const nebula = new OrbitNebula({
 *   local: { root: './storage', baseUrl: '/public' }
 * });
 * core.addOrbit(nebula);
 *
 * // Usage in controller
 * const storage = c.get('storage');
 * await storage.put('example.txt', 'Content');
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class OrbitNebula implements GravitoOrbit {
  constructor(private options?: OrbitNebulaOptions) {}

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

    // Register in core container for global access (CLI/Jobs)
    core.container.instance(exposeAs, storageService)

    // Inject helper into context
    core.adapter.use('*', async (c: GravitoContext, next: GravitoNext) => {
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

declare module '@gravito/core' {
  interface GravitoVariables {
    /** File storage service */
    storage: StorageProvider
  }
}
