/**
 * 原生加速器統一入口
 * 遵循 Galaxy Architecture 的運行時自適應模式
 * 與 RuntimeAdapter 模式保持一致
 *
 * 📍 FFI 暫時禁用
 * Bun 的構建系統在生成 ffi/index.js 時會產生 CJS compatibility helpers，
 * 這些 helpers 與 ESM export 語句導致模組解析失敗。
 * 即使使用 ESM import 也無法避免此問題（Bun 內部機制）。
 *
 * 解決方案：禁用 FFI，使用 JavaScript fallback（性能影響極小）
 * TODO: 當 Bun 改進其 ESM 模組構建時重新啟用
 */

import { CborFallbackEncoder } from './cbor-fallback'
import type { CborAccelerator, NativeAcceleratorStatus } from './types'

/**
 * 原生加速器類別
 * 提供運行時自適應的 CBOR 編碼/解碼加速
 * - 在 Bun 環境下優先使用 C 編譯器實現（bun:ffi）
 * - 在非 Bun 環境或 FFI 不可用時自動降級到 JavaScript 實現
 */
export class NativeAccelerator {
  private static readonly DEBUG_ENV = 'GRAVITO_FFI_DEBUG'

  /**
   * FFI 可用性緩存
   * null: 未檢測, true: 可用, false: 不可用
   */
  private static available: boolean | null = null

  /**
   * 當前加速器實例緩存
   */
  private static cborAccelerator: CborAccelerator | null = null

  /**
   * 當前狀態
   */
  private static status: NativeAcceleratorStatus | null = null

  /**
   * 檢測原生 FFI 是否可用
   * ⚠️ 當前全部返回 false（FFI 已禁用）
   */
  static isAvailable(): boolean {
    if (this.available !== null) {
      return this.available
    }

    // FFI 已禁用 - Bun ESM 模組解析問題
    this.available = false
    return false
  }

  /**
   * 取得 CBOR 加速器實例
   * 優先使用 Native，失敗則降級到 Fallback
   */
  static getCborAccelerator(): CborAccelerator {
    if (this.cborAccelerator !== null) {
      return this.cborAccelerator
    }

    // FFI 已禁用，直接使用 JavaScript fallback
    const fallback = new CborFallbackEncoder()
    this.cborAccelerator = fallback
    this.updateStatus('js-fallback')

    if (this.isDebugEnabled()) {
      // biome-ignore lint/suspicious/noConsole: Static FFI class — no Logger instance available; debug output gated by env var
      console.log('[GRAVITO_FFI] 使用 JavaScript 回退實現（FFI 已禁用）')
    }

    return fallback
  }

  /**
   * 取得加速器狀態
   */
  static getStatus(): NativeAcceleratorStatus {
    // 確保狀態已初始化
    if (this.status === null) {
      this.getCborAccelerator()
    }
    return (
      this.status || {
        available: false,
        runtime: 'js-fallback',
        version: '1.0.0',
      }
    )
  }

  /**
   * 重置加速器狀態（用於測試）
   */
  static reset(): void {
    this.available = null
    this.cborAccelerator = null
    this.status = null
  }

  /**
   * 檢查是否啟用調試模式
   */
  private static isDebugEnabled(): boolean {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[this.DEBUG_ENV] === '1'
    }
    return false
  }

  /**
   * 更新狀態
   */
  private static updateStatus(runtime: 'bun-ffi' | 'js-fallback'): void {
    this.status = {
      available: runtime === 'bun-ffi',
      runtime,
      version: runtime === 'bun-ffi' ? 'native-1.0.0' : 'js-fallback-1.0.0',
    }
  }
}
