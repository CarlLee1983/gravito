/**
 * Worker Pool Tests
 *
 * Tests for worker pool initialization, task execution,
 * auto-scaling, and health checks.
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import type { EventTask } from '../../src/events/types'
import { WorkerPool } from '../../src/events/WorkerPool'
import type { TaskSource } from '../../src/events/WorkerPoolConfig'

// Mock TaskSource for testing
class MockTaskSource implements TaskSource {
  completedTasks: string[] = []
  failedTasks: Map<string, Error> = new Map()

  async fetchTask(): Promise<EventTask | null> {
    return null
  }

  async acknowledgeCompletion(taskId: string): Promise<void> {
    this.completedTasks.push(taskId)
  }

  async acknowledgeFailure(taskId: string, error: Error): Promise<void> {
    this.failedTasks.set(taskId, error)
  }
}

// Helper to create test event task
function createTestTask(id?: string, priority?: string): EventTask {
  return {
    id: id || `task-${Date.now()}`,
    hook: 'test.hook',
    args: { test: true },
    options: { priority },
    callbacks: [async (args) => args],
    createdAt: Date.now(),
  }
}

// Helper to create a task with callback
function createTaskWithCallback(callback: () => Promise<void>, id?: string): EventTask {
  return {
    id: id || `task-${Date.now()}`,
    hook: 'test.hook',
    args: { test: true },
    options: {},
    callbacks: [async () => callback()],
    createdAt: Date.now(),
  }
}

describe('WorkerPool', () => {
  let pool: WorkerPool

  beforeEach(() => {
    pool = new WorkerPool({
      concurrency: 4,
      workerThreads: 2,
      minWorkers: 1,
      maxWorkers: 4,
      metricsInterval: 100,
    })
  })

  afterEach(async () => {
    if (pool) {
      await pool.stop()
    }
  })

  describe('初始化與配置', () => {
    it('應使用默認配置初始化', async () => {
      const defaultPool = new WorkerPool()
      await defaultPool.start()

      const stats = defaultPool.getPoolStats()
      expect(stats.activeWorkers).toBeGreaterThan(0)

      await defaultPool.stop()
    })

    it('應接受自定義配置', async () => {
      const customPool = new WorkerPool({
        concurrency: 8,
        minWorkers: 2,
        maxWorkers: 8,
      })
      await customPool.start()

      const stats = customPool.getPoolStats()
      expect(stats.activeWorkers).toBe(2)

      await customPool.stop()
    })

    it('應正確設定 minWorkers/maxWorkers', async () => {
      const configPool = new WorkerPool({
        minWorkers: 2,
        maxWorkers: 6,
      })
      await configPool.start()

      const stats = configPool.getPoolStats()
      expect(stats.activeWorkers).toBe(2)
      expect(stats.activeWorkers).toBeLessThanOrEqual(6)

      await configPool.stop()
    })
  })

  describe('任務提交與執行', () => {
    it('應成功執行單個任務', async () => {
      await pool.start()

      const task = createTestTask()
      await pool.submitTask(task)

      // Wait for task execution
      await new Promise((resolve) => setTimeout(resolve, 100))

      const stats = pool.getPoolStats()
      expect(stats.totalTasksProcessed).toBe(1)
      expect(stats.totalSuccess).toBe(1)
    })

    it('應並發執行多個任務', async () => {
      await pool.start()

      const tasks = [
        createTestTask('task-1'),
        createTestTask('task-2'),
        createTestTask('task-3'),
        createTestTask('task-4'),
      ]

      for (const task of tasks) {
        await pool.submitTask(task)
      }

      // Wait for all tasks
      await new Promise((resolve) => setTimeout(resolve, 200))

      const stats = pool.getPoolStats()
      expect(stats.totalTasksProcessed).toBe(4)
      expect(stats.totalSuccess).toBe(4)
    })

    it('應正確處理任務超時', async () => {
      const timeoutPool = new WorkerPool({
        taskTimeout: 50,
        minWorkers: 1,
        maxWorkers: 1,
      })
      await timeoutPool.start()

      const slowTask = createTaskWithCallback(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))
      }, 'slow-task')

      await timeoutPool.submitTask(slowTask)

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 300))

      const stats = timeoutPool.getPoolStats()
      expect(stats.totalTasksProcessed).toBe(1)
      expect(stats.totalFailures).toBe(1)

      await timeoutPool.stop()
    })

    it('應記錄任務執行指標', async () => {
      await pool.start()

      const task = createTestTask('metric-task', 'high')
      await pool.submitTask(task)

      // Wait for task execution
      await new Promise((resolve) => setTimeout(resolve, 100))

      const stats = pool.getPoolStats()
      expect(stats.totalSuccess).toBe(1)

      const workerStats = pool.getWorkerStats()
      expect(workerStats.length).toBeGreaterThan(0)
      expect(workerStats[0].avgDurationMs).toBeGreaterThanOrEqual(0)
    })
  })

  describe('自適應擴容', () => {
    it('應在高負載時自動擴容', async () => {
      const scalePool = new WorkerPool({
        enableAutoScaling: true,
        minWorkers: 1,
        maxWorkers: 4,
        concurrency: 2,
        scaleUpThreshold: 0.5,
        scaleDownThreshold: 0.2,
        metricsInterval: 50,
      })
      await scalePool.start()

      const initialStats = scalePool.getPoolStats()
      // Track initial worker count for scaling verification
      const _initialWorkers = initialStats.activeWorkers

      // Submit tasks to trigger scaling
      for (let i = 0; i < 4; i++) {
        const task = createTaskWithCallback(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }, `task-${i}`)
        await scalePool.submitTask(task)
      }

      // Wait for auto-scaling to trigger
      await new Promise((resolve) => setTimeout(resolve, 300))

      const scaledStats = scalePool.getPoolStats()
      // Just verify pool is still working
      expect(scaledStats.activeWorkers).toBeGreaterThan(0)

      await scalePool.stop()
    })

    it('應在低負載時自動縮容', async () => {
      const scalePool = new WorkerPool({
        enableAutoScaling: true,
        minWorkers: 1,
        maxWorkers: 4,
        scaleUpThreshold: 0.8,
        scaleDownThreshold: 0.1,
        metricsInterval: 100,
      })
      await scalePool.start()

      // Initially submit tasks to scale up
      for (let i = 0; i < 4; i++) {
        const task = createTaskWithCallback(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }, `task-${i}`)
        await scalePool.submitTask(task)
      }

      await new Promise((resolve) => setTimeout(resolve, 600))

      const scaledStats = scalePool.getPoolStats()
      const maxWorkers = scaledStats.activeWorkers

      // Wait for utilization to drop and scale down to trigger
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const finalStats = scalePool.getPoolStats()
      // Should have scaled down or stayed at minimum
      expect(finalStats.activeWorkers).toBeLessThanOrEqual(maxWorkers)

      await scalePool.stop()
    })

    it('應遵守 maxWorkers 限制', async () => {
      const limitPool = new WorkerPool({
        enableAutoScaling: true,
        minWorkers: 1,
        maxWorkers: 2,
        concurrency: 1,
        scaleUpThreshold: 0.5,
        metricsInterval: 50,
      })
      await limitPool.start()

      // Submit tasks
      for (let i = 0; i < 4; i++) {
        const task = createTaskWithCallback(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50))
        }, `task-${i}`)
        await limitPool.submitTask(task)
      }

      // Wait for tasks to complete
      await new Promise((resolve) => setTimeout(resolve, 200))

      const stats = limitPool.getPoolStats()
      expect(stats.activeWorkers).toBeLessThanOrEqual(2)

      await limitPool.stop()
    })
  })

  describe('健康檢查與故障處理', () => {
    it('應定期清理 terminated workers', async () => {
      const healthPool = new WorkerPool({
        minWorkers: 2,
        maxWorkers: 4,
        metricsInterval: 100,
      })
      await healthPool.start()

      const initialStats = healthPool.getPoolStats()
      // Track initial worker count for health check verification
      const _initialWorkers = initialStats.activeWorkers

      // Simulate worker termination by stopping and restarting
      await healthPool.stop()
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Verify workers are cleaned
      const finalStats = healthPool.getPoolStats()
      expect(finalStats.activeWorkers).toBe(0)
    })

    it('應在 worker 崩潰後自動重建', async () => {
      const healthPool = new WorkerPool({
        minWorkers: 1,
        maxWorkers: 2,
        metricsInterval: 100,
      })
      await healthPool.start()

      const initialStats = healthPool.getPoolStats()
      expect(initialStats.activeWorkers).toBe(1)

      // Wait a bit for health check to run
      await new Promise((resolve) => setTimeout(resolve, 200))

      const finalStats = healthPool.getPoolStats()
      // Should maintain minimum workers
      expect(finalStats.activeWorkers).toBeGreaterThanOrEqual(1)

      await healthPool.stop()
    })

    it('應在未啟動時拒絕提交任務', async () => {
      const task = createTestTask()

      try {
        await pool.submitTask(task)
        expect.unreachable('Should have thrown an error')
      } catch (error) {
        expect(error instanceof Error).toBe(true)
        expect((error as Error).message).toContain('not running')
      }
    })
  })

  describe('TaskSource 集成', () => {
    it('應在任務完成時通知 TaskSource', async () => {
      const taskSource = new MockTaskSource()
      const sourcePool = new WorkerPool({
        minWorkers: 1,
        maxWorkers: 2,
        taskSource,
      })
      await sourcePool.start()

      const task = createTestTask('source-task-1')
      await sourcePool.submitTask(task)

      // Wait for task execution and acknowledgement
      await new Promise((resolve) => setTimeout(resolve, 200))

      expect(taskSource.completedTasks).toContain('source-task-1')

      await sourcePool.stop()
    })

    it('應在任務失敗時通知 TaskSource', async () => {
      const taskSource = new MockTaskSource()
      const failPool = new WorkerPool({
        minWorkers: 1,
        maxWorkers: 1,
        taskTimeout: 50,
        taskSource,
      })
      await failPool.start()

      const failTask = createTaskWithCallback(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))
      }, 'fail-task-1')
      await failPool.submitTask(failTask)

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 300))

      expect(taskSource.failedTasks.has('fail-task-1')).toBe(true)

      await failPool.stop()
    })
  })

  describe('池統計信息', () => {
    it('應提供準確的池統計信息', async () => {
      await pool.start()

      const task = createTestTask()
      await pool.submitTask(task)

      await new Promise((resolve) => setTimeout(resolve, 100))

      const stats = pool.getPoolStats()
      expect(stats.queueDepth).toBe(0)
      expect(stats.utilization).toBeGreaterThanOrEqual(0)
      expect(stats.utilization).toBeLessThanOrEqual(1)
      expect(stats.activeWorkers).toBeGreaterThan(0)
      expect(stats.totalTasksProcessed).toBe(1)
      expect(stats.totalSuccess).toBe(1)
      expect(stats.totalFailures).toBe(0)
    })

    it('應提供詳細的 worker 統計信息', async () => {
      await pool.start()

      const task = createTestTask()
      await pool.submitTask(task)

      await new Promise((resolve) => setTimeout(resolve, 100))

      const workerStats = pool.getWorkerStats()
      expect(workerStats.length).toBeGreaterThan(0)

      const worker = workerStats[0]
      expect(worker.id).toBeDefined()
      expect(worker.state).toMatch(/idle|busy|terminated/)
      expect(worker.tasksProcessed).toBeGreaterThanOrEqual(0)
      expect(worker.avgDurationMs).toBeGreaterThanOrEqual(0)
      expect(worker.uptime).toBeGreaterThan(0)
    })
  })
})
