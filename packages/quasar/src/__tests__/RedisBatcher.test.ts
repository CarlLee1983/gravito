import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { RedisBatcher } from '../utils/RedisBatcher'

function createMockRedis() {
  const pipeline = {
    set: mock(function (this: any) {
      return this
    }),
    publish: mock(function (this: any) {
      return this
    }),
    lpush: mock(function (this: any) {
      return this
    }),
    del: mock(function (this: any) {
      return this
    }),
    expire: mock(function (this: any) {
      return this
    }),
    exec: mock(() => Promise.resolve([])),
  }

  return {
    pipeline: mock(() => pipeline),
    set: mock(() => Promise.resolve('OK')),
    publish: mock(() => Promise.resolve(1)),
    lpush: mock(() => Promise.resolve(1)),
    del: mock(() => Promise.resolve(1)),
    expire: mock(() => Promise.resolve(1)),
    _pipeline: pipeline,
  }
}

describe('RedisBatcher', () => {
  let batcher: RedisBatcher
  let redis: ReturnType<typeof createMockRedis>

  beforeEach(() => {
    redis = createMockRedis()
  })

  afterEach(() => {
    if (batcher) {
      batcher.stop()
    }
  })

  it('should unref the flush timer', () => {
    const originalSetInterval = globalThis.setInterval
    let unrefCalled = false

    globalThis.setInterval = ((handler: TimerHandler, timeout?: number, ...args: any[]) => {
      const timer = originalSetInterval(handler, timeout, ...args) as unknown as ReturnType<
        typeof setInterval
      >
      return Object.assign(timer, {
        unref: () => {
          unrefCalled = true
          return timer
        },
      })
    }) as unknown as typeof setInterval

    try {
      batcher = new RedisBatcher(redis as any, { maxBatchSize: 100, flushInterval: 5000 })
      expect(unrefCalled).toBe(true)
    } finally {
      globalThis.setInterval = originalSetInterval
    }
  })

  it('should queue set operations', () => {
    batcher = new RedisBatcher(redis as any, { maxBatchSize: 100, flushInterval: 5000 })

    batcher.set('key1', 'value1')

    expect((batcher as any).pending.length).toBe(1)
    expect((batcher as any).pending[0].operation).toBe('set')
  })

  it('should queue publish operations', () => {
    batcher = new RedisBatcher(redis as any, { maxBatchSize: 100, flushInterval: 5000 })

    batcher.publish('channel1', 'message1')

    expect((batcher as any).pending.length).toBe(1)
    expect((batcher as any).pending[0].operation).toBe('publish')
  })

  it('should queue lpush operations', () => {
    batcher = new RedisBatcher(redis as any, { maxBatchSize: 100, flushInterval: 5000 })

    batcher.lpush('list1', 'value1', 'value2')

    expect((batcher as any).pending.length).toBe(1)
    expect((batcher as any).pending[0].operation).toBe('lpush')
  })

  it('should queue del operations', () => {
    batcher = new RedisBatcher(redis as any, { maxBatchSize: 100, flushInterval: 5000 })

    batcher.del('key1')

    expect((batcher as any).pending.length).toBe(1)
    expect((batcher as any).pending[0].operation).toBe('del')
  })

  it('should queue expire operations', () => {
    batcher = new RedisBatcher(redis as any, { maxBatchSize: 100, flushInterval: 5000 })

    batcher.expire('key1', 60)

    expect((batcher as any).pending.length).toBe(1)
    expect((batcher as any).pending[0].operation).toBe('expire')
  })

  it('should serialize object values', () => {
    batcher = new RedisBatcher(redis as any, { maxBatchSize: 100, flushInterval: 5000 })

    batcher.set('key1', { foo: 'bar' })

    const args = (batcher as any).pending[0].args
    expect(args[1]).toBe(JSON.stringify({ foo: 'bar' }))
  })

  it('should not serialize string values', () => {
    batcher = new RedisBatcher(redis as any, { maxBatchSize: 100, flushInterval: 5000 })

    batcher.set('key1', 'already-a-string')

    const args = (batcher as any).pending[0].args
    expect(args[1]).toBe('already-a-string')
  })

  it('should auto-flush when batch size reached', async () => {
    batcher = new RedisBatcher(redis as any, { maxBatchSize: 3, flushInterval: 10000 })

    batcher.set('k1', 'v1')
    batcher.set('k2', 'v2')
    batcher.set('k3', 'v3') // This should trigger flush

    // Wait for flush
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(redis._pipeline.exec).toHaveBeenCalled()
    expect((batcher as any).pending.length).toBe(0)
  })

  it('should flush on timer interval', async () => {
    batcher = new RedisBatcher(redis as any, { maxBatchSize: 100, flushInterval: 50 })

    batcher.set('k1', 'v1')

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(redis._pipeline.exec).toHaveBeenCalled()
  })

  it('should not flush when pending is empty', async () => {
    batcher = new RedisBatcher(redis as any, { maxBatchSize: 100, flushInterval: 5000 })

    await batcher.flush()

    expect(redis.pipeline).not.toHaveBeenCalled()
  })

  it('should flush and clear pending on stop', async () => {
    batcher = new RedisBatcher(redis as any, { maxBatchSize: 100, flushInterval: 10000 })

    batcher.set('k1', 'v1')
    batcher.set('k2', 'v2')

    batcher.stop()

    // After stop, timer should be null
    expect((batcher as any).timer).toBeNull()
  })

  it('should handle pipeline exec error gracefully', async () => {
    const errorPipeline = {
      set: mock(function (this: any) {
        return this
      }),
      exec: mock(() => Promise.reject(new Error('Pipeline failed'))),
    }

    const errorRedis = {
      pipeline: mock(() => errorPipeline),
    }

    const consoleSpy = spyOn(console, 'error').mockImplementation(() => {})

    batcher = new RedisBatcher(errorRedis as any, { maxBatchSize: 100, flushInterval: 10000 })
    batcher.set('k1', 'v1')

    await batcher.flush()

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('should fallback to direct calls when pipeline is not available', async () => {
    const noPipelineRedis = {
      pipeline: () => null, // pipeline returns null
      set: mock(() => Promise.resolve('OK')),
      publish: mock(() => Promise.resolve(1)),
    }

    batcher = new RedisBatcher(noPipelineRedis as any, { maxBatchSize: 100, flushInterval: 10000 })
    batcher.set('k1', 'v1')
    batcher.publish('ch', 'msg')

    await batcher.flush()

    expect(noPipelineRedis.set).toHaveBeenCalled()
    expect(noPipelineRedis.publish).toHaveBeenCalled()
  })

  it('should serialize object values in publish', () => {
    batcher = new RedisBatcher(redis as any, { maxBatchSize: 100, flushInterval: 5000 })

    batcher.publish('channel', { data: 'test' })

    const args = (batcher as any).pending[0].args
    expect(args[1]).toBe(JSON.stringify({ data: 'test' }))
  })

  it('should serialize object values in lpush', () => {
    batcher = new RedisBatcher(redis as any, { maxBatchSize: 100, flushInterval: 5000 })

    batcher.lpush('list', { item: 1 }, 'string-item')

    const args = (batcher as any).pending[0].args
    expect(args[1]).toBe(JSON.stringify({ item: 1 }))
    expect(args[2]).toBe('string-item')
  })

  it('should pass additional args in set', () => {
    batcher = new RedisBatcher(redis as any, { maxBatchSize: 100, flushInterval: 5000 })

    batcher.set('k1', 'v1', 'EX', 30)

    const args = (batcher as any).pending[0].args
    expect(args).toEqual(['k1', 'v1', 'EX', 30])
  })
})
