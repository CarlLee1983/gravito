import { describe, expect, it, mock } from 'bun:test'
import { StreamEventBackend } from '../src/StreamEventBackend'

describe('StreamEventBackend', () => {
  describe('enqueue', () => {
    it('should create SystemEventJob and push to QueueManager', async () => {
      const pushMock = mock(() => Promise.resolve())
      const mockManager: any = { push: pushMock }
      const backend = new StreamEventBackend(mockManager)

      await backend.enqueue({
        hook: 'user:created',
        args: { userId: 1 },
        options: {
          queue: 'events',
          priority: 'high',
          delay: 30,
          connection: 'redis',
          retryAfter: 5,
          retryMultiplier: 2,
        },
      })

      expect(pushMock).toHaveBeenCalled()
      const pushedJob = pushMock.mock.calls[0][0]
      expect(pushedJob.hook).toBe('user:created')
      expect(pushedJob.args).toEqual({ userId: 1 })
      expect(pushedJob.queueName).toBe('events')
      expect(pushedJob.priority).toBe('high')
      expect(pushedJob.delaySeconds).toBe(30)
      expect(pushedJob.connectionName).toBe('redis')
    })

    it('should handle minimal event task', async () => {
      const pushMock = mock(() => Promise.resolve())
      const mockManager: any = { push: pushMock }
      const backend = new StreamEventBackend(mockManager)

      await backend.enqueue({ hook: 'test', args: null, options: {} })
      expect(pushMock).toHaveBeenCalled()
    })
  })

  describe('Configuration', () => {
    it('should initialize with default config', () => {
      const mockManager: any = { push: mock(() => Promise.resolve()) }
      const backend = new StreamEventBackend(mockManager)

      expect(backend.getRetryStrategy()).toBe('bull')
      expect(backend.isCircuitBreakerEnabled()).toBe(false)
      expect(backend.getDLQHandler()).toBeUndefined()
    })

    it('should initialize with custom retry strategy', () => {
      const mockManager: any = { push: mock(() => Promise.resolve()) }
      const backend = new StreamEventBackend(mockManager, {
        retryStrategy: 'core',
      })

      expect(backend.getRetryStrategy()).toBe('core')
    })

    it('should initialize with CircuitBreaker integration enabled', () => {
      const mockManager: any = { push: mock(() => Promise.resolve()) }
      const backend = new StreamEventBackend(mockManager, {
        circuitBreakerIntegration: true,
      })

      expect(backend.isCircuitBreakerEnabled()).toBe(true)
    })

    it('should initialize with DLQ handler', () => {
      const dlqHandler = {
        handle: mock(async (_event: any, _error: Error) => {}),
      }
      const mockManager: any = { push: mock(() => Promise.resolve()) }
      const backend = new StreamEventBackend(mockManager, {
        dlqHandler,
      })

      expect(backend.getDLQHandler()).toBe(dlqHandler)
    })

    it('should support hybrid retry strategy', () => {
      const mockManager: any = { push: mock(() => Promise.resolve()) }
      const backend = new StreamEventBackend(mockManager, {
        retryStrategy: 'hybrid',
      })

      expect(backend.getRetryStrategy()).toBe('hybrid')
    })
  })
})
