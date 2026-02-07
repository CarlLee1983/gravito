import { describe, expect, it, mock, spyOn } from 'bun:test'
import { SystemEventJob } from '../src/SystemEventJob'

describe('SystemEventJob', () => {
  it('should store hook and args', () => {
    const job = new SystemEventJob('user:created', { userId: 1 })
    expect(job.hook).toBe('user:created')
    expect(job.args).toEqual({ userId: 1 })
  })

  it('should apply queue option', () => {
    const job = new SystemEventJob('test', null, { queue: 'events' })
    expect(job.queueName).toBe('events')
  })

  it('should apply priority option', () => {
    const job = new SystemEventJob('test', null, { priority: 'high' })
    expect(job.priority).toBe('high')
  })

  it('should apply delay option', () => {
    const job = new SystemEventJob('test', null, { delay: 30 })
    expect(job.delaySeconds).toBe(30)
  })

  it('should apply backoff options', () => {
    const job = new SystemEventJob('test', null, { retryAfter: 5, retryMultiplier: 3 })
    expect(job.retryAfterSeconds).toBe(5)
    expect(job.retryMultiplier).toBe(3)
  })

  it('should apply connection option', () => {
    const job = new SystemEventJob('test', null, { connection: 'redis' })
    expect(job.connectionName).toBe('redis')
  })

  it('should handle empty options', () => {
    const job = new SystemEventJob('test', null, {})
    expect(job.queueName).toBeUndefined()
    expect(job.priority).toBeUndefined()
  })

  it('should handle default options', () => {
    const job = new SystemEventJob('test', null)
    expect(job.options).toEqual({})
  })

  describe('handle', () => {
    it('should call core hooks.doActionSync when core is available', async () => {
      const doActionSyncMock = mock(() => Promise.resolve())
      const mockCore = { hooks: { doActionSync: doActionSyncMock } }

      const coreModule = require('@gravito/core')
      const appSpy = spyOn(coreModule, 'app').mockReturnValue(mockCore)

      const job = new SystemEventJob('user:created', { userId: 1 })
      await job.handle()

      expect(doActionSyncMock).toHaveBeenCalledWith('user:created', { userId: 1 })
      appSpy.mockRestore()
    })

    it('should handle when core is not available', async () => {
      const coreModule = require('@gravito/core')
      const appSpy = spyOn(coreModule, 'app').mockReturnValue(null)

      const job = new SystemEventJob('test', null)
      await job.handle()

      appSpy.mockRestore()
    })

    it('should handle when core has no hooks', async () => {
      const coreModule = require('@gravito/core')
      const appSpy = spyOn(coreModule, 'app').mockReturnValue({ hooks: null })

      const job = new SystemEventJob('test', null)
      await job.handle()

      appSpy.mockRestore()
    })
  })

  describe('failure handling', () => {
    it('should set failure callback', () => {
      const job = new SystemEventJob('test', null)
      const callback = mock(async (_error: Error, _attempt: number) => {})

      const result = job.onFailed(callback)

      expect(result).toBe(job) // Check chaining
    })

    it('should call failure callback when failed is invoked', async () => {
      const job = new SystemEventJob('test', null)
      const callback = mock(async (_error: Error, _attempt: number) => {})

      job.onFailed(callback)
      const error = new Error('Job failed')
      await job.failed(error, 3)

      expect(callback).toHaveBeenCalledWith(error, 3)
    })

    it('should not fail if no failure callback is set', async () => {
      const job = new SystemEventJob('test', null)
      const error = new Error('Job failed')

      await job.failed(error, 1) // Should not throw
    })

    it('should handle callback errors gracefully', async () => {
      const job = new SystemEventJob('test', null)
      const callback = mock(async () => {
        throw new Error('Callback error')
      })

      job.onFailed(callback)
      const error = new Error('Job failed')

      // Should not throw
      await job.failed(error, 1)

      expect(callback).toHaveBeenCalled()
    })
  })
})
