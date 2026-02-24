import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { HeartbeatManager } from '../../src/consumer/HeartbeatManager'
import type { ConsumerStats } from '../../src/consumer/types'

// 建立 Mock QueueManager
function createMockQueueManager(driverOverrides: Record<string, unknown> = {}) {
  const mockDriver = {
    push: mock(() => Promise.resolve()),
    pop: mock(() => Promise.resolve(null)),
    size: mock(() => Promise.resolve(0)),
    clear: mock(() => Promise.resolve()),
    reportHeartbeat: mock(() => Promise.resolve()),
    publishLog: mock(() => Promise.resolve()),
    ...driverOverrides,
  }

  return {
    getDriver: mock(() => mockDriver),
    getDefaultConnection: mock(() => 'default'),
    _driver: mockDriver,
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

describe('HeartbeatManager', () => {
  let heartbeat: HeartbeatManager
  let mockQueueManager: ReturnType<typeof createMockQueueManager>

  beforeEach(() => {
    mockQueueManager = createMockQueueManager()
  })

  afterEach(() => {
    heartbeat?.stop()
  })

  // ─── 基本行為 ───────────────────────────────────────────────────

  it('should create without errors', () => {
    heartbeat = new HeartbeatManager(
      mockQueueManager as unknown as import('../../src/QueueManager').QueueManager,
      {
        workerId: 'test-worker',
        queues: ['default'],
        connectionName: 'default',
      },
      () => makeStats()
    )
    expect(heartbeat).toBeDefined()
  })

  it('should start and stop without errors', () => {
    heartbeat = new HeartbeatManager(
      mockQueueManager as unknown as import('../../src/QueueManager').QueueManager,
      {
        workerId: 'test-worker',
        queues: ['default'],
        connectionName: 'default',
        interval: 100,
      },
      () => makeStats()
    )

    expect(() => heartbeat.start()).not.toThrow()
    expect(() => heartbeat.stop()).not.toThrow()
  })

  it('should not start twice', () => {
    heartbeat = new HeartbeatManager(
      mockQueueManager as unknown as import('../../src/QueueManager').QueueManager,
      {
        workerId: 'test-worker',
        queues: ['default'],
        connectionName: 'default',
        interval: 5000,
      },
      () => makeStats()
    )

    heartbeat.start()
    heartbeat.start() // 不應拋出或重複啟動

    // 停止時只需清理一次
    heartbeat.stop()
    expect(() => heartbeat.stop()).not.toThrow() // 停止兩次不報錯
  })

  // ─── 定時心跳 ────────────────────────────────────────────────────

  it('should call reportHeartbeat at specified interval', async () => {
    heartbeat = new HeartbeatManager(
      mockQueueManager as unknown as import('../../src/QueueManager').QueueManager,
      {
        workerId: 'test-worker',
        queues: ['default'],
        connectionName: 'default',
        interval: 30, // 30ms 間隔加速測試
      },
      () => makeStats({ processed: 5 })
    )

    heartbeat.start()
    await new Promise((resolve) => setTimeout(resolve, 100))
    heartbeat.stop()

    // 100ms / 30ms 間隔 ≈ 至少 2 次心跳
    expect(mockQueueManager._driver.reportHeartbeat.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('should include stats in heartbeat payload', async () => {
    const stats = makeStats({ processed: 10, failed: 2, active: 3 })

    heartbeat = new HeartbeatManager(
      mockQueueManager as unknown as import('../../src/QueueManager').QueueManager,
      {
        workerId: 'my-worker',
        queues: ['q1', 'q2'],
        connectionName: 'default',
        interval: 50,
      },
      () => stats
    )

    await heartbeat.sendHeartbeat()

    const calls = mockQueueManager._driver.reportHeartbeat.mock.calls
    expect(calls.length).toBe(1)

    const payload = calls[0]![0] as Record<string, unknown>
    expect(payload.id).toBe('my-worker')
    expect(payload.status).toBe('online')
    expect((payload.metrics as Record<string, unknown>).stats).toMatchObject({
      processed: 10,
      failed: 2,
      active: 3,
    })
  })

  // ─── 日誌發送 ────────────────────────────────────────────────────

  it('should publish log via publishLog()', async () => {
    heartbeat = new HeartbeatManager(
      mockQueueManager as unknown as import('../../src/QueueManager').QueueManager,
      {
        workerId: 'test-worker',
        queues: ['default'],
        connectionName: 'default',
      },
      () => makeStats()
    )

    await heartbeat.publishLog('info', 'Test message', 'job-123')

    const calls = mockQueueManager._driver.publishLog.mock.calls
    expect(calls.length).toBe(1)

    const payload = calls[0]![0] as Record<string, unknown>
    expect(payload.level).toBe('info')
    expect(payload.message).toBe('Test message')
    expect(payload.jobId).toBe('job-123')
    expect(payload.workerId).toBe('test-worker')
  })

  // ─── stop 清理 ───────────────────────────────────────────────────

  it('should stop sending heartbeats after stop()', async () => {
    heartbeat = new HeartbeatManager(
      mockQueueManager as unknown as import('../../src/QueueManager').QueueManager,
      {
        workerId: 'test-worker',
        queues: ['default'],
        connectionName: 'default',
        interval: 20,
      },
      () => makeStats()
    )

    heartbeat.start()
    await new Promise((resolve) => setTimeout(resolve, 40))
    heartbeat.stop()

    const countAfterStop = mockQueueManager._driver.reportHeartbeat.mock.calls.length

    // 停止後等待更久，確認不再發送
    await new Promise((resolve) => setTimeout(resolve, 60))

    expect(mockQueueManager._driver.reportHeartbeat.mock.calls.length).toBe(countAfterStop)
  })

  // ─── 錯誤靜默 ────────────────────────────────────────────────────

  it('should silently ignore heartbeat errors', async () => {
    const errorDriver = {
      push: mock(() => Promise.resolve()),
      pop: mock(() => Promise.resolve(null)),
      size: mock(() => Promise.resolve(0)),
      clear: mock(() => Promise.resolve()),
      reportHeartbeat: mock(() => Promise.reject(new Error('Redis down'))),
      publishLog: mock(() => Promise.reject(new Error('Redis down'))),
    }

    const errorQueueManager = {
      getDriver: mock(() => errorDriver),
      getDefaultConnection: mock(() => 'default'),
    }

    heartbeat = new HeartbeatManager(
      errorQueueManager as unknown as import('../../src/QueueManager').QueueManager,
      {
        workerId: 'test-worker',
        queues: ['default'],
        connectionName: 'default',
      },
      () => makeStats()
    )

    // 不應拋出錯誤
    await expect(heartbeat.sendHeartbeat()).resolves.toBeUndefined()
    await expect(heartbeat.publishLog('error', 'msg')).resolves.toBeUndefined()
  })

  it('should skip heartbeat when driver has no reportHeartbeat', async () => {
    const noHeartbeatDriver = {
      push: mock(() => Promise.resolve()),
      pop: mock(() => Promise.resolve(null)),
      size: mock(() => Promise.resolve(0)),
      clear: mock(() => Promise.resolve()),
      // 故意不提供 reportHeartbeat 和 publishLog
    }

    const qm = {
      getDriver: mock(() => noHeartbeatDriver),
      getDefaultConnection: mock(() => 'default'),
    }

    heartbeat = new HeartbeatManager(
      qm as unknown as import('../../src/QueueManager').QueueManager,
      {
        workerId: 'test-worker',
        queues: ['default'],
        connectionName: 'default',
      },
      () => makeStats()
    )

    // 不應拋出錯誤
    await expect(heartbeat.sendHeartbeat()).resolves.toBeUndefined()
    await expect(heartbeat.publishLog('info', 'msg')).resolves.toBeUndefined()
  })
})
