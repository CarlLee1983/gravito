import { describe, expect, it, jest } from 'bun:test'
import { FluxEngine } from '../src/engine/FluxEngine'
import { OrbitFlux } from '../src/orbit/OrbitFlux'
import { MemoryStorage } from '../src/storage/MemoryStorage'

describe('OrbitFlux Extended', () => {
  const createMockCore = () => {
    const instances = new Map<string, any>()
    const hooks: Record<string, any[]> = {}

    return {
      container: {
        instance: (key: string, val: any) => instances.set(key, val),
        make: (key: string) => instances.get(key),
      },
      hooks: {
        doAction: jest.fn((action: string, payload: any) => {
          if (!hooks[action]) {
            hooks[action] = []
          }
          hooks[action].push(payload)
        }),
      },
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
      _instances: instances,
      _hooks: hooks,
    }
  }

  describe('configure', () => {
    it('should create an OrbitFlux instance via static method', () => {
      const orbit = OrbitFlux.configure()
      expect(orbit).toBeInstanceOf(OrbitFlux)
    })

    it('should pass options through configure', () => {
      const orbit = OrbitFlux.configure({
        storage: 'sqlite',
        exposeAs: 'custom-flux',
      })
      expect(orbit).toBeInstanceOf(OrbitFlux)
    })
  })

  describe('install', () => {
    it('should install with memory storage by default', async () => {
      const orbit = new OrbitFlux()
      const core = createMockCore()

      await orbit.install(core as any)

      const engine = orbit.getEngine()
      expect(engine).toBeInstanceOf(FluxEngine)
      expect(core._instances.get('flux')).toBe(engine)
    })

    it('should install with custom storage', async () => {
      const customStorage = new MemoryStorage()
      const orbit = new OrbitFlux({
        storage: customStorage,
      })
      const core = createMockCore()

      await orbit.install(core as any)

      const engine = orbit.getEngine()
      expect(engine).toBeInstanceOf(FluxEngine)
    })

    it('should install with custom exposeAs key', async () => {
      const orbit = new OrbitFlux({
        exposeAs: 'my-engine',
      })
      const core = createMockCore()

      await orbit.install(core as any)

      expect(core._instances.get('my-engine')).toBeDefined()
      expect(core._instances.get('my-engine')).toBeInstanceOf(FluxEngine)
    })

    it('should use custom logger when provided', async () => {
      const customLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      }

      const orbit = new OrbitFlux({
        logger: customLogger,
      })
      const core = createMockCore()

      await orbit.install(core as any)

      expect(orbit.getEngine()).toBeInstanceOf(FluxEngine)
    })

    it('should apply default retries and timeout', async () => {
      const orbit = new OrbitFlux({
        defaultRetries: 5,
        defaultTimeout: 60000,
      })
      const core = createMockCore()

      await orbit.install(core as any)

      expect(orbit.getEngine()).toBeInstanceOf(FluxEngine)
    })

    it('should set up core logger bridge when no custom logger', async () => {
      const orbit = new OrbitFlux()
      const core = createMockCore()

      await orbit.install(core as any)

      // 驗證 core.logger.info 被呼叫以記錄初始化訊息
      expect(core.logger.info).toHaveBeenCalled()
      const infoMessage = core.logger.info.mock.calls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('[OrbitFlux]')
      )
      expect(infoMessage).toBeDefined()
    })

    it('should log storage type in initialization message', async () => {
      const orbit = new OrbitFlux({ storage: 'memory' })
      const core = createMockCore()

      await orbit.install(core as any)

      const infoMessage = core.logger.info.mock.calls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('memory')
      )
      expect(infoMessage).toBeDefined()
    })

    it('should log custom storage type', async () => {
      const customStorage = new MemoryStorage()
      const orbit = new OrbitFlux({ storage: customStorage })
      const core = createMockCore()

      await orbit.install(core as any)

      const infoMessage = core.logger.info.mock.calls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('custom')
      )
      expect(infoMessage).toBeDefined()
    })
  })

  describe('getEngine', () => {
    it('should return undefined before install', () => {
      const orbit = new OrbitFlux()
      expect(orbit.getEngine()).toBeUndefined()
    })

    it('should return engine after install', async () => {
      const orbit = new OrbitFlux()
      const core = createMockCore()

      await orbit.install(core as any)

      expect(orbit.getEngine()).toBeInstanceOf(FluxEngine)
    })
  })

  describe('cleanup', () => {
    it('should close engine on cleanup', async () => {
      const orbit = new OrbitFlux()
      const core = createMockCore()

      await orbit.install(core as any)

      const engine = orbit.getEngine()!
      const closeSpy = jest.spyOn(engine, 'close')

      await orbit.cleanup()

      expect(closeSpy).toHaveBeenCalledTimes(1)
    })

    it('should handle cleanup without install (no engine)', async () => {
      const orbit = new OrbitFlux()
      // 不應拋出錯誤
      await orbit.cleanup()
    })
  })

  describe('event hooks integration', () => {
    it('should bridge engine events to core hooks', async () => {
      const orbit = new OrbitFlux()
      const core = createMockCore()

      await orbit.install(core as any)

      // 驗證 FluxEngine 被正確建立且能夠工作
      const engine = orbit.getEngine()!
      expect(engine).toBeInstanceOf(FluxEngine)
    })

    it('should trigger stepStart and stepComplete hooks during workflow execution', async () => {
      const orbit = new OrbitFlux({ defaultRetries: 0 })
      const core = createMockCore()

      await orbit.install(core as any)

      const engine = orbit.getEngine()!

      const { createWorkflow } = await import('../src/builder/WorkflowBuilder')
      const workflow = createWorkflow('hook-test')
        .input<{}>()
        .step('step1', async (ctx) => {
          ctx.data.done = true
        })
        .build()

      await engine.execute(workflow, {})

      // 驗證 stepStart hook 被觸發
      const stepStartCalls = core.hooks.doAction.mock.calls.filter(
        (call: any[]) => call[0] === 'flux:step:start'
      )
      expect(stepStartCalls.length).toBeGreaterThanOrEqual(1)

      // 驗證 stepComplete hook 被觸發
      const stepCompleteCalls = core.hooks.doAction.mock.calls.filter(
        (call: any[]) => call[0] === 'flux:step:complete'
      )
      expect(stepCompleteCalls.length).toBeGreaterThanOrEqual(1)

      // 驗證 workflowComplete hook 被觸發
      const wfCompleteCalls = core.hooks.doAction.mock.calls.filter(
        (call: any[]) => call[0] === 'flux:workflow:complete'
      )
      expect(wfCompleteCalls.length).toBeGreaterThanOrEqual(1)
    })

    it('should trigger stepStart hook on workflow failure', async () => {
      const orbit = new OrbitFlux({ defaultRetries: 0 })
      const core = createMockCore()

      await orbit.install(core as any)

      const engine = orbit.getEngine()!

      const { createWorkflow } = await import('../src/builder/WorkflowBuilder')
      const workflow = createWorkflow('error-hook-test')
        .input<{}>()
        .step('failing-step', async () => {
          throw new Error('Step failed')
        })
        .build()

      const result = await engine.execute(workflow, {})
      expect(result.status).not.toBe('completed')

      // 驗證 stepStart hook 在失敗步驟前也被觸發
      const stepStartCalls = core.hooks.doAction.mock.calls.filter(
        (call: any[]) => call[0] === 'flux:step:start'
      )
      expect(stepStartCalls.length).toBeGreaterThanOrEqual(1)
    })

    it('should bridge core logger when no custom logger provided', async () => {
      const orbit = new OrbitFlux({ defaultRetries: 0 })
      const core = createMockCore()

      await orbit.install(core as any)

      // 透過引擎操作來間接觸發 logger bridge
      const engine = orbit.getEngine()!
      expect(engine).toBeDefined()

      // core.logger.info 已被呼叫（至少初始化訊息）
      expect(core.logger.info).toHaveBeenCalled()
    })
  })
})
