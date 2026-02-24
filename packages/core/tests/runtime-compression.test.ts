import { describe, expect, it } from 'bun:test'
import { getCompressionAdapter, type RuntimeCompressionAdapter } from '../src/runtime'

// ============ 測試輔助 ============

const getAdapter = (): RuntimeCompressionAdapter => getCompressionAdapter()

const encoder = new TextEncoder()
const decoder = new TextDecoder()

// ============ 基本功能測試 ============

describe('getCompressionAdapter', () => {
  it('應回傳 RuntimeCompressionAdapter 物件', () => {
    const adapter = getAdapter()
    expect(adapter).toBeDefined()
    expect(typeof adapter.gzipSync).toBe('function')
    expect(typeof adapter.gunzipSync).toBe('function')
    expect(typeof adapter.deflateSync).toBe('function')
    expect(typeof adapter.inflateSync).toBe('function')
    expect(typeof adapter.gzip).toBe('function')
    expect(typeof adapter.gunzip).toBe('function')
  })

  it('應快取並回傳相同的 adapter 實例', () => {
    const adapter1 = getAdapter()
    const adapter2 = getAdapter()
    expect(adapter1).toBe(adapter2)
  })
})

// ============ gzipSync / gunzipSync 測試 ============

describe('RuntimeCompressionAdapter - gzipSync / gunzipSync', () => {
  it('應壓縮並解壓縮文字資料', () => {
    const adapter = getAdapter()
    const original = encoder.encode('Hello, Gravito compression!')

    const compressed = adapter.gzipSync(original)
    expect(compressed).toBeInstanceOf(Uint8Array)
    expect(compressed.length).toBeGreaterThan(0)

    const decompressed = adapter.gunzipSync(compressed)
    expect(decoder.decode(decompressed)).toBe('Hello, Gravito compression!')
  })

  it('應壓縮並解壓縮大型資料', () => {
    const adapter = getAdapter()
    const largeContent = 'x'.repeat(100_000)
    const original = encoder.encode(largeContent)

    const compressed = adapter.gzipSync(original)
    // 重複資料壓縮比應該很高
    expect(compressed.length).toBeLessThan(original.length)

    const decompressed = adapter.gunzipSync(compressed)
    expect(decoder.decode(decompressed)).toBe(largeContent)
  })

  it('應壓縮並解壓縮空資料', () => {
    const adapter = getAdapter()
    const empty = new Uint8Array(0)

    const compressed = adapter.gzipSync(empty)
    expect(compressed).toBeInstanceOf(Uint8Array)

    const decompressed = adapter.gunzipSync(compressed)
    expect(decompressed.length).toBe(0)
  })

  it('應壓縮並解壓縮二進位資料', () => {
    const adapter = getAdapter()
    const binary = new Uint8Array([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd, 0x80, 0x7f])

    const compressed = adapter.gzipSync(binary)
    const decompressed = adapter.gunzipSync(compressed)

    expect(decompressed.length).toBe(binary.length)
    for (let i = 0; i < binary.length; i++) {
      expect(decompressed[i]).toBe(binary[i])
    }
  })

  it('應支援不同壓縮等級', () => {
    const adapter = getAdapter()
    const data = encoder.encode('compression level test data '.repeat(1000))

    const lowCompression = adapter.gzipSync(data, {
      level: 1,
    })
    const highCompression = adapter.gzipSync(data, {
      level: 9,
    })

    // 兩者都應可正確解壓縮
    expect(decoder.decode(adapter.gunzipSync(lowCompression))).toBe(decoder.decode(data))
    expect(decoder.decode(adapter.gunzipSync(highCompression))).toBe(decoder.decode(data))

    // 高壓縮等級應產生較小的輸出
    expect(highCompression.length).toBeLessThanOrEqual(lowCompression.length)
  })
})

// ============ deflateSync / inflateSync 測試 ============

describe('RuntimeCompressionAdapter - deflateSync / inflateSync', () => {
  it('應壓縮並解壓縮文字資料', () => {
    const adapter = getAdapter()
    const original = encoder.encode('Hello, Gravito deflate!')

    const compressed = adapter.deflateSync(original)
    expect(compressed).toBeInstanceOf(Uint8Array)
    expect(compressed.length).toBeGreaterThan(0)

    const decompressed = adapter.inflateSync(compressed)
    expect(decoder.decode(decompressed)).toBe('Hello, Gravito deflate!')
  })

  it('應壓縮並解壓縮大型資料', () => {
    const adapter = getAdapter()
    const largeContent = 'deflate-test-'.repeat(10_000)
    const original = encoder.encode(largeContent)

    const compressed = adapter.deflateSync(original)
    expect(compressed.length).toBeLessThan(original.length)

    const decompressed = adapter.inflateSync(compressed)
    expect(decoder.decode(decompressed)).toBe(largeContent)
  })

  it('應壓縮並解壓縮空資料', () => {
    const adapter = getAdapter()
    const empty = new Uint8Array(0)

    const compressed = adapter.deflateSync(empty)
    const decompressed = adapter.inflateSync(compressed)
    expect(decompressed.length).toBe(0)
  })

  it('應支援不同壓縮等級', () => {
    const adapter = getAdapter()
    const data = encoder.encode('deflate level test '.repeat(1000))

    const level1 = adapter.deflateSync(data, { level: 1 })
    const level9 = adapter.deflateSync(data, { level: 9 })

    expect(decoder.decode(adapter.inflateSync(level1))).toBe(decoder.decode(data))
    expect(decoder.decode(adapter.inflateSync(level9))).toBe(decoder.decode(data))

    expect(level9.length).toBeLessThanOrEqual(level1.length)
  })
})

// ============ 非同步 gzip / gunzip 測試 ============

describe('RuntimeCompressionAdapter - async gzip / gunzip', () => {
  it('應非同步壓縮並解壓縮文字資料', async () => {
    const adapter = getAdapter()
    const original = encoder.encode('async compression test')

    const compressed = await adapter.gzip(original)
    expect(compressed).toBeInstanceOf(Uint8Array)

    const decompressed = await adapter.gunzip(compressed)
    expect(decoder.decode(decompressed)).toBe('async compression test')
  })

  it('應非同步壓縮並解壓縮大型資料', async () => {
    const adapter = getAdapter()
    const largeContent = 'async-large-'.repeat(50_000)
    const original = encoder.encode(largeContent)

    const compressed = await adapter.gzip(original)
    expect(compressed.length).toBeLessThan(original.length)

    const decompressed = await adapter.gunzip(compressed)
    expect(decoder.decode(decompressed)).toBe(largeContent)
  })

  it('應支援壓縮等級選項', async () => {
    const adapter = getAdapter()
    const data = encoder.encode('async level test '.repeat(1000))

    const compressed = await adapter.gzip(data, {
      level: 9,
    })
    const decompressed = await adapter.gunzip(compressed)
    expect(decoder.decode(decompressed)).toBe(decoder.decode(data))
  })
})

// ============ 交叉相容性測試 ============

describe('RuntimeCompressionAdapter - 交叉相容性', () => {
  it('同步壓縮的資料可以被非同步方法解壓縮', async () => {
    const adapter = getAdapter()
    const original = encoder.encode('cross compat sync->async')

    const compressed = adapter.gzipSync(original)
    const decompressed = await adapter.gunzip(compressed)
    expect(decoder.decode(decompressed)).toBe('cross compat sync->async')
  })

  it('非同步壓縮的資料可以被同步方法解壓縮', async () => {
    const adapter = getAdapter()
    const original = encoder.encode('cross compat async->sync')

    const compressed = await adapter.gzip(original)
    const decompressed = adapter.gunzipSync(compressed)
    expect(decoder.decode(decompressed)).toBe('cross compat async->sync')
  })
})
