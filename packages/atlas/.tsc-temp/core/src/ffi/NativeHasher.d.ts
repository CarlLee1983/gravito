/**
 * 原生雜湊加速器
 * 運行時自適應實現，遵循 Galaxy Architecture 的設計模式
 *
 * 架構：
 * - 在 Bun 環境：使用 Bun.CryptoHasher（C 實現，高效）
 * - 其他環境：自動降級到 node:crypto
 * - 完全相同的 API 和結果保證
 *
 * 性能：
 * - Bun 環境：2-3x 快於 node:crypto（消除 N-API 開銷）
 * - 跨運行時：完全相容性
 *
 * 應用場景：
 * - FileStore.hashKey() 熱路徑
 * - Encrypter.hash() 加密雜湊
 * - 任何需要高效雜湊計算的地方
 */
import type { NativeHasherStatus } from './types'
/**
 * 原生雜湊加速器統一入口
 * 提供運行時自適應的 SHA-256/HMAC-SHA256 計算
 *
 * 使用範例：
 * ```typescript
 * // SHA-256
 * const hash = NativeHasher.sha256('data')
 *
 * // HMAC-SHA256
 * const hmac = NativeHasher.hmacSha256('secret', 'message')
 *
 * // 檢查狀態
 * const status = NativeHasher.getStatus()
 * console.log(`使用: ${status.runtime}`)
 * ```
 */
export declare class NativeHasher {
  /**
   * 當前加速器實例緩存
   */
  private static accelerator
  /**
   * 當前狀態緩存
   */
  private static status
  /**
   * 取得雜湊加速器實例
   * 優先使用 Bun.CryptoHasher，失敗則降級到 node:crypto
   *
   * @returns 雜湊加速器實例
   */
  private static getAccelerator
  /**
   * 檢測 Bun 運行時和 CryptoHasher 可用性
   *
   * @returns Bun.CryptoHasher 是否可用
   */
  private static isBunAvailable
  /**
   * 更新狀態
   *
   * @param runtime - 當前使用的運行時
   */
  private static updateStatus
  /**
   * 計算 SHA-256 雜湊
   * 支援字串和二進制輸入
   *
   * @param input - 要雜湊的數據（字串或 Uint8Array）
   * @returns 十六進制編碼的 SHA-256 雜湊值（64 字元）
   *
   * @example
   * ```typescript
   * const hash = NativeHasher.sha256('hello')
   * // '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
   *
   * // 支援 Uint8Array
   * const bytes = new TextEncoder().encode('hello')
   * const hash2 = NativeHasher.sha256(bytes)
   * // 相同結果
   * ```
   */
  static sha256(input: string | Uint8Array): string
  /**
   * 計算 HMAC-SHA256
   * 用於認證消息完整性
   *
   * @param key - HMAC 密鑰
   * @param data - 要雜湊的數據
   * @returns 十六進制編碼的 HMAC-SHA256 值（64 字元）
   *
   * @example
   * ```typescript
   * const hmac = NativeHasher.hmacSha256('secret', 'message')
   * // '8b1a9953c4611296aed9e132b8502cf413b1b881fed3e8d26ab'...
   *
   * // 適用於加密驗證
   * const iv = Buffer.from('...').toString('base64')
   * const encrypted = '...'
   * const mac = NativeHasher.hmacSha256(key, iv + encrypted)
   * ```
   */
  static hmacSha256(key: string, data: string): string
  /**
   * 取得加速器狀態
   * 用於診斷和性能監測
   *
   * @returns 加速器狀態報告
   *
   * @example
   * ```typescript
   * const status = NativeHasher.getStatus()
   * console.log(`可用: ${status.available}`)
   * console.log(`運行時: ${status.runtime}`)
   *
   * // 條件邏輯
   * if (status.runtime === 'bun-crypto-hasher') {
   *   console.log('使用 Bun 原生實現（高效）')
   * } else {
   *   console.log('使用 node:crypto（相容性回退）')
   * }
   * ```
   */
  static getStatus(): NativeHasherStatus
  /**
   * 重置加速器狀態
   * 主要用於測試目的，允許重新初始化運行時檢測
   *
   * @internal
   * @example
   * ```typescript
   * // 測試中
   * NativeHasher.reset()
   * // 下一次呼叫會重新偵測運行時
   * const status = NativeHasher.getStatus()
   * ```
   */
  static reset(): void
}
