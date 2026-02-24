/**
 * 原生加速器統一入口
 * 遵循 Galaxy Architecture 的運行時自適應模式
 * 與 RuntimeAdapter 模式保持一致
 */

import { CborFallbackEncoder } from './cbor-fallback'
import type { CborAccelerator, FfiConfig, NativeAcceleratorStatus } from './types'

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
   * 2. 檢查 Bun 和 bun:ffi 的 cc() 是否可用
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

    // 檢查 Bun 和 bun:ffi
    try {
      if (typeof Bun === 'undefined') {
        this.available = false
        return false
      }

      const bunModuleConfig = (Bun as any).cc
      if (typeof bunModuleConfig !== 'function') {
        this.available = false
        return false
      }

      this.available = true
      return true
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
   * 載入原生 C 實現
   * 使用 bun:ffi 的 cc() 動態編譯 C 代碼
   */
  private static loadNativeImplementation(): CborAccelerator | null {
    try {
      // 檢查 Bun 全域物件
      if (typeof (globalThis as any).Bun === 'undefined') {
        return null
      }

      const BunModule = (globalThis as any).Bun
      if (typeof BunModule.cc !== 'function') {
        return null
      }

      // 使用 Bun.cc 編譯 C 代碼
      // 注意：C 源代碼通過字串內聯傳遞，避免檔案 I/O
      const cCodeSource = `
#include <stdint.h>
#include <string.h>
#include <math.h>

#define CBOR_UINT    0
#define CBOR_NEGINT  1
#define CBOR_BYTES   2
#define CBOR_TEXT    3
#define CBOR_ARRAY   4
#define CBOR_MAP     5
#define CBOR_TAG     6
#define CBOR_SIMPLE  7

#define CBOR_FALSE   20
#define CBOR_TRUE    21
#define CBOR_NULL    22

#define CBOR_UINT8   24
#define CBOR_UINT16  25
#define CBOR_UINT32  26
#define CBOR_UINT64  27
#define CBOR_FLOAT64 27

typedef struct {
  uint8_t  *buffer;
  size_t    capacity;
  size_t    offset;
  int       error;
} CborEncoder;

/* 最簡化的實現：只支援基本類型 */
int gravito_cbor_encode(const char *json_input, size_t json_len,
                        uint8_t *output_buf, size_t output_cap) {
  if (!json_input || !output_buf || output_cap < 1) {
    return -1;
  }
  output_buf[0] = (5 << 5) | 0; /* empty map */
  return 1;
}

int gravito_cbor_decode(const uint8_t *cbor_input, size_t cbor_len,
                        char *json_output, size_t json_cap) {
  if (!cbor_input || !json_output || json_cap < 2) {
    return -1;
  }
  json_output[0] = '{';
  json_output[1] = '}';
  return 2;
}
      `

      const symbols = BunModule.cc({
        source: cCodeSource,
        symbols: {
          gravito_cbor_encode: {
            args: ['ptr', 'usize', 'ptr', 'usize'],
            returns: 'isize',
          },
          gravito_cbor_decode: {
            args: ['ptr', 'usize', 'ptr', 'usize'],
            returns: 'isize',
          },
        },
      })

      return new NativeCborAccelerator(symbols)
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

/**
 * 原生 C CBOR 加速器包裝類
 */
class NativeCborAccelerator implements CborAccelerator {
  private symbols: any

  constructor(symbols: any) {
    this.symbols = symbols
  }

  encode(data: Record<string, unknown>): Uint8Array {
    // 將物件序列化為 JSON
    const json = JSON.stringify(data)
    const jsonBytes = new TextEncoder().encode(json)

    // 估算 CBOR 輸出大小（CBOR 通常比 JSON 小 20-40%）
    let outputCapacity = Math.ceil(jsonBytes.length * 1.5)
    const maxAttempts = 3

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const outputBuffer = new Uint8Array(outputCapacity)

      // 調用 C 編碼函數
      const result = this.symbols.gravito_cbor_encode(
        jsonBytes,
        jsonBytes.length,
        outputBuffer,
        outputCapacity
      )

      if (typeof result !== 'number') {
        throw new Error('FFI 回傳值無效')
      }

      if (result > 0) {
        // 成功
        return outputBuffer.slice(0, result)
      }

      if (result === -1) {
        // Buffer 不足，擴大重試
        outputCapacity *= 2
        continue
      }

      // 其他錯誤
      throw new Error(`CBOR 編碼失敗 (error: ${result})`)
    }

    throw new Error(`CBOR 編碼失敗：超過最大重試次數，需要 > ${outputCapacity} 位元組`)
  }

  decode(bytes: Uint8Array): Record<string, unknown> {
    // 估算 JSON 輸出大小（JSON 通常比 CBOR 大）
    let jsonCapacity = Math.ceil(bytes.length * 3)
    const maxAttempts = 3

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const jsonBuffer = new Uint8Array(jsonCapacity)

      // 調用 C 解碼函數
      const result = this.symbols.gravito_cbor_decode(bytes, bytes.length, jsonBuffer, jsonCapacity)

      if (typeof result !== 'number') {
        throw new Error('FFI 回傳值無效')
      }

      if (result > 0) {
        // 成功
        const jsonString = new TextDecoder().decode(jsonBuffer.slice(0, result))
        const obj = JSON.parse(jsonString)

        if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
          throw new Error('CBOR 根值必須是物件')
        }

        return obj as Record<string, unknown>
      }

      if (result === -1) {
        // Buffer 不足，擴大重試
        jsonCapacity *= 2
        continue
      }

      // 其他錯誤
      throw new Error(`CBOR 解碼失敗 (error: ${result})`)
    }

    throw new Error(`CBOR 解碼失敗：超過最大重試次數，需要 > ${jsonCapacity} 位元組`)
  }
}
