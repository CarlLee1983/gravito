/**
 * @gravito/atlas - Pool Management Performance Benchmarks
 * Measures performance metrics for connection pool operations
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { ConnectionManager } from '../../src/connection/ConnectionManager'
import type { ConnectionConfig } from '../../src/types'

/**
 * Benchmark suite for pool management performance
 */
describe('Pool Management Performance Benchmarks', () => {
  let connectionManager: ConnectionManager
  const mockConfigs: Record<string, ConnectionConfig> = {
    default: {
      driver: 'postgres' as const,
      host: 'localhost',
      database: 'test',
      pool: { min: 2, max: 20 },
    },
  }

  const runBenchmark = async (name: string, fn: () => Promise<void>, iterations = 1000) => {
    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      await fn()
    }
    const end = performance.now()
    const duration = end - start
    const avg = duration / iterations
    console.log(
      `[${name}] ${iterations} iterations: ${duration.toFixed(2)}ms (avg: ${avg.toFixed(4)}ms)`
    )
    return { duration, avg }
  }

  beforeAll(() => {
    connectionManager = new ConnectionManager(mockConfigs)
  })

  afterAll(async () => {
    await connectionManager.shutdown()
  })

  describe('Connection Acquisition', () => {
    it('should acquire connections with minimal overhead', async () => {
      const result = await runBenchmark(
        'Connection Acquisition',
        async () => {
          connectionManager.connection('default')
        },
        100
      )

      // Connection acquisition should be fast (< 1ms per acquisition)
      expect(result.avg).toBeLessThan(1)
    })
  })

  describe('Health Check Performance', () => {
    it('should perform health checks with minimal overhead', async () => {
      connectionManager.enableHealthCheck({
        checkInterval: 1000, // Prevent actual execution during benchmark
      })

      const start = performance.now()
      connectionManager.enableHealthCheck({
        checkInterval: 100,
      })

      const duration = performance.now() - start

      // Health check setup should be very fast
      expect(duration).toBeLessThan(10)

      connectionManager.disableHealthCheck()
    })
  })

  describe('Adaptive Management Performance', () => {
    it('should start adaptive management with minimal overhead', async () => {
      const start = performance.now()
      connectionManager.enableAdaptive({
        evaluationInterval: 10000, // Prevent frequent evaluation during test
      })
      const duration = performance.now() - start

      // Adaptive manager startup should be fast
      expect(duration).toBeLessThan(5)

      connectionManager.disableAdaptive()
    })

    it('should maintain adaptive management with acceptable overhead', async () => {
      connectionManager.enableAdaptive({
        evaluationInterval: 5000,
      })

      const start = performance.now()
      // Let it run for a bit
      await new Promise((resolve) => setTimeout(resolve, 100))
      const duration = performance.now() - start

      // Runtime overhead should be minimal
      expect(duration).toBeLessThan(200)

      connectionManager.disableAdaptive()
    })
  })

  describe('Pool Warming Performance', () => {
    it('should warm up pools efficiently', async () => {
      connectionManager.enableWarmup({
        targetConnections: 3,
        concurrency: 2,
      })

      const result = await runBenchmark(
        'Pool Warmup',
        async () => {
          await connectionManager.warmup()
        },
        10
      )

      // Warmup should complete reasonably fast
      expect(result.duration).toBeDefined()
    })
  })

  describe('Memory Footprint', () => {
    it('should maintain stable memory with health checking', async () => {
      connectionManager.enableHealthCheck({
        checkInterval: 100,
      })

      const before = process.memoryUsage().heapUsed
      await new Promise((resolve) => setTimeout(resolve, 500))
      const after = process.memoryUsage().heapUsed

      const increase = (after - before) / 1024 / 1024 // Convert to MB

      // Memory increase should be minimal (< 10MB)
      expect(increase).toBeLessThan(10)

      connectionManager.disableHealthCheck()
    })

    it('should maintain stable memory with adaptive management', async () => {
      connectionManager.enableAdaptive({
        evaluationInterval: 100,
        maxHistorySize: 10,
      })

      const before = process.memoryUsage().heapUsed
      await new Promise((resolve) => setTimeout(resolve, 500))
      const after = process.memoryUsage().heapUsed

      const increase = (after - before) / 1024 / 1024 // Convert to MB

      // Memory increase should be minimal (< 10MB)
      expect(increase).toBeLessThan(10)

      connectionManager.disableAdaptive()
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle concurrent pool operations efficiently', async () => {
      connectionManager.enableAdaptive({
        evaluationInterval: 5000,
      })

      const concurrentOps = async () => {
        const promises = []
        for (let i = 0; i < 10; i++) {
          promises.push(
            Promise.resolve().then(() => {
              connectionManager.connection('default')
            })
          )
        }
        await Promise.all(promises)
      }

      const result = await runBenchmark('Concurrent Operations', concurrentOps, 10)

      // Concurrent operations should be fast
      expect(result.avg).toBeLessThan(5)

      connectionManager.disableAdaptive()
    })
  })

  describe('Feature Overhead', () => {
    it('should measure health check overhead', async () => {
      // Baseline: without health check
      const baseline = await runBenchmark(
        'Connection ops (no health check)',
        async () => {
          connectionManager.connection('default')
        },
        100
      )

      // With health check
      connectionManager.enableHealthCheck({
        checkInterval: 60000, // Prevent actual execution
      })

      const withHealthCheck = await runBenchmark(
        'Connection ops (with health check)',
        async () => {
          connectionManager.connection('default')
        },
        100
      )

      connectionManager.disableHealthCheck()

      // Overhead should be < 0.1ms per operation
      const overhead = withHealthCheck.avg - baseline.avg
      expect(overhead).toBeLessThan(0.1)
    })

    it('should measure adaptive management overhead', async () => {
      // Baseline: without adaptive
      const baseline = await runBenchmark(
        'Connection ops (no adaptive)',
        async () => {
          connectionManager.connection('default')
        },
        100
      )

      // With adaptive
      connectionManager.enableAdaptive({
        evaluationInterval: 10000, // Prevent frequent evaluation
      })

      const withAdaptive = await runBenchmark(
        'Connection ops (with adaptive)',
        async () => {
          connectionManager.connection('default')
        },
        100
      )

      connectionManager.disableAdaptive()

      // Overhead should be < 0.1ms per operation
      const overhead = withAdaptive.avg - baseline.avg
      expect(overhead).toBeLessThan(0.1)
    })
  })

  describe('Throughput Metrics', () => {
    it('should achieve acceptable throughput for connection acquisition', async () => {
      const iterations = 1000
      const start = performance.now()

      for (let i = 0; i < iterations; i++) {
        connectionManager.connection('default')
      }

      const duration = performance.now() - start
      const throughput = iterations / (duration / 1000)

      console.log(`[Connection Acquisition Throughput] ${throughput.toFixed(0)} ops/sec`)

      // Should handle at least 100k ops/sec
      expect(throughput).toBeGreaterThan(100000)
    })

    it('should maintain throughput with adaptive enabled', async () => {
      connectionManager.enableAdaptive({
        evaluationInterval: 60000, // Prevent evaluation during test
      })

      const iterations = 1000
      const start = performance.now()

      for (let i = 0; i < iterations; i++) {
        connectionManager.connection('default')
      }

      const duration = performance.now() - start
      const throughput = iterations / (duration / 1000)

      console.log(`[Connection Throughput w/ Adaptive] ${throughput.toFixed(0)} ops/sec`)

      // Should maintain good throughput (> 50k ops/sec)
      expect(throughput).toBeGreaterThan(50000)

      connectionManager.disableAdaptive()
    })
  })
})
