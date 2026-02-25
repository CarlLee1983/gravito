import { describe, expect, it } from 'bun:test'
import {
  decodeBinaryJobFrame,
  encodeBinaryJobFrame,
  Flags,
  HEADER_SIZE,
  isGravitoJobFrame,
  MAGIC,
  VERSION,
} from '../src/drivers/BinaryJobFrame'
import type { SerializedJob } from '../src/types'

// ─── 測試輔助函式 ────────────────────────────────────────────────────────────

/**
 * 建立標準 binary 測試 Job
 */
function makeBinaryJob(overrides: Partial<SerializedJob> = {}): SerializedJob {
  return {
    id: 'test-job-001',
    type: 'binary',
    data: new Uint8Array([0x01, 0x02, 0x03, 0x04]),
    createdAt: 1700000000000,
    attempts: 0,
    ...overrides,
  }
}

/**
 * 建立指定大小的 Uint8Array payload
 */
function makePayload(sizeBytes: number): Uint8Array {
  const buf = new Uint8Array(sizeBytes)
  for (let i = 0; i < sizeBytes; i++) {
    buf[i] = i % 256
  }
  return buf
}

// ─── Magic Bytes 與格式驗證 ──────────────────────────────────────────────────

describe('MAGIC 常數與 isGravitoJobFrame', () => {
  it('MAGIC 應為 [0x47, 0x4A]', () => {
    expect(MAGIC[0]).toBe(0x47)
    expect(MAGIC[1]).toBe(0x4a)
  })

  it('VERSION 應為 0x01', () => {
    expect(VERSION).toBe(0x01)
  })

  it('HEADER_SIZE 應為 6', () => {
    expect(HEADER_SIZE).toBe(6)
  })

  it('isGravitoJobFrame：正確識別二進制幀', () => {
    const job = makeBinaryJob()
    const frame = encodeBinaryJobFrame(job)
    expect(isGravitoJobFrame(frame)).toBe(true)
  })

  it('isGravitoJobFrame：正確拒絕 JSON 字串的 bytes', () => {
    const jsonBytes = new TextEncoder().encode(JSON.stringify({ id: 'x', type: 'json' }))
    expect(isGravitoJobFrame(jsonBytes)).toBe(false)
  })

  it('isGravitoJobFrame：正確拒絕空資料', () => {
    expect(isGravitoJobFrame(new Uint8Array(0))).toBe(false)
  })

  it('isGravitoJobFrame：正確拒絕長度不足的資料', () => {
    expect(isGravitoJobFrame(new Uint8Array([0x47, 0x4a]))).toBe(false) // 只有 2 bytes
  })

  it('isGravitoJobFrame：Buffer 類型也能正確識別', () => {
    const job = makeBinaryJob()
    const frame = encodeBinaryJobFrame(job)
    const buf = Buffer.from(frame)
    expect(isGravitoJobFrame(buf)).toBe(true)
  })
})

// ─── 基本編碼/解碼 Round-trip ────────────────────────────────────────────────

describe('encodeBinaryJobFrame / decodeBinaryJobFrame 基本 Round-trip', () => {
  it('最小欄位（只有必要欄位）round-trip', () => {
    const job: SerializedJob = {
      id: 'minimal-001',
      type: 'binary',
      data: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
      createdAt: 1700000000000,
    }
    const frame = encodeBinaryJobFrame(job)
    const decoded = decodeBinaryJobFrame(frame)

    expect(decoded.id).toBe('minimal-001')
    expect(decoded.type).toBe('binary')
    expect(decoded.createdAt).toBe(1700000000000)
    expect(decoded.data).toBeInstanceOf(Uint8Array)
    expect(decoded.data).toEqual(new Uint8Array([0xde, 0xad, 0xbe, 0xef]))
  })

  it('100B payload round-trip', () => {
    const payload = makePayload(100)
    const job = makeBinaryJob({ data: payload })
    const frame = encodeBinaryJobFrame(job)
    const decoded = decodeBinaryJobFrame(frame)

    expect(decoded.data).toEqual(payload)
    expect(decoded.id).toBe(job.id)
  })

  it('1KB payload round-trip', () => {
    const payload = makePayload(1024)
    const job = makeBinaryJob({ data: payload })
    const frame = encodeBinaryJobFrame(job)
    const decoded = decodeBinaryJobFrame(frame)

    expect(decoded.data).toEqual(payload)
    expect((decoded.data as Uint8Array).length).toBe(1024)
  })

  it('10KB payload round-trip', () => {
    const payload = makePayload(10 * 1024)
    const job = makeBinaryJob({ data: payload })
    const frame = encodeBinaryJobFrame(job)
    const decoded = decodeBinaryJobFrame(frame)

    expect(decoded.data).toEqual(payload)
    expect((decoded.data as Uint8Array).length).toBe(10 * 1024)
  })

  it('100KB payload round-trip', () => {
    const payload = makePayload(100 * 1024)
    const job = makeBinaryJob({ data: payload })
    const frame = encodeBinaryJobFrame(job)
    const decoded = decodeBinaryJobFrame(frame)

    expect(decoded.data).toEqual(payload)
    expect((decoded.data as Uint8Array).length).toBe(100 * 1024)
  })

  it('空 payload round-trip', () => {
    const job = makeBinaryJob({ data: new Uint8Array(0) })
    const frame = encodeBinaryJobFrame(job)
    const decoded = decodeBinaryJobFrame(frame)

    expect(decoded.data).toBeInstanceOf(Uint8Array)
    expect((decoded.data as Uint8Array).length).toBe(0)
  })
})

// ─── Metadata 欄位保留驗證 ──────────────────────────────────────────────────

describe('Metadata 欄位完整保留', () => {
  it('保留 attempts 和 maxAttempts', () => {
    const job = makeBinaryJob({ attempts: 3, maxAttempts: 5 })
    const decoded = decodeBinaryJobFrame(encodeBinaryJobFrame(job))

    expect(decoded.attempts).toBe(3)
    expect(decoded.maxAttempts).toBe(5)
  })

  it('保留 className', () => {
    const job = makeBinaryJob({ className: 'SendEmailJob' })
    const decoded = decodeBinaryJobFrame(encodeBinaryJobFrame(job))

    expect(decoded.className).toBe('SendEmailJob')
  })

  it('保留 groupId', () => {
    const job = makeBinaryJob({ groupId: 'user-123' })
    const decoded = decodeBinaryJobFrame(encodeBinaryJobFrame(job))

    expect(decoded.groupId).toBe('user-123')
  })

  it('保留 delaySeconds', () => {
    const job = makeBinaryJob({ delaySeconds: 30 })
    const decoded = decodeBinaryJobFrame(encodeBinaryJobFrame(job))

    expect(decoded.delaySeconds).toBe(30)
  })

  it('保留 priority（字串）', () => {
    const job = makeBinaryJob({ priority: 'high' })
    const decoded = decodeBinaryJobFrame(encodeBinaryJobFrame(job))

    expect(decoded.priority).toBe('high')
  })

  it('保留 priority（數字）', () => {
    const job = makeBinaryJob({ priority: 10 })
    const decoded = decodeBinaryJobFrame(encodeBinaryJobFrame(job))

    expect(decoded.priority).toBe(10)
  })

  it('保留 error 和 failedAt', () => {
    const job = makeBinaryJob({
      error: 'Connection refused',
      failedAt: 1700001234567,
    })
    const decoded = decodeBinaryJobFrame(encodeBinaryJobFrame(job))

    expect(decoded.error).toBe('Connection refused')
    expect(decoded.failedAt).toBe(1700001234567)
  })

  it('保留 retryAfterSeconds 和 retryMultiplier', () => {
    const job = makeBinaryJob({ retryAfterSeconds: 5, retryMultiplier: 2 })
    const decoded = decodeBinaryJobFrame(encodeBinaryJobFrame(job))

    expect(decoded.retryAfterSeconds).toBe(5)
    expect(decoded.retryMultiplier).toBe(2)
  })

  it('所有欄位都有的完整 Job round-trip', () => {
    const job: SerializedJob = {
      id: 'full-job-001',
      type: 'binary',
      data: makePayload(512),
      createdAt: 1700000000000,
      attempts: 2,
      maxAttempts: 5,
      className: 'ProcessOrderJob',
      groupId: 'order-group-1',
      delaySeconds: 10,
      priority: 'critical',
      retryAfterSeconds: 3,
      retryMultiplier: 1.5,
      error: 'Previous attempt failed',
      failedAt: 1700000005000,
    }

    const decoded = decodeBinaryJobFrame(encodeBinaryJobFrame(job))

    expect(decoded.id).toBe(job.id)
    expect(decoded.type).toBe('binary')
    expect(decoded.createdAt).toBe(job.createdAt)
    expect(decoded.attempts).toBe(2)
    expect(decoded.maxAttempts).toBe(5)
    expect(decoded.className).toBe('ProcessOrderJob')
    expect(decoded.groupId).toBe('order-group-1')
    expect(decoded.delaySeconds).toBe(10)
    expect(decoded.priority).toBe('critical')
    expect(decoded.retryAfterSeconds).toBe(3)
    expect(decoded.retryMultiplier).toBe(1.5)
    expect(decoded.error).toBe('Previous attempt failed')
    expect(decoded.failedAt).toBe(1700000005000)
    expect(decoded.data).toEqual(makePayload(512))
  })
})

// ─── Flags 位元驗證 ──────────────────────────────────────────────────────────

describe('Flags 位元驗證', () => {
  it('無可選欄位時 Flags 應為 0x00', () => {
    const job: SerializedJob = {
      id: 'no-flags',
      type: 'binary',
      data: new Uint8Array([1, 2, 3]),
      createdAt: 1700000000000,
    }
    const frame = encodeBinaryJobFrame(job)
    // Flags 在 offset 3
    expect(frame[3]).toBe(0x00)
  })

  it('包含 className 時 HAS_CLASS_NAME bit 應設定', () => {
    const job = makeBinaryJob({ className: 'TestJob' })
    const frame = encodeBinaryJobFrame(job)
    expect(frame[3]! & Flags.HAS_CLASS_NAME).toBeTruthy()
  })

  it('包含 groupId 時 HAS_GROUP_ID bit 應設定', () => {
    const job = makeBinaryJob({ groupId: 'group-1' })
    const frame = encodeBinaryJobFrame(job)
    expect(frame[3]! & Flags.HAS_GROUP_ID).toBeTruthy()
  })

  it('包含 delaySeconds 時 HAS_DELAY bit 應設定', () => {
    const job = makeBinaryJob({ delaySeconds: 5 })
    const frame = encodeBinaryJobFrame(job)
    expect(frame[3]! & Flags.HAS_DELAY).toBeTruthy()
  })

  it('包含 priority 時 HAS_PRIORITY bit 應設定', () => {
    const job = makeBinaryJob({ priority: 'high' })
    const frame = encodeBinaryJobFrame(job)
    expect(frame[3]! & Flags.HAS_PRIORITY).toBeTruthy()
  })

  it('包含 error 時 HAS_ERROR bit 應設定', () => {
    const job = makeBinaryJob({ error: 'timeout' })
    const frame = encodeBinaryJobFrame(job)
    expect(frame[3]! & Flags.HAS_ERROR).toBeTruthy()
  })
})

// ─── data 原始性保留 ─────────────────────────────────────────────────────────

describe('Uint8Array data 原始保留（不轉 Base64）', () => {
  it('解碼後 data 應為 Uint8Array（非字串）', () => {
    const job = makeBinaryJob({ data: new Uint8Array([0xff, 0x00, 0x80, 0x7f]) })
    const frame = encodeBinaryJobFrame(job)
    const decoded = decodeBinaryJobFrame(frame)

    expect(decoded.data).toBeInstanceOf(Uint8Array)
    expect(typeof decoded.data).not.toBe('string')
  })

  it('Binary data 中的 0x00 bytes 應完整保留', () => {
    // 包含大量 0x00 的二進制資料
    const payload = new Uint8Array(32).fill(0)
    payload[0] = 0xde
    payload[31] = 0xad

    const job = makeBinaryJob({ data: payload })
    const decoded = decodeBinaryJobFrame(encodeBinaryJobFrame(job))

    expect((decoded.data as Uint8Array)[0]).toBe(0xde)
    expect((decoded.data as Uint8Array)[31]).toBe(0xad)
    expect((decoded.data as Uint8Array)[15]).toBe(0x00)
  })

  it('Buffer 輸入也能正確解碼', () => {
    const job = makeBinaryJob()
    const frame = encodeBinaryJobFrame(job)
    // 用 Buffer 包裝後傳入解碼
    const buf = Buffer.from(frame)
    const decoded = decodeBinaryJobFrame(buf)

    expect(decoded.id).toBe(job.id)
    expect(decoded.data).toBeInstanceOf(Uint8Array)
    expect(decoded.data).toEqual(job.data)
  })
})

// ─── 錯誤處理 ────────────────────────────────────────────────────────────────

describe('錯誤處理', () => {
  it('編碼非 Uint8Array 的 data 應拋出 TypeError', () => {
    const job: SerializedJob = {
      id: 'bad-data',
      type: 'binary',
      data: 'should-be-uint8array' as any,
      createdAt: Date.now(),
    }
    expect(() => encodeBinaryJobFrame(job)).toThrow(TypeError)
  })

  it('解碼 Magic bytes 不符的資料應拋出錯誤', () => {
    const badData = new Uint8Array([0x00, 0x00, 0x01, 0x00, 0x00, 0x02, 0x01, 0x02])
    expect(() => decodeBinaryJobFrame(badData)).toThrow()
  })

  it('解碼長度不足的資料應拋出錯誤', () => {
    const tooShort = new Uint8Array([0x47, 0x4a, 0x01])
    expect(() => decodeBinaryJobFrame(tooShort)).toThrow()
  })

  it('解碼被截斷的 metadata 應拋出錯誤', () => {
    // 建立合法 header 但 metadata 被截斷
    const frame = new Uint8Array(8)
    frame[0] = 0x47 // MAGIC[0]
    frame[1] = 0x4a // MAGIC[1]
    frame[2] = 0x01 // VERSION
    frame[3] = 0x00 // flags
    frame[4] = 0x00 // MetaLen high byte
    frame[5] = 0x64 // MetaLen low byte = 100，但實際沒有那麼多資料
    // 後面的資料不足 100 bytes
    expect(() => decodeBinaryJobFrame(frame)).toThrow()
  })
})
