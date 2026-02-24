/**
 * JavaScript CBOR 回退實現
 * 用於非 Bun 環境或 FFI 不可用的情況
 * 符合 RFC 7049 規範
 */

import type { CborAccelerator } from './types'
import { CBOR_LENGTH_ENCODING, CBOR_MAJOR_TYPES, CBOR_SIMPLE_VALUES } from './types'

/**
 * CBOR 編碼器
 * 將 JavaScript 物件編碼為 CBOR 二進制格式
 */
export class CborFallbackEncoder implements CborAccelerator {
  private static readonly DEFAULT_BUFFER_SIZE = 4096
  private static readonly MAX_DEPTH = 16
  private static readonly MAX_BUFFER_SIZE = 1024 * 1024 // 1MB

  private buffer: Uint8Array
  private offset: number

  constructor() {
    this.buffer = new Uint8Array(CborFallbackEncoder.DEFAULT_BUFFER_SIZE)
    this.offset = 0
  }

  /**
   * 編碼 JavaScript 物件為 CBOR 格式
   */
  encode(data: Record<string, unknown>): Uint8Array {
    this.buffer = new Uint8Array(CborFallbackEncoder.DEFAULT_BUFFER_SIZE)
    this.offset = 0
    this.encodeValue(data, 0)
    return this.buffer.slice(0, this.offset)
  }

  /**
   * 解碼 CBOR 二進制為 JavaScript 物件
   */
  decode(bytes: Uint8Array): Record<string, unknown> {
    const decoder = new CborFallbackDecoder(bytes)
    const value = decoder.decode()
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error('CBOR 根值必須是物件')
    }
    return value as Record<string, unknown>
  }

  /**
   * 確保 buffer 有足夠空間
   */
  private ensureCapacity(required: number): void {
    let newCapacity = this.buffer.length
    while (this.offset + required > newCapacity) {
      newCapacity *= 2
      if (newCapacity > CborFallbackEncoder.MAX_BUFFER_SIZE) {
        throw new Error(
          `CBOR 編碼超過最大 buffer 大小 ${CborFallbackEncoder.MAX_BUFFER_SIZE} 位元組`
        )
      }
    }
    if (newCapacity !== this.buffer.length) {
      const newBuffer = new Uint8Array(newCapacity)
      newBuffer.set(this.buffer)
      this.buffer = newBuffer
    }
  }

  /**
   * 編寫一個位元組
   */
  private writeByte(byte: number): void {
    this.ensureCapacity(1)
    this.buffer[this.offset++] = byte & 0xff
  }

  /**
   * 編寫多個位元組
   */
  private writeBytes(bytes: ArrayLike<number>): void {
    this.ensureCapacity(bytes.length)
    this.buffer.set(bytes, this.offset)
    this.offset += bytes.length
  }

  /**
   * 編寫 CBOR 長度（Major Type + Additional Info）
   */
  private writeLength(majorType: number, length: number): void {
    const type = majorType << 5

    if (length < 24) {
      this.writeByte(type | length)
    } else if (length <= 0xff) {
      this.writeByte(type | CBOR_LENGTH_ENCODING.UINT8)
      this.writeByte(length)
    } else if (length <= 0xffff) {
      this.writeByte(type | CBOR_LENGTH_ENCODING.UINT16)
      this.writeByte((length >> 8) & 0xff)
      this.writeByte(length & 0xff)
    } else if (length <= 0xffffffff) {
      this.writeByte(type | CBOR_LENGTH_ENCODING.UINT32)
      this.writeByte((length >> 24) & 0xff)
      this.writeByte((length >> 16) & 0xff)
      this.writeByte((length >> 8) & 0xff)
      this.writeByte(length & 0xff)
    } else {
      throw new Error(`CBOR 不支援 > 2^32 的長度: ${length}`)
    }
  }

  /**
   * 遞迴編碼值
   */
  private encodeValue(value: unknown, depth: number): void {
    if (depth > CborFallbackEncoder.MAX_DEPTH) {
      throw new Error(`CBOR 編碼深度超過限制 ${CborFallbackEncoder.MAX_DEPTH}`)
    }

    if (value === null) {
      this.writeByte((CBOR_MAJOR_TYPES.SIMPLE << 5) | CBOR_SIMPLE_VALUES.NULL)
    } else if (value === true) {
      this.writeByte((CBOR_MAJOR_TYPES.SIMPLE << 5) | CBOR_SIMPLE_VALUES.TRUE)
    } else if (value === false) {
      this.writeByte((CBOR_MAJOR_TYPES.SIMPLE << 5) | CBOR_SIMPLE_VALUES.FALSE)
    } else if (typeof value === 'number') {
      this.encodeNumber(value)
    } else if (typeof value === 'string') {
      this.encodeString(value)
    } else if (value instanceof Uint8Array) {
      this.encodeBytes(value)
    } else if (Array.isArray(value)) {
      this.encodeArray(value, depth)
    } else if (typeof value === 'object') {
      this.encodeMap(value as Record<string, unknown>, depth)
    } else {
      throw new Error(`CBOR 不支援類型: ${typeof value}`)
    }
  }

  /**
   * 編碼整數或浮點數
   */
  private encodeNumber(num: number): void {
    // 檢查是否為整數
    if (Number.isInteger(num) && !Object.is(num, -0)) {
      if (num >= 0) {
        this.writeLength(CBOR_MAJOR_TYPES.UINT, num)
      } else {
        // 負整數：-1-n
        this.writeLength(CBOR_MAJOR_TYPES.NEGINT, -1 - num)
      }
    } else {
      // 浮點數（float64）
      const bytes = new Uint8Array(9)
      bytes[0] = (CBOR_MAJOR_TYPES.SIMPLE << 5) | CBOR_LENGTH_ENCODING.FLOAT64

      // IEEE 754 雙精度大端序
      const view = new DataView(new ArrayBuffer(8))
      view.setFloat64(0, num, false)
      for (let i = 0; i < 8; i++) {
        bytes[i + 1] = view.getUint8(i)
      }
      this.writeBytes(bytes)
    }
  }

  /**
   * 編碼字串
   */
  private encodeString(str: string): void {
    const encoder = new TextEncoder()
    const bytes = encoder.encode(str)
    this.writeLength(CBOR_MAJOR_TYPES.TEXT, bytes.length)
    this.writeBytes(bytes)
  }

  /**
   * 編碼位元組陣列
   */
  private encodeBytes(bytes: Uint8Array): void {
    this.writeLength(CBOR_MAJOR_TYPES.BYTES, bytes.length)
    this.writeBytes(bytes)
  }

  /**
   * 編碼陣列
   */
  private encodeArray(arr: unknown[], depth: number): void {
    this.writeLength(CBOR_MAJOR_TYPES.ARRAY, arr.length)
    for (const item of arr) {
      this.encodeValue(item, depth + 1)
    }
  }

  /**
   * 編碼物件（Map）
   */
  private encodeMap(obj: Record<string, unknown>, depth: number): void {
    const keys = Object.keys(obj)
    this.writeLength(CBOR_MAJOR_TYPES.MAP, keys.length)
    for (const key of keys) {
      this.encodeString(key)
      this.encodeValue(obj[key], depth + 1)
    }
  }
}

/**
 * CBOR 解碼器
 */
export class CborFallbackDecoder {
  private static readonly MAX_DEPTH = 16
  private data: Uint8Array
  private offset: number

  constructor(data: Uint8Array) {
    this.data = data
    this.offset = 0
  }

  /**
   * 解碼 CBOR 資料
   */
  decode(): unknown {
    return this.decodeValue(0)
  }

  /**
   * 讀取一個位元組
   */
  private readByte(): number {
    if (this.offset >= this.data.length) {
      throw new Error('CBOR 資料不足')
    }
    return this.data[this.offset++]
  }

  /**
   * 讀取固定長度的位元組
   */
  private readBytes(length: number): Uint8Array {
    if (this.offset + length > this.data.length) {
      throw new Error('CBOR 資料不足')
    }
    const result = this.data.slice(this.offset, this.offset + length)
    this.offset += length
    return result
  }

  /**
   * 讀取 CBOR 長度
   */
  private readLength(additionalInfo: number): number {
    if (additionalInfo < 24) {
      return additionalInfo
    }
    if (additionalInfo === 24) {
      return this.readByte()
    }
    if (additionalInfo === 25) {
      const b1 = this.readByte()
      const b2 = this.readByte()
      return (b1 << 8) | b2
    }
    if (additionalInfo === 26) {
      const b1 = this.readByte()
      const b2 = this.readByte()
      const b3 = this.readByte()
      const b4 = this.readByte()
      return (b1 << 24) | (b2 << 16) | (b3 << 8) | b4
    }
    if (additionalInfo === 27) {
      // 64-bit，但 JavaScript 無法精確表示，只支援到 2^53
      const high =
        (this.readByte() << 24) | (this.readByte() << 16) | (this.readByte() << 8) | this.readByte()
      const low =
        (this.readByte() << 24) | (this.readByte() << 16) | (this.readByte() << 8) | this.readByte()
      return high * 0x100000000 + low
    }
    throw new Error(`CBOR 無效的長度編碼: ${additionalInfo}`)
  }

  /**
   * 遞迴解碼值
   */
  private decodeValue(depth: number): unknown {
    if (depth > CborFallbackDecoder.MAX_DEPTH) {
      throw new Error(`CBOR 解碼深度超過限制 ${CborFallbackDecoder.MAX_DEPTH}`)
    }

    const byte = this.readByte()
    const majorType = (byte >> 5) & 0x07
    const additionalInfo = byte & 0x1f

    switch (majorType) {
      case CBOR_MAJOR_TYPES.UINT:
        return this.readLength(additionalInfo)

      case CBOR_MAJOR_TYPES.NEGINT:
        return -1 - this.readLength(additionalInfo)

      case CBOR_MAJOR_TYPES.BYTES: {
        const length = this.readLength(additionalInfo)
        return this.readBytes(length)
      }

      case CBOR_MAJOR_TYPES.TEXT: {
        const length = this.readLength(additionalInfo)
        const bytes = this.readBytes(length)
        const decoder = new TextDecoder()
        return decoder.decode(bytes)
      }

      case CBOR_MAJOR_TYPES.ARRAY: {
        const length = this.readLength(additionalInfo)
        const result: unknown[] = []
        for (let i = 0; i < length; i++) {
          result.push(this.decodeValue(depth + 1))
        }
        return result
      }

      case CBOR_MAJOR_TYPES.MAP: {
        const length = this.readLength(additionalInfo)
        const result: Record<string, unknown> = {}
        for (let i = 0; i < length; i++) {
          const key = this.decodeValue(depth + 1)
          if (typeof key !== 'string') {
            throw new Error(`CBOR Map 的 key 必須是字串，得到: ${typeof key}`)
          }
          result[key] = this.decodeValue(depth + 1)
        }
        return result
      }

      case CBOR_MAJOR_TYPES.SIMPLE:
        if (additionalInfo === CBOR_SIMPLE_VALUES.FALSE) return false
        if (additionalInfo === CBOR_SIMPLE_VALUES.TRUE) return true
        if (additionalInfo === CBOR_SIMPLE_VALUES.NULL) return null

        // 浮點數
        if (additionalInfo === CBOR_LENGTH_ENCODING.FLOAT32) {
          const bytes = this.readBytes(4)
          const view = new DataView(bytes.buffer, bytes.byteOffset)
          return view.getFloat32(0, false)
        }
        if (additionalInfo === CBOR_LENGTH_ENCODING.FLOAT64) {
          const bytes = this.readBytes(8)
          const view = new DataView(bytes.buffer, bytes.byteOffset)
          return view.getFloat64(0, false)
        }

        throw new Error(`CBOR 不支援的 simple value: ${additionalInfo}`)

      case CBOR_MAJOR_TYPES.TAG:
        // TAG 類型在此實現中跳過
        return this.decodeValue(depth)

      default:
        throw new Error(`CBOR 無效的 major type: ${majorType}`)
    }
  }
}
