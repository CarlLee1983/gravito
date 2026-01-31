/**
 * @file packages/cosmos/src/runtime/detector.ts
 * @module @gravito/cosmos/runtime
 * @description 運行環境檢測工具
 */

/**
 * 運行環境類型
 *
 * @public
 * @since 3.2.0
 */
export type RuntimeEnvironment = 'node' | 'edge' | 'unknown'

/**
 * 檢測當前運行環境
 *
 * 支援的環境:
 * - Node.js (包含 Bun)
 * - Cloudflare Workers
 * - Vercel Edge Functions
 * - Deno Deploy
 * - 其他 Edge Runtime
 *
 * @returns 當前運行環境類型
 * @public
 * @since 3.2.0
 *
 * @example
 * ```typescript
 * import { detectRuntime } from '@gravito/cosmos/runtime'
 *
 * const runtime = detectRuntime()
 * if (runtime === 'node') {
 *   // 使用 Node.js 特定功能
 * } else if (runtime === 'edge') {
 *   // 使用 Edge Runtime 功能
 * }
 * ```
 */
export function detectRuntime(): RuntimeEnvironment {
  // Cloudflare Workers
  // 檢查 Cloudflare Workers 特有的全域物件
  if (
    typeof globalThis.caches !== 'undefined' &&
    typeof (globalThis as any).WebSocketPair !== 'undefined'
  ) {
    return 'edge'
  }

  // Vercel Edge Functions
  // 檢查 Vercel Edge Runtime 特有的全域變數
  if (typeof (globalThis as any).EdgeRuntime !== 'undefined') {
    return 'edge'
  }

  // Deno Deploy
  // 檢查 Deno 特有的全域物件
  if (typeof (globalThis as any).Deno !== 'undefined') {
    return 'edge'
  }

  // Node.js (包含 Bun)
  // 檢查 process 物件和 Node.js 版本
  if (typeof process !== 'undefined' && process.versions?.node !== undefined) {
    return 'node'
  }

  // Bun (當 process.versions.node 不存在時)
  if (typeof process !== 'undefined' && (process.versions as any)?.bun !== undefined) {
    return 'node' // Bun 相容 Node.js API
  }

  return 'unknown'
}

/**
 * 檢查是否在 Node.js 環境
 *
 * @returns 是否為 Node.js 環境
 * @public
 * @since 3.2.0
 */
export function isNode(): boolean {
  return detectRuntime() === 'node'
}

/**
 * 檢查是否在 Edge Runtime 環境
 *
 * @returns 是否為 Edge Runtime 環境
 * @public
 * @since 3.2.0
 */
export function isEdge(): boolean {
  return detectRuntime() === 'edge'
}
