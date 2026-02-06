import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { GroupRedisClient } from '../src/drivers/RedisDriver'
import { Job } from '../src/Job'
import { QueueManager } from '../src/QueueManager'
import { Scheduler } from '../src/Scheduler'

/**
 * 測試用的 Job。
 */
class TestJob extends Job {
  constructor(public message: string) {
    super()
  }

  async handle(): Promise<void> {
    // 測試邏輯
  }
}

/**
 * 創建模擬的 Redis 客戶端用於 Scheduler 測試。
 */
function createSchedulerMockRedis(): GroupRedisClient {
  const _storage = new Map<string, any>()
  const zsets = new Map<string, Map<string, number>>()
  const hashes = new Map<string, Record<string, any>>()
  const locks = new Map<string, { value: string; expiresAt: number }>()

  return {
    // SET 命令（用於鎖）
    set: mock(async (key: string, value: string, ...args: any[]) => {
      const exIndex = args.indexOf('EX')
      const nxIndex = args.indexOf('NX')

      // 檢查過期
      const entry = locks.get(key)
      if (entry && entry.expiresAt < Date.now()) {
        locks.delete(key)
      }

      if (nxIndex !== -1 && locks.has(key)) {
        return null
      }

      const ttl = exIndex !== -1 ? (args[exIndex + 1] as number) : 0
      const expiresAt = ttl > 0 ? Date.now() + ttl * 1000 : Infinity

      locks.set(key, { value, expiresAt })
      return 'OK'
    }),

    // EVAL 命令（用於鎖的釋放和續約）
    eval: mock(async (script: string, _numKeys: number, ...args: any[]) => {
      const key = args[0] as string
      const expectedValue = args[1] as string

      // 檢查過期
      const entry = locks.get(key)
      if (entry && entry.expiresAt < Date.now()) {
        locks.delete(key)
      }

      // DEL script
      if (script.includes('del')) {
        const current = locks.get(key)
        if (current && current.value === expectedValue) {
          locks.delete(key)
          return 1
        }
        return 0
      }

      // EXPIRE script
      if (script.includes('expire')) {
        const current = locks.get(key)
        const newTtl = args[2] as number

        if (current && current.value === expectedValue) {
          locks.set(key, {
            value: current.value,
            expiresAt: Date.now() + newTtl * 1000,
          })
          return 1
        }
        return 0
      }

      return 0
    }),

    // ZRANGEBYSCORE 命令（查詢到期的排程）
    zrangebyscore: mock(async (key: string, min: number, max: number) => {
      const zset = zsets.get(key)
      if (!zset) {
        return []
      }

      const results: string[] = []
      for (const [member, score] of zset.entries()) {
        if (score >= min && score <= max) {
          results.push(member)
        }
      }
      return results
    }),

    // ZADD 命令（添加到有序集合）
    zadd: mock(async (key: string, score: number, member: string) => {
      if (!zsets.has(key)) {
        zsets.set(key, new Map())
      }
      zsets.get(key)?.set(member, score)
      return 1
    }),

    // ZRANGE 命令（獲取範圍）
    zrange: mock(async (key: string, start: number, stop: number) => {
      const zset = zsets.get(key)
      if (!zset) {
        return []
      }

      const sorted = Array.from(zset.entries()).sort((a, b) => a[1] - b[1])
      const end = stop === -1 ? sorted.length : stop + 1
      return sorted.slice(start, end).map((e) => e[0])
    }),

    // HSET 命令（設定 hash）
    hset: mock(async (key: string, data: Record<string, any>) => {
      if (!hashes.has(key)) {
        hashes.set(key, {})
      }
      Object.assign(hashes.get(key)!, data)
      return 1
    }),

    // HGETALL 命令（獲取 hash）
    hgetall: mock(async (key: string) => {
      return hashes.get(key) || null
    }),

    // DEL 命令（刪除鍵）
    del: mock(async (...keys: string[]) => {
      let count = 0
      for (const key of keys) {
        if (hashes.delete(key)) {
          count++
        }
      }
      return count
    }),

    // ZREM 命令（從有序集合移除）
    zrem: mock(async (key: string, member: string) => {
      const zset = zsets.get(key)
      if (!zset) {
        return 0
      }
      return zset.delete(member) ? 1 : 0
    }),

    // PIPELINE 支援
    pipeline: mock(() => {
      const commands: Array<() => Promise<any>> = []
      return {
        hset: (key: string, data: Record<string, any>) => {
          commands.push(async () => {
            if (!hashes.has(key)) {
              hashes.set(key, {})
            }
            Object.assign(hashes.get(key)!, data)
            return 1
          })
        },
        zadd: (key: string, score: number, member: string) => {
          commands.push(async () => {
            if (!zsets.has(key)) {
              zsets.set(key, new Map())
            }
            zsets.get(key)?.set(member, score)
            return 1
          })
        },
        del: (...keys: string[]) => {
          commands.push(async () => {
            let count = 0
            for (const key of keys) {
              if (hashes.delete(key)) {
                count++
              }
            }
            return count
          })
        },
        zrem: (key: string, member: string) => {
          commands.push(async () => {
            const zset = zsets.get(key)
            if (!zset) {
              return 0
            }
            return zset.delete(member) ? 1 : 0
          })
        },
        exec: async () => {
          return await Promise.all(commands.map((cmd) => cmd()))
        },
      }
    }),

    // 測試輔助方法
    _getLocks: () => locks,
    _getZsets: () => zsets,
    _getHashes: () => hashes,
  } as any
}

describe('Scheduler 分散式鎖整合', () => {
  let manager: QueueManager
  let scheduler: Scheduler
  let mockRedis: GroupRedisClient

  beforeEach(() => {
    mockRedis = createSchedulerMockRedis()

    // 創建一個模擬的 Redis driver
    const mockDriver = {
      push: mock(async () => {}),
      pop: mock(async () => null),
      size: mock(async () => 0),
      client: mockRedis,
    }

    manager = new QueueManager({
      default: 'mock',
      connections: {
        mock: { driver: 'memory' },
      },
      defaultSerializer: 'class',
    })

    // 注入模擬的 driver
    ;(manager as any).drivers.set('mock', mockDriver)

    manager.registerJobClasses([TestJob])
  })

  describe('基本分散式鎖功能', () => {
    it('應該使用可配置的 TTL', async () => {
      scheduler = new Scheduler(manager, {
        lockTtl: 30000, // 30 秒
      })

      const job = new TestJob('test')
      const serialized = manager.getSerializer().serialize(job)

      await scheduler.register({
        id: 'test-job',
        cron: '* * * * *',
        queue: 'default',
        job: serialized as any,
      })

      // 設定 nextRun 為過去的時間，使其立即觸發
      const pastTime = Date.now() - 1000
      const hashes = (mockRedis as any)._getHashes()
      const jobData = hashes.get('queue:schedule:test-job')
      if (jobData) {
        jobData.nextRun = String(pastTime)
        jobData.enabled = 'true'
      }
      const zsets = (mockRedis as any)._getZsets()
      const schedules = zsets.get('queue:schedules')
      if (schedules) {
        schedules.set('test-job', pastTime)
      }

      await scheduler.tick()

      // 檢查 SET 命令使用了正確的 TTL（30 秒 = 30）
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('lock:schedule:test-job'),
        expect.any(String),
        'EX',
        30, // TTL 應該是 30 秒
        'NX'
      )
    })

    it('應該在多個 Scheduler 實例間避免重複執行', async () => {
      const scheduler1 = new Scheduler(manager, { lockTtl: 10000 })
      const scheduler2 = new Scheduler(manager, { lockTtl: 10000 })

      const job = new TestJob('test')
      const serialized = manager.getSerializer().serialize(job)

      await scheduler1.register({
        id: 'test-job',
        cron: '* * * * *',
        queue: 'default',
        job: serialized as any,
      })

      // 設定 nextRun 為過去的時間
      const pastTime = Date.now() - 1000
      const hashes = (mockRedis as any)._getHashes()
      const jobData = hashes.get('queue:schedule:test-job')
      if (jobData) {
        jobData.nextRun = String(pastTime)
        jobData.enabled = 'true'
      }
      const zsets = (mockRedis as any)._getZsets()
      const schedules = zsets.get('queue:schedules')
      if (schedules) {
        schedules.set('test-job', pastTime)
      }

      // 同時執行兩個 scheduler 的 tick
      const [fired1, fired2] = await Promise.all([scheduler1.tick(), scheduler2.tick()])

      // 只有一個 scheduler 應該成功執行
      expect(fired1 + fired2).toBe(1)
    })

    it('應該在 job 執行完成後釋放鎖', async () => {
      scheduler = new Scheduler(manager, { lockTtl: 10000 })

      const job = new TestJob('test')
      const serialized = manager.getSerializer().serialize(job)

      await scheduler.register({
        id: 'test-job',
        cron: '* * * * *',
        queue: 'default',
        job: serialized as any,
      })

      // 設定 nextRun 為過去的時間
      const pastTime = Date.now() - 1000
      const hashes = (mockRedis as any)._getHashes()
      const jobData = hashes.get('queue:schedule:test-job')
      if (jobData) {
        jobData.nextRun = String(pastTime)
        jobData.enabled = 'true'
      }
      const zsets = (mockRedis as any)._getZsets()
      const schedules = zsets.get('queue:schedules')
      if (schedules) {
        schedules.set('test-job', pastTime)
      }

      await scheduler.tick()

      // EVAL 應該被調用以釋放鎖
      expect(mockRedis.eval).toHaveBeenCalled()

      // 鎖應該已被釋放
      const locks = (mockRedis as any)._getLocks()
      const lockKeys = Array.from(locks.keys()).filter((k) => k.includes('lock:schedule:test-job'))
      expect(lockKeys.length).toBe(0)
    })
  })

  describe('向後相容性', () => {
    it('應該在不提供選項時使用預設值', async () => {
      scheduler = new Scheduler(manager) // 無選項

      const job = new TestJob('test')
      const serialized = manager.getSerializer().serialize(job)

      await scheduler.register({
        id: 'test-job',
        cron: '* * * * *',
        queue: 'default',
        job: serialized as any,
      })

      // 設定 nextRun 為過去的時間
      const pastTime = Date.now() - 1000
      const hashes = (mockRedis as any)._getHashes()
      const jobData = hashes.get('queue:schedule:test-job')
      if (jobData) {
        jobData.nextRun = String(pastTime)
        jobData.enabled = 'true'
      }
      const zsets = (mockRedis as any)._getZsets()
      const schedules = zsets.get('queue:schedules')
      if (schedules) {
        schedules.set('test-job', pastTime)
      }

      const fired = await scheduler.tick()

      expect(fired).toBe(1)
      // 應該使用預設的 60 秒 TTL
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'EX',
        60,
        'NX'
      )
    })

    it('應該支援舊的 prefix 選項', async () => {
      scheduler = new Scheduler(manager, { prefix: 'custom:' })

      const job = new TestJob('test')
      const serialized = manager.getSerializer().serialize(job)

      await scheduler.register({
        id: 'test-job',
        cron: '* * * * *',
        queue: 'default',
        job: serialized as any,
      })

      // 檢查使用了自訂的 prefix（應該通過 pipeline）
      const pipelineCalls = (mockRedis.pipeline as any).mock.calls
      expect(pipelineCalls.length).toBeGreaterThan(0)
    })
  })

  describe('錯誤處理', () => {
    it('應該在 job 執行失敗時仍釋放鎖', async () => {
      // 創建會失敗的 driver
      const failingDriver = {
        push: mock(async () => {
          throw new Error('Push failed')
        }),
        pop: mock(async () => null),
        size: mock(async () => 0),
        client: mockRedis,
      }
      ;(manager as any).drivers.set('mock', failingDriver)

      scheduler = new Scheduler(manager, { lockTtl: 10000 })

      const job = new TestJob('test')
      const serialized = manager.getSerializer().serialize(job)

      await scheduler.register({
        id: 'test-job',
        cron: '* * * * *',
        queue: 'default',
        job: serialized as any,
      })

      // 設定 nextRun 為過去的時間
      const pastTime = Date.now() - 1000
      const hashes = (mockRedis as any)._getHashes()
      const jobData = hashes.get('queue:schedule:test-job')
      if (jobData) {
        jobData.nextRun = String(pastTime)
        jobData.enabled = 'true'
      }
      const zsets = (mockRedis as any)._getZsets()
      const schedules = zsets.get('queue:schedules')
      if (schedules) {
        schedules.set('test-job', pastTime)
      }

      const fired = await scheduler.tick()

      // 應該沒有成功執行
      expect(fired).toBe(0)

      // 鎖應該被釋放
      expect(mockRedis.eval).toHaveBeenCalled()
    })
  })

  describe('自動續約配置', () => {
    it('應該使用配置的 refreshInterval', async () => {
      scheduler = new Scheduler(manager, {
        lockTtl: 60000,
        lockRefreshInterval: 10000, // 10 秒續約
      })

      const job = new TestJob('test')
      const serialized = manager.getSerializer().serialize(job)

      await scheduler.register({
        id: 'test-job',
        cron: '* * * * *',
        queue: 'default',
        job: serialized as any,
      })

      // 設定 nextRun 為過去的時間
      const pastTime = Date.now() - 1000
      const hashes = (mockRedis as any)._getHashes()
      const jobData = hashes.get('queue:schedule:test-job')
      if (jobData) {
        jobData.nextRun = String(pastTime)
        jobData.enabled = 'true'
      }
      const zsets = (mockRedis as any)._getZsets()
      const schedules = zsets.get('queue:schedules')
      if (schedules) {
        schedules.set('test-job', pastTime)
      }

      await scheduler.tick()

      // 驗證鎖被獲取
      expect(mockRedis.set).toHaveBeenCalled()
    })

    it('應該在沒有 refreshInterval 時不啟動續約', async () => {
      scheduler = new Scheduler(manager, {
        lockTtl: 60000,
        lockRefreshInterval: undefined, // 不續約
      })

      const job = new TestJob('test')
      const serialized = manager.getSerializer().serialize(job)

      await scheduler.register({
        id: 'test-job',
        cron: '* * * * *',
        queue: 'default',
        job: serialized as any,
      })

      // 設定 nextRun 為過去的時間
      const pastTime = Date.now() - 1000
      const hashes = (mockRedis as any)._getHashes()
      const jobData = hashes.get('queue:schedule:test-job')
      if (jobData) {
        jobData.nextRun = String(pastTime)
        jobData.enabled = 'true'
      }
      const zsets = (mockRedis as any)._getZsets()
      const schedules = zsets.get('queue:schedules')
      if (schedules) {
        schedules.set('test-job', pastTime)
      }

      const evalCallsBefore = (mockRedis.eval as any).mock.calls.length

      await scheduler.tick()

      // 等待一段時間
      await new Promise((resolve) => setTimeout(resolve, 100))

      const evalCallsAfter = (mockRedis.eval as any).mock.calls.length

      // eval 調用次數應該只增加 1（釋放鎖），不應該有續約
      expect(evalCallsAfter - evalCallsBefore).toBeLessThanOrEqual(1)
    })
  })
})
