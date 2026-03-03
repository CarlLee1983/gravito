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
  ArchiveCreateOptions,
  ArchiveEntry,
  ArchiveExtractOptions,
  ArchiveFileInfo,
  ArchiveFromDirectoryOptions,
  CompressionOptions,
  EscapeHtmlFn,
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
} from './runtime/index'
export {
  archiveFromDirectory,
  createHtmlRenderCallbacks,
  createSqliteDatabase,
  getArchiveAdapter,
  getCompressionAdapter,
  getEscapeHtml,
  getMarkdownAdapter,
  getPasswordAdapter,
  getRuntimeAdapter,
  getRuntimeEnv,
  getRuntimeKind,
  toUint8Array,
} from './runtime/index'
