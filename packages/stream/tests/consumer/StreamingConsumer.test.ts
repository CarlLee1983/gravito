import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { ConsumerOptions } from '../../src/Consumer'
import { StreamingConsumer } from '../../src/consumer/StreamingConsumer'
import { Job } from '../../src/Job'
import { QueueManager } from '../../src/QueueManager'

// ─── 測試用 Job ──────────────────────────────────────────────────

class SimpleTestJob extends Job {
  static log: string[] = []

  constructor(public readonly label = 'job') {
    super()
  }

  async handle(): Promise<void> {
    SimpleTestJob.log.push(`done:${this.label}`)
  }
}

class SleepJob extends Job {
  static log: string[] = []

  constructor(
    public readonly label = 'sleep',
    public readonly durationMs = 50,
    public readonly gid?: string
  ) {
    super()
    if (gid) this.groupId = gid
  }

  async handle(): Promise<void> {
    SleepJob.log.push(`start:${this.label}`)
    await new Promise((r) => setTimeout(r, this.durationMs))
    SleepJob.log.push(`end:${this.label}`)
  }
}

class FailingTestJob extends Job {
  async handle(): Promise<void> {
    throw new Error('Intentional failure')
  }
}

// ─── 輔助工具 ────────────────────────────────────────────────────

function createQueue() {
  const queue = new QueueManager({
    default: 'memory',
    connections: {
      memory: { driver: 'memory' },
    },
    defaultSerializer: 'class',
  })
  queue.registerJobClasses([SimpleTestJob as unknown as typeof Job])
  queue.registerJobClasses([SleepJob as unknown as typeof Job])
  queue.registerJobClasses([FailingTestJob as unknown as typeof Job])
  return queue
}

function defaultOptions(overrides: Partial<ConsumerOptions> = {}): ConsumerOptions {
  return {
    queues: ['default'],
    concurrency: 3,
    pollInterval: 10,
    minPollInterval: 10,
    maxPollInterval: 100,
    useBlocking: false,
    keepAlive: true,
    ...overrides,
  }
}

// ─── 測試套件 ────────────────────────────────────────────────────

describe('StreamingConsumer', () => {
  let queue: QueueManager
  let consumer: StreamingConsumer

  beforeEach(() => {
    SimpleTestJob.log = []
    SleepJob.log = []
    queue = createQueue()
  })

  afterEach(async () => {
    if (consumer?.isRunning()) {
      await consumer.requestStop()
    }
  })

  // ─── 基本行為 ──────────────────────────────────────────────────

  it('should start and stop without errors', async () => {
    consumer = new StreamingConsumer(queue, defaultOptions())
    consumer.start() // 不 await
    await new Promise((r) => setTimeout(r, 50))
    await consumer.requestStop()
    expect(consumer.isRunning()).toBe(false)
  })

  it('should throw if started twice', async () => {
    consumer = new StreamingConsumer(queue, defaultOptions())
    consumer.start()
    await new Promise((r) => setTimeout(r, 10))

    await expect(consumer.start()).rejects.toThrow('already running')
    await consumer.requestStop()
  })

  it('should process a single job', async () => {
    await queue.push(new SimpleTestJob('test-single'))

    consumer = new StreamingConsumer(queue, defaultOptions())
    consumer.start()

    await new Promise((r) => setTimeout(r, 200))
    await consumer.requestStop()

    expect(SimpleTestJob.log).toContain('done:test-single')
  })

  it('should process multiple jobs', async () => {
    for (let i = 0; i < 5; i++) {
      await queue.push(new SimpleTestJob(`job-${i}`))
    }

    consumer = new StreamingConsumer(queue, defaultOptions())
    consumer.start()

    await new Promise((r) => setTimeout(r, 300))
    await consumer.requestStop()

    expect(SimpleTestJob.log.length).toBe(5)
    for (let i = 0; i < 5; i++) {
      expect(SimpleTestJob.log).toContain(`done:job-${i}`)
    }
  })

  // ─── 統計 ──────────────────────────────────────────────────────

  it('should track processed stats', async () => {
    await queue.push(new SimpleTestJob('s1'))
    await queue.push(new SimpleTestJob('s2'))
    await queue.push(new SimpleTestJob('s3'))

    consumer = new StreamingConsumer(queue, defaultOptions())
    consumer.start()

    await new Promise((r) => setTimeout(r, 300))
    await consumer.requestStop()

    expect(consumer.getStats().processed).toBe(3)
  })

  it('should track failed stats', async () => {
    await queue.push(new FailingTestJob())

    consumer = new StreamingConsumer(
      queue,
      defaultOptions({
        workerOptions: { maxAttempts: 1 },
      })
    )
    consumer.start()

    await new Promise((r) => setTimeout(r, 200))
    await consumer.requestStop()

    expect(consumer.getStats().failed).toBe(1)
  })

  it('should reset stats', async () => {
    await queue.push(new SimpleTestJob())
    consumer = new StreamingConsumer(queue, defaultOptions())
    consumer.start()
    await new Promise((r) => setTimeout(r, 200))
    await consumer.requestStop()

    consumer.resetStats()
    const stats = consumer.getStats()
    expect(stats.processed).toBe(0)
    expect(stats.failed).toBe(0)
    expect(stats.retried).toBe(0)
  })

  // ─── 並發 ──────────────────────────────────────────────────────

  it('should run non-grouped jobs concurrently', async () => {
    await queue.push(new SleepJob('A', 80))
    await queue.push(new SleepJob('B', 80))
    await queue.push(new SleepJob('C', 80))

    consumer = new StreamingConsumer(queue, defaultOptions({ concurrency: 3 }))
    consumer.start()

    await new Promise((r) => setTimeout(r, 400))
    await consumer.requestStop()

    const log = SleepJob.log
    expect(log.length).toBe(6) // 3 start + 3 end

    // 驗證並發：至少有 2 個 job 的 start 在第一個 end 之前
    const firstEndIdx = log.findIndex((l) => l.startsWith('end'))
    const startBeforeFirstEnd = log.slice(0, firstEndIdx).filter((l) => l.startsWith('start'))
    expect(startBeforeFirstEnd.length).toBeGreaterThanOrEqual(2)
  })

  // ─── group 序列 ────────────────────────────────────────────────

  it('should run grouped jobs sequentially', async () => {
    const jobA = new SleepJob('A', 40, 'group1')
    const jobB = new SleepJob('B', 40, 'group1')
    const jobC = new SleepJob('C', 40, 'group1')

    await queue.push(jobA)
    await queue.push(jobB)
    await queue.push(jobC)

    consumer = new StreamingConsumer(
      queue,
      defaultOptions({
        concurrency: 5,
        groupJobsSequential: true,
      })
    )
    consumer.start()

    await new Promise((r) => setTimeout(r, 500))
    await consumer.requestStop()

    const log = SleepJob.log
    // group1 的 job 應依序執行
    const startA = log.indexOf('start:A')
    const endA = log.indexOf('end:A')
    const startB = log.indexOf('start:B')
    const endB = log.indexOf('end:B')
    const startC = log.indexOf('start:C')

    expect(startA).toBeLessThan(endA)
    expect(endA).toBeLessThanOrEqual(startB)
    expect(endB).toBeLessThanOrEqual(startC)
  })

  // ─── 事件發射 ─────────────────────────────────────────────────

  it('should emit job:started event', async () => {
    await queue.push(new SimpleTestJob())

    consumer = new StreamingConsumer(queue, defaultOptions())
    const events: string[] = []
    consumer.on('job:started', () => events.push('started'))

    consumer.start()
    await new Promise((r) => setTimeout(r, 200))
    await consumer.requestStop()

    expect(events).toContain('started')
  })

  it('should emit job:processed event', async () => {
    await queue.push(new SimpleTestJob())

    consumer = new StreamingConsumer(queue, defaultOptions())
    const events: string[] = []
    consumer.on('job:processed', () => events.push('processed'))

    consumer.start()
    await new Promise((r) => setTimeout(r, 200))
    await consumer.requestStop()

    expect(events).toContain('processed')
  })

  it('should emit job:failed_permanently event', async () => {
    await queue.push(new FailingTestJob())

    consumer = new StreamingConsumer(
      queue,
      defaultOptions({
        workerOptions: { maxAttempts: 1 },
      })
    )
    const failedEvents: unknown[] = []
    consumer.on('job:failed_permanently', (p: unknown) => failedEvents.push(p))

    consumer.start()
    await new Promise((r) => setTimeout(r, 300))
    await consumer.requestStop()

    expect(failedEvents.length).toBe(1)
  })

  // ─── maxRequests 自動停止 ────────────────────────────────────

  it('should auto-stop when maxRequests reached', async () => {
    for (let i = 0; i < 5; i++) {
      await queue.push(new SimpleTestJob(`r${i}`))
    }

    consumer = new StreamingConsumer(queue, defaultOptions({ maxRequests: 3 }))

    const maxReachedEvents: unknown[] = []
    consumer.on('max_requests_reached', (p: unknown) => maxReachedEvents.push(p))

    await consumer.start() // 應在處理 3 個後自動停止

    expect(consumer.getStats().processed).toBe(3)
    expect(maxReachedEvents.length).toBe(1)
    expect(consumer.isRunning()).toBe(false)
  })

  // ─── stop 優雅關閉 ────────────────────────────────────────────

  it('should wait for active jobs before stopping', async () => {
    await queue.push(new SleepJob('waiting', 100))

    consumer = new StreamingConsumer(queue, defaultOptions({ concurrency: 1 }))
    consumer.start()

    // 讓 job 開始執行
    await new Promise((r) => setTimeout(r, 30))

    const stopStart = Date.now()
    await consumer.requestStop()
    const stopDuration = Date.now() - stopStart

    // stop 應等待 job 完成（約 70ms 剩餘時間）
    expect(stopDuration).toBeGreaterThanOrEqual(60)
    expect(consumer.isRunning()).toBe(false)
    expect(SleepJob.log).toContain('end:waiting')
  })

  // ─── keepAlive=false ─────────────────────────────────────────

  it('should exit when keepAlive=false and queue is empty', async () => {
    await queue.push(new SimpleTestJob('last'))

    consumer = new StreamingConsumer(
      queue,
      defaultOptions({
        keepAlive: false,
        useBlocking: false,
        pollInterval: 10,
        minPollInterval: 10,
      })
    )

    // 應自動結束
    await Promise.race([
      consumer.start(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000)),
    ])

    expect(consumer.isRunning()).toBe(false)
    expect(SimpleTestJob.log).toContain('done:last')
  })

  // ─── isActive() ─────────────────────────────────────────────

  it('should report isActive correctly', async () => {
    consumer = new StreamingConsumer(queue, defaultOptions())

    // 未執行時 active 為 0
    expect(consumer.isActive()).toBe(false)
  })
})
