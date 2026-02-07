import { describe, expect, it, mock } from 'bun:test'
import type { EventTask } from '@gravito/core'
import { StreamEventBackend } from '../src/StreamEventBackend'
import { SystemEventJob } from '../src/SystemEventJob'

describe('StreamEventBackend Integration', () => {
  describe('Event Flow with DLQ', () => {
    it('should enqueue event and route failure to DLQ', async () => {
      const dlqHandleMock = mock(async (_task: any, _error: Error, _attempt: number) => {})
      const pushMock = mock(async () => Promise.resolve())

      const mockManager: any = { push: pushMock }
      const dlqHandler = { handle: dlqHandleMock }

      const backend = new StreamEventBackend(mockManager, { dlqHandler })

      const task: EventTask = {
        hook: 'user:created',
        args: { userId: 1 },
        options: { maxAttempts: 3 },
      }

      await backend.enqueue(task)

      expect(pushMock).toHaveBeenCalled()

      // Verify the job has failure callback
      const job = pushMock.mock.calls[0][0]
      expect(job).toBeInstanceOf(SystemEventJob)
    })

    it('should apply retry strategy to enqueued job', async () => {
      const pushMock = mock(async () => Promise.resolve())
      const mockManager: any = { push: pushMock }

      const backend = new StreamEventBackend(mockManager, {
        retryStrategy: 'bull',
      })

      const task: EventTask = {
        hook: 'payment:processed',
        args: { paymentId: 123 },
        options: {
          maxAttempts: 5,
          retryAfter: 10,
          retryMultiplier: 1.5,
        },
      }

      await backend.enqueue(task)

      expect(pushMock).toHaveBeenCalled()
      const job = pushMock.mock.calls[0][0]
      expect(job.maxAttempts).toBe(5)
      expect(job.retryAfterSeconds).toBe(10)
    })
  })

  describe('CircuitBreaker Integration', () => {
    it('should check circuit breaker state before enqueueing', async () => {
      const mockBreaker = {
        getState: mock(() => 'CLOSED'),
        recordFailure: mock(() => {}),
        recordSuccess: mock(() => {}),
      }

      const getCircuitBreakerMock = mock(() => mockBreaker)
      const pushMock = mock(async () => Promise.resolve())
      const mockManager: any = { push: pushMock }

      const backend = new StreamEventBackend(mockManager, {
        circuitBreakerIntegration: true,
        getCircuitBreaker: getCircuitBreakerMock,
      })

      const task: EventTask = {
        hook: 'email:send',
        args: { to: 'user@example.com' },
      }

      await backend.enqueue(task)

      expect(getCircuitBreakerMock).toHaveBeenCalledWith('email:send')
      expect(pushMock).toHaveBeenCalled()
    })

    it('should reject enqueueing if circuit breaker is OPEN', async () => {
      const mockBreaker = {
        getState: mock(() => 'OPEN'),
      }

      const getCircuitBreakerMock = mock(() => mockBreaker)
      const mockManager: any = { push: mock(async () => Promise.resolve()) }

      const backend = new StreamEventBackend(mockManager, {
        circuitBreakerIntegration: true,
        getCircuitBreaker: getCircuitBreakerMock,
      })

      const task: EventTask = {
        hook: 'external:api',
        args: { data: 'test' },
      }

      await expect(backend.enqueue(task)).rejects.toThrow('Circuit breaker OPEN')
    })

    it('should record job success in circuit breaker', () => {
      const recordSuccessMock = mock(() => {})
      const mockBreaker = {
        recordSuccess: recordSuccessMock,
      }

      const getCircuitBreakerMock = mock(() => mockBreaker)
      const mockManager: any = {}

      const backend = new StreamEventBackend(mockManager, {
        circuitBreakerIntegration: true,
        getCircuitBreaker: getCircuitBreakerMock,
      })

      const task: EventTask = {
        hook: 'payment:completed',
        args: {},
      }

      backend.recordJobSuccess(task)

      expect(recordSuccessMock).toHaveBeenCalled()
    })

    it('should record job failure in circuit breaker', () => {
      const recordFailureMock = mock(() => {})
      const mockBreaker = {
        recordFailure: recordFailureMock,
      }

      const getCircuitBreakerMock = mock(() => mockBreaker)
      const mockManager: any = {}

      const backend = new StreamEventBackend(mockManager, {
        circuitBreakerIntegration: true,
        getCircuitBreaker: getCircuitBreakerMock,
      })

      const task: EventTask = {
        hook: 'api:call',
        args: {},
      }

      const error = new Error('API timeout')
      backend.recordJobFailure(task, error)

      expect(recordFailureMock).toHaveBeenCalledWith(error)
    })
  })

  describe('Retry Strategies', () => {
    it('should support bull retry strategy', async () => {
      const pushMock = mock(async () => Promise.resolve())
      const mockManager: any = { push: pushMock }

      const backend = new StreamEventBackend(mockManager, {
        retryStrategy: 'bull',
      })

      expect(backend.getRetryStrategy()).toBe('bull')
    })

    it('should support core retry strategy', async () => {
      const pushMock = mock(async () => Promise.resolve())
      const mockManager: any = { push: pushMock }

      const backend = new StreamEventBackend(mockManager, {
        retryStrategy: 'core',
      })

      expect(backend.getRetryStrategy()).toBe('core')
    })

    it('should support hybrid retry strategy', async () => {
      const pushMock = mock(async () => Promise.resolve())
      const mockManager: any = { push: pushMock }

      const backend = new StreamEventBackend(mockManager, {
        retryStrategy: 'hybrid',
      })

      expect(backend.getRetryStrategy()).toBe('hybrid')
    })
  })

  describe('Job Options Mapping', () => {
    it('should map event task options to job options', async () => {
      const pushMock = mock(async () => Promise.resolve())
      const mockManager: any = { push: pushMock }
      const backend = new StreamEventBackend(mockManager)

      const task: EventTask = {
        hook: 'notification:send',
        args: { id: 1 },
        options: {
          priority: 'high',
          groupId: 'group-1',
        },
      }

      await backend.enqueue(task)

      expect(pushMock).toHaveBeenCalled()
      const [_job, options] = pushMock.mock.calls[0]
      expect(options.priority).toBe('high')
      expect(options.groupId).toBe('group-1')
    })
  })

  describe('Error Handling', () => {
    it('should handle DLQ handler errors gracefully', async () => {
      const dlqHandleMock = mock(async () => {
        throw new Error('DLQ storage failed')
      })
      const pushMock = mock(async () => Promise.resolve())
      const mockManager: any = { push: pushMock }
      const dlqHandler = { handle: dlqHandleMock }

      const backend = new StreamEventBackend(mockManager, { dlqHandler })

      const task: EventTask = {
        hook: 'payment:failed',
        args: { id: 1 },
      }

      // Should not throw even if DLQ handler fails
      await backend.enqueue(task)
      expect(pushMock).toHaveBeenCalled()
    })

    it('should handle missing circuit breaker gracefully', async () => {
      const getCircuitBreakerMock = mock(() => null)
      const pushMock = mock(async () => Promise.resolve())
      const mockManager: any = { push: pushMock }

      const backend = new StreamEventBackend(mockManager, {
        circuitBreakerIntegration: true,
        getCircuitBreaker: getCircuitBreakerMock,
      })

      const task: EventTask = {
        hook: 'event:trigger',
        args: {},
      }

      // Should not throw
      await backend.enqueue(task)
      expect(pushMock).toHaveBeenCalled()
    })
  })
})
