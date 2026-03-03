import { type RuntimeAdapter, type RuntimeFileSink } from './runtime'
/**
 * Safe append file operation with automatic fallback to node:fs/promises if not supported
 * @public
 */
export declare function runtimeAppendFile(
  adapter: RuntimeAdapter,
  path: string,
  data: string
): Promise<void>
/**
 * Safe text file reading with automatic fallback to node:fs/promises if not supported
 * @public
 */
export declare function runtimeReadText(adapter: RuntimeAdapter, path: string): Promise<string>
/**
 * Safe JSON file reading with automatic fallback
 * @public
 */
export declare function runtimeReadJSON<T = unknown>(
  adapter: RuntimeAdapter,
  path: string
): Promise<T>
/**
 * Safe directory creation with automatic fallback
 * @public
 */
export declare function runtimeMkdir(
  adapter: RuntimeAdapter,
  path: string,
  options?: {
    recursive?: boolean
  }
): Promise<void>
/**
 * Safe directory reading with automatic fallback
 * @public
 */
export declare function runtimeReadDir(
  adapter: RuntimeAdapter,
  path: string
): Promise<
  Array<{
    name: string
    isFile: boolean
    isDirectory: boolean
  }>
>
/**
 * Safe full file statistics reading with automatic fallback
 * @public
 */
export declare function runtimeStatFull(
  adapter: RuntimeAdapter,
  path: string
): Promise<{
  size: number
  mtimeMs: number
  isFile: boolean
  isDirectory: boolean
}>
/**
 * Safe file rename/move with automatic fallback
 * @public
 */
export declare function runtimeRename(
  adapter: RuntimeAdapter,
  oldPath: string,
  newPath: string
): Promise<void>
/**
 * Safe file sink creation with automatic fallback
 * @public
 */
export declare function runtimeCreateFileSink(
  adapter: RuntimeAdapter,
  path: string
): RuntimeFileSink
/**
 * Safe recursive directory removal with automatic fallback
 * @public
 */
export declare function runtimeRemoveRecursive(adapter: RuntimeAdapter, path: string): Promise<void>
/**
 * Safe exclusive file write with automatic fallback
 * @public
 */
export declare function runtimeWriteFileExclusive(
  adapter: RuntimeAdapter,
  path: string,
  data: string | Uint8Array
): Promise<void>
/**
 * Get default runtime adapter instance
 * @public
 */
export declare function getDefaultRuntimeAdapter(): RuntimeAdapter
