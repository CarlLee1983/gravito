/**
 * Unit tests for BinaryWorkerProtocol.
 *
 * 測試 encodeJobForTransfer 和 decodeJobFromTransfer 的正確性，
 * 涵蓋 round-trip、各種 SerializedJob 欄位、邊界值及大 payload。
 */

import { describe, expect, it } from 'bun:test'
import type { SerializedJob } from '../../src/types'
import {
  BINARY_PROTOCOL_VERSION,
  decodeJobFromTransfer,
  encodeJobForTransfer,
} from '../../src/workers/BinaryWorkerProtocol'

// ─── 測試輔助函式 ──────────────────────────────────────────────────────────────

/**
 * 建立最小有效的 SerializedJob（只含必要欄位）。
 */
function createMinimalJob(overrides: Partial<SerializedJob> = {}): SerializedJob {
  return {
    id: 'test-job-001',
    type: 'json',
    data: '{"message":"hello"}',
    createdAt: 1700000000000,
    ...overrides,
  }
}

// ─── 協定版本常數 ──────────────────────────────────────────────────────────────

describe('BINARY_PROTOCOL_VERSION', () => {
  it('應為數字 1', () => {
    expect(BINARY_PROTOCOL_VERSION).toBe(1)
  })
})

// ─── encodeJobForTransfer ──────────────────────────────────────────────────────

describe('encodeJobForTransfer', () => {
  it('應回傳 ArrayBuffer 型別', () => {
    const job = createMinimalJob()
    const buffer = encodeJobForTransfer(job)
    expect(buffer).toBeInstanceOf(ArrayBuffer)
  })

  it('buffer 長度應大於 0', () => {
    const job = createMinimalJob()
    const buffer = encodeJobForTransfer(job)
    expect(buffer.byteLength).toBeGreaterThan(0)
  })

  it('應正確編碼 json 型別 job', () => {
    const job = createMinimalJob({ type: 'json', data: '{"key":"value"}' })
    const buffer = encodeJobForTransfer(job)
    const decoded = decodeJobFromTransfer(buffer)
    expect(decoded.type).toBe('json')
    expect(decoded.data).toBe('{"key":"value"}')
  })

  it('應正確編碼 class 型別 job（含 className）', () => {
    const job = createMinimalJob({
      type: 'class',
      data: '{"userId":42}',
      className: 'SendEmailJob',
    })
    const buffer = encodeJobForTransfer(job)
    const decoded = decodeJobFromTransfer(buffer)
    expect(decoded.type).toBe('class')
    expect(decoded.className).toBe('SendEmailJob')
    expect(decoded.data).toBe('{"userId":42}')
  })

  it('應正確編碼 msgpack 型別 job', () => {
    const job = createMinimalJob({ type: 'msgpack', data: 'base64encodeddata==' })
    const buffer = encodeJobForTransfer(job)
    const decoded = decodeJobFromTransfer(buffer)
    expect(decoded.type).toBe('msgpack')
    expect(decoded.data).toBe('base64encodeddata==')
  })

  it('應正確保留所有可選欄位', () => {
    const job: SerializedJob = {
      id: 'job-full-fields',
      type: 'json',
      data: '{}',
      createdAt: 1700000000000,
      className: 'MyJob',
      delaySeconds: 30,
      attempts: 2,
      maxAttempts: 5,
      groupId: 'user-123',
      retryAfterSeconds: 60,
      retryMultiplier: 2,
      error: 'previous error message',
      failedAt: 1700000001000,
      priority: 'high',
    }
    const buffer = encodeJobForTransfer(job)
    const decoded = decodeJobFromTransfer(buffer)

    expect(decoded.className).toBe('MyJob')
    expect(decoded.delaySeconds).toBe(30)
    expect(decoded.attempts).toBe(2)
    expect(decoded.maxAttempts).toBe(5)
    expect(decoded.groupId).toBe('user-123')
    expect(decoded.retryAfterSeconds).toBe(60)
    expect(decoded.retryMultiplier).toBe(2)
    expect(decoded.error).toBe('previous error message')
    expect(decoded.failedAt).toBe(1700000001000)
    expect(decoded.priority).toBe('high')
  })

  it('undefined 欄位不應出現在解碼結果中', () => {
    const job = createMinimalJob()
    // className 為 undefined，JSON.stringify 會忽略它
    const buffer = encodeJobForTransfer(job)
    const decoded = decodeJobFromTransfer(buffer)
    expect(decoded.className).toBeUndefined()
    expect(decoded.delaySeconds).toBeUndefined()
  })

  it('應回傳可獨立傳遞的 ArrayBuffer（不與原始資料共享）', () => {
    const job = createMinimalJob()
    const buffer = encodeJobForTransfer(job)
    // 確保是獨立 ArrayBuffer（byteOffset 應為 0）
    const view = new Uint8Array(buffer)
    expect(view.byteOffset).toBe(0)
  })
})

// ─── decodeJobFromTransfer ──────────────────────────────────────────────────────

describe('decodeJobFromTransfer', () => {
  it('應從有效 buffer 解碼並回傳 SerializedJob', () => {
    const job = createMinimalJob()
    const buffer = encodeJobForTransfer(job)
    const decoded = decodeJobFromTransfer(buffer)

    expect(decoded.id).toBe(job.id)
    expect(decoded.type).toBe(job.type)
    expect(decoded.data).toBe(job.data)
    expect(decoded.createdAt).toBe(job.createdAt)
  })

  it('空 buffer 應拋出錯誤', () => {
    const emptyBuffer = new ArrayBuffer(0)
    expect(() => decodeJobFromTransfer(emptyBuffer)).toThrow()
  })

  it('損毀的 buffer（非 JSON）應拋出解析錯誤', () => {
    const corruptBuffer = new TextEncoder().encode('not valid json {{{{').buffer.slice(0)
    expect(() => decodeJobFromTransfer(corruptBuffer)).toThrow(/JSON 解析失敗/)
  })

  it('缺少 id 欄位的 JSON 應拋出結構驗證錯誤', () => {
    const invalid = JSON.stringify({ type: 'json', data: '{}', createdAt: 1 })
    const buffer = new TextEncoder().encode(invalid).buffer.slice(0)
    expect(() => decodeJobFromTransfer(buffer)).toThrow(/SerializedJob 結構/)
  })

  it('缺少 type 欄位的 JSON 應拋出結構驗證錯誤', () => {
    const invalid = JSON.stringify({ id: 'x', data: '{}', createdAt: 1 })
    const buffer = new TextEncoder().encode(invalid).buffer.slice(0)
    expect(() => decodeJobFromTransfer(buffer)).toThrow(/SerializedJob 結構/)
  })

  it('無效 type 值應拋出結構驗證錯誤', () => {
    const invalid = JSON.stringify({ id: 'x', type: 'invalid', data: '{}', createdAt: 1 })
    const buffer = new TextEncoder().encode(invalid).buffer.slice(0)
    expect(() => decodeJobFromTransfer(buffer)).toThrow(/SerializedJob 結構/)
  })

  it('缺少 createdAt 欄位的 JSON 應拋出結構驗證錯誤', () => {
    const invalid = JSON.stringify({ id: 'x', type: 'json', data: '{}' })
    const buffer = new TextEncoder().encode(invalid).buffer.slice(0)
    expect(() => decodeJobFromTransfer(buffer)).toThrow(/SerializedJob 結構/)
  })
})

// ─── Round-trip 測試 ──────────────────────────────────────────────────────────

describe('encodeJobForTransfer + decodeJobFromTransfer round-trip', () => {
  it('基本 round-trip：編碼後解碼應得到相同資料', () => {
    const original = createMinimalJob()
    const buffer = encodeJobForTransfer(original)
    const restored = decodeJobFromTransfer(buffer)

    expect(restored).toEqual(original)
  })

  it('包含特殊 Unicode 字元的 round-trip', () => {
    const job = createMinimalJob({
      data: '{"message":"繁體中文 🚀 特殊符號 \u0000\uffff"}',
    })
    const buffer = encodeJobForTransfer(job)
    const restored = decodeJobFromTransfer(buffer)
    expect(restored.data).toBe(job.data)
  })

  it('包含跳脫字元的 round-trip', () => {
    const job = createMinimalJob({
      data: '{"path":"C:\\\\Users\\\\test","newline":"line1\\nline2","tab":"col1\\tcol2"}',
    })
    const buffer = encodeJobForTransfer(job)
    const restored = decodeJobFromTransfer(buffer)
    expect(restored.data).toBe(job.data)
  })

  it('包含引號字元的 round-trip', () => {
    const job = createMinimalJob({
      data: '{"quote":"He said \\"hello\\"","apos":"It\'s fine"}',
    })
    const buffer = encodeJobForTransfer(job)
    const restored = decodeJobFromTransfer(buffer)
    expect(restored.data).toBe(job.data)
  })

  it('priority 為數字的 round-trip', () => {
    const job = createMinimalJob({ priority: 100 })
    const buffer = encodeJobForTransfer(job)
    const restored = decodeJobFromTransfer(buffer)
    expect(restored.priority).toBe(100)
  })

  it('大 payload（100KB+ data 字串）的 round-trip', () => {
    // 建立 ~100KB 的 data 字串
    const largeData = 'x'.repeat(100 * 1024)
    const job = createMinimalJob({ data: largeData })
    const buffer = encodeJobForTransfer(job)

    // buffer 應該 >= 100KB
    expect(buffer.byteLength).toBeGreaterThanOrEqual(100 * 1024)

    const restored = decodeJobFromTransfer(buffer)
    expect(restored.data).toBe(largeData)
    expect(restored.data.length).toBe(100 * 1024)
  })

  it('多次 round-trip 應保持一致性', () => {
    const original = createMinimalJob({
      data: '{"counter":0}',
      attempts: 3,
    })

    // 執行 3 次 round-trip
    let current = original
    for (let i = 0; i < 3; i++) {
      const buffer = encodeJobForTransfer(current)
      current = decodeJobFromTransfer(buffer)
    }

    expect(current).toEqual(original)
  })
})
