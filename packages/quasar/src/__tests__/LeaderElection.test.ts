import { afterEach, describe, expect, it, mock } from 'bun:test'
import { LeaderElection } from '../utils/LeaderElection'

function createMockRedis(overrides: Record<string, any> = {}) {
  return {
    set: mock((..._args: any[]) => Promise.resolve('OK')),
    get: mock((..._args: any[]) => Promise.resolve(null)),
    pexpire: mock((..._args: any[]) => Promise.resolve(1)),
    eval: mock((..._args: any[]) => Promise.resolve(1)),
    ...overrides,
  }
}

function createMockLogger() {
  return {
    debug: mock(() => {}),
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
  }
}

describe('LeaderElection', () => {
  let election: LeaderElection
  let redis: any
  let logger: any

  afterEach(async () => {
    if (election) {
      await election.stop()
    }
  })

  it('should initialize with correct lock key', () => {
    redis = createMockRedis()
    logger = createMockLogger()
    election = new LeaderElection(redis, { service: 'api', nodeId: 'node-1' }, logger)

    expect((election as any).lockKey).toBe('gravito:quasar:leader:api')
  })

  it('should use default ttl and interval', () => {
    redis = createMockRedis()
    logger = createMockLogger()
    election = new LeaderElection(redis, { service: 'api', nodeId: 'node-1' }, logger)

    expect((election as any).ttl).toBe(15000)
    expect((election as any).interval).toBe(5000)
  })

  it('should accept custom ttl and interval', () => {
    redis = createMockRedis()
    logger = createMockLogger()
    election = new LeaderElection(
      redis,
      { service: 'api', nodeId: 'node-1', ttl: 30000, interval: 10000 },
      logger
    )

    expect((election as any).ttl).toBe(30000)
    expect((election as any).interval).toBe(10000)
  })

  it('should start as non-leader', () => {
    redis = createMockRedis()
    logger = createMockLogger()
    election = new LeaderElection(redis, { service: 'api', nodeId: 'node-1' }, logger)

    expect(election.isLeader()).toBe(false)
  })

  it('should become leader when SET NX succeeds', async () => {
    redis = createMockRedis({
      set: mock(() => Promise.resolve('OK')),
    })
    logger = createMockLogger()
    election = new LeaderElection(redis, { service: 'api', nodeId: 'node-1', interval: 50 }, logger)

    const leaderPromise = new Promise<void>((resolve) => {
      election.on('leader', resolve)
    })

    election.start()
    await leaderPromise

    expect(election.isLeader()).toBe(true)
  })

  it('should not start twice', () => {
    redis = createMockRedis()
    logger = createMockLogger()
    election = new LeaderElection(
      redis,
      { service: 'api', nodeId: 'node-1', interval: 10000 },
      logger
    )

    election.start()
    election.start() // Should be no-op

    expect((election as any).running).toBe(true)
  })

  it('should unref the next tick timer', async () => {
    const originalSetTimeout = globalThis.setTimeout
    let unrefCalled = false

    globalThis.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: any[]) => {
      const timer = originalSetTimeout(handler, timeout, ...args) as unknown as ReturnType<
        typeof setTimeout
      >
      return Object.assign(timer, {
        unref: () => {
          unrefCalled = true
          return timer
        },
      })
    }) as unknown as typeof setTimeout

    redis = createMockRedis()
    logger = createMockLogger()
    election = new LeaderElection(redis, { service: 'api', nodeId: 'node-1', interval: 50 }, logger)

    try {
      election.start()
      await new Promise((resolve) => setTimeout(resolve, 20))
      expect(unrefCalled).toBe(true)
    } finally {
      globalThis.setTimeout = originalSetTimeout
    }
  })

  it('should refresh TTL when already leader', async () => {
    redis = createMockRedis({
      // First call: NX fails (null)
      set: mock(() => Promise.resolve(null)),
      // get returns our nodeId (we are still the owner)
      get: mock(() => Promise.resolve('node-1')),
      pexpire: mock(() => Promise.resolve(1)),
    })
    logger = createMockLogger()
    election = new LeaderElection(redis, { service: 'api', nodeId: 'node-1', interval: 50 }, logger)

    const leaderPromise = new Promise<void>((resolve) => {
      election.on('leader', resolve)
    })

    election.start()
    await leaderPromise

    expect(election.isLeader()).toBe(true)
    expect(redis.pexpire).toHaveBeenCalled()
  })

  it('should become follower when another node is leader', async () => {
    // First: become leader
    let callCount = 0
    redis = createMockRedis({
      set: mock(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve('OK')
        }
        return Promise.resolve(null) // 第二次之後 NX 失敗
      }),
      get: mock(() => Promise.resolve('other-node')), // 另一個節點是 leader
    })
    logger = createMockLogger()
    election = new LeaderElection(redis, { service: 'api', nodeId: 'node-1', interval: 50 }, logger)

    const leaderPromise = new Promise<void>((resolve) => {
      election.on('leader', resolve)
    })
    const followerPromise = new Promise<void>((resolve) => {
      election.on('follower', resolve)
    })

    election.start()
    await leaderPromise

    expect(election.isLeader()).toBe(true)

    // 等第二輪 tick
    await followerPromise

    expect(election.isLeader()).toBe(false)
  })

  it('should stop and release lock', async () => {
    redis = createMockRedis({
      set: mock(() => Promise.resolve('OK')),
      eval: mock(() => Promise.resolve(1)),
    })
    logger = createMockLogger()
    election = new LeaderElection(redis, { service: 'api', nodeId: 'node-1', interval: 50 }, logger)

    const leaderPromise = new Promise<void>((resolve) => {
      election.on('leader', resolve)
    })

    election.start()
    await leaderPromise

    expect(election.isLeader()).toBe(true)

    await election.stop()

    expect(election.isLeader()).toBe(false)
    expect(redis.eval).toHaveBeenCalled()
  })

  it('should emit follower on stop', async () => {
    redis = createMockRedis({
      set: mock(() => Promise.resolve('OK')),
      eval: mock(() => Promise.resolve(1)),
    })
    logger = createMockLogger()
    election = new LeaderElection(redis, { service: 'api', nodeId: 'node-1', interval: 50 }, logger)

    const leaderPromise = new Promise<void>((resolve) => {
      election.on('leader', resolve)
    })

    election.start()
    await leaderPromise

    const followerPromise = new Promise<void>((resolve) => {
      election.on('follower', resolve)
    })

    await election.stop()
    await followerPromise
  })

  it('should handle Redis error during lock release on stop', async () => {
    redis = createMockRedis({
      set: mock(() => Promise.resolve('OK')),
      eval: mock(() => Promise.reject(new Error('Redis error'))),
    })
    logger = createMockLogger()
    election = new LeaderElection(redis, { service: 'api', nodeId: 'node-1', interval: 50 }, logger)

    const leaderPromise = new Promise<void>((resolve) => {
      election.on('leader', resolve)
    })

    election.start()
    await leaderPromise

    // Should not throw
    await election.stop()

    expect(logger.error).toHaveBeenCalled()
  })

  it('should handle Redis error during tick', async () => {
    redis = createMockRedis({
      set: mock(() => Promise.reject(new Error('Connection lost'))),
    })
    logger = createMockLogger()
    election = new LeaderElection(redis, { service: 'api', nodeId: 'node-1', interval: 50 }, logger)

    election.start()
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(logger.error).toHaveBeenCalled()
    expect(election.isLeader()).toBe(false)
  })

  it('should stop scheduling when running is false', async () => {
    redis = createMockRedis()
    logger = createMockLogger()
    election = new LeaderElection(redis, { service: 'api', nodeId: 'node-1', interval: 50 }, logger)

    // Stop without start
    await election.stop()
    expect((election as any).running).toBe(false)
  })
})
