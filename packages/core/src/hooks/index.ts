/**
 * Hook subsystem 的公開匯出。
 *
 * 此 barrel file 匯出 hook 系統所有的型別定義和子模組。
 * HookManager facade 已在 ../HookManager.ts 中，對外繼續透過 index.ts 匯出。
 */

// 型別定義
export type {
  FilterCallback,
  ActionCallback,
  ListenerOptions,
  ListenerInfo,
  HookManagerConfig,
} from './types'

// 子模組（可用於測試或進階整合）
export { FilterManager } from './FilterManager'
export { ActionManager } from './ActionManager'
export { AsyncDetector } from './AsyncDetector'
export { MigrationWarner } from './MigrationWarner'
