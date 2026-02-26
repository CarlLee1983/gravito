/**
 * Runtime compression adapter implementations.
 *
 * Provides unified gzip/deflate compression across Bun and Node.js runtimes.
 * Bun uses native C++ implementations (Bun.gzipSync etc.) for 2-5x better performance.
 * Node.js falls back to the standard node:zlib module.
 *
 * @module runtime/compression
 * @since 3.2.0
 */

import { getRuntimeKind } from './detection'
import type { RuntimeCompressionAdapter } from './types'

// ============ Bun Compression Adapter ============

/**
 * 建立 Bun 原生壓縮 adapter
 * 使用 Bun.gzipSync / Bun.gunzipSync / Bun.deflateSync / Bun.inflateSync
 * @internal
 */
function createBunCompressionAdapter(): RuntimeCompressionAdapter {
  // Bun 壓縮等級型別
  type BunLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | -1

  // Bun API 要求 Uint8Array<ArrayBuffer>，確保型別相容
  function toBunBuffer(data: Uint8Array): Uint8Array<ArrayBuffer> {
    const buf = new ArrayBuffer(data.byteLength)
    const view = new Uint8Array(buf)
    view.set(data)
    return view
  }

  function toLevel(level: number): BunLevel {
    return Math.max(-1, Math.min(12, level)) as BunLevel
  }

  return {
    gzipSync(data, options = {}) {
      return Bun.gzipSync(toBunBuffer(data), {
        level: toLevel(options.level ?? 6),
      })
    },

    gunzipSync(data) {
      return Bun.gunzipSync(toBunBuffer(data))
    },

    deflateSync(data, options = {}) {
      return Bun.deflateSync(toBunBuffer(data), {
        level: toLevel(options.level ?? 6),
      })
    },

    inflateSync(data) {
      return Bun.inflateSync(toBunBuffer(data))
    },

    async gzip(data, options = {}) {
      return Bun.gzipSync(toBunBuffer(data), {
        level: toLevel(options.level ?? 6),
      })
    },

    async gunzip(data) {
      return Bun.gunzipSync(toBunBuffer(data))
    },
  }
}

// ============ Node.js Compression Adapter ============

/**
 * 建立 Node.js 壓縮 adapter（使用 node:zlib）
 * @internal
 */
function createNodeCompressionAdapter(): RuntimeCompressionAdapter {
  return {
    gzipSync(data, options = {}) {
      // biome-ignore lint: node context
      const zlib = require('node:zlib')
      const result = zlib.gzipSync(Buffer.from(data), {
        level: options.level ?? 6,
      })
      return new Uint8Array(result)
    },

    gunzipSync(data) {
      // biome-ignore lint: node context
      const zlib = require('node:zlib')
      const result = zlib.gunzipSync(Buffer.from(data))
      return new Uint8Array(result)
    },

    deflateSync(data, options = {}) {
      // biome-ignore lint: node context
      const zlib = require('node:zlib')
      const result = zlib.deflateSync(Buffer.from(data), {
        level: options.level ?? 6,
      })
      return new Uint8Array(result)
    },

    inflateSync(data) {
      // biome-ignore lint: node context
      const zlib = require('node:zlib')
      const result = zlib.inflateSync(Buffer.from(data))
      return new Uint8Array(result)
    },

    async gzip(data, options = {}) {
      const zlib = await import('node:zlib')
      const { promisify } = await import('node:util')
      const gzipAsync = promisify(zlib.gzip)
      const result = await gzipAsync(Buffer.from(data), {
        level: options.level ?? 6,
      })
      return new Uint8Array(result)
    },

    async gunzip(data) {
      const zlib = await import('node:zlib')
      const { promisify } = await import('node:util')
      const gunzipAsync = promisify(zlib.gunzip)
      const result = await gunzipAsync(Buffer.from(data))
      return new Uint8Array(result)
    },
  }
}

// ============ Unsupported Compression Adapter ============

/**
 * 建立不支援的壓縮 adapter（Deno / Unknown runtime 共用）
 * @internal
 */
function createUnsupportedCompressionAdapter(message: string): RuntimeCompressionAdapter {
  return {
    gzipSync() {
      throw new Error(message)
    },
    gunzipSync() {
      throw new Error(message)
    },
    deflateSync() {
      throw new Error(message)
    },
    inflateSync() {
      throw new Error(message)
    },
    async gzip() {
      throw new Error(message)
    },
    async gunzip() {
      throw new Error(message)
    },
  }
}

// ============ Singleton ============

let compressionAdapter: RuntimeCompressionAdapter | null = null

/**
 * 取得壓縮操作 adapter（依運行時自動選擇最佳實作）
 *
 * - Bun: 使用原生 C++ 壓縮（2-5x 更快）
 * - Node.js: 使用 node:zlib
 * - Deno/Unknown: 拋出錯誤
 *
 * @public
 */
export function getCompressionAdapter(): RuntimeCompressionAdapter {
  if (compressionAdapter) {
    return compressionAdapter
  }
  const kind = getRuntimeKind()
  switch (kind) {
    case 'bun':
      compressionAdapter = createBunCompressionAdapter()
      break
    case 'node':
      compressionAdapter = createNodeCompressionAdapter()
      break
    case 'deno':
      compressionAdapter = createUnsupportedCompressionAdapter(
        '[RuntimeCompressionAdapter] Deno compression support not yet implemented'
      )
      break
    default:
      compressionAdapter = createUnsupportedCompressionAdapter(
        '[RuntimeCompressionAdapter] Compression unavailable in unknown runtime'
      )
  }
  return compressionAdapter
}
