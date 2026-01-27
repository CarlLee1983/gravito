import type { StorageStore } from './store'

/**
 * OrbitNebulaStoreConfig defines the configuration for a single storage disk.
 *
 * It supports multiple driver types, each with its own specific configuration requirements.
 *
 * 單一磁碟配置
 * @public
 */
export type OrbitNebulaStoreConfig =
  | {
      /** Local filesystem driver */
      driver: 'local'
      /** Root directory for file storage */
      root: string
      /** Base URL for generating public links */
      baseUrl?: string
    }
  | {
      /** Volatile in-memory driver */
      driver: 'memory'
    }
  | {
      /** No-op driver for disabling storage */
      driver: 'null'
    }
  | {
      /** Custom driver implementation */
      driver: 'custom'
      /** The custom store instance */
      store: StorageStore
    }

/**
 * OrbitNebulaOptions defines the global configuration for the Nebula orbit.
 *
 * It allows configuring multiple disks, the default disk, and how the service
 * is exposed in the Gravito context.
 *
 * OrbitNebula 配置選項
 * @public
 */
export interface OrbitNebulaOptions {
  /** The name of the default disk to use when none is specified */
  default?: string
  /** The key used to expose the StorageManager in the context (default: 'storage') */
  exposeAs?: string
  /** A map of disk names to their respective configurations */
  disks?: Record<string, OrbitNebulaStoreConfig>
  /** Execution mode for storage hooks */
  eventsMode?: 'sync' | 'async'

  /** @deprecated 使用 disks.local 替代 */
  local?: { root: string; baseUrl?: string }
  /** @deprecated 使用 disks[name] = { driver: 'custom', store } 替代 */
  provider?: StorageStore
}

/**
 * StorageHooks defines the internal interface for triggering Gravito hooks.
 *
 * Hooks 回調介面
 * @internal
 */
export interface StorageHooks {
  /** Applies a filter hook to a value */
  applyFilter<T>(hook: string, value: T, context?: Record<string, unknown>): Promise<T>
  /** Executes an action hook */
  doAction(hook: string, context?: Record<string, unknown>): Promise<void>
}
