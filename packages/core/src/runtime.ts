/**
 * Runtime abstraction module (barrel re-export).
 *
 * This file re-exports all runtime types and functions from the
 * modular runtime/ directory for backward compatibility.
 *
 * @module runtime
 * @since 3.2.0
 */

export type {
  // Archive types
  ArchiveCreateOptions,
  ArchiveEntry,
  ArchiveExtractOptions,
  ArchiveFileInfo,
  ArchiveFromDirectoryOptions,
  // Compression types
  CompressionOptions,
  // Markdown types
  MarkdownRenderCallbacks,
  MarkdownRenderOptions,
  OptionalRuntimeResourceUsage,
  // Runtime adapter types
  RuntimeAdapter,
  RuntimeArchiveAdapter,
  RuntimeCompressionAdapter,
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
} from './runtime/index'
export {
  // Archive
  archiveFromDirectory,
  // Markdown adapter
  createHtmlRenderCallbacks,
  // SQLite
  createSqliteDatabase,
  // Archive adapter
  getArchiveAdapter,
  // Compression adapter
  getCompressionAdapter,
  getMarkdownAdapter,
  // Password adapter
  getPasswordAdapter,
  // Runtime adapter
  getRuntimeAdapter,
  // Detection
  getRuntimeEnv,
  getRuntimeKind,
} from './runtime/index'
