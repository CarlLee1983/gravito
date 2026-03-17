import { describe, expect, test } from 'bun:test'
import { decodeCursor, encodeCursor } from '../../src/pagination/cursor'

describe('Cursor 編碼/解碼', () => {
  test('編碼簡單 cursor', () => {
    const cursor = encodeCursor({ id: 123, offset: 0 })

    expect(cursor).toBeTypeOf('string')
    expect(cursor.length).toBeGreaterThan(0)

    // Base64 編碼應該不含特殊字元（URL safe）
    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  test('解碼 cursor', () => {
    const original = { id: 456, offset: 10 }
    const cursor = encodeCursor(original)
    const decoded = decodeCursor(cursor)

    expect(decoded).toEqual(original)
  })

  test('編碼/解碼往返', () => {
    const testCases = [
      { id: 1, offset: 0 },
      { id: 999, offset: 50 },
      { id: 'abc123', offset: 100 },
      { id: null, offset: 0 },
    ]

    for (const testCase of testCases) {
      const cursor = encodeCursor(testCase)
      const decoded = decodeCursor(cursor)
      expect(decoded).toEqual(testCase)
    }
  })

  test('處理特殊字元', () => {
    const data = { id: 'user:123:post:456', offset: 0 }
    const cursor = encodeCursor(data)
    const decoded = decodeCursor(cursor)

    expect(decoded).toEqual(data)
  })

  test('處理大數字', () => {
    const data = { id: Number.MAX_SAFE_INTEGER, offset: 9999 }
    const cursor = encodeCursor(data)
    const decoded = decodeCursor(cursor)

    expect(decoded).toEqual(data)
  })

  test('無效 cursor 應拋出錯誤', () => {
    expect(() => decodeCursor('invalid-cursor')).toThrow()
    expect(() => decodeCursor('')).toThrow()
    expect(() => decodeCursor('=====')).toThrow()
  })

  test('應拒絕 offset 型別錯誤或非法值的 cursor', () => {
    const invalidType = Buffer.from(JSON.stringify({ id: 1, offset: 'bad' }))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
    const invalidNegative = encodeCursor({ id: 1, offset: -1 })
    const invalidNaN = Buffer.from(JSON.stringify({ id: 1, offset: 'NaN-marker' }))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')

    expect(() => decodeCursor(invalidType)).toThrow(
      'Cursor offset must be a non-negative finite number'
    )
    expect(() => decodeCursor(invalidNegative)).toThrow(
      'Cursor offset must be a non-negative finite number'
    )
    expect(() => decodeCursor(invalidNaN)).toThrow(
      'Cursor offset must be a non-negative finite number'
    )
  })
})
