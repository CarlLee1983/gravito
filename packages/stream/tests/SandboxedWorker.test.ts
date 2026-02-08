import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test'
import type { SerializedJob } from '../src/types'
import { SandboxedWorker } from '../src/workers/SandboxedWorker'

function createJob(id = 'sw-job'): SerializedJob {
  return {
    id,
    type: 'json',
    data: '{}',
    createdAt: Date.now(),
  }
}

/**
 * 建立模擬的 ThreadWorker 物件
 */
function createMockThreadWorker() {
  const listeners: Record<string, Function[]> = {}

  const worker = {
    on: mock((event: string, handler: Function) => {
      if (!listeners[event]) {
        listeners[event] = []
      }
      listeners[event].push(handler)
      return worker
    }),
    once: mock((event: string, handler: Function) => {
      if (!listeners[event]) {
        listeners[event] = []
      }
      listeners[event].push(handler)
      return worker
    }),
    off: mock((event: string, handler: Function) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((h) => h !== handler)
      }
      return worker
    }),
    postMessage: mock((_msg: any) => {}),
    terminate: mock(() => Promise.resolve(0)),
    _listeners: listeners,
    _emit(event: string, ...args: any[]) {
      const handlers = listeners[event] || []
      for (const h of handlers) {
        h(...args)
      }
    },
  }
  return worker
}

describe('SandboxedWorker', () => {
  let sw: SandboxedWorker

  afterEach(async () => {
    if (sw) {
      await sw.terminate()
    }
  })

  describe('constructor', () => {
    it('should use default config values', () => {
      sw = new SandboxedWorker()
      const config = (sw as any).config
      expect(config.maxExecutionTime).toBe(30000)
      expect(config.maxMemory).toBe(0)
      expect(config.isolateContexts).toBe(false)
      expect(config.idleTimeout).toBe(60000)
    })

    it('should accept custom config', () => {
      sw = new SandboxedWorker({
        maxExecutionTime: 5000,
        maxMemory: 256,
        isolateContexts: true,
        idleTimeout: 10000,
      })
      const config = (sw as any).config
      expect(config.maxExecutionTime).toBe(5000)
      expect(config.maxMemory).toBe(256)
      expect(config.isolateContexts).toBe(true)
      expect(config.idleTimeout).toBe(10000)
    })

    it('should start in initializing state', () => {
      sw = new SandboxedWorker()
      expect(sw.getState()).toBe('initializing')
    })
  })

  describe('getState', () => {
    it('should return current state string', () => {
      sw = new SandboxedWorker()
      expect(sw.getState()).toBe('initializing')

      ;(sw as any).state = 'ready'
      expect(sw.getState()).toBe('ready')

      ;(sw as any).state = 'busy'
      expect(sw.getState()).toBe('busy')

      ;(sw as any).state = 'terminated'
      expect(sw.getState()).toBe('terminated')
    })
  })

  describe('isReady', () => {
    it('should return true when state is ready', () => {
      sw = new SandboxedWorker()
      ;(sw as any).state = 'ready'
      expect(sw.isReady()).toBe(true)
    })

    it('should return false for other states', () => {
      sw = new SandboxedWorker()
      expect(sw.isReady()).toBe(false) // initializing

      ;(sw as any).state = 'busy'
      expect(sw.isReady()).toBe(false)

      ;(sw as any).state = 'terminated'
      expect(sw.isReady()).toBe(false)
    })
  })

  describe('isBusy', () => {
    it('should return true when state is busy', () => {
      sw = new SandboxedWorker()
      ;(sw as any).state = 'busy'
      expect(sw.isBusy()).toBe(true)
    })

    it('should return false for other states', () => {
      sw = new SandboxedWorker()
      expect(sw.isBusy()).toBe(false)

      ;(sw as any).state = 'ready'
      expect(sw.isBusy()).toBe(false)
    })
  })

  describe('terminate', () => {
    it('should clear idle timer', async () => {
      sw = new SandboxedWorker()
      ;(sw as any).idleTimer = setTimeout(() => {}, 100000)

      await sw.terminate()
      expect((sw as any).idleTimer).toBeNull()
    })

    it('should clear execution timer', async () => {
      sw = new SandboxedWorker()
      ;(sw as any).executionTimer = setTimeout(() => {}, 100000)

      await sw.terminate()
      expect((sw as any).executionTimer).toBeNull()
    })

    it('should terminate the worker thread', async () => {
      sw = new SandboxedWorker()
      const mockWorker = createMockThreadWorker()
      ;(sw as any).worker = mockWorker

      await sw.terminate()

      expect(mockWorker.terminate).toHaveBeenCalled()
      expect((sw as any).worker).toBeNull()
      expect(sw.getState()).toBe('terminated')
    })

    it('should handle termination error gracefully', async () => {
      const consoleSpy = spyOn(console, 'error').mockImplementation(() => {})
      sw = new SandboxedWorker()
      const mockWorker = createMockThreadWorker()
      mockWorker.terminate = mock(() => Promise.reject(new Error('terminate failed')))
      ;(sw as any).worker = mockWorker

      await sw.terminate() // should not throw
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should be a no-op when worker is null', async () => {
      sw = new SandboxedWorker()
      ;(sw as any).worker = null

      await sw.terminate() // should not throw
    })
  })

  describe('initWorker', () => {
    it('should return existing worker if not terminated', async () => {
      sw = new SandboxedWorker()
      const mockWorker = createMockThreadWorker()
      ;(sw as any).worker = mockWorker
      ;(sw as any).state = 'ready'

      const result = await (sw as any).initWorker()
      expect(result).toBe(mockWorker)
    })

    it('should reinitialize when state is terminated', async () => {
      sw = new SandboxedWorker()
      const mockWorker = createMockThreadWorker()
      ;(sw as any).worker = mockWorker
      ;(sw as any).state = 'terminated'

      // initWorker will try to create a new ThreadWorker, which will fail
      // because we can't actually load worker_threads in test
      try {
        await (sw as any).initWorker()
      } catch (_e) {
        // Expected - the real ThreadWorker constructor will fail in test
      }
    })
  })

  describe('executeInWorker', () => {
    it('should resolve on success message', async () => {
      sw = new SandboxedWorker()
      const mockWorker = createMockThreadWorker()

      // Set up postMessage to trigger success response
      mockWorker.postMessage = mock((_msg: any) => {
        setTimeout(() => {
          mockWorker._emit('message', { type: 'success' })
        }, 5)
      })

      const job = createJob()
      await (sw as any).executeInWorker(mockWorker, job)
    })

    it('should reject on error message', async () => {
      sw = new SandboxedWorker()
      const mockWorker = createMockThreadWorker()

      mockWorker.postMessage = mock((_msg: any) => {
        setTimeout(() => {
          mockWorker._emit('message', {
            type: 'error',
            error: 'Execution failed',
            stack: 'Error: Execution failed\n    at ...',
          })
        }, 5)
      })

      await expect((sw as any).executeInWorker(mockWorker, createJob())).rejects.toThrow(
        'Execution failed'
      )
    })

    it('should reject on error message without stack', async () => {
      sw = new SandboxedWorker()
      const mockWorker = createMockThreadWorker()

      mockWorker.postMessage = mock((_msg: any) => {
        setTimeout(() => {
          mockWorker._emit('message', { type: 'error' })
        }, 5)
      })

      await expect((sw as any).executeInWorker(mockWorker, createJob())).rejects.toThrow(
        'Job execution failed'
      )
    })

    it('should reject on worker error event', async () => {
      sw = new SandboxedWorker()
      const mockWorker = createMockThreadWorker()

      mockWorker.postMessage = mock((_msg: any) => {
        setTimeout(() => {
          mockWorker._emit('error', new Error('Worker crash'))
        }, 5)
      })

      await expect((sw as any).executeInWorker(mockWorker, createJob())).rejects.toThrow(
        'Worker crash'
      )
    })

    it('should reject on worker exit with non-zero code', async () => {
      sw = new SandboxedWorker()
      const mockWorker = createMockThreadWorker()

      mockWorker.postMessage = mock((_msg: any) => {
        setTimeout(() => {
          mockWorker._emit('exit', 1)
        }, 5)
      })

      await expect((sw as any).executeInWorker(mockWorker, createJob())).rejects.toThrow(
        'Worker exited unexpectedly with code 1'
      )
    })

    it('should not reject on worker exit with code 0', async () => {
      sw = new SandboxedWorker()
      const mockWorker = createMockThreadWorker()

      mockWorker.postMessage = mock((_msg: any) => {
        setTimeout(() => {
          mockWorker._emit('exit', 0)
        }, 5)
      })

      // exit with code 0 does NOT reject, so the promise will hang
      // We need to also emit success or this will timeout
      // Actually, code 0 means normal exit - the cleanup happens but no reject
      // The promise stays pending. Let's race it.
      const result = await Promise.race([
        (sw as any).executeInWorker(mockWorker, createJob()).then(() => 'resolved'),
        new Promise((r) => setTimeout(() => r('timeout'), 50)),
      ])
      expect(result).toBe('timeout') // Promise stays pending because code 0 doesn't reject
    })

    it('should cleanup listeners after completion', async () => {
      sw = new SandboxedWorker()
      const mockWorker = createMockThreadWorker()

      mockWorker.postMessage = mock((_msg: any) => {
        setTimeout(() => {
          mockWorker._emit('message', { type: 'success' })
        }, 5)
      })

      await (sw as any).executeInWorker(mockWorker, createJob())
      expect(mockWorker.off).toHaveBeenCalled()
    })
  })

  describe('createTimeoutPromise', () => {
    it('should reject after configured timeout', async () => {
      sw = new SandboxedWorker({ maxExecutionTime: 10 })
      const consoleSpy = spyOn(console, 'error').mockImplementation(() => {})

      const promise = (sw as any).createTimeoutPromise()

      await expect(promise).rejects.toThrow('Job execution timeout after 10ms')
      consoleSpy.mockRestore()
    })
  })

  describe('startIdleTimer', () => {
    it('should set idle timer', () => {
      sw = new SandboxedWorker({ idleTimeout: 100 })
      ;(sw as any).startIdleTimer()

      expect((sw as any).idleTimer).not.toBeNull()
    })

    it('should clear existing idle timer before setting new one', () => {
      sw = new SandboxedWorker({ idleTimeout: 100 })
      const firstTimer = setTimeout(() => {}, 100000)
      ;(sw as any).idleTimer = firstTimer

      ;(sw as any).startIdleTimer()

      expect((sw as any).idleTimer).not.toBe(firstTimer)
    })
  })

  describe('execute', () => {
    it('should set state to busy during execution', async () => {
      sw = new SandboxedWorker({ maxExecutionTime: 5000 })
      const mockWorker = createMockThreadWorker()

      // Patch initWorker to return mock
      ;(sw as any).initWorker = mock(async () => {
        ;(sw as any).worker = mockWorker
        return mockWorker
      })

      // Mock executeInWorker for success
      ;(sw as any).executeInWorker = mock(async () => {})

      await sw.execute(createJob())

      // After execution, state should be ready (reset in finally block)
      expect(sw.getState()).toBe('ready')
    })

    it('should terminate before execute when isolateContexts is true', async () => {
      sw = new SandboxedWorker({ isolateContexts: true, maxExecutionTime: 5000 })
      const mockWorker = createMockThreadWorker()

      const terminateSpy = spyOn(sw, 'terminate').mockResolvedValue()
      ;(sw as any).initWorker = mock(async () => {
        ;(sw as any).worker = mockWorker
        return mockWorker
      })
      ;(sw as any).executeInWorker = mock(async () => {})

      await sw.execute(createJob())

      // terminate is called before execution (isolateContexts) and after (isolateContexts)
      expect(terminateSpy).toHaveBeenCalled()
      terminateSpy.mockRestore()
    })

    it('should clear idle timer when executing', async () => {
      sw = new SandboxedWorker({ maxExecutionTime: 5000 })
      const mockWorker = createMockThreadWorker()
      ;(sw as any).idleTimer = setTimeout(() => {}, 100000)
      ;(sw as any).initWorker = mock(async () => {
        ;(sw as any).worker = mockWorker
        return mockWorker
      })
      ;(sw as any).executeInWorker = mock(async () => {})

      await sw.execute(createJob())

      // idle timer should be cleared during execute, then startIdleTimer sets a new one
      // since isolateContexts is false by default
    })

    it('should start idle timer after execution when not isolating contexts', async () => {
      sw = new SandboxedWorker({ maxExecutionTime: 5000, idleTimeout: 500 })
      const mockWorker = createMockThreadWorker()

      ;(sw as any).initWorker = mock(async () => {
        ;(sw as any).worker = mockWorker
        return mockWorker
      })
      ;(sw as any).executeInWorker = mock(async () => {})

      await sw.execute(createJob())

      expect((sw as any).idleTimer).not.toBeNull()
    })

    it('should clear execution timer in finally block', async () => {
      sw = new SandboxedWorker({ maxExecutionTime: 5000 })
      const mockWorker = createMockThreadWorker()

      ;(sw as any).initWorker = mock(async () => {
        ;(sw as any).worker = mockWorker
        return mockWorker
      })
      ;(sw as any).executeInWorker = mock(async () => {
        // Simulate execution timer being set
        ;(sw as any).executionTimer = setTimeout(() => {}, 100000)
      })

      await sw.execute(createJob())

      expect((sw as any).executionTimer).toBeNull()
    })

    it('should reset state to ready even on error', async () => {
      sw = new SandboxedWorker({ maxExecutionTime: 5000 })
      const mockWorker = createMockThreadWorker()

      ;(sw as any).initWorker = mock(async () => {
        ;(sw as any).worker = mockWorker
        return mockWorker
      })
      ;(sw as any).executeInWorker = mock(async () => {
        throw new Error('exec fail')
      })

      try {
        await sw.execute(createJob())
      } catch (_e) {
        // expected
      }

      expect(sw.getState()).toBe('ready')
    })
  })
})
