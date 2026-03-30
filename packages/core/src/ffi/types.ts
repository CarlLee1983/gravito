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
export const CBOR_MAJOR_TYPES = {
  UINT: 0, // 正整數 (0 to 2^64-1)
  NEGINT: 1, // 負整數 (-1 to -2^64)
  BYTES: 2, // 位元組字串
  TEXT: 3, // 文字字串
  ARRAY: 4, // 陣列
  MAP: 5, // Map 物件
  TAG: 6, // 語意 tag
  SIMPLE: 7, // 簡單值與浮點數
} as const

/**
 * CBOR 簡單值常數
 */
export const CBOR_SIMPLE_VALUES = {
  FALSE: 20, // Boolean false
  TRUE: 21, // Boolean true
  NULL: 22, // null
  UNDEFINED: 23, // undefined (不常用)
} as const

/**
 * CBOR 長度編碼的附加資訊
 */
export const CBOR_LENGTH_ENCODING = {
  SMALL_RANGE_END: 23, // 0-23: 直接作為值
  UINT8: 24, // 24: 接下來 1 byte 為 uint8_t
  UINT16: 25, // 25: 接下來 2 bytes 為 uint16_t (大端序)
  UINT32: 26, // 26: 接下來 4 bytes 為 uint32_t (大端序)
  UINT64: 27, // 27: 接下來 8 bytes 為 uint64_t (大端序)
  FLOAT16: 25, // 25: IEEE 754 半精度浮點數 (special case for SIMPLE)
  FLOAT32: 26, // 26: IEEE 754 單精度浮點數
  FLOAT64: 27, // 27: IEEE 754 雙精度浮點數
  INDEFINITE: 31, // 31: 無限長度編碼
} as const

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

  /**
   * SHA-512 hash computation
   * @param input - Input (string or binary)
   * @returns Hex-encoded SHA-512 hash (128 characters)
   */
  sha512(input: string | Uint8Array): string

  /**
   * BLAKE2b-256 hash computation
   * On non-Bun runtimes, falls back to SHA-256 with a console warning
   * @param input - Input (string or binary)
   * @returns Hex-encoded hash (64 characters)
   */
  blake2b(input: string | Uint8Array): string
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
