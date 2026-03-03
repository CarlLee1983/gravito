/**
 * Runtime abstraction module.
 *
 * Provides unified APIs for filesystem, process, archive, and compression
 * operations across Bun, Node.js, and Deno runtimes.
 *
 * @module runtime
 * @since 3.2.0
 */
import type { RuntimeAdapter, RuntimePasswordAdapter, RuntimeSqliteDatabase } from './types'
export type {
  ArchiveCreateOptions,
  ArchiveEntry,
  ArchiveExtractOptions,
  ArchiveFileInfo,
  ArchiveFromDirectoryOptions,
  CompressionOptions,
  MarkdownRenderCallbacks,
  MarkdownRenderOptions,
  OptionalRuntimeResourceUsage,
  RuntimeAdapter,
  RuntimeArchiveAdapter,
  RuntimeCompressionAdapter,
  RuntimeFileSink,
  RuntimeFileStat,
  RuntimeKind,
  RuntimeMarkdownAdapter,
  RuntimePasswordAdapter,
  RuntimeProcess,
  RuntimeProcessOutput,
  RuntimeResourceUsage,
  RuntimeServeConfig,
  RuntimeServer,
  RuntimeSpawnOptions,
  RuntimeSpawnSyncResult,
  RuntimeSqliteDatabase,
  RuntimeSqliteStatement,
} from './types'
export { getRuntimeEnv, getRuntimeKind } from './detection'
export { archiveFromDirectory, getArchiveAdapter } from './archive'
export { getCompressionAdapter } from './compression'
export { createHtmlRenderCallbacks, getMarkdownAdapter } from './markdown'
export type { DeepEqualsFn, DeepEqualsOptions } from './deep-equals'
export { getDeepEquals } from './deep-equals'
export type { EscapeHtmlFn } from './escape'
export { getEscapeHtml } from './escape'
/**
 * Get the runtime abstraction adapter (Bun/Node/Deno).
 * @public
 */
export declare function getRuntimeAdapter(): RuntimeAdapter
/**
 * Reset the runtime adapter (mainly for testing).
 * @internal
 */
export declare function resetRuntimeAdapter(): void
/**
 * Get the password hashing adapter using native optimized implementations if available.
 * @public
 */
export declare function getPasswordAdapter(): RuntimePasswordAdapter
/**
 * Create a SQLite database connection using runtime-native drivers.
 * @public
 */
export declare function createSqliteDatabase(path: string): Promise<RuntimeSqliteDatabase>
/**
 * Convert various data types to Uint8Array.
 * @internal
 */
export declare function toUint8Array(
  data: Blob | Buffer | string | ArrayBuffer | Uint8Array
): Promise<Uint8Array>
