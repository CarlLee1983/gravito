/**
 * BinaryUtils - 統一的二進制轉換工具類
 *
 * 支援 Bun 原生 API 優化，並提供 Node.js 回退路徑。
 * 設計為 isomorphic，可在 Bun 和 Node.js 環境中運行。
 * @public
 */
/**
 * BinaryUtils - 提供統一的二進制轉換、編碼、壓縮工具
 * 所有方法均為靜態方法，可直接呼叫
 * @public
 */
export declare class BinaryUtils {
  /**
   * 將各種資料類型轉換為 Uint8Array
   * @param data - 輸入資料（Blob、Buffer、string、ArrayBuffer 或 Uint8Array）
   * @returns Uint8Array
   * @public
   */
  static toUint8Array(data: Blob | Buffer | string | ArrayBuffer | Uint8Array): Promise<Uint8Array>
  /**
   * 將各種資料類型轉換為 ArrayBuffer
   * @param data - 輸入資料
   * @returns ArrayBuffer
   * @public
   */
  static toArrayBuffer(
    data: Blob | Buffer | string | Uint8Array | ArrayBuffer
  ): Promise<ArrayBuffer>
  /**
   * 將 Uint8Array 編碼為 Base64 字串
   * 在 Bun 環境中使用原生 toBase64()，否則使用 Buffer
   * @param data - 輸入的 Uint8Array
   * @returns Base64 字串
   * @public
   */
  static toBase64(data: Uint8Array): string
  /**
   * 將 Base64 字串解碼為 Uint8Array
   * @param base64 - Base64 字串
   * @returns Uint8Array
   * @public
   */
  static fromBase64(base64: string): Uint8Array
  /**
   * 將 Uint8Array 編碼為 Base64URL 字串（URL 安全，無填充）
   * @param data - 輸入的 Uint8Array
   * @returns Base64URL 字串
   * @public
   */
  static toBase64Url(data: Uint8Array): string
  /**
   * 將 Base64URL 字串解碼為 Uint8Array
   * @param base64url - Base64URL 字串
   * @returns Uint8Array
   * @public
   */
  static fromBase64Url(base64url: string): Uint8Array
  /**
   * 將 Uint8Array 編碼為十六進制字串
   * 在 Bun 環境中使用原生 toHex()，否則使用 Buffer
   * @param data - 輸入的 Uint8Array
   * @returns 十六進制字串（小寫）
   * @public
   */
  static toHex(data: Uint8Array): string
  /**
   * 將十六進制字串解碼為 Uint8Array
   * @param hex - 十六進制字串
   * @returns Uint8Array
   * @throws {TypeError} 如果輸入不是有效的十六進制字串
   * @public
   */
  static fromHex(hex: string): Uint8Array
  /**
   * 使用 gzip 壓縮資料
   * 在 Bun 環境中使用原生 Bun.gzipSync()，在 Node.js 中使用 zlib
   * @param data - 輸入資料
   * @param level - 壓縮等級（0-9），預設為 6
   * @returns 壓縮後的 Uint8Array
   * @public
   */
  static gzip(data: Uint8Array, level?: number): Promise<Uint8Array>
  /**
   * 解壓縮 gzip 資料
   * 在 Bun 環境中使用原生 Bun.gunzipSync()，在 Node.js 中使用 zlib
   * @param data - gzip 壓縮的 Uint8Array
   * @returns 解壓縮後的 Uint8Array
   * @public
   */
  static gunzip(data: Uint8Array): Promise<Uint8Array>
  /**
   * 將 ReadableStream<Uint8Array> 讀取為 Uint8Array
   * 在 Bun 環境中使用原生 Bun.readableStreamToBytes()，否則手動讀取 chunks
   * @param stream - 輸入的 ReadableStream
   * @returns Uint8Array
   * @public
   */
  static readableStreamToBytes(stream: ReadableStream<Uint8Array>): Promise<Uint8Array>
  /**
   * 將 ReadableStream<Uint8Array> 讀取為 ArrayBuffer
   * @param stream - 輸入的 ReadableStream
   * @returns ArrayBuffer
   * @public
   */
  static readableStreamToArrayBuffer(stream: ReadableStream<Uint8Array>): Promise<ArrayBuffer>
}
