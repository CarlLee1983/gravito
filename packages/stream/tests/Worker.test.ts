import { describe, expect, it, mock, spyOn } from 'bun:test'
import { Job } from '../src/Job'
import { Worker } from '../src/Worker'

class SuccessJob extends Job {
  async handle(): Promise<void> {}
}

class FailingJob extends Job {
  async handle(): Promise<void> {
    throw new Error('job failed')
  }
}

class SlowJob extends Job {
  async handle(): Promise<void> {
    return new Promise(() => {})
  }
}

describe('Worker', () => {
  describe('process (standard mode)', () => {
    it('should process a successful job', async () => {
      const worker = new Worker()
      await worker.process(new SuccessJob())
    })

    it('should initialize attempts if not set', async () => {
      const worker = new Worker()
      const job = new SuccessJob()
      expect(job.attempts).toBeUndefined()
      await worker.process(job)
      expect(job.attempts).toBe(1)
    })

    it('should not overwrite existing attempts', async () => {
      const worker = new Worker()
      const job = new SuccessJob()
      job.attempts = 5
      await worker.process(job)
      expect(job.attempts).toBe(5)
    })

    it('should throw error from failed job', async () => {
      const worker = new Worker({ maxAttempts: 5 })
      const job = new FailingJob()
      job.attempts = 1
      await expect(worker.process(job)).rejects.toThrow('job failed')
    })

    it('should call handleFailure when max attempts reached', async () => {
      let failedCalled = false

      class CustomFailJob extends Job {
        async handle(): Promise<void> {
          throw new Error('boom')
        }
        async failed(_err: Error): Promise<void> {
          failedCalled = true
        }
      }

      const worker = new Worker({ maxAttempts: 1 })
      await expect(worker.process(new CustomFailJob())).rejects.toThrow('boom')
      expect(failedCalled).toBe(true)
    })

    it('should call onFailed callback when max attempts reached', async () => {
      let onFailedJob: any = null
      let onFailedError: any = null

      const worker = new Worker({
        maxAttempts: 1,
        onFailed: async (job, error) => {
          onFailedJob = job
          onFailedError = error
        },
      })

      const job = new FailingJob()
      await expect(worker.process(job)).rejects.toThrow('job failed')
      expect(onFailedJob).toBe(job)
      expect(onFailedError.message).toBe('job failed')
    })

    it('should handle errors in failed() handler gracefully', async () => {
      const consoleSpy = spyOn(console, 'error').mockImplementation(() => {})

      class ErrorInFailedJob extends Job {
        async handle(): Promise<void> {
          throw new Error('boom')
        }
        async failed(): Promise<void> {
          throw new Error('failed handler error')
        }
      }

      const worker = new Worker({ maxAttempts: 1 })
      await expect(worker.process(new ErrorInFailedJob())).rejects.toThrow('boom')
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should handle errors in onFailed callback gracefully', async () => {
      const consoleSpy = spyOn(console, 'error').mockImplementation(() => {})

      const worker = new Worker({
        maxAttempts: 1,
        onFailed: async () => {
          throw new Error('callback error')
        },
      })

      await expect(worker.process(new FailingJob())).rejects.toThrow('job failed')
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should not call failure handlers when below max attempts', async () => {
      let failedCalled = false

      class TrackFailJob extends Job {
        async handle(): Promise<void> {
          throw new Error('fail')
        }
        async failed(): Promise<void> {
          failedCalled = true
        }
      }

      const worker = new Worker({ maxAttempts: 5 })
      const job = new TrackFailJob()
      job.attempts = 1
      await expect(worker.process(job)).rejects.toThrow('fail')
      expect(failedCalled).toBe(false)
    })

    it('should use job maxAttempts when set', async () => {
      let failedCalled = false

      class JobWithMax extends Job {
        maxAttempts = 2
        async handle(): Promise<void> {
          throw new Error('fail')
        }
        async failed(): Promise<void> {
          failedCalled = true
        }
      }

      const worker = new Worker({ maxAttempts: 100 })
      const job = new JobWithMax()
      job.attempts = 2
      await expect(worker.process(job)).rejects.toThrow('fail')
      expect(failedCalled).toBe(true)
    })

    it('should timeout when job exceeds timeout', async () => {
      const worker = new Worker({ timeout: 0.001 })
      await expect(worker.process(new SlowJob())).rejects.toThrow('Job timeout')
    })

    it('should work without timeout', async () => {
      const worker = new Worker({ timeout: undefined })
      await worker.process(new SuccessJob())
    })

    it('should handle non-Error thrown values', async () => {
      class StringThrowJob extends Job {
        async handle(): Promise<void> {
          throw 'string error'
        }
      }

      const worker = new Worker({ maxAttempts: 1 })
      await expect(worker.process(new StringThrowJob())).rejects.toThrow('string error')
    })
  })

  describe('process (sandboxed mode)', () => {
    it('should throw when sandboxed worker is missing', async () => {
      const worker = new Worker()
      await expect((worker as any).processSandboxed(new SuccessJob())).rejects.toThrow(
        'Sandboxed worker not initialized'
      )
    })

    it('should enter sandboxed path when both sandboxed and worker exist', async () => {
      const worker = new Worker({ sandboxed: false })
      const mockExecute = mock(() => Promise.resolve())
      ;(worker as any).options.sandboxed = true
      ;(worker as any).sandboxedWorker = { execute: mockExecute }

      const job = new SuccessJob()
      job.id = 'test-sandboxed'
      await worker.process(job)
      expect(mockExecute).toHaveBeenCalled()
    })
  })

  describe('serializeJob', () => {
    it('should serialize job to SerializedJob format', () => {
      const worker = new Worker()
      const job = new SuccessJob()
      job.id = 'test-123'
      job.attempts = 2
      job.maxAttempts = 5
      job.delaySeconds = 30
      job.groupId = 'group-1'
      job.priority = 'high'
      job.retryAfterSeconds = 10
      job.retryMultiplier = 3

      const serialized = (worker as any).serializeJob(job)
      expect(serialized.id).toBe('test-123')
      expect(serialized.type).toBe('json')
      expect(serialized.attempts).toBe(2)
      expect(serialized.maxAttempts).toBe(5)
      expect(serialized.delaySeconds).toBe(30)
      expect(serialized.groupId).toBe('group-1')
      expect(serialized.priority).toBe('high')
      expect(serialized.retryAfterSeconds).toBe(10)
      expect(serialized.retryMultiplier).toBe(3)
    })

    it('should generate id when not set', () => {
      const worker = new Worker()
      const job = new SuccessJob()
      const serialized = (worker as any).serializeJob(job)
      expect(serialized.id).toContain('job-')
    })
  })

  describe('terminate', () => {
    it('should be a no-op when not sandboxed', async () => {
      const worker = new Worker()
      await worker.terminate()
    })
  })
})
