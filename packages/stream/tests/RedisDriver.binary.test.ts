import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { encodeBinaryJobFrame, isGravitoJobFrame } from '../src/drivers/BinaryJobFrame'
import { RedisDriver } from '../src/drivers/RedisDriver'
import type { SerializedJob } from '../src/types'

// ─── 測試輔助函式 ────────────────────────────────────────────────────────────

/**
 * 建立 binary 類型的 SerializedJob
 */
function makeBinaryJob(overrides: Partial<SerializedJob> = {}): SerializedJob {
  return {
    id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'binary',
    data: new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05]),
    createdAt: Date.now(),
    attempts: 0,
    ...overrides,
  }
}

/**
 * 建立 JSON 類型的 SerializedJob（legacy）
 */
function makeJsonJob(overrides: Partial<SerializedJob> = {}): SerializedJob {
  return {
    id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'json',
    data: JSON.stringify({ task: 'send-email', userId: 42 }),
    createdAt: Date.now(),
    attempts: 0,
    ...overrides,
  }
}

// ─── Mock Redis Client（支援 Buffer API）───────────────────────────────────

/**
 * 建立支援 Buffer API 的 Mock Redis Client
 *
 * 模擬 ioredis Buffer mode：rpopBuffer、brpopBuffer、lrangeBuffer、lpushBuffer
 */
function createMockRedisClientWithBufferSupport() {
  // 使用 Map 模擬 Redis 的多個 list
  const store = new Map<string, Array<string | Buffer>>()
  const zsets = new Map<string, Array<{ score: number; member: string }>>()
  const stringStore = new Map<string, string>()

  const getList = (key: string): Array<string | Buffer> => {
    if (!store.has(key)) store.set(key, [])
    return store.get(key)!
  }

  const client = {
    // 標準 string API
    async lpush(key: string, ...values: (string | Buffer)[]): Promise<number> {
      const list = getList(key)
      for (const v of values) {
        list.unshift(v) // LPUSH 插入到頭部
      }
      return list.length
    },

    async rpop(key: string, count?: number): Promise<string | string[] | null> {
      const list = getList(key)
      if (list.length === 0) return null
      if (count !== undefined) {
        const items = list
          .splice(list.length - count, count)
          .map((v) => (Buffer.isBuffer(v) ? v.toString('utf8') : (v as string)))
        return items.length > 0 ? items : null
      }
      const item = list.pop()
      if (item === undefined) return null
      return Buffer.isBuffer(item) ? item.toString('utf8') : (item as string)
    },

    async llen(key: string): Promise<number> {
      return getList(key).length
    },

    async del(...keys: string[]): Promise<number> {
      let count = 0
      for (const k of keys) {
        if (store.has(k) || zsets.has(k) || stringStore.has(k)) {
          store.delete(k)
          zsets.delete(k)
          stringStore.delete(k)
          count++
        }
      }
      return count
    },

    async get(key: string): Promise<string | null> {
      return stringStore.get(key) ?? null
    },

    async set(key: string, value: string, ...args: any[]): Promise<'OK'> {
      stringStore.set(key, value)
      return 'OK'
    },

    async lrange(key: string, start: number, stop: number): Promise<string[]> {
      const list = getList(key)
      const actualStop = stop === -1 ? list.length - 1 : stop
      return list
        .slice(start, actualStop + 1)
        .map((v) => (Buffer.isBuffer(v) ? v.toString('utf8') : (v as string)))
    },

    async zadd(key: string, score: number, member: string): Promise<number> {
      if (!zsets.has(key)) zsets.set(key, [])
      const zset = zsets.get(key)!
      zset.push({ score, member })
      zset.sort((a, b) => a.score - b.score)
      return 1
    },

    async zrange(key: string, start: number, end: number, ...args: string[]): Promise<string[]> {
      const zset = zsets.get(key) ?? []
      const withScores = args.includes('WITHSCORES')
      const actualEnd = end === -1 ? zset.length - 1 : end
      const items = zset.slice(start, actualEnd + 1)
      if (withScores) {
        return items.flatMap((item) => [item.member, item.score.toString()])
      }
      return items.map((item) => item.member)
    },

    async zrem(key: string, ...members: string[]): Promise<number> {
      if (!zsets.has(key)) return 0
      const zset = zsets.get(key)!
      const memberSet = new Set(members)
      const before = zset.length
      const filtered = zset.filter((item) => !memberSet.has(item.member))
      zsets.set(key, filtered)
      return before - filtered.length
    },

    async ltrim(key: string, start: number, stop: number): Promise<'OK'> {
      const list = getList(key)
      const trimmed = list.slice(start, stop + 1)
      store.set(key, trimmed)
      return 'OK'
    },

    // Buffer API（模擬 ioredis buffer mode）
    async lpushBuffer(key: string, ...buffers: Buffer[]): Promise<number> {
      const list = getList(key)
      for (const buf of buffers) {
        list.unshift(buf)
      }
      return list.length
    },

    async rpopBuffer(key: string, count?: number): Promise<Buffer | Buffer[] | null> {
      const list = getList(key)
      if (list.length === 0) return null
      if (count !== undefined) {
        const items = list
          .splice(list.length - count, count)
          .map((v) => (Buffer.isBuffer(v) ? v : Buffer.from(v as string)))
        return items.length > 0 ? items : null
      }
      const item = list.pop()
      if (item === undefined) return null
      return Buffer.isBuffer(item) ? item : Buffer.from(item as string)
    },

    async lrangeBuffer(key: string, start: number, stop: number): Promise<Buffer[]> {
      const list = getList(key)
      const actualStop = stop === -1 ? list.length - 1 : stop
      return list
        .slice(start, actualStop + 1)
        .map((v) => (Buffer.isBuffer(v) ? v : Buffer.from(v as string)))
    },

    async eval(script: string, numKeys: number, ...args: any[]): Promise<any> {
      // 模擬簡單的 Lua eval：失敗讓 fallback 接管
      throw new Error('[MockRedis] eval not supported in tests, use fallback')
    },

    // 用於讀取所有已存資料（測試輔助）
    _getStore: () => store,
    _getZsets: () => zsets,
  }

  return client
}

/**
 * 建立不支援 Buffer API 的 Mock Redis Client（降級測試）
 */
function createMockRedisClientWithoutBufferSupport() {
  const baseClient = createMockRedisClientWithBufferSupport()
  // 移除 Buffer API 方法
  const { lpushBuffer: _lb, rpopBuffer: _rb, lrangeBuffer: _lr, ...legacyClient } = baseClient
  return legacyClient
}

// ─── Binary Path 測試 ────────────────────────────────────────────────────────

describe('RedisDriver Binary Path（支援 Buffer API）', () => {
  let client: ReturnType<typeof createMockRedisClientWithBufferSupport>
  let driver: RedisDriver

  beforeEach(() => {
    client = createMockRedisClientWithBufferSupport()
    driver = new RedisDriver({ client: client as any, prefix: 'test:' })
  })

  it('Push binary job → Pop binary job round-trip', async () => {
    const job = makeBinaryJob({
      id: 'binary-roundtrip-001',
      data: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
    })

    await driver.push('default', job)

    // 確認 Redis 中存的是 Buffer（非 string）
    const store = client._getStore()
    const list = store.get('test:default')
    expect(list).toBeDefined()
    expect(list!.length).toBe(1)
    expect(Buffer.isBuffer(list![0])).toBe(true)
    // 確認 Buffer 以 Magic bytes 開頭
    const buf = list![0] as Buffer
    expect(buf[0]).toBe(0x47)
    expect(buf[1]).toBe(0x4a)

    // Pop 並驗證 round-trip
    const popped = await driver.pop('default')
    expect(popped).not.toBeNull()
    expect(popped!.id).toBe('binary-roundtrip-001')
    expect(popped!.type).toBe('binary')
    expect(popped!.data).toBeInstanceOf(Uint8Array)
    expect(popped!.data).toEqual(new Uint8Array([0xde, 0xad, 0xbe, 0xef]))
  })

  it('Binary job Metadata 完整保留（attempts, groupId, priority）', async () => {
    const job = makeBinaryJob({
      id: 'meta-preserve-001',
      attempts: 3,
      maxAttempts: 5,
      groupId: 'order-group-1',
      priority: 'high',
      className: 'ProcessOrderJob',
      retryAfterSeconds: 2,
    })

    await driver.push('default', job)
    const popped = await driver.pop('default')

    expect(popped).not.toBeNull()
    expect(popped!.attempts).toBe(3)
    expect(popped!.maxAttempts).toBe(5)
    expect(popped!.groupId).toBe('order-group-1')
    expect(popped!.priority).toBe('high')
    expect(popped!.className).toBe('ProcessOrderJob')
    expect(popped!.retryAfterSeconds).toBe(2)
  })

  it('Multiple push/pop：多個 binary job 批次正確處理', async () => {
    const jobs = Array.from({ length: 5 }, (_, i) =>
      makeBinaryJob({
        id: `batch-job-${i}`,
        data: new Uint8Array([i, i + 1, i + 2]),
      })
    )

    for (const job of jobs) {
      await driver.push('default', job)
    }

    // popMany 應回傳所有 job
    const popped = await driver.popMany('default', 5)
    expect(popped.length).toBe(5)

    for (const p of popped) {
      expect(p.type).toBe('binary')
      expect(p.data).toBeInstanceOf(Uint8Array)
    }
  })

  it('Binary job fail → 進入 DLQ → retry 格式保留', async () => {
    const job = makeBinaryJob({
      id: 'dlq-test-001',
      data: new Uint8Array([0xff, 0xfe, 0xfd]),
      attempts: 3,
      maxAttempts: 3,
    })

    // 模擬 fail
    await driver.fail('default', { ...job, error: 'Network timeout' })

    // 從 DLQ 讀取
    const failedJobs = await driver.getFailed('default')
    expect(failedJobs.length).toBe(1)
    expect(failedJobs[0]!.id).toBe('dlq-test-001')
    expect(failedJobs[0]!.type).toBe('binary')
    expect(failedJobs[0]!.error).toBe('Network timeout')
    expect(failedJobs[0]!.data).toBeInstanceOf(Uint8Array)
    expect(failedJobs[0]!.data).toEqual(new Uint8Array([0xff, 0xfe, 0xfd]))
  })

  it('pushMany：批次 binary jobs 正確推送', async () => {
    const jobs = Array.from({ length: 3 }, (_, i) =>
      makeBinaryJob({
        id: `pushMany-${i}`,
        data: new Uint8Array([100 + i]),
      })
    )

    await driver.pushMany('default', jobs)

    const store = client._getStore()
    const list = store.get('test:default')
    expect(list).toBeDefined()
    expect(list!.length).toBe(3)

    // 所有存入的應為 Buffer
    for (const item of list!) {
      expect(Buffer.isBuffer(item)).toBe(true)
    }

    const popped = await driver.popMany('default', 3)
    expect(popped.length).toBe(3)
    for (const p of popped) {
      expect(p.type).toBe('binary')
    }
  })

  it('Uint8Array 中的 0x00 bytes 完整保留', async () => {
    const data = new Uint8Array(10).fill(0)
    data[0] = 0xca
    data[9] = 0xfe

    const job = makeBinaryJob({ id: 'null-bytes', data })
    await driver.push('default', job)
    const popped = await driver.pop('default')

    expect(popped).not.toBeNull()
    expect((popped!.data as Uint8Array)[0]).toBe(0xca)
    expect((popped!.data as Uint8Array)[9]).toBe(0xfe)
    expect((popped!.data as Uint8Array)[5]).toBe(0x00)
  })
})

// ─── Legacy Path 測試 ────────────────────────────────────────────────────────

describe('RedisDriver Legacy Path（JSON job 向後相容）', () => {
  let client: ReturnType<typeof createMockRedisClientWithBufferSupport>
  let driver: RedisDriver

  beforeEach(() => {
    client = createMockRedisClientWithBufferSupport()
    driver = new RedisDriver({ client: client as any, prefix: 'test:' })
  })

  it('Push JSON job → Pop JSON job（不受 binary 改動影響）', async () => {
    const job = makeJsonJob({ id: 'json-legacy-001' })
    await driver.push('default', job)

    const store = client._getStore()
    const list = store.get('test:default')
    expect(list).toBeDefined()
    // JSON job 應存為 string（非 Buffer）
    expect(typeof list![0]).toBe('string')

    const popped = await driver.pop('default')
    expect(popped).not.toBeNull()
    expect(popped!.id).toBe('json-legacy-001')
    expect(popped!.type).toBe('json')
  })

  it('Push class job（type === "class"）向後相容', async () => {
    const job: SerializedJob = {
      id: 'class-job-001',
      type: 'class',
      data: JSON.stringify({ method: 'handle' }),
      createdAt: Date.now(),
      className: 'SendNotificationJob',
      attempts: 0,
    }
    await driver.push('default', job)

    const popped = await driver.pop('default')
    expect(popped).not.toBeNull()
    expect(popped!.type).toBe('class')
    expect(popped!.className).toBe('SendNotificationJob')
  })

  it('pushMany：legacy JSON jobs 批次正確處理', async () => {
    const jobs = Array.from({ length: 4 }, (_, i) => makeJsonJob({ id: `legacy-batch-${i}` }))

    await driver.pushMany('default', jobs)

    const popped = await driver.popMany('default', 4)
    expect(popped.length).toBe(4)
    for (const p of popped) {
      expect(p.type).toBe('json')
    }
  })
})

// ─── Mixed Format 測試 ──────────────────────────────────────────────────────

describe('Mixed Format（同一 queue 交替 binary + JSON）', () => {
  let client: ReturnType<typeof createMockRedisClientWithBufferSupport>
  let driver: RedisDriver

  beforeEach(() => {
    client = createMockRedisClientWithBufferSupport()
    driver = new RedisDriver({ client: client as any, prefix: 'test:' })
  })

  it('交替 push binary + JSON → pop 時自動偵測格式', async () => {
    const binaryJob = makeBinaryJob({ id: 'mixed-binary-1' })
    const jsonJob = makeJsonJob({ id: 'mixed-json-1' })
    const binaryJob2 = makeBinaryJob({ id: 'mixed-binary-2' })

    await driver.push('default', binaryJob)
    await driver.push('default', jsonJob)
    await driver.push('default', binaryJob2)

    const jobs: SerializedJob[] = []
    for (let i = 0; i < 3; i++) {
      const job = await driver.pop('default')
      if (job) jobs.push(job)
    }

    expect(jobs.length).toBe(3)

    // 各 job 應有正確的 type
    const ids = jobs.map((j) => j.id)
    expect(ids).toContain('mixed-binary-1')
    expect(ids).toContain('mixed-json-1')
    expect(ids).toContain('mixed-binary-2')

    const binaryJobs = jobs.filter((j) => j.type === 'binary')
    const jsonJobs = jobs.filter((j) => j.type === 'json')
    expect(binaryJobs.length).toBe(2)
    expect(jsonJobs.length).toBe(1)

    // Binary job 的 data 應為 Uint8Array
    for (const j of binaryJobs) {
      expect(j.data).toBeInstanceOf(Uint8Array)
    }
  })

  it('popMany 混合格式正確解析', async () => {
    const jobs = [
      makeBinaryJob({ id: 'mix-pop-binary-1' }),
      makeJsonJob({ id: 'mix-pop-json-1' }),
      makeBinaryJob({ id: 'mix-pop-binary-2' }),
      makeJsonJob({ id: 'mix-pop-json-2' }),
    ]

    for (const job of jobs) {
      await driver.push('default', job)
    }

    const popped = await driver.popMany('default', 4)
    expect(popped.length).toBe(4)

    const binaryPopped = popped.filter((j) => j.type === 'binary')
    const jsonPopped = popped.filter((j) => j.type === 'json')
    expect(binaryPopped.length).toBe(2)
    expect(jsonPopped.length).toBe(2)
  })
})

// ─── 無 Buffer API 降級測試 ─────────────────────────────────────────────────

describe('無 Buffer API 降級測試', () => {
  let client: ReturnType<typeof createMockRedisClientWithoutBufferSupport>
  let driver: RedisDriver

  beforeEach(() => {
    client = createMockRedisClientWithoutBufferSupport()
    driver = new RedisDriver({ client: client as any, prefix: 'test:' })
  })

  it('不支援 lpushBuffer：binary job 降級為 base64 string 存儲', async () => {
    const job = makeBinaryJob({ id: 'degraded-001' })
    // 應不拋出錯誤
    await expect(driver.push('default', job)).resolves.toBeUndefined()
  })

  it('不支援 rpopBuffer：仍能正常運作（透過 string rpop）', async () => {
    const jsonJob = makeJsonJob({ id: 'degraded-json-001' })
    await driver.push('default', jsonJob)

    const popped = await driver.pop('default')
    expect(popped).not.toBeNull()
    expect(popped!.id).toBe('degraded-json-001')
    expect(popped!.type).toBe('json')
  })

  it('不支援 lrangeBuffer：getFailed 降級為 string lrange', async () => {
    const jsonJob = makeJsonJob({ id: 'degraded-fail-001' })
    await driver.fail('default', { ...jsonJob, error: 'Test error' })

    const failed = await driver.getFailed('default')
    expect(failed.length).toBe(1)
    expect(failed[0]!.id).toBe('degraded-fail-001')
    expect(failed[0]!.error).toBe('Test error')
  })
})

// ─── isGravitoJobFrame 整合驗證 ──────────────────────────────────────────────

describe('isGravitoJobFrame 整合驗證', () => {
  it('encodeBinaryJobFrame 產生的 Buffer 應通過 isGravitoJobFrame 檢測', () => {
    const job = makeBinaryJob({ id: 'frame-detect-001' })
    const frame = encodeBinaryJobFrame(job)
    const buf = Buffer.from(frame)
    expect(isGravitoJobFrame(buf)).toBe(true)
  })

  it('JSON string bytes 不應通過 isGravitoJobFrame', () => {
    const jsonStr = JSON.stringify({ id: 'test', type: 'json', data: 'hello' })
    const bytes = Buffer.from(jsonStr)
    expect(isGravitoJobFrame(bytes)).toBe(false)
  })
})
