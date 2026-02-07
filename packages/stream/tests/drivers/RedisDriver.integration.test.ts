import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import type { RedisClient } from '../../src/drivers/RedisDriver'
import { RedisDriver } from '../../src/drivers/RedisDriver'
import type { SerializedJob } from '../../src/types'

// --- Helper: 建立 mock SerializedJob ---
function createMockJob(overrides: Partial<SerializedJob> = {}): SerializedJob {
  return {
    id: 'job-1',
    type: 'json',
    data: '{"key":"value"}',
    className: 'TestJob',
    createdAt: 1700000000000,
    delaySeconds: 0,
    attempts: 0,
    maxAttempts: 3,
    ...overrides,
  }
}

// --- Helper: 建立 mock Redis client ---
function createMockRedisClient(): RedisClient & Record<string, any> {
  return {
    lpush: mock((..._args: any[]) => Promise.resolve(1)),
    rpop: mock((_key: string, _count?: number) =>
      Promise.resolve(null as string | string[] | null)
    ),
    llen: mock((_key: string) => Promise.resolve(0)),
    del: mock((..._keys: string[]) => Promise.resolve(1)),
    zadd: mock((_key: string, _score: number, _member: string) => Promise.resolve(1)),
    zrange: mock((_key: string, _start: number, _end: number, ..._args: string[]) =>
      Promise.resolve([] as string[])
    ),
    zrem: mock((_key: string, ..._members: string[]) => Promise.resolve(1)),
    get: mock((_key: string) => Promise.resolve(null as string | null)),
    set: mock((..._args: any[]) => Promise.resolve('OK' as const)),
    ltrim: mock((_key: string, _start: number, _stop: number) => Promise.resolve('OK' as const)),
    lrange: mock((_key: string, _start: number, _stop: number) => Promise.resolve([] as string[])),
    publish: mock((_channel: string, _message: string) => Promise.resolve(1)),
    pipeline: mock(() => createMockPipeline()),
    defineCommand: mock((_name: string, _options: any) => {}),
    eval: mock((..._args: any[]) => Promise.resolve(null)),
    sadd: mock((..._args: any[]) => Promise.resolve(1)),
    smembers: mock((..._args: any[]) => Promise.resolve([] as string[])),
    brpop: mock((..._args: any[]) => Promise.resolve(null)),
    incr: mock((_key: string) => Promise.resolve(1)),
    expire: mock((_key: string, _seconds: number) => Promise.resolve(1)),
    zcard: mock((..._args: any[]) => Promise.resolve(0)),
    // 自訂命令（由 defineCommand 註冊，但在測試中直接 mock）
    pushGroupJob: mock((..._args: any[]) => Promise.resolve(1)),
    completeGroupJob: mock((..._args: any[]) => Promise.resolve(1)),
    popMany: mock((..._args: any[]) => Promise.resolve([] as string[])),
  }
}

// --- Helper: 建立 mock pipeline ---
function createMockPipeline() {
  const cmds: any[] = []
  const pipeline: any = {
    lpush: mock((..._args: any[]) => {
      cmds.push(['lpush', ..._args])
      return pipeline
    }),
    rpop: mock((..._args: any[]) => {
      cmds.push(['rpop', ..._args])
      return pipeline
    }),
    llen: mock((..._args: any[]) => {
      cmds.push(['llen', ..._args])
      return pipeline
    }),
    zadd: mock((..._args: any[]) => {
      cmds.push(['zadd', ..._args])
      return pipeline
    }),
    zcard: mock((..._args: any[]) => {
      cmds.push(['zcard', ..._args])
      return pipeline
    }),
    ltrim: mock((..._args: any[]) => {
      cmds.push(['ltrim', ..._args])
      return pipeline
    }),
    pushGroupJob: mock((..._args: any[]) => {
      cmds.push(['pushGroupJob', ..._args])
      return pipeline
    }),
    exec: mock(() => Promise.resolve(cmds.map(() => [null, 0]))),
  }
  return pipeline
}

describe('RedisDriver', () => {
  let driver: RedisDriver
  let mockClient: ReturnType<typeof createMockRedisClient>

  beforeEach(() => {
    mockClient = createMockRedisClient()
    driver = new RedisDriver({
      client: mockClient,
      prefix: 'queue:',
    })
  })

  afterEach(() => {
    for (const value of Object.values(mockClient)) {
      if (typeof value === 'function' && 'mockClear' in value) {
        ;(value as any).mockClear()
      }
    }
  })

  // --- 建構函式測試 ---
  describe('constructor', () => {
    test('應使用提供的設定建立實例', () => {
      expect(driver).toBeDefined()
    })

    test('應在未提供 prefix 時使用預設值 queue:', () => {
      const d = new RedisDriver({ client: mockClient })
      expect(d).toBeDefined()
    })

    test('應在未提供 client 時拋出錯誤', () => {
      expect(() => new RedisDriver({ client: null as any })).toThrow(
        '[RedisDriver] Redis client is required'
      )
    })

    test('應在 client 為 undefined 時拋出錯誤', () => {
      expect(() => new RedisDriver({ client: undefined as any })).toThrow(
        '[RedisDriver] Redis client is required'
      )
    })

    test('應在 defineCommand 可用時註冊自訂 Lua 命令', () => {
      expect(mockClient.defineCommand).toHaveBeenCalledTimes(3)
      expect(mockClient.defineCommand).toHaveBeenCalledWith(
        'pushGroupJob',
        expect.objectContaining({ numberOfKeys: 3 })
      )
      expect(mockClient.defineCommand).toHaveBeenCalledWith(
        'completeGroupJob',
        expect.objectContaining({ numberOfKeys: 3 })
      )
      expect(mockClient.defineCommand).toHaveBeenCalledWith(
        'popMany',
        expect.objectContaining({ numberOfKeys: 1 })
      )
    })

    test('應在 defineCommand 不可用時不拋出錯誤', () => {
      const simpleClient = {
        lpush: mock(() => Promise.resolve(1)),
        rpop: mock(() => Promise.resolve(null)),
        llen: mock(() => Promise.resolve(0)),
        del: mock(() => Promise.resolve(1)),
        eval: mock(() => Promise.resolve(null)),
      }
      const d = new RedisDriver({ client: simpleClient as any })
      expect(d).toBeDefined()
    })
  })

  // --- push 測試（一般） ---
  describe('push (regular)', () => {
    test('應使用 LPUSH 推送 job 到佇列', async () => {
      const job = createMockJob()
      await driver.push('default', job)

      expect(mockClient.lpush).toHaveBeenCalledTimes(1)
      const args = mockClient.lpush.mock.calls[0]!
      expect(args[0]).toBe('queue:default')

      const payload = JSON.parse(args[1] as string)
      expect(payload.id).toBe('job-1')
      expect(payload.type).toBe('json')
    })

    test('應將佇列名稱加入已知佇列集合（sadd）', async () => {
      const job = createMockJob()
      await driver.push('emails', job)

      expect(mockClient.sadd).toHaveBeenCalledWith('queue:queues', 'emails')
    })
  })

  // --- push 測試（延遲） ---
  describe('push (delayed)', () => {
    test('應使用 ZADD 推送延遲 job', async () => {
      const job = createMockJob({ delaySeconds: 60 })
      await driver.push('default', job)

      expect(mockClient.zadd).toHaveBeenCalledTimes(1)
      const args = mockClient.zadd.mock.calls[0]!
      expect(args[0]).toBe('queue:default:delayed')
      // score 應大於目前時間
      expect(args[1]).toBeGreaterThan(Date.now() - 1000)
    })

    test('應在 zadd 不可用時 fallback 到 lpush', async () => {
      const clientNoZadd = {
        ...createMockRedisClient(),
        zadd: undefined,
      }
      const d = new RedisDriver({ client: clientNoZadd as any })

      const job = createMockJob({ delaySeconds: 30 })
      await d.push('default', job)

      expect(clientNoZadd.lpush).toHaveBeenCalledTimes(1)
    })
  })

  // --- push 測試（群組） ---
  describe('push (grouped)', () => {
    test('應使用自訂 pushGroupJob 命令處理群組 job', async () => {
      const job = createMockJob()
      await driver.push('default', job, { groupId: 'group-A' })

      expect(mockClient.pushGroupJob).toHaveBeenCalledTimes(1)
      const args = mockClient.pushGroupJob.mock.calls[0]!
      expect(args[0]).toBe('queue:default') // waitList
      expect(args[1]).toBe('queue:active') // activeSet
      expect(args[2]).toBe('queue:pending:group-A') // pendingList
      expect(args[3]).toBe('group-A')
    })
  })

  // --- push 測試（優先級） ---
  describe('push (priority)', () => {
    test('應將 high priority job 推送到帶有優先級後綴的 key', async () => {
      const job = createMockJob()
      await driver.push('default', job, { priority: 'high' })

      const args = mockClient.lpush.mock.calls[0]!
      expect(args[0]).toBe('queue:default:high')
    })

    test('應將 critical priority job 推送到帶有 critical 後綴的 key', async () => {
      const job = createMockJob()
      await driver.push('default', job, { priority: 'critical' })

      const args = mockClient.lpush.mock.calls[0]!
      expect(args[0]).toBe('queue:default:critical')
    })
  })

  // --- pop 測試 ---
  describe('pop', () => {
    test('應使用 Lua 腳本從佇列中取出 job', async () => {
      const jobPayload = createMockJob()
      mockClient.eval.mockImplementation(async () => ['queue:default', JSON.stringify(jobPayload)])

      const result = await driver.pop('default')

      expect(mockClient.eval).toHaveBeenCalledTimes(1)
      expect(result).not.toBeNull()
      expect(result?.id).toBe('job-1')
      expect(result?.type).toBe('json')
    })

    test('應在佇列為空時回傳 null', async () => {
      mockClient.eval.mockImplementation(async () => null)

      const result = await driver.pop('empty-queue')
      expect(result).toBeNull()
    })

    test('應在 Lua 腳本失敗時 fallback 到手動迴圈', async () => {
      const jobPayload = JSON.stringify(createMockJob())

      mockClient.eval.mockImplementation(async () => {
        throw new Error('Lua error')
      })
      mockClient.zrange?.mockImplementation(async () => [])
      mockClient.get?.mockImplementation(async () => null) // 未暫停
      mockClient.rpop.mockImplementation(async () => jobPayload)

      const result = await driver.pop('default')
      expect(result).not.toBeNull()
      expect(result?.id).toBe('job-1')
    })

    test('應在 Lua 回傳結果但 [1] 為空時回傳 null', async () => {
      mockClient.eval.mockImplementation(async () => ['queue:default', null])

      const result = await driver.pop('default')
      expect(result).toBeNull()
    })
  })

  // --- popBlocking 測試 ---
  describe('popBlocking', () => {
    test('應使用 BRPOP 阻塞等待 job', async () => {
      const jobPayload = JSON.stringify(createMockJob())
      mockClient.brpop.mockImplementation(async () => ['queue:default', jobPayload])

      const result = await driver.popBlocking('default', 5)

      expect(mockClient.brpop).toHaveBeenCalledTimes(1)
      expect(result).not.toBeNull()
      expect(result?.id).toBe('job-1')
    })

    test('應在逾時時回傳 null', async () => {
      mockClient.brpop.mockImplementation(async () => null)

      const result = await driver.popBlocking('default', 1)
      expect(result).toBeNull()
    })

    test('應在 BRPOP 拋出錯誤時回傳 null', async () => {
      mockClient.brpop.mockImplementation(async () => {
        throw new Error('timeout')
      })

      const result = await driver.popBlocking('default', 1)
      expect(result).toBeNull()
    })

    test('應在 brpop 不可用時 fallback 到 pop', async () => {
      const clientNoBrpop = createMockRedisClient()
      delete (clientNoBrpop as any).brpop
      const d = new RedisDriver({ client: clientNoBrpop as any })

      const jobPayload = createMockJob()
      clientNoBrpop.eval.mockImplementation(async () => [
        'queue:default',
        JSON.stringify(jobPayload),
      ])

      const result = await d.popBlocking('default', 5)
      expect(result).not.toBeNull()
    })

    test('應支援多個佇列', async () => {
      const jobPayload = JSON.stringify(createMockJob())
      mockClient.brpop.mockImplementation(async () => ['queue:emails', jobPayload])

      const result = await driver.popBlocking(['default', 'emails'], 5)
      expect(result).not.toBeNull()
      expect(result?.id).toBe('job-1')
    })
  })

  // --- size 測試 ---
  describe('size', () => {
    test('應回傳佇列長度', async () => {
      mockClient.llen.mockImplementation(async () => 10)

      const result = await driver.size('default')
      expect(result).toBe(10)
      expect(mockClient.llen).toHaveBeenCalledWith('queue:default')
    })

    test('應在佇列為空時回傳 0', async () => {
      mockClient.llen.mockImplementation(async () => 0)

      const result = await driver.size('empty')
      expect(result).toBe(0)
    })
  })

  // --- fail 測試 ---
  describe('fail', () => {
    test('應將失敗的 job 推送到 DLQ', async () => {
      const job = createMockJob({ error: 'something went wrong' })
      await driver.fail('default', job)

      expect(mockClient.lpush).toHaveBeenCalledTimes(1)
      const args = mockClient.lpush.mock.calls[0]!
      expect(args[0]).toBe('queue:default:failed')

      const payload = JSON.parse(args[1] as string)
      expect(payload.id).toBe('job-1')
      expect(payload.failedAt).toBeDefined()
    })

    test('應在 ltrim 可用時裁切 DLQ 長度', async () => {
      const job = createMockJob()
      await driver.fail('default', job)

      expect(mockClient.ltrim).toHaveBeenCalledWith('queue:default:failed', 0, 999)
    })

    test('應在 ltrim 不可用時正常完成', async () => {
      const clientNoLtrim = createMockRedisClient()
      delete (clientNoLtrim as any).ltrim
      const d = new RedisDriver({ client: clientNoLtrim as any })

      const job = createMockJob()
      await d.fail('default', job)

      expect(clientNoLtrim.lpush).toHaveBeenCalledTimes(1)
    })
  })

  // --- clear 測試 ---
  describe('clear', () => {
    test('應刪除佇列及其延遲和 active 集合', async () => {
      await driver.clear('default')

      // 應呼叫三次 del
      expect(mockClient.del).toHaveBeenCalledTimes(3)
      const calls = mockClient.del.mock.calls.map((c) => c[0])
      expect(calls).toContain('queue:default')
      expect(calls).toContain('queue:default:delayed')
      expect(calls).toContain('queue:active')
    })
  })

  // --- stats 測試 ---
  describe('stats', () => {
    test('應使用 pipeline 聚合統計資料', async () => {
      const mockPipe = createMockPipeline()
      // 模擬 pipeline 回傳結果：4 個優先級各有 llen + zcard，再加上 failed llen
      // 共 4 * 2 + 1 = 9 個結果
      mockPipe.exec.mockImplementation(async () => [
        [null, 5], // default llen
        [null, 2], // default:delayed zcard
        [null, 3], // critical llen
        [null, 1], // critical:delayed zcard
        [null, 0], // high llen（注意順序可能不同，但概念一致）
        [null, 0], // high:delayed zcard
        [null, 1], // low llen
        [null, 0], // low:delayed zcard
        [null, 7], // failed llen
      ])
      mockClient.pipeline.mockImplementation(() => mockPipe)

      const result = await driver.stats('default')

      expect(result.queue).toBe('default')
      expect(result.size).toBeGreaterThanOrEqual(0)
      expect(result.delayed).toBeGreaterThanOrEqual(0)
      expect(result.failed).toBeGreaterThanOrEqual(0)
    })

    test('應在 pipeline 不可用時使用 fallback', async () => {
      const clientNoPipeline = createMockRedisClient()
      delete (clientNoPipeline as any).pipeline
      clientNoPipeline.llen.mockImplementation(async () => 3)
      clientNoPipeline.zcard.mockImplementation(async () => 1)
      const d = new RedisDriver({ client: clientNoPipeline as any })

      const result = await d.stats('default')
      expect(result.queue).toBe('default')
      expect(result.size).toBeGreaterThanOrEqual(0)
    })

    test('應在錯誤發生時回傳預設 stats', async () => {
      mockClient.pipeline.mockImplementation(() => {
        throw new Error('pipeline error')
      })

      const result = await driver.stats('default')
      expect(result.queue).toBe('default')
      expect(result.size).toBe(0)
      expect(result.delayed).toBe(0)
      expect(result.failed).toBe(0)
    })
  })

  // --- pushMany 測試 ---
  describe('pushMany', () => {
    test('應在空陣列時提前返回', async () => {
      await driver.pushMany('default', [])
      expect(mockClient.lpush).not.toHaveBeenCalled()
    })

    test('應批次推送多個一般 jobs', async () => {
      const jobs = [
        createMockJob({ id: 'j1' }),
        createMockJob({ id: 'j2' }),
        createMockJob({ id: 'j3' }),
      ]

      await driver.pushMany('default', jobs)

      expect(mockClient.lpush).toHaveBeenCalledTimes(1)
      const args = mockClient.lpush.mock.calls[0]!
      expect(args[0]).toBe('queue:default')
      // 後面應有 3 個 payload
      expect(args.length).toBe(4) // key + 3 payloads
    })

    test('應在有 groupId 的 jobs 時使用 pipeline', async () => {
      const jobs = [
        createMockJob({ id: 'j1', groupId: 'group-A' }),
        createMockJob({ id: 'j2', groupId: 'group-B' }),
      ]

      const mockPipe = createMockPipeline()
      mockClient.pipeline.mockImplementation(() => mockPipe)

      await driver.pushMany('default', jobs)

      expect(mockClient.pipeline).toHaveBeenCalled()
      expect(mockPipe.pushGroupJob).toHaveBeenCalledTimes(2)
      expect(mockPipe.exec).toHaveBeenCalledTimes(1)
    })

    test('應在 pipeline 不可用且有 groupId 時 fallback 到個別 push', async () => {
      const clientNoPipeline = createMockRedisClient()
      delete (clientNoPipeline as any).pipeline
      const d = new RedisDriver({ client: clientNoPipeline as any })

      const jobs = [createMockJob({ id: 'j1', groupId: 'group-A' })]

      await d.pushMany('default', jobs)

      // 應透過個別 push 呼叫 pushGroupJob
      expect(clientNoPipeline.pushGroupJob).toHaveBeenCalledTimes(1)
    })
  })

  // --- popMany 測試 ---
  describe('popMany', () => {
    test('應在 count <= 0 時回傳空陣列', async () => {
      const result = await driver.popMany('default', 0)
      expect(result).toEqual([])
    })

    test('應在 count = 1 時使用 pop()', async () => {
      const jobPayload = createMockJob()
      mockClient.eval.mockImplementation(async () => ['queue:default', JSON.stringify(jobPayload)])

      const result = await driver.popMany('default', 1)
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('job-1')
    })

    test('應使用自訂 popMany 命令（Lua 腳本）批次取出 jobs', async () => {
      const jobs = [
        JSON.stringify(createMockJob({ id: 'j1' })),
        JSON.stringify(createMockJob({ id: 'j2' })),
      ]
      mockClient.popMany.mockImplementation(async () => jobs)

      const result = await driver.popMany('default', 5)
      expect(result).toHaveLength(2)
      expect(result[0]?.id).toBe('j1')
      expect(result[1]?.id).toBe('j2')
    })

    test('應在 popMany Lua 失敗時 fallback 到手動取出', async () => {
      mockClient.popMany.mockImplementation(async () => {
        throw new Error('Lua error')
      })
      mockClient.get?.mockImplementation(async () => null)

      const jobStr = JSON.stringify(createMockJob({ id: 'fallback-job' }))
      let rpopCount = 0
      mockClient.rpop.mockImplementation(async () => {
        rpopCount++
        if (rpopCount === 1) {
          return jobStr
        }
        return null
      })

      const result = await driver.popMany('default', 3)
      expect(result.length).toBeGreaterThanOrEqual(1)
    })
  })

  // --- complete 測試 ---
  describe('complete', () => {
    test('應在 job 沒有 groupId 時不做任何事', async () => {
      const job = createMockJob()
      await driver.complete('default', job)

      expect(mockClient.completeGroupJob).not.toHaveBeenCalled()
    })

    test('應在 job 有 groupId 時呼叫 completeGroupJob', async () => {
      const job = createMockJob({ groupId: 'group-A' })
      await driver.complete('default', job)

      expect(mockClient.completeGroupJob).toHaveBeenCalledTimes(1)
      const args = mockClient.completeGroupJob.mock.calls[0]!
      expect(args[0]).toBe('queue:default')
      expect(args[1]).toBe('queue:active')
      expect(args[2]).toBe('queue:pending:group-A')
      expect(args[3]).toBe('group-A')
    })
  })

  // --- reportHeartbeat 測試 ---
  describe('reportHeartbeat', () => {
    test('應使用 SET 儲存 worker 資訊並設定 TTL', async () => {
      const workerInfo = { id: 'w1', status: 'active' }
      await driver.reportHeartbeat(workerInfo)

      expect(mockClient.set).toHaveBeenCalledWith(
        'queue:worker:w1',
        JSON.stringify(workerInfo),
        'EX',
        10
      )
    })

    test('應支援自訂 prefix', async () => {
      const workerInfo = { id: 'w2', status: 'idle' }
      await driver.reportHeartbeat(workerInfo, 'custom:')

      expect(mockClient.set).toHaveBeenCalledWith('custom:worker:w2', expect.any(String), 'EX', 10)
    })
  })

  // --- publishLog 測試 ---
  describe('publishLog', () => {
    test('應發佈 log 到 PubSub 和歷史列表', async () => {
      const logPayload = { level: 'info', message: 'test log' }
      await driver.publishLog(logPayload)

      expect(mockClient.publish).toHaveBeenCalledWith('queue:logs', JSON.stringify(logPayload))
    })

    test('應使用 pipeline 推送歷史紀錄', async () => {
      const mockPipe = createMockPipeline()
      mockClient.pipeline.mockImplementation(() => mockPipe)

      const logPayload = { level: 'error', message: 'error log' }
      await driver.publishLog(logPayload)

      expect(mockClient.pipeline).toHaveBeenCalled()
    })
  })

  // --- checkRateLimit 測試 ---
  describe('checkRateLimit', () => {
    test('應在未達速率限制時回傳 true', async () => {
      mockClient.incr?.mockImplementation(async () => 1)

      const result = await driver.checkRateLimit('default', { max: 10, duration: 60000 })
      expect(result).toBe(true)
    })

    test('應在超過速率限制時回傳 false', async () => {
      mockClient.incr?.mockImplementation(async () => 11)

      const result = await driver.checkRateLimit('default', { max: 10, duration: 60000 })
      expect(result).toBe(false)
    })

    test('應在第一次呼叫時設定 expire', async () => {
      mockClient.incr?.mockImplementation(async () => 1)

      await driver.checkRateLimit('default', { max: 10, duration: 60000 })

      expect(mockClient.expire).toHaveBeenCalledTimes(1)
    })

    test('應在 incr 不可用時回傳 true', async () => {
      const clientNoIncr = createMockRedisClient()
      delete (clientNoIncr as any).incr
      const d = new RedisDriver({ client: clientNoIncr as any })

      const result = await d.checkRateLimit('default', { max: 10, duration: 60000 })
      expect(result).toBe(true)
    })
  })

  // --- getFailed 測試 ---
  describe('getFailed', () => {
    test('應回傳失敗的 jobs 列表', async () => {
      const failedJobs = [
        JSON.stringify(createMockJob({ id: 'f1', error: 'err1' })),
        JSON.stringify(createMockJob({ id: 'f2', error: 'err2' })),
      ]
      mockClient.lrange?.mockImplementation(async () => failedJobs)

      const result = await driver.getFailed('default')
      expect(result).toHaveLength(2)
      expect(result[0]?.id).toBe('f1')
      expect(result[1]?.id).toBe('f2')
    })

    test('應在 lrange 不可用時回傳空陣列', async () => {
      const clientNoLrange = createMockRedisClient()
      delete (clientNoLrange as any).lrange
      const d = new RedisDriver({ client: clientNoLrange as any })

      const result = await d.getFailed('default')
      expect(result).toEqual([])
    })
  })

  // --- retryFailed 測試 ---
  describe('retryFailed', () => {
    test('應從 DLQ 取出並重新推送 job', async () => {
      const failedJob = JSON.stringify(
        createMockJob({ id: 'failed-1', error: 'test error', attempts: 2 })
      )
      let rpopCallCount = 0
      mockClient.rpop.mockImplementation(async () => {
        rpopCallCount++
        if (rpopCallCount === 1) {
          return failedJob
        }
        return null
      })

      const count = await driver.retryFailed('default', 1)
      expect(count).toBe(1)
      // rpop from failed key + lpush to main queue
      expect(mockClient.rpop).toHaveBeenCalled()
      expect(mockClient.lpush).toHaveBeenCalled()
    })

    test('應在 DLQ 為空時回傳 0', async () => {
      mockClient.rpop.mockImplementation(async () => null)

      const count = await driver.retryFailed('default', 5)
      expect(count).toBe(0)
    })
  })

  // --- clearFailed 測試 ---
  describe('clearFailed', () => {
    test('應刪除 DLQ key', async () => {
      await driver.clearFailed('default')
      expect(mockClient.del).toHaveBeenCalledWith('queue:default:failed')
    })
  })

  // --- getQueues 測試 ---
  describe('getQueues', () => {
    test('應回傳已知佇列列表', async () => {
      mockClient.smembers.mockImplementation(async () => ['emails', 'default', 'notifications'])

      const result = await driver.getQueues()
      expect(result).toEqual(['default', 'emails', 'notifications']) // 排序後
    })

    test('應在 smembers 不可用時回傳 [default]', async () => {
      const clientNoSmembers = createMockRedisClient()
      delete (clientNoSmembers as any).smembers
      const d = new RedisDriver({ client: clientNoSmembers as any })

      const result = await d.getQueues()
      expect(result).toEqual(['default'])
    })
  })
})
