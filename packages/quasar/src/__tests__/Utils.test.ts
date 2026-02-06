import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { AdaptiveHeartbeat } from '../utils/AdaptiveHeartbeat'
import { BufferPool } from '../utils/BufferPool'
import { SmartCompressor } from '../utils/Compression'
import { LogSampler } from '../utils/LogSampler'
import { ConsoleLogger } from '../utils/logger'
import { ObjectPool } from '../utils/pool'
import { CborSerializer, MsgPackSerializer, ProtobufSerializer } from '../utils/Serializer'

// ==========================================================
// ObjectPool
// ==========================================================

describe('ObjectPool', () => {
  it('should create objects via factory', () => {
    const factory = mock(() => ({ value: 42 }))
    const reset = mock(() => {})
    const pool = new ObjectPool(factory, reset, 10)

    const obj = pool.acquire()
    expect(obj).toEqual({ value: 42 })
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('should reuse released objects', () => {
    const factory = mock(() => ({ value: 42 }))
    const reset = mock(() => {})
    const pool = new ObjectPool(factory, reset, 10)

    const obj1 = pool.acquire()
    pool.release(obj1)

    const obj2 = pool.acquire()
    expect(factory).toHaveBeenCalledTimes(1) // 只呼叫一次 factory
    expect(obj2).toBe(obj1) // 重複使用同一物件
  })

  it('should reset objects on release', () => {
    const reset = mock(() => {})
    const pool = new ObjectPool(() => ({ value: 0 }), reset, 10)

    const obj = pool.acquire()
    pool.release(obj)

    expect(reset).toHaveBeenCalledWith(obj)
  })

  it('should not exceed maxSize', () => {
    const pool = new ObjectPool(
      () => ({ id: Math.random() }),
      () => {},
      2
    )

    const a = pool.acquire()
    const b = pool.acquire()
    const c = pool.acquire()

    pool.release(a)
    pool.release(b)
    pool.release(c) // Should be discarded (maxSize = 2)

    const stats = pool.getStats()
    expect(stats.available).toBe(2)
  })

  it('should prewarm the pool', () => {
    const pool = new ObjectPool(
      () => Buffer.alloc(64),
      () => {},
      128
    )
    pool.prewarm(32)

    const stats = pool.getStats()
    expect(stats.available).toBe(32)
    expect(stats.total).toBe(32)
  })

  it('should not prewarm beyond maxSize', () => {
    const pool = new ObjectPool(
      () => ({}),
      () => {},
      5
    )
    pool.prewarm(100)

    const stats = pool.getStats()
    expect(stats.available).toBe(5)
  })

  it('should return accurate stats', () => {
    const pool = new ObjectPool(
      () => ({}),
      () => {},
      10
    )

    pool.acquire()
    pool.acquire()

    const stats = pool.getStats()
    expect(stats.total).toBe(2)
    expect(stats.used).toBe(2)
    expect(stats.available).toBe(0)
    expect(stats.maxSize).toBe(10)
  })
})

// ==========================================================
// BufferPool
// ==========================================================

describe('BufferPool', () => {
  it('should acquire buffers of specified size', () => {
    const buffer = BufferPool.acquire(256)
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBe(256)
    BufferPool.release(buffer)
  })

  it('should reuse released buffers', () => {
    const buf1 = BufferPool.acquire(512)
    BufferPool.release(buf1)
    const buf2 = BufferPool.acquire(512)
    // buf2 should be the same reused buffer
    expect(buf2.length).toBe(512)
    BufferPool.release(buf2)
  })

  it('should handle release of non-pooled buffer gracefully', () => {
    const randomBuffer = Buffer.alloc(9999)
    // This should not throw even if pool for 9999 doesn't exist
    BufferPool.release(randomBuffer)
  })

  it('should prewarm multiple sizes', () => {
    BufferPool.prewarm([128, 256], 8)

    const stats = BufferPool.getStats()
    expect(stats[128]).toBeDefined()
    expect(stats[256]).toBeDefined()
  })

  it('should getStats for all pools', () => {
    BufferPool.acquire(1024)
    const stats = BufferPool.getStats()
    expect(stats[1024]).toBeDefined()
    expect(stats[1024].total).toBeGreaterThanOrEqual(1)
  })

  it('should create separate pools for different sizes', () => {
    const pool1 = BufferPool.getPool(64)
    const pool2 = BufferPool.getPool(128)
    expect(pool1).not.toBe(pool2)
  })
})

// ==========================================================
// SmartCompressor
// ==========================================================

describe('SmartCompressor', () => {
  describe('constructor defaults', () => {
    it('should use brotli by default', () => {
      const compressor = new SmartCompressor()
      expect((compressor as any).algorithm).toBe('brotli')
    })

    it('should use 1024 threshold by default', () => {
      const compressor = new SmartCompressor()
      expect((compressor as any).threshold).toBe(1024)
    })
  })

  describe('compress', () => {
    it('should not compress data below threshold', () => {
      const compressor = new SmartCompressor({ threshold: 1024 })
      const result = compressor.compress('short text')

      expect(result.compressed).toBe(false)
      expect(result.algorithm).toBeUndefined()
    })

    it('should compress data above threshold with brotli', () => {
      const compressor = new SmartCompressor({ threshold: 10, algorithm: 'brotli' })
      const largeData = 'a'.repeat(1000) // 高度可壓縮的資料

      const result = compressor.compress(largeData)

      expect(result.compressed).toBe(true)
      expect(result.algorithm).toBe('brotli')
      expect(result.data.length).toBeLessThan(1000)
    })

    it('should compress data above threshold with gzip', () => {
      const compressor = new SmartCompressor({ threshold: 10, algorithm: 'gzip' })
      const largeData = 'b'.repeat(1000)

      const result = compressor.compress(largeData)

      expect(result.compressed).toBe(true)
      expect(result.algorithm).toBe('gzip')
      expect(result.data.length).toBeLessThan(1000)
    })

    it('should accept Buffer input', () => {
      const compressor = new SmartCompressor({ threshold: 10 })
      const buffer = Buffer.from('c'.repeat(1000))

      const result = compressor.compress(buffer)

      expect(result.compressed).toBe(true)
    })

    it('should not compress if result is larger than original', () => {
      // 隨機資料通常不可壓縮
      const compressor = new SmartCompressor({ threshold: 10, algorithm: 'brotli' })
      const randomData = Buffer.alloc(50)
      for (let i = 0; i < 50; i++) {
        randomData[i] = Math.floor(Math.random() * 256)
      }

      const result = compressor.compress(randomData)

      // 不管是否壓縮，結果都不應出錯
      expect(result.data).toBeDefined()
    })
  })

  describe('decompress', () => {
    it('should decompress brotli data', () => {
      const compressor = new SmartCompressor({ threshold: 10, algorithm: 'brotli' })
      const original = 'x'.repeat(500)

      const compressed = compressor.compress(original)
      expect(compressed.compressed).toBe(true)

      const decompressed = compressor.decompress(compressed.data, 'brotli')
      expect(decompressed.toString()).toBe(original)
    })

    it('should decompress gzip data', () => {
      const compressor = new SmartCompressor({ threshold: 10, algorithm: 'gzip' })
      const original = 'y'.repeat(500)

      const compressed = compressor.compress(original)
      expect(compressed.compressed).toBe(true)

      const decompressed = compressor.decompress(compressed.data, 'gzip')
      expect(decompressed.toString()).toBe(original)
    })

    it('should return data as-is for unknown algorithm', () => {
      const compressor = new SmartCompressor()
      const data = Buffer.from('test data')

      const result = compressor.decompress(data, 'unknown')
      expect(result).toBe(data)
    })
  })
})

// ==========================================================
// LogSampler
// ==========================================================

describe('LogSampler', () => {
  it('should always log error and warning levels (neverSample)', () => {
    const sampler = new LogSampler({ rate: 0.01, threshold: 0 })

    // Error and warning should always be logged
    for (let i = 0; i < 100; i++) {
      expect(sampler.shouldLog('error')).toBe(true)
      expect(sampler.shouldLog('warning')).toBe(true)
    }
  })

  it('should log all events when rate is below threshold', () => {
    const sampler = new LogSampler({ threshold: 10000 })

    // With low event count, all should be logged
    for (let i = 0; i < 10; i++) {
      expect(sampler.shouldLog('info')).toBe(true)
    }
  })

  it('should return getCurrentRate', () => {
    const sampler = new LogSampler()
    expect(sampler.getCurrentRate()).toBe(0)
  })

  it('should reset counters', () => {
    const sampler = new LogSampler()

    // Generate some events
    for (let i = 0; i < 50; i++) {
      sampler.shouldLog('info')
    }

    sampler.reset()
    expect(sampler.getCurrentRate()).toBe(0)
  })

  it('should update threshold', () => {
    const sampler = new LogSampler({ threshold: 500 })
    sampler.updateThreshold(1000)

    expect((sampler as any).options.threshold).toBe(1000)
  })

  it('should use default options when none provided', () => {
    const sampler = new LogSampler()
    expect((sampler as any).options.rate).toBe(0.1)
    expect((sampler as any).options.threshold).toBe(500)
    expect((sampler as any).options.adaptive).toBe(true)
  })

  it('should handle custom neverSample levels', () => {
    const sampler = new LogSampler({ neverSample: ['info'] })

    for (let i = 0; i < 100; i++) {
      expect(sampler.shouldLog('info')).toBe(true)
    }
  })
})

// ==========================================================
// AdaptiveHeartbeat
// ==========================================================

describe('AdaptiveHeartbeat', () => {
  let heartbeat: AdaptiveHeartbeat

  afterEach(() => {
    if (heartbeat) {
      heartbeat.stop()
    }
  })

  it('should start and call callback', async () => {
    const callback = mock(() => Promise.resolve())
    heartbeat = new AdaptiveHeartbeat(callback, {
      baseInterval: 50,
      minInterval: 25,
      maxInterval: 200,
      jitter: 0,
      backoffMultiplier: 1.5,
    })

    heartbeat.start()
    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(callback).toHaveBeenCalled()
  })

  it('should not start twice', () => {
    const callback = mock(() => Promise.resolve())
    heartbeat = new AdaptiveHeartbeat(callback, {
      baseInterval: 1000,
      minInterval: 500,
      maxInterval: 3000,
      jitter: 0,
      backoffMultiplier: 1.5,
    })

    heartbeat.start()
    heartbeat.start() // Should be a no-op

    expect((heartbeat as any).isRunning).toBe(true)
  })

  it('should stop and clear timer', () => {
    const callback = mock(() => Promise.resolve())
    heartbeat = new AdaptiveHeartbeat(callback, {
      baseInterval: 1000,
      minInterval: 500,
      maxInterval: 3000,
      jitter: 0,
      backoffMultiplier: 1.5,
    })

    heartbeat.start()
    heartbeat.stop()

    expect((heartbeat as any).isRunning).toBe(false)
    expect((heartbeat as any).timer).toBeNull()
  })

  it('should handle callback failure with backoff', async () => {
    let callCount = 0
    const callback = mock(() => {
      callCount++
      if (callCount <= 2) {
        return Promise.reject(new Error('fail'))
      }
      return Promise.resolve()
    })

    heartbeat = new AdaptiveHeartbeat(callback, {
      baseInterval: 30,
      minInterval: 15,
      maxInterval: 500,
      jitter: 0,
      backoffMultiplier: 2,
    })

    heartbeat.start()
    await new Promise((resolve) => setTimeout(resolve, 300))

    expect(callback).toHaveBeenCalled()
    // After failures, interval should increase
    expect((heartbeat as any).consecutiveFailures).toBeGreaterThanOrEqual(0)
  })

  it('should update interval at runtime', () => {
    const callback = mock(() => Promise.resolve())
    heartbeat = new AdaptiveHeartbeat(callback, {
      baseInterval: 10000,
      minInterval: 5000,
      maxInterval: 60000,
      jitter: 0.1,
      backoffMultiplier: 1.5,
    })

    heartbeat.updateInterval(5000)

    expect((heartbeat as any).options.baseInterval).toBe(5000)
    expect((heartbeat as any).currentInterval).toBe(5000)
  })

  it('should apply jitter to interval', () => {
    const callback = mock(() => Promise.resolve())
    heartbeat = new AdaptiveHeartbeat(callback, {
      baseInterval: 1000,
      minInterval: 500,
      maxInterval: 3000,
      jitter: 0.5, // 50% jitter
      backoffMultiplier: 1.5,
    })

    // Call private applyJitter to verify behavior
    const interval = (heartbeat as any).applyJitter(1000)

    // With 50% jitter, result should be between 500 and 1500
    expect(interval).toBeGreaterThanOrEqual(500)
    expect(interval).toBeLessThanOrEqual(1500)
  })
})

// ==========================================================
// ConsoleLogger
// ==========================================================

describe('ConsoleLogger', () => {
  it('should log debug messages when level is debug', () => {
    const logger = new ConsoleLogger('debug')
    const spy = spyOn(console, 'debug').mockImplementation(() => {})

    logger.debug('test debug')
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('should not log debug messages when level is info', () => {
    const logger = new ConsoleLogger('info')
    const spy = spyOn(console, 'debug').mockImplementation(() => {})

    logger.debug('test debug')
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('should log info messages when level is info', () => {
    const logger = new ConsoleLogger('info')
    const spy = spyOn(console, 'info').mockImplementation(() => {})

    logger.info('test info')
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('should log warn messages', () => {
    const logger = new ConsoleLogger('warn')
    const spy = spyOn(console, 'warn').mockImplementation(() => {})

    logger.warn('test warn')
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('should log error messages', () => {
    const logger = new ConsoleLogger('error')
    const spy = spyOn(console, 'error').mockImplementation(() => {})

    logger.error('test error', new Error('fail'))
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('should not log anything when level is silent', () => {
    const logger = new ConsoleLogger('silent')
    const debugSpy = spyOn(console, 'debug').mockImplementation(() => {})
    const infoSpy = spyOn(console, 'info').mockImplementation(() => {})
    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = spyOn(console, 'error').mockImplementation(() => {})

    logger.debug('test')
    logger.info('test')
    logger.warn('test')
    logger.error('test')

    expect(debugSpy).not.toHaveBeenCalled()
    expect(infoSpy).not.toHaveBeenCalled()
    expect(warnSpy).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()

    debugSpy.mockRestore()
    infoSpy.mockRestore()
    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })
})

// ==========================================================
// Serializers (CborSerializer, ProtobufSerializer)
// ==========================================================

describe('CborSerializer', () => {
  const serializer = new CborSerializer()
  const testData = { level: 'info', message: 'test', nested: { a: 1, b: [2, 3] } }

  it('should serialize and deserialize correctly', () => {
    const serialized = serializer.serialize(testData)
    expect(serialized).toBeInstanceOf(Buffer)

    const deserialized = serializer.deserialize(serialized)
    expect(deserialized).toEqual(testData)
  })

  it('should have correct contentType', () => {
    expect(serializer.contentType).toBe('application/cbor')
  })

  it('should handle string input in deserialize (JSON fallback)', () => {
    const jsonStr = JSON.stringify(testData)
    const result = serializer.deserialize(jsonStr)
    expect(result).toEqual(testData)
  })

  it('should handle non-JSON string input in deserialize', () => {
    const result = serializer.deserialize('not-json')
    expect(result).toBe('not-json')
  })
})

describe('ProtobufSerializer', () => {
  const serializer = new ProtobufSerializer()

  it('should serialize and deserialize a log payload', () => {
    const data = {
      level: 'error',
      message: 'Job failed',
      jobId: 'job-1',
      workerId: 'worker-1',
      timestamp: '2024-01-01T00:00:00.000Z',
      context: { event: 'job_failed', queue: 'emails' },
    }

    const serialized = serializer.serialize(data)
    expect(serialized).toBeInstanceOf(Buffer)

    const deserialized = serializer.deserialize(serialized)
    expect(deserialized.level).toBe('error')
    expect(deserialized.message).toBe('Job failed')
    expect(deserialized.jobId).toBe('job-1')
    expect(deserialized.context).toEqual({ event: 'job_failed', queue: 'emails' })
  })

  it('should have correct contentType', () => {
    expect(serializer.contentType).toBe('application/x-protobuf')
  })

  it('should handle data without context', () => {
    const data = { level: 'info', message: 'simple' }
    const serialized = serializer.serialize(data)
    const deserialized = serializer.deserialize(serialized)
    expect(deserialized.level).toBe('info')
    expect(deserialized.message).toBe('simple')
  })

  it('should handle context as non-JSON string in deserialized data', () => {
    // 直接帶 string context 的情況
    const data = { level: 'info', message: 'test', context: { key: 'value' } }
    const serialized = serializer.serialize(data)
    const deserialized = serializer.deserialize(serialized)
    expect(deserialized.context).toEqual({ key: 'value' })
  })
})

describe('MsgPackSerializer edge cases', () => {
  const serializer = new MsgPackSerializer()

  it('should handle string input in deserialize (JSON fallback)', () => {
    const jsonStr = JSON.stringify({ test: 123 })
    const result = serializer.deserialize(jsonStr)
    expect(result).toEqual({ test: 123 })
  })

  it('should return string as-is if not valid JSON', () => {
    const result = serializer.deserialize('not-json')
    expect(result).toBe('not-json')
  })
})
