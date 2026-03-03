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
import type { RuntimeCompressionAdapter } from './types'
/**
 * 取得壓縮操作 adapter（依運行時自動選擇最佳實作）
 *
 * - Bun: 使用原生 C++ 壓縮（2-5x 更快）
 * - Node.js: 使用 node:zlib
 * - Deno/Unknown: 拋出錯誤
 *
 * @public
 */
export declare function getCompressionAdapter(): RuntimeCompressionAdapter
