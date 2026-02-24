/**
 * @fileoverview Frame protocol with length prefix for TCP message delimiting
 * @module @gravito/quark/protocols/FrameProtocol
 */

import type { FrameProtocolConfig } from '../types'

/**
 * Frame protocol using length-prefixed framing
 *
 * Solves TCP message delimiting problem by prefixing each frame with its length.
 * Supports both 2-byte (uint16) and 4-byte (uint32) headers with configurable byte order.
 *
 * Frame format:
 * ```
 * [Header (2 or 4 bytes)][Payload (variable length)]
 * ```
 *
 * @example
 * ```typescript
 * const protocol = new FrameProtocol({ headerSize: 4 })
 *
 * // Encoding: "Hello" → [0x00 0x00 0x00 0x05] + [H e l l o]
 * const encoded = protocol.encode('Hello')
 *
 * // Decoding with multiple frames
 * let remaining = buffer
 * while (remaining.length > 0) {
 *   const result = protocol.parse(remaining)
 *   if (!result) break
 *   console.log(result.message) // "Hello"
 *   remaining = result.remaining
 * }
 * ```
 */
export class FrameProtocol {
  private config: Required<FrameProtocolConfig>

  constructor(config?: FrameProtocolConfig) {
    this.config = {
      headerSize: 4,
      byteOrder: 'big',
      maxFrameSize: 10 * 1024 * 1024,
      encoding: 'utf-8',
      ...config,
    }

    if (this.config.headerSize !== 2 && this.config.headerSize !== 4) {
      throw new Error('headerSize must be 2 or 4')
    }

    if (this.config.byteOrder !== 'big' && this.config.byteOrder !== 'little') {
      throw new Error("byteOrder must be 'big' or 'little'")
    }
  }

  /**
   * Parse incoming data and extract complete frames
   *
   * @param data - Incoming data buffer
   * @returns Object with parsed message and remaining bytes, or null if incomplete
   */
  parse(data: Uint8Array): { message: Uint8Array; remaining: Uint8Array } | null {
    if (data.length < this.config.headerSize) {
      return null // Not enough data for header
    }

    // Read frame length from header
    const frameLength = this.readLength(data)

    if (frameLength < 0 || frameLength > this.config.maxFrameSize) {
      throw new Error(`Invalid frame size: ${frameLength}`)
    }

    const totalLength = this.config.headerSize + frameLength

    if (data.length < totalLength) {
      return null // Not enough data for complete frame
    }

    // Extract frame payload
    const payload = data.slice(this.config.headerSize, totalLength)
    const remaining = data.slice(totalLength)

    return { message: payload, remaining }
  }

  /**
   * Encode data into length-prefixed frame
   *
   * @param data - Data to encode (string or bytes)
   * @returns Encoded frame with length header
   */
  encode(data: string | Uint8Array): Uint8Array {
    const payload = typeof data === 'string' ? Buffer.from(data, this.config.encoding) : data

    if (payload.length > this.config.maxFrameSize) {
      throw new Error(`Data exceeds max frame size: ${payload.length}`)
    }

    const frame = new Uint8Array(this.config.headerSize + payload.length)

    // Write length header
    this.writeLength(frame, payload.length)

    // Write payload
    frame.set(payload, this.config.headerSize)

    return frame
  }

  /**
   * Decode frame payload to string
   *
   * @param frameData - Decoded frame data
   * @returns Decoded string
   */
  decodeString(frameData: Uint8Array): string {
    return Buffer.from(frameData).toString(this.config.encoding)
  }

  /**
   * Read length from frame header
   */
  private readLength(data: Uint8Array): number {
    const view = new DataView(data.buffer, data.byteOffset)

    if (this.config.headerSize === 2) {
      return this.config.byteOrder === 'big' ? view.getUint16(0) : view.getUint16(0, true)
    } else {
      return this.config.byteOrder === 'big' ? view.getUint32(0) : view.getUint32(0, true)
    }
  }

  /**
   * Write length to frame header
   */
  private writeLength(frame: Uint8Array, length: number): void {
    const view = new DataView(frame.buffer, frame.byteOffset)

    if (this.config.headerSize === 2) {
      if (this.config.byteOrder === 'big') {
        view.setUint16(0, length)
      } else {
        view.setUint16(0, length, true)
      }
    } else {
      if (this.config.byteOrder === 'big') {
        view.setUint32(0, length)
      } else {
        view.setUint32(0, length, true)
      }
    }
  }
}

/**
 * Line protocol using line delimiter (e.g., newline)
 *
 * @example
 * ```typescript
 * const protocol = new LineProtocol({ delimiter: '\n' })
 *
 * const encoded = protocol.encode('Hello')  // "Hello\n"
 * const decoded = protocol.decode(buffer)    // "Hello"
 * ```
 */
export class LineProtocol {
  private delimiter: string
  private encoding: BufferEncoding

  constructor(config?: { delimiter?: string; encoding?: BufferEncoding }) {
    this.delimiter = config?.delimiter ?? '\n'
    this.encoding = config?.encoding ?? 'utf-8'
  }

  /**
   * Parse incoming data and extract complete lines
   */
  parse(data: Uint8Array): { message: string; remaining: Uint8Array } | null {
    const str = Buffer.from(data).toString(this.encoding)
    const index = str.indexOf(this.delimiter)

    if (index === -1) {
      return null // No complete line yet
    }

    const line = str.substring(0, index)
    const consumed = Buffer.byteLength(line + this.delimiter, this.encoding)
    const remaining = data.slice(consumed)

    return { message: line, remaining }
  }

  /**
   * Encode message with line delimiter
   */
  encode(message: string): Uint8Array {
    return Buffer.from(message + this.delimiter, this.encoding)
  }

  /**
   * Decode message (trim delimiter)
   */
  decode(data: Uint8Array): string {
    return Buffer.from(data).toString(this.encoding)
  }
}
