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
import type { HashAccelerator } from './types'
/**
 * Node.js crypto 回退實現
 * 適用於非 Bun 環境
 */
export declare class HashFallback implements HashAccelerator {
  /**
   * SHA-256 計算（回退實現）
   * @param input - 輸入（字串或 Uint8Array）
   * @returns 十六進制編碼的 SHA-256 雜湊值
   */
  sha256(input: string | Uint8Array): string
  /**
   * HMAC-SHA256 計算（回退實現）
   * @param key - 密鑰
   * @param data - 要雜湊的數據
   * @returns 十六進制編碼的 HMAC-SHA256 值
   */
  hmacSha256(key: string, data: string): string
}
