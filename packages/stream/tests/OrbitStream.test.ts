import { describe, expect, it, mock } from 'bun:test'
import { OrbitStream } from '../src/OrbitStream'

describe('OrbitStream', () => {
  describe('configure', () => {
    it('should create an OrbitStream instance', () => {
      const orbit = OrbitStream.configure({ default: 'memory' })
      expect(orbit).toBeInstanceOf(OrbitStream)
    })
  })

  describe('getQueueManager', () => {
    it('should return undefined before install', () => {
      const orbit = new OrbitStream()
      expect(orbit.getQueueManager()).toBeUndefined()
    })
  })

  describe('install', () => {
    it('should initialize QueueManager and register in container', () => {
      const orbit = new OrbitStream({ default: 'memory' })
      const mockCore: any = {
        container: { instance: mock(() => {}), make: mock(() => null) },
        adapter: { use: mock(() => {}) },
        logger: { info: mock(() => {}) },
        hooks: { setBackend: mock(() => {}) },
      }

      orbit.install(mockCore)

      expect(orbit.getQueueManager()).toBeDefined()
      expect(mockCore.container.instance).toHaveBeenCalledWith('queue', expect.anything())
      expect(mockCore.hooks.setBackend).toHaveBeenCalled()
    })

    it('should register dashboard when enabled', () => {
      const orbit = new OrbitStream({ default: 'memory', dashboard: true })
      const mockCore: any = {
        container: { instance: mock(() => {}), make: mock(() => null) },
        adapter: {
          use: mock(() => {}),
          get: mock(() => {}),
          post: mock(() => {}),
        },
        logger: { info: mock(() => {}) },
        hooks: { setBackend: mock(() => {}) },
      }

      orbit.install(mockCore)
      // Dashboard registered at default /_flux path
      expect(mockCore.logger.info).toHaveBeenCalled()
    })

    it('should register dashboard with custom path', () => {
      const orbit = new OrbitStream({ default: 'memory', dashboard: { path: '/admin/queue' } })
      const mockCore: any = {
        container: { instance: mock(() => {}), make: mock(() => null) },
        adapter: {
          use: mock(() => {}),
          get: mock(() => {}),
          post: mock(() => {}),
        },
        logger: { info: mock(() => {}) },
        hooks: { setBackend: mock(() => {}) },
      }

      orbit.install(mockCore)
      expect(mockCore.logger.info).toHaveBeenCalled()
    })
  })

  describe('startWorker', () => {
    it('should throw when QueueManager not initialized', () => {
      const orbit = new OrbitStream()
      expect(() => orbit.startWorker({ queues: ['default'] })).toThrow(
        'QueueManager not initialized'
      )
    })

    it('should throw when worker is already running', () => {
      const orbit = new OrbitStream({ default: 'memory' })
      const mockCore: any = {
        container: { instance: mock(() => {}), make: mock(() => null) },
        adapter: { use: mock(() => {}) },
        logger: { info: mock(() => {}) },
        hooks: { setBackend: mock(() => {}) },
      }

      orbit.install(mockCore)

      // Mock consumer as already running
      ;(orbit as any).consumer = { isRunning: () => true }
      expect(() => orbit.startWorker({ queues: ['default'] })).toThrow('already running')
    })
  })

  describe('middleware injection', () => {
    it('should inject queue manager into context via middleware', async () => {
      const orbit = new OrbitStream({ default: 'memory' })
      let capturedMiddleware: Function | null = null

      const mockCore: any = {
        container: { instance: mock(() => {}), make: mock(() => null) },
        adapter: {
          use: mock((_path: string, handler: Function) => {
            capturedMiddleware = handler
          }),
        },
        logger: { info: mock(() => {}) },
        hooks: { setBackend: mock(() => {}) },
      }

      orbit.install(mockCore)
      expect(capturedMiddleware).not.toBeNull()

      // Execute the middleware
      const mockContext: any = {
        get: mock(() => null),
        set: mock(() => {}),
      }
      const mockNext = mock(() => Promise.resolve())

      await capturedMiddleware?.(mockContext, mockNext)

      expect(mockContext.set).toHaveBeenCalledWith('queue', expect.anything())
      expect(mockNext).toHaveBeenCalled()
    })

    it('should resolve db service for database connections', async () => {
      // Create with memory only, then manually add database connection to options
      const orbit = new OrbitStream({ default: 'memory' })
      let capturedMiddleware: Function | null = null

      const mockCore: any = {
        container: { instance: mock(() => {}), make: mock(() => null) },
        adapter: {
          use: mock((_path: string, handler: Function) => {
            capturedMiddleware = handler
          }),
        },
        logger: { info: mock(() => {}) },
        hooks: { setBackend: mock(() => {}) },
      }

      orbit.install(mockCore)

      // Manually add database connection config AFTER install (bypasses constructor validation)
      ;(orbit as any).options.connections = {
        db: { driver: 'database' },
      }

      // Mock context with db service available
      const mockDbService = { query: mock(() => {}) }
      const mockContext: any = {
        get: mock((key: string) => (key === 'db' ? mockDbService : null)),
        set: mock(() => {}),
      }
      const mockNext = mock(() => Promise.resolve())

      await capturedMiddleware?.(mockContext, mockNext)
      expect(mockContext.set).toHaveBeenCalledWith('queue', expect.anything())
    })

    it('should handle missing db service gracefully', async () => {
      const orbit = new OrbitStream({ default: 'memory' })
      let capturedMiddleware: Function | null = null

      const mockCore: any = {
        container: { instance: mock(() => {}), make: mock(() => null) },
        adapter: {
          use: mock((_path: string, handler: Function) => {
            capturedMiddleware = handler
          }),
        },
        logger: { info: mock(() => {}) },
        hooks: { setBackend: mock(() => {}) },
      }

      orbit.install(mockCore)

      // Manually add database connection config
      ;(orbit as any).options.connections = {
        db: { driver: 'database' },
      }

      // Mock context where c.get('db') throws
      const mockContext: any = {
        get: mock(() => {
          throw new Error('db not available')
        }),
        set: mock(() => {}),
      }
      const mockNext = mock(() => Promise.resolve())

      // Should not throw
      await capturedMiddleware?.(mockContext, mockNext)
      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('startWorker (with initialized manager)', () => {
    it('should create consumer and start it', async () => {
      const orbit = new OrbitStream({ default: 'default' })
      const mockCore: any = {
        container: { instance: mock(() => {}), make: mock(() => null) },
        adapter: { use: mock(() => {}) },
        logger: { info: mock(() => {}) },
        hooks: { setBackend: mock(() => {}) },
      }

      orbit.install(mockCore)
      orbit.startWorker({ queues: ['default'], keepAlive: false })

      // Consumer should be created
      expect((orbit as any).consumer).toBeDefined()

      // Clean up
      await orbit.stopWorker()
    })
  })

  describe('stopWorker', () => {
    it('should be a no-op when no consumer', async () => {
      const orbit = new OrbitStream()
      await orbit.stopWorker()
    })

    it('should stop the consumer', async () => {
      const orbit = new OrbitStream()
      const mockStop = mock(() => Promise.resolve())
      ;(orbit as any).consumer = { stop: mockStop }

      await orbit.stopWorker()
      expect(mockStop).toHaveBeenCalled()
    })
  })
})
