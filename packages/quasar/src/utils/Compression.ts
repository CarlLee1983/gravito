import { brotliCompressSync, brotliDecompressSync, gunzipSync, gzipSync } from 'node:zlib'

export interface CompressionOptions {
  threshold?: number
  algorithm?: 'brotli' | 'gzip'
}

export class SmartCompressor {
  private threshold: number
  private algorithm: 'brotli' | 'gzip'

  constructor(options: CompressionOptions = {}) {
    this.threshold = options.threshold ?? 1024
    this.algorithm = options.algorithm ?? 'brotli'
  }

  compress(data: Buffer | string): { data: Buffer; compressed: boolean; algorithm?: string } {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data)

    if (buffer.length < this.threshold) {
      return { data: buffer, compressed: false }
    }

    let compressed: Buffer
    if (this.algorithm === 'brotli') {
      compressed = brotliCompressSync(buffer)
    } else {
      compressed = gzipSync(buffer)
    }

    if (compressed.length < buffer.length) {
      return { data: compressed, compressed: true, algorithm: this.algorithm }
    }

    return { data: buffer, compressed: false }
  }

  decompress(data: Buffer, algorithm: string): Buffer {
    if (algorithm === 'brotli') {
      return brotliDecompressSync(data)
    } else if (algorithm === 'gzip') {
      return gunzipSync(data)
    }
    return data
  }
}
