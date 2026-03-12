/**
 * 原生加速器統一入口
 * 遵循 Galaxy Architecture 的運行時自適應模式
 * 與 RuntimeAdapter 模式保持一致
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
  private static readonly DISABLE_ENV = 'GRAVITO_FFI_DISABLE'

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
   * 偵測邏輯：
   * 1. 檢查 GRAVITO_FFI_DISABLE 環境變數
   * 2. 檢查 Bun 運行時可用性
   * 3. 檢查 bun:ffi 的 cc() 是否可用
   */
  static isAvailable(): boolean {
    if (this.available !== null) {
      return this.available
    }

    // 檢查環境變數強制禁用
    if (typeof process !== 'undefined' && process.env) {
      if (process.env[this.DISABLE_ENV] === '1') {
        this.available = false
        return false
      }
    }

    // 檢查 Bun 運行時
    try {
      if (typeof Bun === 'undefined') {
        this.available = false
        return false
      }

      // 嘗試載入 bun:ffi 的 cc 函數
      // NOTE: bun:ffi require() calls cause CJS compatibility code to be emitted
      // which breaks ESM parsing. For now, disable FFI checks and use JavaScript fallback
      // TODO: Revisit when Bun's ESM module handling improves
      this.available = false
      return false
    } catch {
      this.available = false
      return false
    }
  }

  /**
   * 取得 CBOR 加速器實例
   * 優先使用 Native，失敗則降級到 Fallback
   */
  static getCborAccelerator(): CborAccelerator {
    if (this.cborAccelerator !== null) {
      return this.cborAccelerator
    }

    // 嘗試載入原生實現
    if (this.isAvailable()) {
      try {
        const native = this.loadNativeImplementation()
        if (native !== null) {
          this.cborAccelerator = native
          this.updateStatus('bun-ffi')
          return native
        }
      } catch (error) {
        const debugMode = this.isDebugEnabled()
        if (debugMode) {
          console.warn('[GRAVITO_FFI] Native CBOR 載入失敗，降級到 JavaScript 實現:', error)
        }
        // 繼續降級到 Fallback
      }
    }

    // 降級到 JavaScript 實現
    const fallback = new CborFallbackEncoder()
    this.cborAccelerator = fallback
    this.updateStatus('js-fallback')

    if (this.isDebugEnabled()) {
      console.log('[GRAVITO_FFI] 使用 JavaScript 回退實現')
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
   * 解析 C 原始碼路徑
   * 支援從原始碼目錄或 npm 套件的 src/ffi/native 目錄載入
   */
  private static resolveCSourcePath(): string {
    // NOTE: This method is never called since FFI is disabled
    // Removed require() calls that caused CJS compat code generation
    throw new Error('FFI is disabled - resolveCSourcePath should not be called')
  }

  /**
   * 載入原生 C 實現
   * 使用 bun:ffi 的 cc() 動態編譯 C 代碼
   * 優先從檔案載入完整實現，避免內聯限制
   */
  private static loadNativeImplementation(): CborAccelerator | null {
    try {
      // 檢查 Bun 運行時
      if (typeof Bun === 'undefined') {
        return null
      }

      // NOTE: bun:ffi require() calls cause CJS compatibility code to be emitted
      // which breaks ESM parsing. Disabled FFI for now, using JavaScript fallback
      // TODO: Revisit when Bun's ESM module handling improves
      return null
    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('[GRAVITO_FFI] 編譯失敗:', error)
      }
      return null
    }
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

// NOTE: NativeCborAccelerator class was removed as FFI is disabled
// When FFI is re-enabled in the future, this class will need to be restored
