/**
 * 雜湊加速器 JavaScript 回退實現
 * 基於 node:crypto 標準庫
 *
 * 使用場景：
 * - 非 Bun 環境（Node.js、Deno 等）
 * - Bun CryptoHasher 不可用的情況
 *
 * 性能特性：
 * - 短 key (<100 bytes)：~1-2x 慢於 Bun.CryptoHasher（N-API 橋接開銷）
 * - 長 payload：差異較小（主要計算時間）
 * - 一致性：與 node:crypto 標準行為完全相同
 */

import { createHash, createHmac } from 'node:crypto'
import type { HashAccelerator } from './types'

/**
 * Node.js crypto 回退實現
 * 適用於非 Bun 環境
 */
export class HashFallback implements HashAccelerator {
  /** @internal */
  private blake2bWarned = false

  /**
   * SHA-256 計算（回退實現）
   * @param input - 輸入（字串或 Uint8Array）
   * @returns 十六進制編碼的 SHA-256 雜湊值
   */
  sha256(input: string | Uint8Array): string {
    return createHash('sha256').update(input).digest('hex')
  }

  /**
   * HMAC-SHA256 計算（回退實現）
   * @param key - 密鑰
   * @param data - 要雜湊的數據
   * @returns 十六進制編碼的 HMAC-SHA256 值
   */
  hmacSha256(key: string, data: string): string {
    return createHmac('sha256', key).update(data).digest('hex')
  }

  /**
   * SHA-512 計算（回退實現）
   * @param input - 輸入（字串或 Uint8Array）
   * @returns 十六進制編碼的 SHA-512 雜湊值（128 字元）
   */
  sha512(input: string | Uint8Array): string {
    return createHash('sha512').update(input).digest('hex')
  }

  /**
   * BLAKE2b-256 計算（回退實現）
   * BLAKE2b-256 在 node:crypto 中不普遍可用，回退至 SHA-256 並發出警告。
   * @param input - 輸入（字串或 Uint8Array）
   * @returns 十六進制編碼的雜湊值（64 字元）
   */
  blake2b(input: string | Uint8Array): string {
    // BLAKE2b-256 not universally available in Node.js node:crypto
    // Fallback to SHA-256 with warning
    if (!this.blake2bWarned) {
      console.warn('[gravito] BLAKE2b not available in node:crypto — using SHA-256 fallback')
      this.blake2bWarned = true
    }
    return createHash('sha256').update(input).digest('hex')
  }
}
