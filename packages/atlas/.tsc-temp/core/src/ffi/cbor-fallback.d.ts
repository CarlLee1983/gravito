/**
 * JavaScript CBOR 回退實現
 * 用於非 Bun 環境或 FFI 不可用的情況
 * 符合 RFC 7049 規範
 */
import type { CborAccelerator } from './types'
/**
 * CBOR 編碼器
 * 將 JavaScript 物件編碼為 CBOR 二進制格式
 */
export declare class CborFallbackEncoder implements CborAccelerator {
  private static readonly DEFAULT_BUFFER_SIZE
  private static readonly MAX_DEPTH
  private static readonly MAX_BUFFER_SIZE
  private buffer
  private offset
  constructor()
  /**
   * 編碼 JavaScript 物件為 CBOR 格式
   */
  encode(data: Record<string, unknown>): Uint8Array
  /**
   * 解碼 CBOR 二進制為 JavaScript 物件
   */
  decode(bytes: Uint8Array): Record<string, unknown>
  /**
   * 確保 buffer 有足夠空間
   */
  private ensureCapacity
  /**
   * 編寫一個位元組
   */
  private writeByte
  /**
   * 編寫多個位元組
   */
  private writeBytes
  /**
   * 編寫 CBOR 長度（Major Type + Additional Info）
   */
  private writeLength
  /**
   * 遞迴編碼值
   */
  private encodeValue
  /**
   * 編碼整數或浮點數
   * 對於超過 uint32 範圍的整數，使用 float64 編碼（JavaScript 精度限制）
   */
  private encodeNumber
  /**
   * 編碼字串
   */
  private encodeString
  /**
   * 編碼位元組陣列
   */
  private encodeBytes
  /**
   * 編碼陣列
   */
  private encodeArray
  /**
   * 編碼物件（Map）
   */
  private encodeMap
}
/**
 * CBOR 解碼器
 */
export declare class CborFallbackDecoder {
  private static readonly MAX_DEPTH
  private data
  private offset
  constructor(data: Uint8Array)
  /**
   * 解碼 CBOR 資料
   */
  decode(): unknown
  /**
   * 讀取一個位元組
   */
  private readByte
  /**
   * 讀取固定長度的位元組
   */
  private readBytes
  /**
   * 讀取 CBOR 長度
   */
  private readLength
  /**
   * 遞迴解碼值
   */
  private decodeValue
}
