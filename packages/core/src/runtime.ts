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
  // Escape types
  EscapeHtmlFn,
  // Markdown types
  MarkdownRenderCallbacks,
  MarkdownRenderOptions,
  OptionalRuntimeResourceUsage,
  // Runtime adapter types
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
} from './runtime/index'
export {
  // Archive
  archiveFromDirectory,
  // Markdown
  createHtmlRenderCallbacks,
  // SQLite
  createSqliteDatabase,
  // Archive adapter
  getArchiveAdapter,
  // Compression adapter
  getCompressionAdapter,
  // Escape HTML
  getEscapeHtml,
  getMarkdownAdapter,
  // Password adapter
  getPasswordAdapter,
  resetPasswordAdapter,
  // Runtime adapter
  getRuntimeAdapter,
  // Detection
  getRuntimeEnv,
  getRuntimeKind,
  resetRuntimeAdapter,
  toUint8Array,
} from './runtime/index'
