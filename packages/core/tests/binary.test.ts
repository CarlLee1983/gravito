import { describe, expect, it } from 'bun:test'
import { BinaryUtils } from '../src/binary'

describe('BinaryUtils', () => {
  // ─── toUint8Array ───────────────────────────────────────────────────────

  describe('toUint8Array()', () => {
    it('應直接返回 Uint8Array 輸入', async () => {
      const input = new Uint8Array([1, 2, 3])
      const result = await BinaryUtils.toUint8Array(input)
      expect(result).toBe(input)
    })

    it('應將 string 轉換為 Uint8Array', async () => {
      const result = await BinaryUtils.toUint8Array('hello')
      expect(result).toEqual(new TextEncoder().encode('hello'))
    })

    it('應將 ArrayBuffer 轉換為 Uint8Array', async () => {
      const buf = new Uint8Array([10, 20, 30]).buffer
      const result = await BinaryUtils.toUint8Array(buf)
      expect(result).toEqual(new Uint8Array([10, 20, 30]))
    })

    it('應將 Buffer 轉換為 Uint8Array', async () => {
      const buf = Buffer.from([5, 6, 7])
      const result = await BinaryUtils.toUint8Array(buf)
      expect(result).toEqual(new Uint8Array([5, 6, 7]))
    })

    it('應將 Blob 轉換為 Uint8Array', async () => {
      const blob = new Blob(['test'])
      const result = await BinaryUtils.toUint8Array(blob)
      expect(result).toEqual(new TextEncoder().encode('test'))
    })

    it('應處理空字串', async () => {
      const result = await BinaryUtils.toUint8Array('')
      expect(result).toEqual(new Uint8Array(0))
    })

    it('應處理空 ArrayBuffer', async () => {
      const result = await BinaryUtils.toUint8Array(new ArrayBuffer(0))
      expect(result).toEqual(new Uint8Array(0))
    })
  })

  // ─── toArrayBuffer ──────────────────────────────────────────────────────

  describe('toArrayBuffer()', () => {
    it('應直接返回 ArrayBuffer 輸入', async () => {
      const buf = new ArrayBuffer(4)
      const result = await BinaryUtils.toArrayBuffer(buf)
      expect(result).toBeInstanceOf(ArrayBuffer)
      expect(result.byteLength).toBe(4)
    })

    it('應將 Uint8Array 轉換為 ArrayBuffer', async () => {
      const input = new Uint8Array([1, 2, 3])
      const result = await BinaryUtils.toArrayBuffer(input)
      expect(new Uint8Array(result)).toEqual(input)
    })

    it('應將 string 轉換為 ArrayBuffer', async () => {
      const result = await BinaryUtils.toArrayBuffer('hello')
      expect(new TextDecoder().decode(result)).toBe('hello')
    })
  })

  // ─── Base64 ──────────────────────────────────────────────────────────────

  describe('toBase64() 和 fromBase64()', () => {
    it('應正確編碼和解碼 Base64', () => {
      const original = new TextEncoder().encode('Hello, World!')
      const encoded = BinaryUtils.toBase64(original)
      const decoded = BinaryUtils.fromBase64(encoded)
      expect(decoded).toEqual(original)
    })

    it('應為空輸入返回空字串', () => {
      expect(BinaryUtils.toBase64(new Uint8Array(0))).toBe('')
    })

    it('應為空字串返回空 Uint8Array', () => {
      expect(BinaryUtils.fromBase64('')).toEqual(new Uint8Array(0))
    })

    it('toBase64 的結果應為有效的 Base64 格式', () => {
      const data = new Uint8Array([72, 101, 108, 108, 111])
      const encoded = BinaryUtils.toBase64(data)
      expect(encoded).toBe('SGVsbG8=')
    })

    it('應正確處理二進制資料', () => {
      const original = new Uint8Array([0, 1, 2, 127, 128, 255])
      const encoded = BinaryUtils.toBase64(original)
      const decoded = BinaryUtils.fromBase64(encoded)
      expect(decoded).toEqual(original)
    })

    it('應處理大型資料的往返編碼', () => {
      const original = new Uint8Array(1000).fill(42)
      const encoded = BinaryUtils.toBase64(original)
      const decoded = BinaryUtils.fromBase64(encoded)
      expect(decoded).toEqual(original)
    })
  })

  // ─── Base64URL ───────────────────────────────────────────────────────────

  describe('toBase64Url() 和 fromBase64Url()', () => {
    it('應正確編碼和解碼 Base64URL', () => {
      const original = new TextEncoder().encode('Hello, World!')
      const encoded = BinaryUtils.toBase64Url(original)
      const decoded = BinaryUtils.fromBase64Url(encoded)
      expect(decoded).toEqual(original)
    })

    it('Base64URL 不應包含 +、/ 字元', () => {
      const data = new Uint8Array([251, 255, 254, 250])
      const encoded = BinaryUtils.toBase64Url(data)
      expect(encoded).not.toContain('+')
      expect(encoded).not.toContain('/')
    })

    it('Base64URL 與 Base64 應產生不同結果（對含特殊字元的資料）', () => {
      const data = new Uint8Array([251, 239])
      const base64 = BinaryUtils.toBase64(data)
      const base64url = BinaryUtils.toBase64Url(data)
      expect(BinaryUtils.fromBase64(base64)).toEqual(BinaryUtils.fromBase64Url(base64url))
    })

    it('應為空輸入返回空字串', () => {
      expect(BinaryUtils.toBase64Url(new Uint8Array(0))).toBe('')
    })

    it('應為空字串返回空 Uint8Array', () => {
      expect(BinaryUtils.fromBase64Url('')).toEqual(new Uint8Array(0))
    })
  })

  // ─── Hex ─────────────────────────────────────────────────────────────────

  describe('toHex() 和 fromHex()', () => {
    it('應正確編碼和解碼十六進制', () => {
      const original = new Uint8Array([0, 1, 127, 128, 255])
      const encoded = BinaryUtils.toHex(original)
      const decoded = BinaryUtils.fromHex(encoded)
      expect(decoded).toEqual(original)
    })

    it('toHex 應產生小寫十六進制字串', () => {
      const data = new Uint8Array([255, 0, 171])
      const hex = BinaryUtils.toHex(data)
      expect(hex).toBe('ff00ab')
    })

    it('fromHex 應接受大寫十六進制', () => {
      const decoded = BinaryUtils.fromHex('FF00AB')
      expect(decoded).toEqual(new Uint8Array([255, 0, 171]))
    })

    it('應為空輸入返回空字串', () => {
      expect(BinaryUtils.toHex(new Uint8Array(0))).toBe('')
    })

    it('應為空字串返回空 Uint8Array', () => {
      expect(BinaryUtils.fromHex('')).toEqual(new Uint8Array(0))
    })

    it('應拒絕奇數長度的十六進制字串', () => {
      expect(() => BinaryUtils.fromHex('abc')).toThrow(TypeError)
    })

    it('應拒絕無效的十六進制字元', () => {
      expect(() => BinaryUtils.fromHex('zz')).toThrow(TypeError)
    })

    it('應處理大型資料的往返編碼', () => {
      const original = new Uint8Array(512)
      for (let i = 0; i < 512; i++) {
        original[i] = i % 256
      }
      const encoded = BinaryUtils.toHex(original)
      const decoded = BinaryUtils.fromHex(encoded)
      expect(decoded).toEqual(original)
    })
  })

  // ─── Gzip ─────────────────────────────────────────────────────────────────

  describe('gzip() 和 gunzip()', () => {
    it('應正確壓縮和解壓縮資料', async () => {
      const original = new TextEncoder().encode(
        'Hello, World! This is a test string for compression.'
      )
      const compressed = await BinaryUtils.gzip(original)
      const decompressed = await BinaryUtils.gunzip(compressed)
      expect(decompressed).toEqual(original)
    })

    it('壓縮後的資料大小應小於或等於原始大小（對可壓縮資料）', async () => {
      const original = new TextEncoder().encode('a'.repeat(1000))
      const compressed = await BinaryUtils.gzip(original)
      expect(compressed.length).toBeLessThan(original.length)
    })

    it('應處理空資料', async () => {
      const empty = new Uint8Array(0)
      const compressed = await BinaryUtils.gzip(empty)
      expect(compressed).toEqual(empty)
    })

    it('應支援不同壓縮等級', async () => {
      const data = new TextEncoder().encode('test '.repeat(100))
      const level1 = await BinaryUtils.gzip(data, 1)
      const level9 = await BinaryUtils.gzip(data, 9)

      expect(await BinaryUtils.gunzip(level1)).toEqual(data)
      expect(await BinaryUtils.gunzip(level9)).toEqual(data)
    })

    it('應正確處理二進制資料', async () => {
      const original = new Uint8Array(256)
      for (let i = 0; i < 256; i++) {
        original[i] = i
      }
      const compressed = await BinaryUtils.gzip(original)
      const decompressed = await BinaryUtils.gunzip(compressed)
      expect(decompressed).toEqual(original)
    })
  })

  // ─── Stream 工具 ──────────────────────────────────────────────────────────

  describe('readableStreamToBytes()', () => {
    const createStream = (chunks: Uint8Array[]): ReadableStream<Uint8Array> => {
      let index = 0
      return new ReadableStream<Uint8Array>({
        pull(controller) {
          if (index < chunks.length) {
            controller.enqueue(chunks[index++])
          } else {
            controller.close()
          }
        },
      })
    }

    it('應從 stream 讀取所有資料', async () => {
      const chunks = [
        new Uint8Array([1, 2, 3]),
        new Uint8Array([4, 5, 6]),
        new Uint8Array([7, 8, 9]),
      ]
      const stream = createStream(chunks)
      const result = await BinaryUtils.readableStreamToBytes(stream)
      expect(result instanceof Uint8Array).toBe(true)
      expect(Array.from(result)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    })

    it('應處理空 stream', async () => {
      const stream = createStream([])
      const result = await BinaryUtils.readableStreamToBytes(stream)
      expect(result instanceof Uint8Array).toBe(true)
      expect(result.length).toBe(0)
    })

    it('應處理單一 chunk 的 stream', async () => {
      const expected = new Uint8Array([10, 20, 30])
      const stream = createStream([expected])
      const result = await BinaryUtils.readableStreamToBytes(stream)
      expect(result instanceof Uint8Array).toBe(true)
      expect(Array.from(result)).toEqual([10, 20, 30])
    })

    it('應處理大量 chunks', async () => {
      const chunkCount = 100
      const chunkSize = 100
      const chunks: Uint8Array[] = []
      for (let i = 0; i < chunkCount; i++) {
        chunks.push(new Uint8Array(chunkSize).fill(i % 256))
      }
      const stream = createStream(chunks)
      const result = await BinaryUtils.readableStreamToBytes(stream)
      expect(result instanceof Uint8Array).toBe(true)
      expect(result.byteLength).toBe(chunkCount * chunkSize)
    })
  })

  describe('readableStreamToArrayBuffer()', () => {
    it('應從 stream 讀取並返回 ArrayBuffer', async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5])
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(data)
          controller.close()
        },
      })
      const result = await BinaryUtils.readableStreamToArrayBuffer(stream)
      expect(result).toBeInstanceOf(ArrayBuffer)
      expect(new Uint8Array(result)).toEqual(data)
    })
  })

  // ─── 邊界條件 ─────────────────────────────────────────────────────────────

  describe('邊界條件', () => {
    it('應正確處理所有零值的 Uint8Array', async () => {
      const data = new Uint8Array(10).fill(0)
      const hex = BinaryUtils.toHex(data)
      expect(hex).toBe('00000000000000000000')
      expect(BinaryUtils.fromHex(hex)).toEqual(data)
    })

    it('應正確處理所有最大值的 Uint8Array', () => {
      const data = new Uint8Array(10).fill(255)
      const hex = BinaryUtils.toHex(data)
      expect(hex).toBe('ffffffffffffffffffff')
      expect(BinaryUtils.fromHex(hex)).toEqual(data)
    })

    it('Base64 往返應保持大型二進制資料的完整性', () => {
      const size = 10000
      const original = new Uint8Array(size)
      for (let i = 0; i < size; i++) {
        original[i] = i % 256
      }
      const encoded = BinaryUtils.toBase64(original)
      const decoded = BinaryUtils.fromBase64(encoded)
      expect(decoded).toEqual(original)
    })

    it('gzip/gunzip 往返應保持大型資料完整性', async () => {
      const size = 50000
      const original = new Uint8Array(size)
      for (let i = 0; i < size; i++) {
        original[i] = i % 256
      }
      const compressed = await BinaryUtils.gzip(original)
      const decompressed = await BinaryUtils.gunzip(compressed)
      expect(decompressed).toEqual(original)
    })
  })
})
