import { afterEach, describe, expect, it, mock } from 'bun:test'
import type { SerializedJob } from '../src/types'
import { WorkerPool } from '../src/workers/WorkerPool'

function createJob(id = 'pool-job'): SerializedJob {
  return { id, type: 'json', data: '{}', createdAt: Date.now() }
}

describe('WorkerPool', () => {
  let pool: WorkerPool

  afterEach(async () => {
    if (pool) {
      await pool.shutdown()
    }
  })

  describe('constructor', () => {
    it('should create pool with default config', () => {
      pool = new WorkerPool()
      const stats = pool.getStats()
      expect(stats.total).toBe(0)
    })

    it('should warm up with minWorkers', () => {
      pool = new WorkerPool({ minWorkers: 2, poolSize: 4 })
      const stats = pool.getStats()
      expect(stats.total).toBe(2)
    })

    it('should cap minWorkers at poolSize', () => {
      pool = new WorkerPool({ minWorkers: 10, poolSize: 3 })
      const stats = pool.getStats()
      expect(stats.total).toBe(3)
    })
  })

  describe('getStats', () => {
    it('should return correct initial stats', () => {
      pool = new WorkerPool({ minWorkers: 1 })
      const stats = pool.getStats()
      expect(stats.total).toBe(1)
      expect(stats.ready).toBe(0)
      expect(stats.busy).toBe(0)
      expect(stats.terminated).toBe(0)
      expect(stats.pending).toBe(0)
      expect(stats.completed).toBe(0)
      expect(stats.failed).toBe(0)
    })
  })

  describe('execute', () => {
    it('should create new worker when pool has capacity', async () => {
      pool = new WorkerPool({ poolSize: 4 })

      const mockExecute = mock(() => Promise.resolve())
      ;(pool as any).createWorker = () => {
        const worker = {
          execute: mockExecute,
          isReady: mock(() => true),
          getState: mock(() => 'ready'),
          terminate: mock(() => Promise.resolve()),
        }
        ;(pool as any).workers.push(worker)
        return worker
      }

      await pool.execute(createJob())
      const stats = pool.getStats()
      expect(stats.completed).toBe(1)
    })

    it('should track failed jobs', async () => {
      pool = new WorkerPool({ poolSize: 4 })

      ;(pool as any).createWorker = () => {
        const worker = {
          execute: mock(() => Promise.reject(new Error('exec failed'))),
          isReady: mock(() => true),
          getState: mock(() => 'ready'),
          terminate: mock(() => Promise.resolve()),
        }
        ;(pool as any).workers.push(worker)
        return worker
      }

      await expect(pool.execute(createJob())).rejects.toThrow('exec failed')
      const stats = pool.getStats()
      expect(stats.failed).toBe(1)
    })

    it('should queue jobs when pool is saturated', async () => {
      pool = new WorkerPool({ poolSize: 1 })

      const busyWorker = {
        execute: mock(() => new Promise<void>(() => {})),
        isReady: mock(() => false),
        getState: mock(() => 'busy'),
        terminate: mock(() => Promise.resolve()),
      }
      ;(pool as any).workers = [busyWorker]

      pool.execute(createJob('queued'))
      const stats = pool.getStats()
      expect(stats.pending).toBe(1)

      ;(pool as any).queue = []
    })
  })

  describe('shutdown', () => {
    it('should terminate all workers and reject pending jobs', async () => {
      pool = new WorkerPool({ minWorkers: 0, poolSize: 4 })

      const mockWorker = {
        execute: mock(() => Promise.resolve()),
        isReady: mock(() => true),
        getState: mock(() => 'ready'),
        terminate: mock(() => Promise.resolve()),
      }
      ;(pool as any).workers = [mockWorker]

      const pendingPromise = new Promise<void>((resolve, reject) => {
        ;(pool as any).queue.push({ job: createJob('pending'), resolve, reject })
      })

      await pool.shutdown()
      await expect(pendingPromise).rejects.toThrow('shutting down')

      const stats = pool.getStats()
      expect(stats.total).toBe(0)
      expect(stats.pending).toBe(0)
    })

    it('should clear health check timer', async () => {
      pool = new WorkerPool({ healthCheckInterval: 100 })
      await pool.shutdown()
      expect((pool as any).healthCheckTimer).toBeNull()
    })
  })

  describe('waitForCompletion', () => {
    it('should resolve immediately when no jobs are active', async () => {
      pool = new WorkerPool()
      await pool.waitForCompletion()
    })

    it('should timeout when jobs are still running', async () => {
      pool = new WorkerPool({ poolSize: 1 })

      const busyWorker = {
        execute: mock(() => new Promise(() => {})),
        isReady: mock(() => false),
        getState: mock(() => 'busy'),
        terminate: mock(() => Promise.resolve()),
      }
      ;(pool as any).workers = [busyWorker]

      await expect(pool.waitForCompletion(100)).rejects.toThrow('timeout')
    })
  })

  describe('health check', () => {
    it('should remove terminated workers', async () => {
      pool = new WorkerPool({ healthCheckInterval: 10000 })

      ;(pool as any).workers = [
        {
          getState: mock(() => 'terminated'),
          terminate: mock(() => Promise.resolve()),
          isReady: mock(() => false),
        },
        {
          getState: mock(() => 'ready'),
          terminate: mock(() => Promise.resolve()),
          isReady: mock(() => true),
        },
      ]
      ;(pool as any).performHealthCheck()
      expect((pool as any).workers).toHaveLength(1)
    })

    it('should create workers when below minWorkers', async () => {
      pool = new WorkerPool({ minWorkers: 3, poolSize: 5, healthCheckInterval: 10000 })
      ;(pool as any).workers = []
      ;(pool as any).performHealthCheck()
      expect((pool as any).workers.length).toBe(3)
    })
  })

  describe('processQueue', () => {
    it('should process queued jobs when worker becomes available', async () => {
      pool = new WorkerPool({ poolSize: 2 })

      const mockWorker = {
        execute: mock(() => Promise.resolve()),
        isReady: mock(() => true),
        getState: mock(() => 'ready'),
        terminate: mock(() => Promise.resolve()),
      }
      ;(pool as any).workers = [mockWorker]

      let resolved = false
      ;(pool as any).queue.push({
        job: createJob('q-job'),
        resolve: () => {
          resolved = true
        },
        reject: () => {},
      })

      ;(pool as any).processQueue()
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(resolved).toBe(true)
    })

    it('should handle execution error in queued job', async () => {
      pool = new WorkerPool({ poolSize: 2 })

      const mockWorker = {
        execute: mock(() => Promise.reject(new Error('queue exec fail'))),
        isReady: mock(() => true),
        getState: mock(() => 'ready'),
        terminate: mock(() => Promise.resolve()),
      }
      ;(pool as any).workers = [mockWorker]

      let rejected = false
      ;(pool as any).queue.push({
        job: createJob('fail-q-job'),
        resolve: () => {},
        reject: () => {
          rejected = true
        },
      })

      ;(pool as any).processQueue()
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(rejected).toBe(true)
    })

    it('should do nothing when queue is empty', () => {
      pool = new WorkerPool()
      ;(pool as any).processQueue()
    })

    it('should do nothing when no workers available', () => {
      pool = new WorkerPool({ poolSize: 0 })
      ;(pool as any).queue.push({ job: createJob(), resolve: () => {}, reject: () => {} })
      ;(pool as any).processQueue()
      expect((pool as any).queue.length).toBe(1)
    })
  })

  describe('runtime-aware worker creation', () => {
    it('should accept runtime configuration', () => {
      pool = new WorkerPool({ runtime: 'node', poolSize: 2 })
      const config = (pool as any).config
      expect(config.runtime).toBe('node')
    })

    it('should accept custom factory', () => {
      const { RuntimeAwareWorkerFactory } = require('../src/workers/WorkerFactory')
      const customFactory = new RuntimeAwareWorkerFactory('bun')

      pool = new WorkerPool({ factory: customFactory, poolSize: 2 })
      const config = (pool as any).config
      expect(config.factory).toBe(customFactory)
    })

    it('should support auto runtime detection', () => {
      pool = new WorkerPool({ runtime: 'auto', poolSize: 2 })
      const config = (pool as any).config
      expect(config.runtime).toBe('auto')
    })

    it('should create workers via factory', () => {
      pool = new WorkerPool({ minWorkers: 1, runtime: 'node' })
      const stats = pool.getStats()
      expect(stats.total).toBe(1)
    })

    it('should preserve poolSize with factory-created workers', () => {
      pool = new WorkerPool({ poolSize: 5, minWorkers: 2, runtime: 'node' })
      const stats = pool.getStats()
      expect(stats.total).toBe(2)
      expect((pool as any).config.poolSize).toBe(5)
    })
  })
})
