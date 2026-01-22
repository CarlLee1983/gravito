import type { StorageStore } from './store'

/**
 * 單一磁碟配置
 * @public
 */
export type OrbitNebulaStoreConfig =
  | {
      driver: 'local'
      root: string
      baseUrl?: string
    }
  | {
      driver: 'memory'
    }
  | {
      driver: 'null'
    }
  | {
      driver: 'custom'
      store: StorageStore
    }

/**
 * OrbitNebula 配置選項
 * @public
 */
export interface OrbitNebulaOptions {
  default?: string
  exposeAs?: string
  disks?: Record<string, OrbitNebulaStoreConfig>
  eventsMode?: 'sync' | 'async'

  /** @deprecated 使用 disks.local 替代 */
  local?: { root: string; baseUrl?: string }
  /** @deprecated 使用 disks[name] = { driver: 'custom', store } 替代 */
  provider?: StorageStore
}

/**
 * Hooks 回調介面
 * @internal
 */
export interface StorageHooks {
  applyFilter<T>(hook: string, value: T, context?: Record<string, unknown>): Promise<T>
  doAction(hook: string, context?: Record<string, unknown>): Promise<void>
}
