import { beforeEach, describe, expect, it } from 'bun:test'
import { CompensationRetryPolicy } from '../src/engine/CompensationRetryPolicy'

describe('CompensationRetryPolicy', () => {
  let policy: CompensationRetryPolicy

  beforeEach(() => {
    policy = new CompensationRetryPolicy({
      maxAttempts: 3,
      initialDelay: 10,
      backoffCoefficient: 2,
      maxDelay: 1000,
      jitter: 0,
    })
  })

  describe('execute', () => {
    it('should succeed on first attempt', async () => {
      let callCount = 0
      const operation = async () => {
        callCount++
        return 'success'
      }

      const result = await policy.execute(operation)

      expect(result.success).toBe(true)
      expect(result.value).toBe('success')
      expect(result.attempts).toBe(1)
      expect(callCount).toBe(1)
    })

    it('should retry on failure and eventually succeed', async () => {
      let callCount = 0
      const operation = async () => {
        callCount++
        if (callCount < 3) {
          throw new Error('Transient failure')
        }
        return 'success'
      }

      const result = await policy.execute(operation)

      expect(result.success).toBe(true)
      expect(result.value).toBe('success')
      expect(result.attempts).toBe(3)
      expect(callCount).toBe(3)
    })

    it('should fail after max attempts', async () => {
      const operation = async () => {
        throw new Error('Permanent failure')
      }

      const result = await policy.execute(operation)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Permanent failure')
      expect(result.attempts).toBe(3)
    })

    it('should track execution duration', async () => {
      const operation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 5))
        return 'done'
      }

      const result = await policy.execute(operation)

      expect(result.duration).toBeGreaterThan(0)
    })

    it('should handle non-Error exceptions', async () => {
      const operation = async () => {
        throw 'string error'
      }

      const result = await policy.execute(operation)

      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error?.message).toBe('string error')
    })
  })

  describe('executeWithPredicate', () => {
    it('should only retry errors matching predicate', async () => {
      let callCount = 0
      const operation = async () => {
        callCount++
        if (callCount === 1) {
          throw new Error('TRANSIENT_ERROR')
        }
        if (callCount === 2) {
          throw new Error('PERMANENT_ERROR')
        }
        return 'success'
      }

      const result = await policy.executeWithPredicate(operation, (err) =>
        err.message.includes('TRANSIENT')
      )

      expect(result.success).toBe(false)
      expect(result.attempts).toBe(2)
      expect(result.error?.message).toBe('PERMANENT_ERROR')
    })

    it('should succeed when retryable errors are retried', async () => {
      let callCount = 0
      const operation = async () => {
        callCount++
        if (callCount < 3) {
          throw new Error('TIMEOUT')
        }
        return 'success'
      }

      const result = await policy.executeWithPredicate(
        operation,
        (err) => err.message === 'TIMEOUT'
      )

      expect(result.success).toBe(true)
      expect(result.attempts).toBe(3)
    })
  })

  describe('retry delay calculation', () => {
    it('should use exponential backoff', async () => {
      const delays: number[] = []
      const startTimes: number[] = []

      const operation = async () => {
        startTimes.push(Date.now())
        throw new Error('retry')
      }

      await policy.execute(operation)

      for (let i = 1; i < startTimes.length; i++) {
        delays.push(startTimes[i] - startTimes[i - 1])
      }

      expect(delays[0]).toBeGreaterThanOrEqual(10)
      expect(delays[1]).toBeGreaterThanOrEqual(20)
    })

    it('should respect max delay cap', async () => {
      const shortPolicy = new CompensationRetryPolicy({
        maxAttempts: 5,
        initialDelay: 100,
        backoffCoefficient: 10,
        maxDelay: 200,
        jitter: 0,
      })

      const startTimes: number[] = []
      const operation = async () => {
        startTimes.push(Date.now())
        throw new Error('retry')
      }

      await shortPolicy.execute(operation)

      for (let i = 2; i < startTimes.length; i++) {
        const delay = startTimes[i] - startTimes[i - 1]
        expect(delay).toBeLessThanOrEqual(250)
      }
    })
  })

  describe('configuration', () => {
    it('should use default configuration', () => {
      const defaultPolicy = new CompensationRetryPolicy()
      const config = defaultPolicy.getConfig()

      expect(config.maxAttempts).toBe(3)
      expect(config.initialDelay).toBe(1000)
      expect(config.backoffCoefficient).toBe(2)
      expect(config.maxDelay).toBe(30000)
      expect(config.jitter).toBe(0.1)
    })

    it('should accept custom configuration', () => {
      const customPolicy = new CompensationRetryPolicy({
        maxAttempts: 5,
        initialDelay: 2000,
        backoffCoefficient: 3,
        maxDelay: 60000,
        jitter: 0.2,
      })

      const config = customPolicy.getConfig()

      expect(config.maxAttempts).toBe(5)
      expect(config.initialDelay).toBe(2000)
      expect(config.backoffCoefficient).toBe(3)
      expect(config.maxDelay).toBe(60000)
      expect(config.jitter).toBe(0.2)
    })

    it('should merge partial configuration with defaults', () => {
      const partialPolicy = new CompensationRetryPolicy({
        maxAttempts: 10,
      })

      const config = partialPolicy.getConfig()

      expect(config.maxAttempts).toBe(10)
      expect(config.initialDelay).toBe(1000)
      expect(config.backoffCoefficient).toBe(2)
    })
  })

  describe('real-world scenarios', () => {
    it('should handle payment refund with transient failures', async () => {
      let attempts = 0
      const paymentGateway = {
        refund: async (_txId: string) => {
          attempts++
          if (attempts < 2) {
            throw new Error('Gateway timeout')
          }
          return { refundId: 'ref-123', status: 'completed' }
        },
      }

      const retryPolicy = new CompensationRetryPolicy({
        maxAttempts: 3,
        initialDelay: 50,
        backoffCoefficient: 2,
        jitter: 0,
      })

      const result = await retryPolicy.execute(() => paymentGateway.refund('tx-456'))

      expect(result.success).toBe(true)
      expect(result.value?.refundId).toBe('ref-123')
      expect(result.attempts).toBe(2)
    })

    it('should handle inventory release with permanent failure', async () => {
      const inventoryService = {
        release: async (_reservationId: string) => {
          throw new Error('Reservation not found')
        },
      }

      const retryPolicy = new CompensationRetryPolicy({
        maxAttempts: 3,
        initialDelay: 10,
      })

      const result = await retryPolicy.execute(() => inventoryService.release('res-789'))

      expect(result.success).toBe(false)
      expect(result.error?.message).toBe('Reservation not found')
      expect(result.attempts).toBe(3)
    })

    it('should handle network errors with selective retry', async () => {
      let callCount = 0
      const apiClient = {
        cancelBooking: async (_bookingId: string) => {
          callCount++
          if (callCount === 1) {
            const err: any = new Error('ECONNREFUSED')
            err.code = 'ECONNREFUSED'
            throw err
          }
          if (callCount === 2) {
            const err: any = new Error('Not authorized')
            err.code = 'UNAUTHORIZED'
            throw err
          }
          return { cancelled: true }
        },
      }

      const retryPolicy = new CompensationRetryPolicy({
        maxAttempts: 5,
        initialDelay: 10,
      })

      const result = await retryPolicy.executeWithPredicate(
        () => apiClient.cancelBooking('book-123'),
        (err: any) => err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT'
      )

      expect(result.success).toBe(false)
      expect(result.attempts).toBe(2)
      expect(result.error?.message).toBe('Not authorized')
    })
  })

  describe('isRetryable', () => {
    it('should return true by default for all errors', () => {
      expect(policy.isRetryable(new Error('Any error'))).toBe(true)
    })

    it('should allow custom retry logic via extension', () => {
      class SelectiveRetryPolicy extends CompensationRetryPolicy {
        isRetryable(error: Error): boolean {
          return error.message.includes('TRANSIENT')
        }
      }

      const selective = new SelectiveRetryPolicy()

      expect(selective.isRetryable(new Error('TRANSIENT failure'))).toBe(true)
      expect(selective.isRetryable(new Error('PERMANENT failure'))).toBe(false)
    })
  })
})
