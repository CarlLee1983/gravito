import { describe, expect, it } from 'bun:test'
import { Job } from '../src/Job'

class TestJob extends Job {
  async handle(): Promise<void> {}
}

describe('Job', () => {
  describe('onQueue', () => {
    it('should set queueName and return this', () => {
      const job = new TestJob()
      const result = job.onQueue('emails')
      expect(job.queueName).toBe('emails')
      expect(result).toBe(job)
    })
  })

  describe('onConnection', () => {
    it('should set connectionName and return this', () => {
      const job = new TestJob()
      const result = job.onConnection('redis')
      expect(job.connectionName).toBe('redis')
      expect(result).toBe(job)
    })
  })

  describe('withPriority', () => {
    it('should set priority with string', () => {
      const job = new TestJob()
      const result = job.withPriority('high')
      expect(job.priority).toBe('high')
      expect(result).toBe(job)
    })

    it('should set priority with number', () => {
      const job = new TestJob()
      job.withPriority(10)
      expect(job.priority).toBe(10)
    })
  })

  describe('delay', () => {
    it('should set delaySeconds', () => {
      const job = new TestJob()
      const result = job.delay(60)
      expect(job.delaySeconds).toBe(60)
      expect(result).toBe(job)
    })
  })

  describe('backoff', () => {
    it('should set retryAfterSeconds and retryMultiplier', () => {
      const job = new TestJob()
      const result = job.backoff(5, 3)
      expect(job.retryAfterSeconds).toBe(5)
      expect(job.retryMultiplier).toBe(3)
      expect(result).toBe(job)
    })

    it('should default multiplier to 2', () => {
      const job = new TestJob()
      job.backoff(5)
      expect(job.retryMultiplier).toBe(2)
    })
  })

  describe('getRetryDelay', () => {
    it('should calculate exponential backoff', () => {
      const job = new TestJob()
      job.retryAfterSeconds = 2
      job.retryMultiplier = 3

      expect(job.getRetryDelay(1)).toBe(2000) // 2 * 3^0 = 2s
      expect(job.getRetryDelay(2)).toBe(6000) // 2 * 3^1 = 6s
      expect(job.getRetryDelay(3)).toBe(18000) // 2 * 3^2 = 18s
    })

    it('should use defaults when not set', () => {
      const job = new TestJob()
      expect(job.getRetryDelay(1)).toBe(1000) // 1 * 2^0 = 1s
      expect(job.getRetryDelay(2)).toBe(2000) // 1 * 2^1 = 2s
      expect(job.getRetryDelay(3)).toBe(4000) // 1 * 2^2 = 4s
    })

    it('should cap at 1 hour', () => {
      const job = new TestJob()
      job.retryAfterSeconds = 100
      job.retryMultiplier = 10
      // 100 * 10^5 = 10,000,000 > 3600000
      expect(job.getRetryDelay(6)).toBe(3600000)
    })
  })

  describe('failed', () => {
    it('should be a no-op by default', async () => {
      const job = new TestJob()
      await job.failed(new Error('test'))
    })
  })

  describe('chaining', () => {
    it('should support fluent chaining', () => {
      const job = new TestJob()
        .onQueue('emails')
        .onConnection('redis')
        .withPriority('high')
        .delay(60)
        .backoff(5, 3)

      expect(job.queueName).toBe('emails')
      expect(job.connectionName).toBe('redis')
      expect(job.priority).toBe('high')
      expect(job.delaySeconds).toBe(60)
      expect(job.retryAfterSeconds).toBe(5)
      expect(job.retryMultiplier).toBe(3)
    })
  })

  describe('defaults', () => {
    it('should have undefined defaults', () => {
      const job = new TestJob()
      expect(job.id).toBeUndefined()
      expect(job.queueName).toBeUndefined()
      expect(job.connectionName).toBeUndefined()
      expect(job.delaySeconds).toBeUndefined()
      expect(job.attempts).toBeUndefined()
      expect(job.maxAttempts).toBeUndefined()
      expect(job.groupId).toBeUndefined()
      expect(job.priority).toBeUndefined()
      expect(job.retryAfterSeconds).toBeUndefined()
      expect(job.retryMultiplier).toBeUndefined()
    })
  })
})
