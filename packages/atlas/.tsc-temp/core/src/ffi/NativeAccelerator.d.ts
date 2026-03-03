/**
 * 原生加速器統一入口
 * 遵循 Galaxy Architecture 的運行時自適應模式
 * 與 RuntimeAdapter 模式保持一致
 */
import type { CborAccelerator, NativeAcceleratorStatus } from './types'
/**
 * 原生加速器類別
 * 提供運行時自適應的 CBOR 編碼/解碼加速
 * - 在 Bun 環境下優先使用 C 編譯器實現（bun:ffi）
 * - 在非 Bun 環境或 FFI 不可用時自動降級到 JavaScript 實現
 */
export declare class NativeAccelerator {
  private static readonly DEBUG_ENV
  private static readonly DISABLE_ENV
  /**
   * FFI 可用性緩存
   * null: 未檢測, true: 可用, false: 不可用
   */
  private static available
  /**
   * 當前加速器實例緩存
   */
  private static cborAccelerator
  /**
   * 當前狀態
   */
  private static status
  /**
   * 檢測原生 FFI 是否可用
   * 偵測邏輯：
   * 1. 檢查 GRAVITO_FFI_DISABLE 環境變數
   * 2. 檢查 Bun 運行時可用性
   * 3. 檢查 bun:ffi 的 cc() 是否可用
   */
  static isAvailable(): boolean
  /**
   * 取得 CBOR 加速器實例
   * 優先使用 Native，失敗則降級到 Fallback
   */
  static getCborAccelerator(): CborAccelerator
  /**
   * 取得加速器狀態
   */
  static getStatus(): NativeAcceleratorStatus
  /**
   * 重置加速器狀態（用於測試）
   */
  static reset(): void
  /**
   * 解析 C 原始碼路徑
   * 支援從原始碼目錄或 npm 套件的 src/ffi/native 目錄載入
   */
  private static resolveCSourcePath
  /**
   * 載入原生 C 實現
   * 使用 bun:ffi 的 cc() 動態編譯 C 代碼
   * 優先從檔案載入完整實現，避免內聯限制
   */
  private static loadNativeImplementation
  /**
   * 檢查是否啟用調試模式
   */
  private static isDebugEnabled
  /**
   * 更新狀態
   */
  private static updateStatus
}
