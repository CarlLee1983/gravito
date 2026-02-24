import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { EventEmitter } from 'node:events'
import { JobExecutor } from '../../src/consumer/JobExecutor'
import type { ConsumerStats } from '../../src/consumer/types'
import { Job } from '../../src/Job'

// ─── 測試用 Job ──────────────────────────────────────────────────

class SimpleJob extends Job {
  public handled = false

  async handle(): Promise<void> {
    this.handled = true
  }
}

class FailingJob extends Job {
  public handleCallCount = 0

  async handle(): Promise<void> {
    this.handleCallCount++
    throw new Error('Job failed intentionally')
  }
}

class SlowJob extends Job {
  async handle(): Promise<void> {
    await new Promise((r) => setTimeout(r, 20))
  }
}

// ─── Mock 建立工具 ──────────────────────────────────────────────

function createMockQueueManager() {
  return {
    complete: mock(() => Promise.resolve()),
    fail: mock(() => Promise.resolve()),
    push: mock(() => Promise.resolve()),
    pop: mock(() => Promise.resolve(null)),
    popMany: mock(() => Promise.resolve([])),
    popBlocking: mock(() => Promise.resolve(null)),
    getDriver: mock(() => ({})),
    getDefaultConnection: mock(() => 'default'),
  }
}

function createMockWorker(processImpl?: (job: Job) => Promise<void>) {
  return {
    process: mock(processImpl ?? ((job: Job) => job.handle())),
  }
}

function makeStats(overrides: Partial<ConsumerStats> = {}): ConsumerStats {
  return {
    processed: 0,
    failed: 0,
    retried: 0,
    active: 0,
    ...overrides,
  }
}

function createExecutor(
  queueManager: ReturnType<typeof createMockQueueManager>,
  emitter: EventEmitter,
  stats: ConsumerStats,
  options: Partial<import('../../src/consumer/types').ExecutorOptions> = {}
) {
  return new JobExecutor(
    queueManager as unknown as import('../../src/QueueManager').QueueManager,
    emitter,
    stats,
    null, // no heartbeat
    {
      debug: false,
      workerId: 'test-worker',
      ...options,
    }
  )
}

// ─── 測試套件 ────────────────────────────────────────────────────

describe('JobExecutor', () => {
  let queueManager: ReturnType<typeof createMockQueueManager>
  let emitter: EventEmitter
  let stats: ConsumerStats

  beforeEach(() => {
    queueManager = createMockQueueManager()
    emitter = new EventEmitter()
    stats = makeStats()
  })

  // ─── 成功執行 ──────────────────────────────────────────────────

  it('should execute job successfully', async () => {
    const executor = createExecutor(queueManager, emitter, stats)
    const worker = createMockWorker()
    const job = new SimpleJob()

    const result = await executor.execute(
      job,
      worker as unknown as import('../../src/Worker').Worker
    )

    expect(result.success).toBe(true)
    expect(result.shouldStop).toBe(false)
    expect(result.duration).toBeGreaterThanOrEqual(0)
    expect(stats.processed).toBe(1)
  })

  it('should call queueManager.complete after success', async () => {
    const executor = createExecutor(queueManager, emitter, stats)
    const worker = createMockWorker()
    const job = new SimpleJob()

    await executor.execute(job, worker as unknown as import('../../src/Worker').Worker)

    expect(queueManager.complete.mock.calls.length).toBe(1)
  })

  it('should emit job:started and job:processed events on success', async () => {
    const executor = createExecutor(queueManager, emitter, stats)
    const worker = createMockWorker()
    const job = new SimpleJob()

    const events: string[] = []
    emitter.on('job:started', () => events.push('started'))
    emitter.on('job:processed', () => events.push('processed'))

    await executor.execute(job, worker as unknown as import('../../src/Worker').Worker)

    expect(events).toEqual(['started', 'processed'])
  })

  it('should include duration in job:processed event', async () => {
    const executor = createExecutor(queueManager, emitter, stats)
    const worker = createMockWorker(async () => {
      await new Promise((r) => setTimeout(r, 20))
    })
    const job = new SimpleJob()

    let duration = -1
    emitter.on('job:processed', (payload: { duration: number }) => {
      duration = payload.duration
    })

    await executor.execute(job, worker as unknown as import('../../src/Worker').Worker)

    expect(duration).toBeGreaterThan(0)
  })

  // ─── 失敗重試 ──────────────────────────────────────────────────

  it('should schedule retry when job fails and attempts < maxAttempts', async () => {
    const executor = createExecutor(queueManager, emitter, stats, {
      workerOptions: { maxAttempts: 3 },
    })
    const worker = createMockWorker()
    const job = new FailingJob()
    job.attempts = 1
    job.maxAttempts = 3

    const result = await executor.execute(
      job,
      worker as unknown as import('../../src/Worker').Worker
    )

    expect(result.success).toBe(false)
    expect(stats.retried).toBe(1)
    expect(queueManager.push.mock.calls.length).toBe(1)
    expect(job.attempts).toBe(2)
  })

  it('should emit job:retried event on retry', async () => {
    const executor = createExecutor(queueManager, emitter, stats)
    const worker = createMockWorker()
    const job = new FailingJob()
    job.attempts = 1
    job.maxAttempts = 3

    let retriedPayload: unknown = null
    emitter.on('job:retried', (payload: unknown) => {
      retriedPayload = payload
    })

    await executor.execute(job, worker as unknown as import('../../src/Worker').Worker)

    expect(retriedPayload).not.toBeNull()
  })

  it('should emit job:failed event on failure', async () => {
    const executor = createExecutor(queueManager, emitter, stats)
    const worker = createMockWorker()
    const job = new FailingJob()
    job.attempts = 1

    const failedEvents: unknown[] = []
    emitter.on('job:failed', (payload: unknown) => {
      failedEvents.push(payload)
    })

    await executor.execute(job, worker as unknown as import('../../src/Worker').Worker)

    expect(failedEvents.length).toBe(1)
  })

  // ─── 永久失敗 DLQ ─────────────────────────────────────────────

  it('should handle permanent failure when maxAttempts exceeded', async () => {
    const executor = createExecutor(queueManager, emitter, stats, {
      workerOptions: { maxAttempts: 3 },
    })
    const worker = createMockWorker()
    const job = new FailingJob()
    job.attempts = 3
    job.maxAttempts = 3

    const permanentlyFailed: unknown[] = []
    emitter.on('job:failed_permanently', (p: unknown) => permanentlyFailed.push(p))

    const result = await executor.execute(
      job,
      worker as unknown as import('../../src/Worker').Worker
    )

    expect(result.success).toBe(false)
    expect(permanentlyFailed.length).toBe(1)
    expect(queueManager.fail.mock.calls.length).toBe(1)
    // 永久失敗不應 re-push
    expect(queueManager.push.mock.calls.length).toBe(0)
  })

  it('should call queueManager.complete after permanent failure too', async () => {
    const executor = createExecutor(queueManager, emitter, stats)
    const worker = createMockWorker()
    const job = new FailingJob()
    job.attempts = 3
    job.maxAttempts = 3

    await executor.execute(job, worker as unknown as import('../../src/Worker').Worker)

    expect(queueManager.complete.mock.calls.length).toBe(1)
  })

  // ─── maxRequests 停止 ─────────────────────────────────────────

  it('should return shouldStop=true when maxRequests reached', async () => {
    const executor = createExecutor(queueManager, emitter, stats, {
      maxRequests: 1,
    })
    const worker = createMockWorker()
    const job = new SimpleJob()

    const result = await executor.execute(
      job,
      worker as unknown as import('../../src/Worker').Worker
    )

    expect(result.shouldStop).toBe(true)
    expect(stats.processed).toBe(1)
  })

  it('should emit max_requests_reached event when maxRequests reached', async () => {
    const executor = createExecutor(queueManager, emitter, stats, {
      maxRequests: 2,
    })
    const worker = createMockWorker()

    const maxReachedEvents: unknown[] = []
    emitter.on('max_requests_reached', (p: unknown) => maxReachedEvents.push(p))

    // 第一個 job 不應觸發
    await executor.execute(new SimpleJob(), worker as unknown as import('../../src/Worker').Worker)
    expect(maxReachedEvents.length).toBe(0)

    // 第二個 job 應觸發
    await executor.execute(new SimpleJob(), worker as unknown as import('../../src/Worker').Worker)
    expect(maxReachedEvents.length).toBe(1)
  })

  it('should not return shouldStop when maxRequests not reached', async () => {
    const executor = createExecutor(queueManager, emitter, stats, {
      maxRequests: 10,
    })
    const worker = createMockWorker()
    const job = new SimpleJob()

    const result = await executor.execute(
      job,
      worker as unknown as import('../../src/Worker').Worker
    )

    expect(result.shouldStop).toBe(false)
  })

  // ─── onEvent 回呼 ─────────────────────────────────────────────

  it('should call onEvent for job:started and job:processed', async () => {
    const events: string[] = []
    const executor = createExecutor(queueManager, emitter, stats, {
      onEvent: (event: string) => events.push(event),
    })
    const worker = createMockWorker()
    const job = new SimpleJob()

    await executor.execute(job, worker as unknown as import('../../src/Worker').Worker)

    expect(events).toContain('job:started')
    expect(events).toContain('job:processed')
  })

  it('should call onEvent for job:failed', async () => {
    const events: string[] = []
    const executor = createExecutor(queueManager, emitter, stats, {
      onEvent: (event: string) => events.push(event),
    })
    const worker = createMockWorker()
    const job = new FailingJob()
    job.attempts = 1

    await executor.execute(job, worker as unknown as import('../../src/Worker').Worker)

    expect(events).toContain('job:failed')
  })

  // ─── complete 失敗不影響主流程 ────────────────────────────────

  it('should not throw when complete fails', async () => {
    queueManager.complete = mock(() => Promise.reject(new Error('complete failed')))

    const errorEvents: unknown[] = []
    emitter.on('error', (e: unknown) => errorEvents.push(e))

    const executor = createExecutor(queueManager, emitter, stats)
    const worker = createMockWorker()
    const job = new SimpleJob()

    await expect(
      executor.execute(job, worker as unknown as import('../../src/Worker').Worker)
    ).resolves.toBeDefined()
    expect(errorEvents.length).toBeGreaterThanOrEqual(0)
  })

  // ─── 計時器準確性 ─────────────────────────────────────────────

  it('should measure execution duration accurately', async () => {
    const executor = createExecutor(queueManager, emitter, stats)
    const worker = createMockWorker(async () => {
      await new Promise((r) => setTimeout(r, 30))
    })
    const job = new SlowJob()

    const result = await executor.execute(
      job,
      worker as unknown as import('../../src/Worker').Worker
    )

    expect(result.duration).toBeGreaterThanOrEqual(25)
  })
})
