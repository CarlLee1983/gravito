import { describe, expect, it, jest } from 'bun:test'
import { createWorkflow } from '../src/builder/WorkflowBuilder'
import { MemoryLockProvider } from '../src/core/LockProvider'
import { FluxEngine } from '../src/engine/FluxEngine'
import { MemoryStorage } from '../src/storage/MemoryStorage'
import type { WorkflowState } from '../src/types'

describe('FluxEngine Extended', () => {
  const createEngine = (options: Record<string, any> = {}) => {
    return new FluxEngine({
      storage: new MemoryStorage(),
      defaultRetries: 0,
      defaultTimeout: 5000,
      ...options,
    })
  }

  describe('saveState', () => {
    it('should save workflow state with version increment', async () => {
      const engine = createEngine()

      const state: WorkflowState = {
        id: 'wf-save-test',
        name: 'test',
        status: 'running',
        input: {},
        data: {},
        currentStep: 0,
        history: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      }

      // 先建立初始狀態
      const storage = (engine as any).storage as MemoryStorage
      await storage.save(state)

      await engine.saveState(state)

      const loaded = await engine.get('wf-save-test')
      expect(loaded).not.toBeNull()
      expect(loaded?.version).toBe(2)
    })

    it('should throw on concurrent modification', async () => {
      const engine = createEngine()
      const storage = (engine as any).storage as MemoryStorage

      const state: WorkflowState = {
        id: 'wf-concurrent',
        name: 'test',
        status: 'running',
        input: {},
        data: {},
        currentStep: 0,
        history: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      }

      // 儲存 version 1
      await storage.save(state)

      // 更新到 version 2（在 storage 裡）
      await storage.save({ ...state, version: 2 })

      // 嘗試用 version 1 保存，應拋出錯誤
      await expect(engine.saveState(state)).rejects.toThrow('Concurrent modification detected')
    })
  })

  describe('list', () => {
    it('should list all workflows', async () => {
      const engine = createEngine()

      const workflow = createWorkflow('list-test')
        .input<{}>()
        .step('step1', async () => {})
        .build()

      await engine.execute(workflow, {})
      await engine.execute(workflow, {})

      const results = await engine.list()
      expect(results.length).toBeGreaterThanOrEqual(2)
    })

    it('should filter by name', async () => {
      const engine = createEngine()

      const wf1 = createWorkflow('workflow-a')
        .input<{}>()
        .step('step1', async () => {})
        .build()

      const wf2 = createWorkflow('workflow-b')
        .input<{}>()
        .step('step1', async () => {})
        .build()

      await engine.execute(wf1, {})
      await engine.execute(wf2, {})

      const results = await engine.list({ name: 'workflow-a' })
      expect(results.every((r) => r.name === 'workflow-a')).toBe(true)
    })
  })

  describe('get', () => {
    it('should return workflow state by id', async () => {
      const engine = createEngine()

      const workflow = createWorkflow('get-test')
        .input<{}>()
        .step('step1', async () => {})
        .build()

      const result = await engine.execute(workflow, {})

      const state = await engine.get(result.id)
      expect(state).not.toBeNull()
      expect(state?.name).toBe('get-test')
    })

    it('should return null for non-existent workflow', async () => {
      const engine = createEngine()

      const state = await engine.get('non-existent')
      expect(state).toBeNull()
    })
  })

  describe('schedule / unschedule / listSchedules', () => {
    it('should schedule and unschedule a workflow', async () => {
      const engine = createEngine()

      const workflow = createWorkflow('scheduled-test')
        .input<{}>()
        .step('step1', async () => {})
        .build()

      const scheduleId = engine.schedule('*/5 * * * *', workflow, {})

      expect(scheduleId).toBeDefined()
      expect(typeof scheduleId).toBe('string')

      const schedules = engine.listSchedules()
      expect(schedules.length).toBeGreaterThanOrEqual(1)
      expect(schedules.find((s) => s.id === scheduleId)).toBeDefined()

      engine.unschedule(scheduleId)

      const afterUnschedule = engine.listSchedules()
      expect(afterUnschedule.find((s) => s.id === scheduleId)).toBeUndefined()
    })

    it('should use custom schedule id', async () => {
      const engine = createEngine()

      const workflow = createWorkflow('custom-id-test')
        .input<{}>()
        .step('step1', async () => {})
        .build()

      const id = engine.schedule('0 * * * *', workflow, {}, 'my-custom-id')

      expect(id).toBe('my-custom-id')
    })

    it('should list empty schedules', () => {
      const engine = createEngine()
      expect(engine.listSchedules()).toEqual([])
    })
  })

  describe('getRecoveryManager', () => {
    it('should return the recovery manager', () => {
      const engine = createEngine()
      const recovery = engine.getRecoveryManager()
      expect(recovery).toBeDefined()
    })
  })

  describe('getLockProvider', () => {
    it('should return undefined when no lock provider configured', () => {
      const engine = createEngine()
      expect(engine.getLockProvider()).toBeUndefined()
    })

    it('should return lock provider when configured', () => {
      const lockProvider = new MemoryLockProvider()
      const engine = createEngine({ lockProvider })
      expect(engine.getLockProvider()).toBe(lockProvider)
    })
  })

  describe('init / close', () => {
    it('should initialize and close the engine', async () => {
      const engine = createEngine()
      await engine.init()
      await engine.close()
    })

    it('should call storage init on engine init', async () => {
      const storage = new MemoryStorage()
      const initSpy = jest.spyOn(storage, 'init')

      const engine = new FluxEngine({
        storage,
        defaultRetries: 0,
      })

      await engine.init()
      expect(initSpy).toHaveBeenCalled()

      await engine.close()
    })
  })

  describe('execute with optimizer', () => {
    it('should create engine with optimizer enabled', async () => {
      const engine = new FluxEngine({
        storage: new MemoryStorage(),
        defaultRetries: 0,
        optimizer: {
          enabled: true,
          threshold: 1024,
          defaultLocation: 'memory',
        },
      })

      const workflow = createWorkflow('optimizer-test')
        .input<{}>()
        .step('step1', async (ctx) => {
          ctx.data.result = 'ok'
        })
        .build()

      const result = await engine.execute(workflow, {})
      expect(result.status).toBe('completed')
    })
  })

  describe('execute with lifecycle hooks', () => {
    it('should call lifecycle hooks during execution', async () => {
      const hooks = {
        stepStart: jest.fn(),
        stepComplete: jest.fn(),
        workflowComplete: jest.fn(),
      }

      const engine = new FluxEngine({
        storage: new MemoryStorage(),
        defaultRetries: 0,
        on: hooks,
      })

      const workflow = createWorkflow('hooks-test')
        .input<{}>()
        .step('step1', async (ctx) => {
          ctx.data.result = 'ok'
        })
        .build()

      await engine.execute(workflow, {})

      expect(hooks.stepStart).toHaveBeenCalled()
      expect(hooks.stepComplete).toHaveBeenCalled()
      expect(hooks.workflowComplete).toHaveBeenCalled()
    })

    it('should call error hooks on workflow failure', async () => {
      const hooks = {
        stepStart: jest.fn(),
        stepError: jest.fn(),
        workflowError: jest.fn(),
      }

      const engine = new FluxEngine({
        storage: new MemoryStorage(),
        defaultRetries: 0,
        on: hooks,
      })

      const workflow = createWorkflow('error-hooks-test')
        .input<{}>()
        .step('failing-step', async () => {
          throw new Error('Step failed')
        })
        .build()

      const result = await engine.execute(workflow, {})

      // 步驟失敗會觸發 hooks
      expect(result.status).not.toBe('completed')
    })
  })

  describe('execute with input validation', () => {
    it('should throw on invalid input', async () => {
      const engine = createEngine()

      const workflow: any = {
        name: 'validated-workflow',
        steps: [{ name: 'step1', handler: async () => {} }],
        validateInput: (input: any): input is { required: string } => {
          return input && typeof input.required === 'string'
        },
      }

      await expect(engine.execute(workflow, {})).rejects.toThrow()
    })

    it('should succeed with valid input', async () => {
      const engine = createEngine()

      const workflow: any = {
        name: 'validated-workflow',
        steps: [{ name: 'step1', handler: async () => {} }],
        validateInput: (input: any): input is { required: string } => {
          return input && typeof input.required === 'string'
        },
      }

      const result = await engine.execute(workflow, { required: 'valid' })
      expect(result.status).toBe('completed')
    })
  })

  describe('execute with lock provider', () => {
    it('should acquire and release lock during execution', async () => {
      const lockProvider = new MemoryLockProvider()
      const acquireSpy = jest.spyOn(lockProvider, 'acquire')

      const engine = new FluxEngine({
        storage: new MemoryStorage(),
        defaultRetries: 0,
        lockProvider,
      })

      const workflow = createWorkflow('lock-test')
        .input<{}>()
        .step('step1', async () => {})
        .build()

      await engine.execute(workflow, {})

      expect(acquireSpy).toHaveBeenCalled()
    })
  })
})
