import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { DeleteJobExecutor } from '../executors/DeleteJobExecutor'
import type { QuasarCommand } from '../types'

describe('DeleteJobExecutor', () => {
  let executor: DeleteJobExecutor
  let mockRedis: any

  beforeEach(() => {
    executor = new DeleteJobExecutor()
    mockRedis = {
      lrem: mock(() => Promise.resolve(0)),
      lrange: mock(() => Promise.resolve([])),
      zrem: mock(() => Promise.resolve(0)),
    }
  })

  it('should have correct supportedType', () => {
    expect(executor.supportedType).toBe('DELETE_JOB')
  })

  it('should fail when queue is missing', async () => {
    const command: QuasarCommand = {
      id: 'test-cmd-1',
      type: 'DELETE_JOB',
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
      type: 'DELETE_JOB',
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

  it('should successfully delete a job from failed queue', async () => {
    mockRedis.lrem = mock(() => Promise.resolve(1)) // Found and removed

    const command: QuasarCommand = {
      id: 'test-cmd-3',
      type: 'DELETE_JOB',
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
    expect(result.message).toContain('deleted')
    expect(mockRedis.lrem).toHaveBeenCalled()
  })

  it('should try partial match when exact match fails', async () => {
    const jobPayload = JSON.stringify({ id: 'job-123', data: { orderId: 1 } })

    // First call: exact match fails
    mockRedis.lrem = mock(() => Promise.resolve(0))
    // Second call: lrange returns jobs containing the key
    mockRedis.lrange = mock(() => Promise.resolve([jobPayload]))

    const command: QuasarCommand = {
      id: 'test-cmd-4',
      type: 'DELETE_JOB',
      targetNodeId: 'node-1',
      payload: {
        queue: 'orders',
        jobKey: 'job-123',
        driver: 'redis',
      },
      timestamp: Date.now(),
      issuer: 'zenith',
    }

    // Override lrem to succeed on second call (partial match)
    let callCount = 0
    mockRedis.lrem = mock(() => {
      callCount++
      // First 3 calls are for exact match in different locations, all fail
      // After that, we find via partial match
      return Promise.resolve(callCount > 3 ? 1 : 0)
    })

    const result = await executor.execute(command, mockRedis)
    expect(result.status).toBe('success')
  })

  it('should fail when job not found anywhere', async () => {
    mockRedis.lrem = mock(() => Promise.resolve(0))
    mockRedis.lrange = mock(() => Promise.resolve([]))

    const command: QuasarCommand = {
      id: 'test-cmd-5',
      type: 'DELETE_JOB',
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
    expect(result.message).toContain('not found')
  })

  it('should delete Laravel job from waiting queue', async () => {
    mockRedis.lrem = mock(() => Promise.resolve(1))

    const command: QuasarCommand = {
      id: 'test-cmd-6',
      type: 'DELETE_JOB',
      targetNodeId: 'node-1',
      payload: {
        queue: 'default',
        jobKey: '{"job":"App\\\\Jobs\\\\SendEmail"}',
        driver: 'laravel',
      },
      timestamp: Date.now(),
      issuer: 'zenith',
    }

    const result = await executor.execute(command, mockRedis)
    expect(result.status).toBe('success')
    expect(mockRedis.lrem).toHaveBeenCalledWith(
      'queues:default',
      1,
      '{"job":"App\\\\Jobs\\\\SendEmail"}'
    )
  })

  it('should delete Laravel job from reserved ZSet', async () => {
    // lrem fails (not in waiting)
    mockRedis.lrem = mock(() => Promise.resolve(0))
    // zrem succeeds (found in reserved)
    mockRedis.zrem = mock(() => Promise.resolve(1))
    mockRedis.lrange = mock(() => Promise.resolve([]))

    const command: QuasarCommand = {
      id: 'test-cmd-7',
      type: 'DELETE_JOB',
      targetNodeId: 'node-1',
      payload: {
        queue: 'default',
        jobKey: 'job-in-reserved',
        driver: 'laravel',
      },
      timestamp: Date.now(),
      issuer: 'zenith',
    }

    const result = await executor.execute(command, mockRedis)
    expect(result.status).toBe('success')
    expect(mockRedis.zrem).toHaveBeenCalled()
  })
})
