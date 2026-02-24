/**
 * BinaryUtils - 統一的二進制轉換工具類
 *
 * 支援 Bun 原生 API 優化，並提供 Node.js 回退路徑。
 * 設計為 isomorphic，可在 Bun 和 Node.js 環境中運行。
 * @public
 */

/**
 * 偵測當前是否在 Bun 運行時中
 */
const isBunRuntime = (): boolean =>
  typeof globalThis !== 'undefined' &&
  typeof (globalThis as Record<string, unknown>).Bun !== 'undefined'

/**
 * BinaryUtils - 提供統一的二進制轉換、編碼、壓縮工具
 * 所有方法均為靜態方法，可直接呼叫
 * @public
 */
export class BinaryUtils {
  /**
   * 將各種資料類型轉換為 Uint8Array
   * @param data - 輸入資料（Blob、Buffer、string、ArrayBuffer 或 Uint8Array）
   * @returns Uint8Array
   * @public
   */
  static async toUint8Array(
    data: Blob | Buffer | string | ArrayBuffer | Uint8Array
  ): Promise<Uint8Array> {
    if (data instanceof Uint8Array) {
      return data
    }
    if (typeof data === 'string') {
      return new TextEncoder().encode(data)
    }
    if (data instanceof ArrayBuffer) {
      return new Uint8Array(data)
    }
    if (typeof Buffer !== 'undefined' && data instanceof Buffer) {
      return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    }
    if (data instanceof Blob) {
      return new Uint8Array(await data.arrayBuffer())
    }
    throw new TypeError('[BinaryUtils] toUint8Array: 不支援的資料類型')
  }

  /**
   * 將各種資料類型轉換為 ArrayBuffer
   * @param data - 輸入資料
   * @returns ArrayBuffer
   * @public
   */
  static async toArrayBuffer(
    data: Blob | Buffer | string | Uint8Array | ArrayBuffer
  ): Promise<ArrayBuffer> {
    if (data instanceof ArrayBuffer) {
      return data
    }
    const bytes = await BinaryUtils.toUint8Array(data as Blob | Buffer | string | Uint8Array)
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  }

  /**
   * 將 Uint8Array 編碼為 Base64 字串
   * 在 Bun 環境中使用原生 toBase64()，否則使用 Buffer
   * @param data - 輸入的 Uint8Array
   * @returns Base64 字串
   * @public
   */
  static toBase64(data: Uint8Array): string {
    if (data.length === 0) {
      return ''
    }
    const bunTyped = data as Uint8Array & { toBase64?: () => string }
    if (typeof bunTyped.toBase64 === 'function') {
      return bunTyped.toBase64()
    }
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(data).toString('base64')
    }
    let binary = ''
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i] as number)
    }
    return btoa(binary)
  }

  /**
   * 將 Base64 字串解碼為 Uint8Array
   * @param base64 - Base64 字串
   * @returns Uint8Array
   * @public
   */
  static fromBase64(base64: string): Uint8Array {
    if (!base64 || base64.length === 0) {
      return new Uint8Array(0)
    }
    const BunUint8Array = Uint8Array as typeof Uint8Array & {
      fromBase64?: (s: string) => Uint8Array
    }
    if (typeof BunUint8Array.fromBase64 === 'function') {
      return BunUint8Array.fromBase64(base64)
    }
    if (typeof Buffer !== 'undefined') {
      const buf = Buffer.from(base64, 'base64')
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
    }
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }

  /**
   * 將 Uint8Array 編碼為 Base64URL 字串（URL 安全，無填充）
   * @param data - 輸入的 Uint8Array
   * @returns Base64URL 字串
   * @public
   */
  static toBase64Url(data: Uint8Array): string {
    if (data.length === 0) {
      return ''
    }
    // 使用 Node.js Buffer 或標準 Base64 並進行轉換
    const base64 = BinaryUtils.toBase64(data)
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }

  /**
   * 將 Base64URL 字串解碼為 Uint8Array
   * @param base64url - Base64URL 字串
   * @returns Uint8Array
   * @public
   */
  static fromBase64Url(base64url: string): Uint8Array {
    if (!base64url || base64url.length === 0) {
      return new Uint8Array(0)
    }
    const BunUint8Array = Uint8Array as typeof Uint8Array & {
      fromBase64?: (s: string, opts?: { alphabet?: string }) => Uint8Array
    }
    if (typeof BunUint8Array.fromBase64 === 'function') {
      return BunUint8Array.fromBase64(base64url, { alphabet: 'base64url' })
    }
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    return BinaryUtils.fromBase64(padded)
  }

  /**
   * 將 Uint8Array 編碼為十六進制字串
   * 在 Bun 環境中使用原生 toHex()，否則使用 Buffer
   * @param data - 輸入的 Uint8Array
   * @returns 十六進制字串（小寫）
   * @public
   */
  static toHex(data: Uint8Array): string {
    if (data.length === 0) {
      return ''
    }
    const bunTyped = data as Uint8Array & { toHex?: () => string }
    if (typeof bunTyped.toHex === 'function') {
      return bunTyped.toHex()
    }
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(data).toString('hex')
    }
    return Array.from(data)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  /**
   * 將十六進制字串解碼為 Uint8Array
   * @param hex - 十六進制字串
   * @returns Uint8Array
   * @throws {TypeError} 如果輸入不是有效的十六進制字串
   * @public
   */
  static fromHex(hex: string): Uint8Array {
    if (!hex || hex.length === 0) {
      return new Uint8Array(0)
    }
    if (hex.length % 2 !== 0) {
      throw new TypeError(
        `[BinaryUtils] fromHex: 十六進制字串長度必須為偶數，收到長度 ${hex.length}`
      )
    }
    if (!/^[0-9a-fA-F]+$/.test(hex)) {
      throw new TypeError('[BinaryUtils] fromHex: 輸入包含無效的十六進制字元')
    }
    const BunUint8Array = Uint8Array as typeof Uint8Array & {
      fromHex?: (s: string) => Uint8Array
    }
    if (typeof BunUint8Array.fromHex === 'function') {
      return BunUint8Array.fromHex(hex)
    }
    if (typeof Buffer !== 'undefined') {
      const buf = Buffer.from(hex, 'hex')
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
    }
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
    }
    return bytes
  }

  /**
   * 使用 gzip 壓縮資料
   * 在 Bun 環境中使用原生 Bun.gzipSync()，在 Node.js 中使用 zlib
   * @param data - 輸入資料
   * @param level - 壓縮等級（0-9），預設為 6
   * @returns 壓縮後的 Uint8Array
   * @public
   */
  static async gzip(data: Uint8Array, level = 6): Promise<Uint8Array> {
    if (data.length === 0) {
      return data
    }
    if (isBunRuntime()) {
      const bunGlobal = (globalThis as Record<string, unknown>).Bun as {
        gzipSync?: (data: Uint8Array, opts?: { level?: number }) => Uint8Array
      }
      if (typeof bunGlobal?.gzipSync === 'function') {
        return bunGlobal.gzipSync(data, { level })
      }
    }
    const { gzipSync } = await import('node:zlib')
    const result = gzipSync(data, { level })
    return new Uint8Array(result.buffer, result.byteOffset, result.byteLength)
  }

  /**
   * 解壓縮 gzip 資料
   * 在 Bun 環境中使用原生 Bun.gunzipSync()，在 Node.js 中使用 zlib
   * @param data - gzip 壓縮的 Uint8Array
   * @returns 解壓縮後的 Uint8Array
   * @public
   */
  static async gunzip(data: Uint8Array): Promise<Uint8Array> {
    if (data.length === 0) {
      return data
    }
    if (isBunRuntime()) {
      const bunGlobal = (globalThis as Record<string, unknown>).Bun as {
        gunzipSync?: (data: Uint8Array) => Uint8Array
      }
      if (typeof bunGlobal?.gunzipSync === 'function') {
        return bunGlobal.gunzipSync(data)
      }
    }
    const { gunzipSync } = await import('node:zlib')
    const result = gunzipSync(data)
    return new Uint8Array(result.buffer, result.byteOffset, result.byteLength)
  }

  /**
   * 將 ReadableStream<Uint8Array> 讀取為 Uint8Array
   * 在 Bun 環境中使用原生 Bun.readableStreamToBytes()，否則手動讀取 chunks
   * @param stream - 輸入的 ReadableStream
   * @returns Uint8Array
   * @public
   */
  static async readableStreamToBytes(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
    if (isBunRuntime()) {
      const bunGlobal = (globalThis as Record<string, unknown>).Bun as {
        readableStreamToBytes?: (
          stream: ReadableStream<Uint8Array>
        ) => Promise<Uint8Array | ArrayBuffer>
      }
      if (typeof bunGlobal?.readableStreamToBytes === 'function') {
        const result = await bunGlobal.readableStreamToBytes(stream)
        // 如果返回 ArrayBuffer，轉換為 Uint8Array
        if (result instanceof ArrayBuffer) {
          return new Uint8Array(result)
        }
        return result as Uint8Array
      }
    }
    const chunks: Uint8Array[] = []
    let totalLength = 0
    const reader = stream.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        if (value) {
          chunks.push(value)
          totalLength += value.length
        }
      }
    } finally {
      reader.releaseLock()
    }
    const result = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      result.set(chunk, offset)
      offset += chunk.length
    }
    return result
  }

  /**
   * 將 ReadableStream<Uint8Array> 讀取為 ArrayBuffer
   * @param stream - 輸入的 ReadableStream
   * @returns ArrayBuffer
   * @public
   */
  static async readableStreamToArrayBuffer(
    stream: ReadableStream<Uint8Array>
  ): Promise<ArrayBuffer> {
    const bytes = await BinaryUtils.readableStreamToBytes(stream)
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  }
}
