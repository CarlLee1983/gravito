/**
 * FFI (Foreign Function Interface) 類型定義
 * 支持 bun:ffi 的原生加速層
 */
/**
 * CBOR 編碼/解碼加速器介面
 * 可由原生 C 實現或 JavaScript 回退實現
 */
export interface CborAccelerator {
  /**
   * 將任意 JavaScript 物件編碼為 CBOR 二進制格式
   * @param data - 要編碼的物件（支援：map、string、uint、float64、bytes、null、boolean）
   * @returns CBOR 編碼的二進制資料
   */
  encode(data: Record<string, unknown>): Uint8Array
  /**
   * 將 CBOR 二進制格式解碼為 JavaScript 物件
   * @param bytes - CBOR 編碼的二進制資料
   * @returns 解碼後的物件
   */
  decode(bytes: Uint8Array): Record<string, unknown>
}
/**
 * FFI 加速層狀態報告
 */
export interface NativeAcceleratorStatus {
  /**
   * 原生 FFI 加速是否可用
   */
  readonly available: boolean
  /**
   * 當前使用的運行時實現
   * - 'bun-ffi': Bun C 編譯器（bun:ffi 的 cc()）
   * - 'js-fallback': 手寫 JavaScript CBOR 實現
   * - 'cborg': npm 的 cborg 套件（已棄用，僅用於向後相容）
   */
  readonly runtime: 'bun-ffi' | 'js-fallback' | 'cborg'
  /**
   * 運行時版本或詳細資訊
   */
  readonly version: string
}
/**
 * FFI 層配置選項
 */
export interface FfiConfig {
  /**
   * 啟用調試日誌
   * @default false
   */
  readonly debug?: boolean
  /**
   * 最大 buffer 大小（位元組）
   * @default 1048576 (1MB)
   */
  readonly maxBufferSize?: number
  /**
   * 強制使用特定的加速器實現
   * - undefined: 自動選擇（優先 bun-ffi，降級到 js-fallback）
   * - 'bun-ffi': 只使用原生 C 實現
   * - 'js-fallback': 只使用 JavaScript 實現
   */
  readonly forceImplementation?: 'bun-ffi' | 'js-fallback'
}
/**
 * CBOR Major Type 常數
 * 符合 RFC 7049 規範
 */
export declare const CBOR_MAJOR_TYPES: {
  readonly UINT: 0
  readonly NEGINT: 1
  readonly BYTES: 2
  readonly TEXT: 3
  readonly ARRAY: 4
  readonly MAP: 5
  readonly TAG: 6
  readonly SIMPLE: 7
}
/**
 * CBOR 簡單值常數
 */
export declare const CBOR_SIMPLE_VALUES: {
  readonly FALSE: 20
  readonly TRUE: 21
  readonly NULL: 22
  readonly UNDEFINED: 23
}
/**
 * CBOR 長度編碼的附加資訊
 */
export declare const CBOR_LENGTH_ENCODING: {
  readonly SMALL_RANGE_END: 23
  readonly UINT8: 24
  readonly UINT16: 25
  readonly UINT32: 26
  readonly UINT64: 27
  readonly FLOAT16: 25
  readonly FLOAT32: 26
  readonly FLOAT64: 27
  readonly INDEFINITE: 31
}
/**
 * 雜湊加速器介面
 * 可由 Bun 原生實現或 Node.js 回退實現
 */
export interface HashAccelerator {
  /**
   * SHA-256 雜湊計算
   * @param input - 輸入（字串或二進制）
   * @returns 十六進制編碼的 SHA-256 雜湊值（64 字元）
   */
  sha256(input: string | Uint8Array): string
  /**
   * HMAC-SHA256 計算
   * @param key - 密鑰
   * @param data - 要雜湊的數據
   * @returns 十六進制編碼的 HMAC-SHA256 值（64 字元）
   */
  hmacSha256(key: string, data: string): string
}
/**
 * 雜湊加速器狀態報告
 */
export interface NativeHasherStatus {
  /**
   * 雜湊加速層是否可用
   */
  readonly available: boolean
  /**
   * 當前使用的運行時實現
   * - 'bun-crypto-hasher': Bun 原生 CryptoHasher（C 實現，推薦）
   * - 'node-crypto': node:crypto 回退實現
   */
  readonly runtime: 'bun-crypto-hasher' | 'node-crypto'
}
