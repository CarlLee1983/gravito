import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { CleanQueueExecutor } from '../executors/CleanQueueExecutor'
import { PauseQueueExecutor } from '../executors/PauseQueueExecutor'
import { PrioritizeJobExecutor } from '../executors/PrioritizeJobExecutor'
import { ResumeQueueExecutor } from '../executors/ResumeQueueExecutor'
import type { QuasarCommand } from '../types'

describe('NewExecutors', () => {
  let mockRedis: any

  beforeEach(() => {
    mockRedis = {
      set: mock(() => Promise.resolve('OK')),
      del: mock(() => Promise.resolve(1)),
      publish: mock(() => Promise.resolve(1)),
      zremrangebyrank: mock(() => Promise.resolve(10)),
      exists: mock(() => Promise.resolve(1)),
      hset: mock(() => Promise.resolve(1)),
    }
  })

  describe('PauseQueueExecutor', () => {
    it('should pause a BullMQ queue', async () => {
      const executor = new PauseQueueExecutor()
      const command: QuasarCommand = {
        id: 'cmd-1',
        type: 'PAUSE_QUEUE',
        targetNodeId: 'node-1',
        payload: { queue: 'test-q', driver: 'bullmq' },
        timestamp: Date.now(),
        issuer: 'test',
      }

      const result = await executor.execute(command, mockRedis)
      expect(result.status).toBe('success')
      expect(mockRedis.set).toHaveBeenCalledWith('bull:test-q:meta:paused', '1')
      expect(mockRedis.publish).toHaveBeenCalledWith('bull:test-q:meta', 'paused')
    })
  })

  describe('ResumeQueueExecutor', () => {
    it('should resume a BullMQ queue', async () => {
      const executor = new ResumeQueueExecutor()
      const command: QuasarCommand = {
        id: 'cmd-2',
        type: 'RESUME_QUEUE',
        targetNodeId: 'node-1',
        payload: { queue: 'test-q', driver: 'bullmq' },
        timestamp: Date.now(),
        issuer: 'test',
      }

      const result = await executor.execute(command, mockRedis)
      expect(result.status).toBe('success')
      expect(mockRedis.del).toHaveBeenCalledWith('bull:test-q:meta:paused')
      expect(mockRedis.publish).toHaveBeenCalledWith('bull:test-q:meta', 'resumed')
    })
  })

  describe('CleanQueueExecutor', () => {
    it('should clean completed jobs', async () => {
      const executor = new CleanQueueExecutor()
      const command: QuasarCommand = {
        id: 'cmd-3',
        type: 'CLEAN_QUEUE',
        targetNodeId: 'node-1',
        payload: { queue: 'test-q', driver: 'bullmq', status: 'completed', limit: 100 },
        timestamp: Date.now(),
        issuer: 'test',
      }

      const result = await executor.execute(command, mockRedis)
      expect(result.status).toBe('success')
      expect(mockRedis.zremrangebyrank).toHaveBeenCalledWith('bull:test-q:completed', 0, 99)
    })
  })

  describe('PrioritizeJobExecutor', () => {
    it('should prioritize a job', async () => {
      const executor = new PrioritizeJobExecutor()
      const command: QuasarCommand = {
        id: 'cmd-4',
        type: 'PRIORITIZE_JOB',
        targetNodeId: 'node-1',
        payload: { queue: 'test-q', driver: 'bullmq', jobId: 'job-1', priority: 1 },
        timestamp: Date.now(),
        issuer: 'test',
      }

      const result = await executor.execute(command, mockRedis)
      expect(result.status).toBe('success')
      expect(mockRedis.exists).toHaveBeenCalledWith('bull:test-q:job-1')
      expect(mockRedis.hset).toHaveBeenCalledWith('bull:test-q:job-1', 'priority', 1)
    })
  })
})
