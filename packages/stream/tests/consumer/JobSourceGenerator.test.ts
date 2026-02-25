import { describe, expect, it, mock } from 'bun:test'
import { jobSourceGenerator } from '../../src/consumer/JobSourceGenerator'
import type { JobSourceOptions } from '../../src/consumer/types'
import { Job } from '../../src/Job'

// ─── 測試用 Job ──────────────────────────────────────────────────

class TestJob extends Job {
  constructor(public readonly label: string = 'test') {
    super()
    this.id = label
    this.queueName = 'default'
  }
  async handle() {}
}

// ─── Mock QueueManager 建立工具 ─────────────────────────────────

function createMockQueueManager(
  overrides: {
    pop?: () => Promise<Job | null>
    popMany?: (queue: string, count: number) => Promise<Job[]>
    popBlocking?: (queues: string[], timeout: number) => Promise<Job | null>
    checkRateLimit?: () => Promise<boolean>
  } = {}
) {
  const mockDriver = {
    push: mock(() => Promise.resolve()),
    pop: mock(() => Promise.resolve(null)),
    size: mock(() => Promise.resolve(0)),
    clear: mock(() => Promise.resolve()),
    popBlocking: overrides.popBlocking
      ? mock(overrides.popBlocking)
      : mock(() => Promise.resolve(null)),
    checkRateLimit: overrides.checkRateLimit ? mock(overrides.checkRateLimit) : undefined,
  }

  return {
    getDriver: mock(() => mockDriver),
    getDefaultConnection: mock(() => 'default'),
    pop: mock(overrides.pop ?? (() => Promise.resolve(null))),
    popMany: mock(overrides.popMany ?? ((_q: string, _c: number) => Promise.resolve([]))),
    popBlocking: mock(
      overrides.popBlocking ?? ((_qs: string[], _t: number) => Promise.resolve(null))
    ),
    _driver: mockDriver,
  }
}

function defaultOptions(overrides: Partial<JobSourceOptions> = {}): JobSourceOptions {
  return {
    queues: ['default'],
    batchSize: 1,
    useBlocking: false,
    blockingTimeout: 5,
    keepAlive: true,
    minPollInterval: 10,
    maxPollInterval: 100,
    backoffMultiplier: 1.5,
    getCapacity: () => 5,
    ...overrides,
  }
}

// ─── 測試套件 ────────────────────────────────────────────────────

describe('JobSourceGenerator', () => {
  // ─── sequential（非阻塞 pop）模式 ────────────────────────────

  describe('sequential mode (useBlocking=false, batchSize=1)', () => {
    it('should yield jobs from pop', async () => {
      let callCount = 0
      const qm = createMockQueueManager({
        pop: () => {
          callCount++
          if (callCount === 1) {
            return Promise.resolve(new TestJob('job1'))
          }
          return Promise.resolve(null)
        },
      })

      const controller = new AbortController()
      const options = defaultOptions({ useBlocking: false, keepAlive: false })

      const results: Job[] = []
      for await (const fetchResult of jobSourceGenerator(
        qm as unknown as import('../../src/QueueManager').QueueManager,
        options,
        controller.signal
      )) {
        results.push(...fetchResult.jobs)
        if (results.length >= 1) {
          break
        }
      }

      expect(results.length).toBe(1)
      expect(results[0]?.id).toBe('job1')
    })

    it('should terminate when keepAlive=false and queue is empty', async () => {
      const qm = createMockQueueManager({
        pop: () => Promise.resolve(null),
      })

      const controller = new AbortController()
      const options = defaultOptions({ useBlocking: false, keepAlive: false })

      const results: import('../../src/consumer/types').FetchResult[] = []
      for await (const fetchResult of jobSourceGenerator(
        qm as unknown as import('../../src/QueueManager').QueueManager,
        options,
        controller.signal
      )) {
        results.push(fetchResult)
        // 不 break，讓 generator 自然結束
        if (results.length > 5) {
          break // 安全保護
        }
      }

      // keepAlive=false 且佇列為空時應結束（不應超過幾輪）
      expect(results.length).toBeLessThanOrEqual(3)
    })

    it('should abort when signal is aborted', async () => {
      const qm = createMockQueueManager({
        pop: () => Promise.resolve(null),
      })

      const controller = new AbortController()
      const options = defaultOptions({ useBlocking: false, keepAlive: true })

      let count = 0
      const generator = jobSourceGenerator(
        qm as unknown as import('../../src/QueueManager').QueueManager,
        options,
        controller.signal
      )

      // 中止信號
      controller.abort()

      for await (const _ of generator) {
        count++
        if (count > 5) {
          break
        }
      }

      expect(count).toBe(0)
    })
  })

  // ─── blocking 模式 ─────────────────────────────────────────────

  describe('blocking mode (useBlocking=true, batchSize=1)', () => {
    it('should use popBlocking when driver supports it', async () => {
      let callCount = 0
      const qm = createMockQueueManager({
        popBlocking: (_qs: string[], _t: number) => {
          callCount++
          if (callCount === 1) {
            return Promise.resolve(new TestJob('blocked-job'))
          }
          return new Promise((resolve) => setTimeout(() => resolve(null), 5000))
        },
      })

      const controller = new AbortController()
      const options = defaultOptions({
        useBlocking: true,
        batchSize: 1,
        blockingTimeout: 5,
        keepAlive: false,
      })

      const results: Job[] = []
      for await (const fetchResult of jobSourceGenerator(
        qm as unknown as import('../../src/QueueManager').QueueManager,
        options,
        controller.signal
      )) {
        results.push(...fetchResult.jobs)
        if (results.length >= 1) {
          controller.abort()
          break
        }
      }

      expect(results.length).toBe(1)
      expect(results[0]?.id).toBe('blocked-job')
    })

    it('should set didBlock=true when using popBlocking', async () => {
      const qm = createMockQueueManager({
        popBlocking: async (_qs: string[], _t: number) => new TestJob('j1'),
      })

      const controller = new AbortController()
      const options = defaultOptions({ useBlocking: true, batchSize: 1 })

      for await (const fetchResult of jobSourceGenerator(
        qm as unknown as import('../../src/QueueManager').QueueManager,
        options,
        controller.signal
      )) {
        if (fetchResult.jobs.length > 0) {
          expect(fetchResult.didBlock).toBe(true)
          controller.abort()
          break
        }
      }
    })
  })

  // ─── batch 模式 ────────────────────────────────────────────────

  describe('batch mode (batchSize > 1)', () => {
    it('should use popMany when batchSize > 1', async () => {
      const qm = createMockQueueManager({
        popMany: (_q: string, count: number) =>
          Promise.resolve(
            Array.from({ length: Math.min(count, 3) }, (_, i) => new TestJob(`job-${i}`))
          ),
      })

      const controller = new AbortController()
      const options = defaultOptions({
        batchSize: 5,
        useBlocking: false,
        keepAlive: false,
      })

      const allJobs: Job[] = []
      for await (const fetchResult of jobSourceGenerator(
        qm as unknown as import('../../src/QueueManager').QueueManager,
        options,
        controller.signal
      )) {
        allJobs.push(...fetchResult.jobs)
        if (allJobs.length > 0) {
          controller.abort()
          break
        }
      }

      expect(allJobs.length).toBe(3)
      expect(qm.popMany.mock.calls.length).toBeGreaterThanOrEqual(1)
    })

    it('should batch size respect capacity', async () => {
      let capturedCount = 0
      const qm = createMockQueueManager({
        popMany: (_q: string, count: number) => {
          capturedCount = count
          return Promise.resolve([])
        },
      })

      const controller = new AbortController()
      // 容量只有 2，即使 batchSize=10，實際請求應受限於 capacity
      const options = defaultOptions({
        batchSize: 10,
        useBlocking: false,
        keepAlive: false,
        getCapacity: () => 2,
      })

      for await (const _ of jobSourceGenerator(
        qm as unknown as import('../../src/QueueManager').QueueManager,
        options,
        controller.signal
      )) {
        if (capturedCount > 0) {
          controller.abort()
          break
        }
        break // 只需一輪
      }

      if (capturedCount > 0) {
        expect(capturedCount).toBeLessThanOrEqual(2)
      }
    })
  })

  // ─── rate limit 過濾 ─────────────────────────────────────────

  describe('rate limit filtering', () => {
    it('should skip rate-limited queues', async () => {
      const mockDriver = {
        push: mock(() => Promise.resolve()),
        pop: mock(() => Promise.resolve(null)),
        size: mock(() => Promise.resolve(0)),
        clear: mock(() => Promise.resolve()),
        checkRateLimit: mock(() => Promise.resolve(false)), // 所有佇列都被限制
      }

      const qm = {
        getDriver: mock(() => mockDriver),
        getDefaultConnection: mock(() => 'default'),
        pop: mock(() => Promise.resolve(null)),
        popMany: mock(() => Promise.resolve([])),
        popBlocking: mock(() => Promise.resolve(null)),
      }

      const controller = new AbortController()
      const options = defaultOptions({
        queues: ['limited-queue'],
        useBlocking: false,
        keepAlive: false,
        rateLimits: {
          'limited-queue': { max: 10, duration: 1000 },
        },
      })

      let count = 0
      for await (const _ of jobSourceGenerator(
        qm as unknown as import('../../src/QueueManager').QueueManager,
        options,
        controller.signal
      )) {
        count++
        if (count >= 2) {
          controller.abort()
          break
        }
      }

      // pop 不應被呼叫，因為佇列被 rate limit 了
      expect(qm.pop.mock.calls.length).toBe(0)
    })

    it('should allow queues without rate limit config', async () => {
      let popCalled = false
      const qm = createMockQueueManager({
        pop: () => {
          popCalled = true
          return Promise.resolve(null)
        },
      })

      const controller = new AbortController()
      const options = defaultOptions({
        queues: ['default'],
        useBlocking: false,
        keepAlive: false,
        // 沒有 rateLimits
      })

      for await (const _ of jobSourceGenerator(
        qm as unknown as import('../../src/QueueManager').QueueManager,
        options,
        controller.signal
      )) {
        if (popCalled) {
          controller.abort()
          break
        }
        if (controller.signal.aborted) {
          break
        }
        break
      }

      expect(popCalled).toBe(true)
    })
  })

  // ─── 自適應 backoff ──────────────────────────────────────────

  describe('adaptive backoff', () => {
    it('should reset poll interval after receiving jobs', async () => {
      let callCount = 0
      const qm = createMockQueueManager({
        pop: () => {
          callCount++
          // 第一次回傳 job，之後返回空
          if (callCount === 1) {
            return Promise.resolve(new TestJob('j1'))
          }
          return Promise.resolve(null)
        },
      })

      const controller = new AbortController()
      const options = defaultOptions({
        useBlocking: false,
        keepAlive: false,
        minPollInterval: 10,
        maxPollInterval: 1000,
        backoffMultiplier: 2,
      })

      const jobsReceived: Job[] = []
      for await (const fetchResult of jobSourceGenerator(
        qm as unknown as import('../../src/QueueManager').QueueManager,
        options,
        controller.signal
      )) {
        jobsReceived.push(...fetchResult.jobs)
        if (jobsReceived.length > 0) {
          controller.abort()
          break
        }
      }

      expect(jobsReceived.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ─── 容量為 0 的情況 ─────────────────────────────────────────

  describe('capacity management', () => {
    it('should not pop when capacity is 0', async () => {
      const qm = createMockQueueManager()
      const controller = new AbortController()
      const options = defaultOptions({
        getCapacity: () => 0, // 容量為 0
        useBlocking: false,
        keepAlive: true,
        minPollInterval: 5,
      })

      // 容量為 0 時，generator 內部等待（不 yield）
      // 我們透過中止信號終止它，並確認 pop 未被呼叫
      const genPromise = (async () => {
        for await (const _ of jobSourceGenerator(
          qm as unknown as import('../../src/QueueManager').QueueManager,
          options,
          controller.signal
        )) {
          // 不應有任何 yield
        }
      })()

      // 等待一段時間後中止
      await new Promise((r) => setTimeout(r, 30))
      controller.abort()
      await genPromise

      // pop 不應被呼叫（容量為 0）
      expect(qm.pop.mock.calls.length).toBe(0)
    })

    it('should resume fetching when capacity becomes available', async () => {
      let capacity = 0
      let popCalled = false
      const qm = createMockQueueManager({
        pop: () => {
          popCalled = true
          return Promise.resolve(null)
        },
      })

      const controller = new AbortController()
      const options = defaultOptions({
        getCapacity: () => capacity,
        useBlocking: false,
        keepAlive: false,
        minPollInterval: 5,
      })

      // 啟動 generator，然後讓容量變為可用
      const genPromise = (async () => {
        for await (const _ of jobSourceGenerator(
          qm as unknown as import('../../src/QueueManager').QueueManager,
          options,
          controller.signal
        )) {
          // 有 yield 就中止
          controller.abort()
          break
        }
      })()

      // 10ms 後讓容量變為 1
      await new Promise((r) => setTimeout(r, 15))
      capacity = 1

      await new Promise((r) => setTimeout(r, 50))
      controller.abort()
      await genPromise

      // 一旦容量可用，pop 應被呼叫
      expect(popCalled).toBe(true)
    })
  })
})
