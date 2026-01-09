import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { RetryJobExecutor } from '../executors/RetryJobExecutor'
import type { QuasarCommand } from '../types'

describe('RetryJobExecutor', () => {
  let executor: RetryJobExecutor
  let mockRedis: any

  beforeEach(() => {
    executor = new RetryJobExecutor()
    mockRedis = {
      lrange: mock(() => Promise.resolve([])),
      lrem: mock(() => Promise.resolve(1)),
      rpush: mock(() => Promise.resolve(1)),
      multi: mock(() => ({
        lrem: mock(() => {}),
        rpush: mock(() => {}),
        exec: mock(() => Promise.resolve([])),
      })),
      exists: mock(() => Promise.resolve(1)),
    }
  })

  it('should have correct supportedType', () => {
    expect(executor.supportedType).toBe('RETRY_JOB')
  })

  it('should fail when queue is missing', async () => {
    const command: QuasarCommand = {
      id: 'test-cmd-1',
      type: 'RETRY_JOB',
      targetNodeId: 'node-1',
      payload: {
        queue: '', // Missing queue
        jobKey: 'job-123',
      },
      timestamp: Date.now(),
      issuer: 'zenith',
    }

    const result = await executor.execute(command, mockRedis)
    expect(result.status).toBe('failed')
    expect(result.message).toContain('Missing queue or jobKey')
  })

  it('should fail when jobKey is missing', async () => {
    const command: QuasarCommand = {
      id: 'test-cmd-2',
      type: 'RETRY_JOB',
      targetNodeId: 'node-1',
      payload: {
        queue: 'orders',
        jobKey: '', // Missing jobKey
      },
      timestamp: Date.now(),
      issuer: 'zenith',
    }

    const result = await executor.execute(command, mockRedis)
    expect(result.status).toBe('failed')
    expect(result.message).toContain('Missing queue or jobKey')
  })

  it('should fail when job not found in failed queue', async () => {
    mockRedis.lrange = mock(() => Promise.resolve([]))

    const command: QuasarCommand = {
      id: 'test-cmd-3',
      type: 'RETRY_JOB',
      targetNodeId: 'node-1',
      payload: {
        queue: 'orders',
        jobKey: 'non-existent-job',
        driver: 'redis',
      },
      timestamp: Date.now(),
      issuer: 'zenith',
    }

    const result = await executor.execute(command, mockRedis)
    expect(result.status).toBe('failed')
    expect(result.message).toContain('Job not found')
  })

  it('should successfully retry a Redis job', async () => {
    const jobPayload = JSON.stringify({ id: 'job-123', data: { orderId: 1 } })
    mockRedis.lrange = mock(() => Promise.resolve([jobPayload]))

    const mockPipeline = {
      lrem: mock(() => mockPipeline),
      rpush: mock(() => mockPipeline),
      exec: mock(() =>
        Promise.resolve([
          [null, 1],
          [null, 1],
        ])
      ),
    }
    mockRedis.multi = mock(() => mockPipeline)

    const command: QuasarCommand = {
      id: 'test-cmd-4',
      type: 'RETRY_JOB',
      targetNodeId: 'node-1',
      payload: {
        queue: 'orders',
        jobKey: 'job-123',
        driver: 'redis',
      },
      timestamp: Date.now(),
      issuer: 'zenith',
    }

    const result = await executor.execute(command, mockRedis)
    expect(result.status).toBe('success')
    expect(result.commandId).toBe('test-cmd-4')
    expect(mockPipeline.lrem).toHaveBeenCalled()
    expect(mockPipeline.rpush).toHaveBeenCalled()
  })

  it('should successfully retry a Laravel job', async () => {
    mockRedis.exists = mock(() => Promise.resolve(1))
    mockRedis.rpush = mock(() => Promise.resolve(1))

    const command: QuasarCommand = {
      id: 'test-cmd-5',
      type: 'RETRY_JOB',
      targetNodeId: 'node-1',
      payload: {
        queue: 'default',
        jobKey: '{"job":"App\\\\Jobs\\\\SendEmail","data":{}}',
        driver: 'laravel',
      },
      timestamp: Date.now(),
      issuer: 'zenith',
    }

    const result = await executor.execute(command, mockRedis)
    expect(result.status).toBe('success')
    expect(mockRedis.rpush).toHaveBeenCalledWith(
      'queues:default',
      '{"job":"App\\\\Jobs\\\\SendEmail","data":{}}'
    )
  })
})
