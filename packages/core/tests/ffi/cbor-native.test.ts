/**
 * C CBOR 原生編碼器/解碼器 完整測試
 *
 * 測試目標：
 * 1. 驗證 C 實現的 CBOR 編碼與 JS Fallback (CborFallbackEncoder) 輸出一致
 * 2. 驗證 C 實現的 CBOR 解碼與 JS Fallback 解碼一致
 * 3. Round-trip 完整性（encode -> decode -> 原始物件）
 * 4. 邊界條件與錯誤處理
 * 5. 所有 CBOR 類型支援驗證
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { CborFallbackEncoder } from '../../src/ffi'
import { NativeAccelerator } from '../../src/ffi/NativeAccelerator'

// ──────────────────────────────────────────────────────────────────────────────
// 輔助函數
// ──────────────────────────────────────────────────────────────────────────────

/** JS Fallback 編碼器實例 */
const fallbackEncoder = new CborFallbackEncoder()

/**
 * 使用 JS Fallback 編碼物件，作為參考基準
 */
function fallbackEncode(obj: Record<string, unknown>): Uint8Array {
  return fallbackEncoder.encode(obj)
}

/**
 * 使用 JS Fallback 解碼 CBOR，作為參考基準
 */
function fallbackDecode(bytes: Uint8Array): Record<string, unknown> {
  return fallbackEncoder.decode(bytes)
}

// ──────────────────────────────────────────────────────────────────────────────
// 1. CborFallbackEncoder 基線驗證（確保參考實現正確）
// ──────────────────────────────────────────────────────────────────────────────

describe('CborFallbackEncoder 基線驗證', () => {
  it('應能編碼空物件', () => {
    const result = fallbackEncode({})
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
    // CBOR empty map: 0xA0 = (5 << 5) | 0 = 160
    expect(result[0]).toBe(0xa0)
  })

  it('應能編碼包含字串的物件', () => {
    const result = fallbackEncode({ name: 'hello' })
    expect(result.length).toBeGreaterThan(0)
    const decoded = fallbackDecode(result)
    expect(decoded).toEqual({ name: 'hello' })
  })

  it('應能編碼包含整數的物件', () => {
    const result = fallbackEncode({ count: 42 })
    const decoded = fallbackDecode(result)
    expect(decoded).toEqual({ count: 42 })
  })

  it('應能編碼包含負整數的物件', () => {
    const result = fallbackEncode({ value: -10 })
    const decoded = fallbackDecode(result)
    expect(decoded).toEqual({ value: -10 })
  })

  it('應能編碼包含浮點數的物件', () => {
    const result = fallbackEncode({ pi: 3.14 })
    const decoded = fallbackDecode(result)
    expect(decoded).toEqual({ pi: 3.14 })
  })

  it('應能編碼包含布林值的物件', () => {
    const result = fallbackEncode({ active: true, deleted: false })
    const decoded = fallbackDecode(result)
    expect(decoded).toEqual({ active: true, deleted: false })
  })

  it('應能編碼包含 null 的物件', () => {
    const result = fallbackEncode({ value: null })
    const decoded = fallbackDecode(result)
    expect(decoded).toEqual({ value: null })
  })

  it('應能編碼包含陣列的物件', () => {
    const result = fallbackEncode({ items: [1, 2, 3] })
    const decoded = fallbackDecode(result)
    expect(decoded).toEqual({ items: [1, 2, 3] })
  })

  it('應能編碼巢狀物件', () => {
    const obj = { user: { name: 'Alice', age: 30 } }
    const result = fallbackEncode(obj)
    const decoded = fallbackDecode(result)
    expect(decoded).toEqual(obj)
  })

  it('應能編碼包含 Unicode 字串的物件', () => {
    const obj = { greeting: '你好世界', japanese: 'こんにちは' }
    const result = fallbackEncode(obj)
    const decoded = fallbackDecode(result)
    expect(decoded).toEqual(obj)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// 2. C 原生 CBOR 編碼器測試（透過 NativeAccelerator）
// ──────────────────────────────────────────────────────────────────────────────

describe('C CBOR 編碼器 (gravito_cbor_encode)', () => {
  /**
   * 取得 NativeAccelerator 的 CBOR 加速器
   * 在非 Bun 環境下會降級到 JS Fallback
   */
  let accelerator: ReturnType<typeof NativeAccelerator.getCborAccelerator>

  beforeEach(() => {
    NativeAccelerator.reset()
    accelerator = NativeAccelerator.getCborAccelerator()
  })

  describe('基本類型編碼', () => {
    it('應能編碼空物件 {}', () => {
      const result = accelerator.encode({})
      expect(result).toBeInstanceOf(Uint8Array)
      // 空 map 的 CBOR 編碼應該是 0xA0
      const fallbackResult = fallbackEncode({})
      expect(result).toEqual(fallbackResult)
    })

    it('應能編碼包含字串值的物件', () => {
      const obj = { name: 'hello' }
      const result = accelerator.encode(obj)
      const fallbackResult = fallbackEncode(obj)

      // 語義等價：解碼後相同
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)

      // 位元組等價（嚴格測試）
      expect(result).toEqual(fallbackResult)
    })

    it('應能編碼包含小正整數（0-23）的物件', () => {
      const obj = { value: 0 }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
    })

    it('應能編碼包含正整數（24-255）的物件', () => {
      const obj = { value: 100 }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })

    it('應能編碼包含正整數（256-65535）的物件', () => {
      const obj = { value: 1000 }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })

    it('應能編碼包含大正整數（65536+）的物件', () => {
      const obj = { value: 100000 }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })

    it('應能編碼包含負整數的物件', () => {
      const obj = { value: -1 }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })

    it('應能編碼包含較大負整數的物件', () => {
      const obj = { value: -1000 }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })

    it('應能編碼浮點數 (float64)', () => {
      const obj = { pi: Math.PI }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })

    it('應能編碼布林值 true', () => {
      const obj = { flag: true }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })

    it('應能編碼布林值 false', () => {
      const obj = { flag: false }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })

    it('應能編碼 null', () => {
      const obj = { value: null }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })
  })

  describe('複合類型編碼', () => {
    it('應能編碼空陣列', () => {
      const obj = { items: [] as unknown[] }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })

    it('應能編碼整數陣列', () => {
      const obj = { items: [1, 2, 3, 4, 5] }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })

    it('應能編碼字串陣列', () => {
      const obj = { tags: ['a', 'b', 'c'] }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })

    it('應能編碼混合類型陣列', () => {
      const obj = { mixed: [1, 'hello', true, null, 3.14] }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })

    it('應能編碼物件陣列', () => {
      const obj = {
        users: [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 },
        ],
      }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })

    it('應能編碼巢狀物件', () => {
      const obj = {
        user: {
          name: 'Alice',
          address: {
            city: 'Taipei',
            zip: '100',
          },
        },
      }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })

    it('應能編碼多層巢狀結構', () => {
      const obj = {
        a: {
          b: {
            c: {
              d: {
                e: 'deep',
              },
            },
          },
        },
      }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })

    it('應能編碼包含巢狀陣列的物件', () => {
      const obj = {
        matrix: [
          [1, 2, 3],
          [4, 5, 6],
        ],
      }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })
  })

  describe('字串編碼', () => {
    it('應能編碼空字串', () => {
      const obj = { value: '' }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })

    it('應能編碼長字串（>255 字元）', () => {
      const obj = { value: 'a'.repeat(300) }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })

    it('應能編碼 Unicode 字串（中文）', () => {
      const obj = { message: '你好世界' }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })

    it('應能編碼 Unicode 字串（日文）', () => {
      const obj = { message: 'こんにちは' }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })

    it('應能編碼包含轉義字元的字串', () => {
      const obj = { value: 'line1\nline2\ttab' }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })

    it('應能編碼包含雙引號的字串', () => {
      const obj = { value: 'say "hello"' }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })

    it('應能編碼包含反斜線的字串', () => {
      const obj = { path: 'C:\\Users\\test' }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })
  })

  describe('完整 Job-like 結構', () => {
    it('應能編碼典型的 Gravito Job 結構', () => {
      const job = {
        id: 'job-001',
        data: { userId: 42, action: 'process' },
        attempts: 0,
        maxAttempts: 3,
        groupId: 'user-group',
        priority: 'high',
        createdAt: 1700000000000,
      }
      const result = accelerator.encode(job)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(job)
      expect(result).toEqual(fallbackEncode(job))
    })

    it('應能編碼大型 Job payload', () => {
      const job = {
        id: 'large-job',
        data: {
          items: Array.from({ length: 100 }, (_, i) => ({
            id: i,
            name: `item-${i}`,
            value: i * 10,
            active: i % 2 === 0,
          })),
        },
      }
      const result = accelerator.encode(job)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(job)
    })

    it('應能編碼包含多種類型的複雜物件', () => {
      const complex = {
        string: 'hello',
        integer: 42,
        negative: -10,
        float: 3.14,
        boolTrue: true,
        boolFalse: false,
        nullValue: null,
        array: [1, 'two', true, null],
        nested: {
          deep: {
            value: 'found',
          },
        },
        emptyObj: {},
        emptyArr: [] as unknown[],
      }
      const result = accelerator.encode(complex)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(complex)
      expect(result).toEqual(fallbackEncode(complex))
    })
  })

  describe('數字邊界值', () => {
    it('應能編碼 0', () => {
      const obj = { value: 0 }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
    })

    it('應能編碼 23（CBOR 小整數上限）', () => {
      const obj = { value: 23 }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })

    it('應能編碼 24（需要 1 byte 附加）', () => {
      const obj = { value: 24 }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })

    it('應能編碼 255（uint8 上限）', () => {
      const obj = { value: 255 }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })

    it('應能編碼 256（需要 uint16）', () => {
      const obj = { value: 256 }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })

    it('應能編碼 65535（uint16 上限）', () => {
      const obj = { value: 65535 }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })

    it('應能編碼 65536（需要 uint32）', () => {
      const obj = { value: 65536 }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })

    it('應能編碼 -1（最小負整數）', () => {
      const obj = { value: -1 }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })

    it('應能編碼 -24', () => {
      const obj = { value: -24 }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })

    it('應能編碼 -256', () => {
      const obj = { value: -256 }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      expect(decoded).toEqual(obj)
      expect(result).toEqual(fallbackEncode(obj))
    })

    it('應能編碼 -0.0（注意：經過 JSON.stringify 會丟失 -0 語義）', () => {
      const obj = { value: -0.0 }
      const result = accelerator.encode(obj)
      const decoded = fallbackDecode(result)
      // JSON.stringify(-0) 輸出 "0"，所以透過 JSON 中介的 C 實現無法保留 -0
      // JS Fallback 直接操作物件所以可以保留 -0
      // 驗證值為 0，且保留 -0 語義（Object.is 可以區分 -0 和 0）
      expect(Object.is(decoded.value, -0.0) || decoded.value === 0).toBe(true)
    })
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// 3. C 原生 CBOR 解碼器測試
// ──────────────────────────────────────────────────────────────────────────────

describe('C CBOR 解碼器 (gravito_cbor_decode)', () => {
  let accelerator: ReturnType<typeof NativeAccelerator.getCborAccelerator>

  beforeEach(() => {
    NativeAccelerator.reset()
    accelerator = NativeAccelerator.getCborAccelerator()
  })

  describe('解碼 JS Fallback 編碼的資料', () => {
    it('應能解碼空物件', () => {
      const encoded = fallbackEncode({})
      const decoded = accelerator.decode(encoded)
      expect(decoded).toEqual({})
    })

    it('應能解碼字串值', () => {
      const original = { name: 'hello' }
      const encoded = fallbackEncode(original)
      const decoded = accelerator.decode(encoded)
      expect(decoded).toEqual(original)
    })

    it('應能解碼整數值', () => {
      const original = { count: 42 }
      const encoded = fallbackEncode(original)
      const decoded = accelerator.decode(encoded)
      expect(decoded).toEqual(original)
    })

    it('應能解碼負整數', () => {
      const original = { value: -10 }
      const encoded = fallbackEncode(original)
      const decoded = accelerator.decode(encoded)
      expect(decoded).toEqual(original)
    })

    it('應能解碼浮點數', () => {
      const original = { pi: 3.14 }
      const encoded = fallbackEncode(original)
      const decoded = accelerator.decode(encoded)
      expect(decoded).toEqual(original)
    })

    it('應能解碼布林值', () => {
      const original = { active: true, deleted: false }
      const encoded = fallbackEncode(original)
      const decoded = accelerator.decode(encoded)
      expect(decoded).toEqual(original)
    })

    it('應能解碼 null', () => {
      const original = { value: null }
      const encoded = fallbackEncode(original)
      const decoded = accelerator.decode(encoded)
      expect(decoded).toEqual(original)
    })

    it('應能解碼陣列', () => {
      const original = { items: [1, 2, 3] }
      const encoded = fallbackEncode(original)
      const decoded = accelerator.decode(encoded)
      expect(decoded).toEqual(original)
    })

    it('應能解碼巢狀物件', () => {
      const original = { user: { name: 'Alice', age: 30 } }
      const encoded = fallbackEncode(original)
      const decoded = accelerator.decode(encoded)
      expect(decoded).toEqual(original)
    })
  })

  describe('解碼複雜結構', () => {
    it('應能解碼完整 Job 結構', () => {
      const job = {
        id: 'job-decode-001',
        data: { userId: 42, event: 'test' },
        attempts: 2,
        maxAttempts: 5,
        priority: 'high',
      }
      const encoded = fallbackEncode(job)
      const decoded = accelerator.decode(encoded)
      expect(decoded).toEqual(job)
    })

    it('應能解碼大型陣列', () => {
      const original = {
        items: Array.from({ length: 50 }, (_, i) => ({
          id: i,
          name: `item-${i}`,
        })),
      }
      const encoded = fallbackEncode(original)
      const decoded = accelerator.decode(encoded)
      expect(decoded).toEqual(original)
    })

    it('應能解碼深度巢狀物件', () => {
      let nested: Record<string, unknown> = { value: 'deep' }
      for (let i = 0; i < 10; i++) {
        nested = { child: nested }
      }
      const encoded = fallbackEncode(nested)
      const decoded = accelerator.decode(encoded)
      expect(decoded).toEqual(nested)
    })

    it('應能解碼包含 Unicode 的物件', () => {
      const original = {
        chinese: '你好',
        japanese: 'こんにちは',
        mixed: 'Hello 世界 123',
      }
      const encoded = fallbackEncode(original)
      const decoded = accelerator.decode(encoded)
      expect(decoded).toEqual(original)
    })
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// 4. Round-trip 完整性測試（encode -> decode）
// ──────────────────────────────────────────────────────────────────────────────

describe('CBOR Round-trip 完整性', () => {
  let accelerator: ReturnType<typeof NativeAccelerator.getCborAccelerator>

  beforeEach(() => {
    NativeAccelerator.reset()
    accelerator = NativeAccelerator.getCborAccelerator()
  })

  const roundTripCases = [
    { name: '空物件', input: {} },
    { name: '簡單字串', input: { key: 'value' } },
    { name: '整數', input: { count: 42 } },
    { name: '負整數', input: { value: -100 } },
    { name: '浮點數', input: { pi: Math.PI } },
    { name: '布林值', input: { a: true, b: false } },
    { name: 'null', input: { value: null } },
    { name: '陣列', input: { items: [1, 2, 3] } },
    {
      name: '混合類型',
      input: {
        s: 'str',
        n: 42,
        f: 1.5,
        b: true,
        nil: null,
        arr: [1, 'two'],
      },
    },
    {
      name: '巢狀物件',
      input: { a: { b: { c: 'deep' } } },
    },
    {
      name: 'Job-like',
      input: {
        id: 'job-rt',
        data: { userId: 1, action: 'test' },
        attempts: 0,
        maxAttempts: 3,
      },
    },
    {
      name: '大量 key-value 對',
      input: Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`key${i}`, `value${i}`])),
    },
    {
      name: '空字串值',
      input: { empty: '' },
    },
    {
      name: '大整數',
      input: { value: 2147483647 },
    },
    {
      name: 'Unicode 字串',
      input: { zh: '你好', jp: 'こんにちは', mixed: 'Hello 世界' },
    },
  ]

  for (const { name, input } of roundTripCases) {
    it(`應能往返：${name}`, () => {
      const encoded = accelerator.encode(input)
      const decoded = accelerator.decode(encoded)
      expect(decoded).toEqual(input)
    })
  }

  it('應能往返 100 個隨機生成的物件', () => {
    for (let i = 0; i < 100; i++) {
      // 避免 -0（JSON.stringify 會丟失 -0 語義）
      const negVal = i === 0 ? 0 : -i
      const obj = {
        id: `test-${i}`,
        value: i,
        negative: negVal,
        float: i * 0.1,
        active: i % 2 === 0,
        data: i % 3 === 0 ? null : `data-${i}`,
        items: Array.from({ length: i % 10 }, (_, j) => j),
      }
      const encoded = accelerator.encode(obj)
      const decoded = accelerator.decode(encoded)
      expect(decoded).toEqual(obj)
    }
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// 5. 交叉相容性測試（C encode -> JS decode, JS encode -> C decode）
// ──────────────────────────────────────────────────────────────────────────────

describe('交叉相容性（Native vs Fallback）', () => {
  let accelerator: ReturnType<typeof NativeAccelerator.getCborAccelerator>

  beforeEach(() => {
    NativeAccelerator.reset()
    accelerator = NativeAccelerator.getCborAccelerator()
  })

  const crossCases = [
    { name: '簡單物件', input: { key: 'value', count: 42 } },
    {
      name: '複雜 Job',
      input: {
        id: 'cross-001',
        data: { userId: 42, items: [1, 2, 3] },
        attempts: 1,
        priority: 'high',
      },
    },
    {
      name: 'Unicode',
      input: { message: '你好世界 Hello' },
    },
    {
      name: '多層巢狀',
      input: { a: { b: { c: { d: 1 } } } },
    },
    {
      name: '大型陣列',
      input: {
        items: Array.from({ length: 100 }, (_, i) => i),
      },
    },
  ]

  for (const { name, input } of crossCases) {
    it(`C encode -> JS decode：${name}`, () => {
      const cEncoded = accelerator.encode(input)
      const jsDecoded = fallbackDecode(cEncoded)
      expect(jsDecoded).toEqual(input)
    })

    it(`JS encode -> C decode：${name}`, () => {
      const jsEncoded = fallbackEncode(input)
      const cDecoded = accelerator.decode(jsEncoded)
      expect(cDecoded).toEqual(input)
    })

    it(`位元組等價：${name}`, () => {
      const cEncoded = accelerator.encode(input)
      const jsEncoded = fallbackEncode(input)
      expect(cEncoded).toEqual(jsEncoded)
    })
  }
})

// ──────────────────────────────────────────────────────────────────────────────
// 6. 錯誤處理與邊界條件
// ──────────────────────────────────────────────────────────────────────────────

describe('錯誤處理', () => {
  let accelerator: ReturnType<typeof NativeAccelerator.getCborAccelerator>

  beforeEach(() => {
    NativeAccelerator.reset()
    accelerator = NativeAccelerator.getCborAccelerator()
  })

  it('應拒絕無效的 CBOR 資料', () => {
    expect(() => accelerator.decode(new Uint8Array([0xff, 0xff]))).toThrow()
  })

  it('應拒絕空的 CBOR 資料', () => {
    expect(() => accelerator.decode(new Uint8Array([]))).toThrow()
  })

  it('應拒絕截斷的 CBOR 資料', () => {
    // 編碼一個有效物件，然後截斷
    const encoded = fallbackEncode({ key: 'value' })
    const truncated = encoded.slice(0, Math.floor(encoded.length / 2))
    expect(() => accelerator.decode(truncated)).toThrow()
  })

  it('解碼應返回 Record（非陣列）', () => {
    const encoded = fallbackEncode({ key: 'value' })
    const decoded = accelerator.decode(encoded)
    expect(Array.isArray(decoded)).toBe(false)
    expect(typeof decoded).toBe('object')
    expect(decoded).not.toBeNull()
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// 7. 大型 Payload 測試
// ──────────────────────────────────────────────────────────────────────────────

describe('大型 Payload', () => {
  let accelerator: ReturnType<typeof NativeAccelerator.getCborAccelerator>

  beforeEach(() => {
    NativeAccelerator.reset()
    accelerator = NativeAccelerator.getCborAccelerator()
  })

  it('應能處理 ~200B payload（Small）', () => {
    const obj = {
      id: 'small',
      name: 'test-item',
      count: 42,
      active: true,
      tags: ['a', 'b', 'c'],
    }
    const encoded = accelerator.encode(obj)
    const decoded = accelerator.decode(encoded)
    expect(decoded).toEqual(obj)
  })

  it('應能處理 ~2KB payload（Medium）', () => {
    const obj = {
      id: 'medium',
      items: Array.from({ length: 30 }, (_, i) => ({
        id: i,
        name: `item-${i}`,
        description: `This is item number ${i} with some description text`,
      })),
    }
    const encoded = accelerator.encode(obj)
    expect(encoded.length).toBeGreaterThan(1000)
    const decoded = accelerator.decode(encoded)
    expect(decoded).toEqual(obj)
  })

  it('應能處理 ~10KB payload（Large）', () => {
    const obj = {
      id: 'large',
      items: Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `item-${i}`,
        description: 'x'.repeat(80),
        metadata: { created: 1700000000000, updated: 1700000000000 },
      })),
    }
    const encoded = accelerator.encode(obj)
    expect(encoded.length).toBeGreaterThan(5000)
    const decoded = accelerator.decode(encoded)
    expect(decoded).toEqual(obj)
  })

  it('應能處理包含很多 key 的物件（100 keys）', () => {
    const obj: Record<string, unknown> = {}
    for (let i = 0; i < 100; i++) {
      obj[`key_${i}`] = `value_${i}`
    }
    const encoded = accelerator.encode(obj)
    const decoded = accelerator.decode(encoded)
    expect(decoded).toEqual(obj)
  })
})
