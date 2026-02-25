/**
 * Runtime abstraction module.
 *
 * Provides unified APIs for filesystem, process, archive, and compression
 * operations across Bun, Node.js, and Deno runtimes.
 *
 * @module runtime
 * @since 3.2.0
 */

import { createBunAdapter } from './adapter-bun'
import { createDenoAdapter } from './adapter-deno'
import { createNodeAdapter } from './adapter-node'
import { createUnknownAdapter } from './adapter-unknown'
import { getRuntimeKind } from './detection'
import type { RuntimeAdapter, RuntimePasswordAdapter, RuntimeSqliteDatabase } from './types'

// ============ Type Exports ============

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

// ============ Detection Exports ============

export { getRuntimeEnv, getRuntimeKind } from './detection'

// ============ Archive Exports ============

export {
  archiveFromDirectory,
  getArchiveAdapter,
} from './archive'

// ============ Compression Exports ============

export { getCompressionAdapter } from './compression'

// ============ Markdown Exports ============

export { createHtmlRenderCallbacks, getMarkdownAdapter } from './markdown'

// ============ Escape Exports ============

export type { EscapeHtmlFn } from './escape'
export { getEscapeHtml } from './escape'

// ============ Runtime Adapter Singleton ============

let runtimeAdapter: RuntimeAdapter | null = null

/**
 * Get the runtime abstraction adapter (Bun/Node/Deno).
 * @public
 */
export function getRuntimeAdapter(): RuntimeAdapter {
  if (runtimeAdapter) {
    return runtimeAdapter
  }
  const kind = getRuntimeKind()
  switch (kind) {
    case 'bun':
      runtimeAdapter = createBunAdapter()
      break
    case 'node':
      runtimeAdapter = createNodeAdapter()
      break
    case 'deno':
      runtimeAdapter = createDenoAdapter()
      break
    default:
      runtimeAdapter = createUnknownAdapter()
  }
  return runtimeAdapter
}

// ============ Password Adapter Singleton ============

let passwordAdapter: RuntimePasswordAdapter | null = null

/**
 * Get the password hashing adapter using native optimized implementations if available.
 * @public
 */
export function getPasswordAdapter(): RuntimePasswordAdapter {
  if (passwordAdapter) {
    return passwordAdapter
  }
  const kind = getRuntimeKind()
  if (kind === 'bun' && typeof Bun !== 'undefined') {
    passwordAdapter = {
      async hash(value, options) {
        if (options.algorithm === 'bcrypt') {
          return await Bun.password.hash(value, {
            algorithm: 'bcrypt',
            cost: options.cost ?? 12,
          })
        }
        return await Bun.password.hash(value, {
          algorithm: 'argon2id',
          ...(options.memoryCost !== undefined ? { memoryCost: options.memoryCost } : {}),
          ...(options.timeCost !== undefined ? { timeCost: options.timeCost } : {}),
          ...(options.parallelism !== undefined ? { parallelism: options.parallelism } : {}),
        })
      },
      async verify(value, hashed) {
        return await Bun.password.verify(value, hashed)
      },
    }
    return passwordAdapter
  }

  const message = '[RuntimeAdapter] Password hashing requires Bun runtime or a Node/Deno adapter'
  passwordAdapter = {
    async hash() {
      throw new Error(message)
    },
    async verify() {
      throw new Error(message)
    },
  }
  return passwordAdapter
}

// ============ SQLite Adapter ============

/**
 * Create a SQLite database connection using runtime-native drivers.
 * @public
 */
export async function createSqliteDatabase(path: string): Promise<RuntimeSqliteDatabase> {
  const kind = getRuntimeKind()
  if (kind === 'bun') {
    const sqlite = await import('bun:sqlite')
    const db = new sqlite.Database(path, { create: true })
    return db as RuntimeSqliteDatabase
  }

  throw new Error('[RuntimeAdapter] SQLite storage requires Bun runtime or a Node/Deno adapter')
}

/**
 * Convert various data types to Uint8Array.
 * @internal
 */
export async function toUint8Array(
  data: Blob | Buffer | string | ArrayBuffer | Uint8Array
): Promise<Uint8Array> {
  if (data instanceof Uint8Array) {
    return data
  }
  if (typeof data === 'string') {
    return new TextEncoder().encode(data)
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data)
  }
  if (typeof Buffer !== 'undefined' && data instanceof Buffer) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  }
  if (data instanceof Blob) {
    return new Uint8Array(await data.arrayBuffer())
  }
  return new Uint8Array()
}
