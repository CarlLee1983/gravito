import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { CircuitOpenException } from '../../src/exceptions/CircuitOpenException'
import { OrbitDegradationManager } from '../../src/degradation/OrbitDegradationManager'
import type { DegradedResult } from '../../src/degradation/DegradedResult'

describe('OrbitDegradationManager', () => {
  let manager: OrbitDegradationManager
  let originalNodeEnv: string | undefined

  beforeEach(() => {
    manager = new OrbitDegradationManager()
    originalNodeEnv = process.env.NODE_ENV
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  // Test 1: execute() returns live result on success
  it('returns { value, degraded: false, source: "live" } when fn succeeds', async () => {
    const result: DegradedResult<string> = await manager.execute('catalog', () =>
      Promise.resolve('live-data'),
    )

    expect(result.value).toBe('live-data')
    expect(result.degraded).toBe(false)
    expect(result.source).toBe('live')
  })

  // Test 2: execute() returns fallback result when CircuitOpenException thrown and fallback registered
  it('returns { value, degraded: true, source: "fallback" } when CircuitOpenException thrown and fallback registered', async () => {
    process.env.NODE_ENV = 'production'
    manager.registerFallback('catalog', { fn: () => Promise.resolve('fallback-data'), ttl: 0 })

    const result: DegradedResult<string> = await manager.execute('catalog', () => {
      throw new CircuitOpenException({ breakerName: 'catalog' })
    })

    expect(result.value).toBe('fallback-data')
    expect(result.degraded).toBe(true)
    expect(result.source).toBe('fallback')
  })

  // Test 3: execute() re-throws CircuitOpenException when no fallback registered
  it('re-throws CircuitOpenException when no fallback registered for orbitName', async () => {
    process.env.NODE_ENV = 'production'

    await expect(
      manager.execute('catalog', () => {
        throw new CircuitOpenException({ breakerName: 'catalog' })
      }),
    ).rejects.toBeInstanceOf(CircuitOpenException)
  })

  // Test 4: execute() propagates non-CircuitOpenException errors unchanged
  it('propagates non-CircuitOpenException errors unchanged', async () => {
    process.env.NODE_ENV = 'production'
    manager.registerFallback('catalog', { fn: () => Promise.resolve('fallback'), ttl: 0 })

    const error = new TypeError('network failed')
    await expect(
      manager.execute('catalog', () => {
        throw error
      }),
    ).rejects.toBe(error)
  })

  // Test 5: registerFallback stores a fallback with TTL; execute() uses cached value within TTL window
  it('returns cached fallback value within TTL window', async () => {
    process.env.NODE_ENV = 'production'
    let callCount = 0
    manager.registerFallback('catalog', {
      fn: () => {
        callCount++
        return Promise.resolve(`fallback-call-${callCount}`)
      },
      ttl: 5000, // 5 second TTL
    })

    // First call - miss the cache
    const result1 = await manager.execute<string>('catalog', () => {
      throw new CircuitOpenException()
    })

    // Second call - should use cached value
    const result2 = await manager.execute<string>('catalog', () => {
      throw new CircuitOpenException()
    })

    expect(result1.value).toBe('fallback-call-1')
    expect(result2.value).toBe('fallback-call-1') // cached - same value
    expect(callCount).toBe(1) // fallback fn called only once
    expect(result1.degraded).toBe(true)
    expect(result2.degraded).toBe(true)
  })

  // Test 6: execute() re-invokes fallback fn when TTL has expired
  it('re-invokes fallback fn when TTL has expired', async () => {
    process.env.NODE_ENV = 'production'
    let callCount = 0
    manager.registerFallback('catalog', {
      fn: () => {
        callCount++
        return Promise.resolve(`fallback-call-${callCount}`)
      },
      ttl: 50, // 50ms TTL — will expire quickly
    })

    // First call - populates cache
    const result1 = await manager.execute<string>('catalog', () => {
      throw new CircuitOpenException()
    })

    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Second call - cache expired, re-invoke fn
    const result2 = await manager.execute<string>('catalog', () => {
      throw new CircuitOpenException()
    })

    expect(result1.value).toBe('fallback-call-1')
    expect(result2.value).toBe('fallback-call-2') // fresh invocation
    expect(callCount).toBe(2)
  })

  // Test 7: NODE_ENV=test gate — execute() does NOT catch CircuitOpenException; exception propagates
  it('propagates CircuitOpenException in NODE_ENV=test (D-05)', async () => {
    process.env.NODE_ENV = 'test'
    manager.registerFallback('catalog', { fn: () => Promise.resolve('fallback'), ttl: 0 })

    await expect(
      manager.execute('catalog', () => {
        throw new CircuitOpenException({ breakerName: 'catalog' })
      }),
    ).rejects.toBeInstanceOf(CircuitOpenException)
  })

  // Test 8: registerFallback with ttl=0 never caches; always invokes fallback fn
  it('never caches when ttl=0; always invokes fallback fn fresh', async () => {
    process.env.NODE_ENV = 'production'
    let callCount = 0
    manager.registerFallback('catalog', {
      fn: () => {
        callCount++
        return Promise.resolve(`fallback-call-${callCount}`)
      },
      ttl: 0,
    })

    const result1 = await manager.execute<string>('catalog', () => {
      throw new CircuitOpenException()
    })
    const result2 = await manager.execute<string>('catalog', () => {
      throw new CircuitOpenException()
    })

    expect(result1.value).toBe('fallback-call-1')
    expect(result2.value).toBe('fallback-call-2') // always fresh
    expect(callCount).toBe(2)
  })
})
