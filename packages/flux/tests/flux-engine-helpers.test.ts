import { describe, expect, it, jest } from 'bun:test'
import { createWorkflow } from '../src/builder/WorkflowBuilder'
import { ContextManager } from '../src/core/ContextManager'
import { MemoryLockProvider } from '../src/core/LockProvider'
import {
  acquireEngineLock,
  createStepExecutor,
  handleExecutionResult,
  persistContext,
  resetHistoryFrom,
  resolveDefinition,
  resolveStartIndex,
} from '../src/engine/FluxEngineHelpers'
import { RollbackManager } from '../src/engine/RollbackManager'
import { TraceEmitter } from '../src/engine/TraceEmitter'
import { MemoryStorage } from '../src/storage/MemoryStorage'
import type {
  FluxConfig,
  FluxResult,
  StepExecution,
  WorkflowContext,
  WorkflowDefinition,
} from '../src/types'

describe('FluxEngineHelpers', () => {
  const createMockContext = (overrides: Partial<WorkflowContext> = {}): WorkflowContext => ({
    id: 'wf-helper-test',
    name: 'test-workflow',
    input: {},
    data: {},
    status: 'running',
    currentStep: 0,
    history: [],
    version: 1,
    ...overrides,
  })

  const createMockDefinition = (): WorkflowDefinition => ({
    name: 'test-workflow',
    steps: [
      { name: 'step1', handler: async () => {}, commit: false },
      { name: 'step2', handler: async () => {}, commit: false },
      { name: 'step3', handler: async () => {}, commit: true },
    ],
  })

  describe('createStepExecutor', () => {
    it('should create executor with default config', () => {
      const traceEmitter = new TraceEmitter()
      const config: FluxConfig = {}

      const executor = createStepExecutor(config, traceEmitter)
      expect(executor).toBeDefined()
    })

    it('should create executor with custom retries and timeout', () => {
      const traceEmitter = new TraceEmitter()
      const config: FluxConfig = {
        defaultRetries: 5,
        defaultTimeout: 60000,
      }

      const executor = createStepExecutor(config, traceEmitter)
      expect(executor).toBeDefined()
    })

    it('should emit trace event on retry', async () => {
      const sink = { emit: jest.fn() }
      const traceEmitter = new TraceEmitter(sink)
      const config: FluxConfig = {
        defaultRetries: 2,
        defaultTimeout: 30000,
      }

      const executor = createStepExecutor(config, traceEmitter)

      let attempts = 0
      const step = {
        name: 'flaky-step',
        handler: async () => {
          attempts++
          if (attempts < 2) {
            throw new Error('Transient')
          }
        },
        commit: false,
      }

      const execution: StepExecution = {
        name: 'flaky-step',
        status: 'pending' as const,
        retries: 0,
      }

      const ctx = createMockContext()
      await executor.execute(step, ctx, execution)

      // 應該有 retry 事件被觸發
      const retryCalls = (sink.emit as any).mock.calls.filter(
        (call: any[]) => call[0]?.type === 'step:retry'
      )
      expect(retryCalls.length).toBeGreaterThan(0)
      expect(retryCalls[0][0].stepName).toBe('flaky-step')
    })
  })

  describe('resolveDefinition', () => {
    it('should return definition directly when passed a definition', () => {
      const def = createMockDefinition()
      const result = resolveDefinition(def)
      expect(result).toBe(def)
    })

    it('should build from WorkflowBuilder', () => {
      const builder = createWorkflow('builder-test')
        .input<{}>()
        .step('step1', async () => {})

      const result = resolveDefinition(builder)
      expect(result.name).toBe('builder-test')
      expect(result.steps).toHaveLength(1)
    })
  })

  describe('resolveStartIndex', () => {
    const def = createMockDefinition()

    it('should return numeric fromStep directly', () => {
      expect(resolveStartIndex(def, 1, 0)).toBe(1)
    })

    it('should throw for out-of-bounds numeric fromStep', () => {
      expect(() => resolveStartIndex(def, -1, 0)).toThrow()
      expect(() => resolveStartIndex(def, 10, 0)).toThrow()
    })

    it('should resolve string step name to index', () => {
      expect(resolveStartIndex(def, 'step2', 0)).toBe(1)
      expect(resolveStartIndex(def, 'step3', 0)).toBe(2)
    })

    it('should throw for non-existent step name', () => {
      expect(() => resolveStartIndex(def, 'non-existent', 0)).toThrow()
    })

    it('should use fallback when fromStep is undefined', () => {
      expect(resolveStartIndex(def, undefined, 1)).toBe(1)
    })

    it('should clamp fallback to valid range', () => {
      expect(resolveStartIndex(def, undefined, -5)).toBe(0)
      expect(resolveStartIndex(def, undefined, 100)).toBe(2)
    })
  })

  describe('resetHistoryFrom', () => {
    it('should reset history entries from startIndex', () => {
      const ctx = createMockContext({
        history: [
          {
            name: 'step1',
            status: 'completed',
            startedAt: new Date(),
            completedAt: new Date(),
            duration: 100,
            retries: 1,
          },
          {
            name: 'step2',
            status: 'completed',
            startedAt: new Date(),
            completedAt: new Date(),
            duration: 200,
            retries: 0,
          },
          {
            name: 'step3',
            status: 'failed',
            startedAt: new Date(),
            error: 'Error',
            duration: 50,
            retries: 2,
          },
        ],
      })

      resetHistoryFrom(ctx, 1)

      // step1 不受影響
      expect(ctx.history[0].status).toBe('completed')
      expect(ctx.history[0].startedAt).toBeDefined()

      // step2 和 step3 被重設
      expect(ctx.history[1].status).toBe('pending')
      expect(ctx.history[1].startedAt).toBeUndefined()
      expect(ctx.history[1].completedAt).toBeUndefined()
      expect(ctx.history[1].duration).toBeUndefined()
      expect(ctx.history[1].error).toBeUndefined()
      expect(ctx.history[1].retries).toBe(0)

      expect(ctx.history[2].status).toBe('pending')
    })

    it('should handle empty history gracefully', () => {
      const ctx = createMockContext({ history: [] })
      // 不應拋出錯誤
      resetHistoryFrom(ctx, 0)
    })

    it('should handle startIndex beyond history length', () => {
      const ctx = createMockContext({
        history: [{ name: 'step1', status: 'completed', retries: 0 }],
      })

      resetHistoryFrom(ctx, 5)
      // 不應拋出錯誤，step1 不受影響
      expect(ctx.history[0].status).toBe('completed')
    })
  })

  describe('handleExecutionResult', () => {
    it('should return result directly when not failed', async () => {
      const def = createMockDefinition()
      const ctx = createMockContext()
      const contextManager = new ContextManager()
      const storage = new MemoryStorage()
      const traceEmitter = new TraceEmitter()
      const rollbackManager = new RollbackManager(storage, contextManager, traceEmitter)

      const result: FluxResult = {
        id: 'wf-1',
        status: 'completed',
        data: { result: 'ok' },
        history: [],
        duration: 100,
        version: 1,
      }

      const finalResult = await handleExecutionResult(
        def,
        ctx,
        result,
        contextManager,
        rollbackManager,
        storage
      )

      expect(finalResult).toBe(result)
    })

    it('should trigger rollback when result is failed', async () => {
      const def: WorkflowDefinition = {
        name: 'test-workflow',
        steps: [
          {
            name: 'step1',
            handler: async () => {},
            compensate: async () => {},
          },
          {
            name: 'step2',
            handler: async () => {},
          },
        ],
      }
      const contextManager = new ContextManager()
      const storage = new MemoryStorage()
      const traceEmitter = new TraceEmitter()
      const rollbackManager = new RollbackManager(storage, contextManager, traceEmitter)

      const ctx = contextManager.create('test-workflow', {}, 2)

      // 儲存初始狀態
      await storage.save(contextManager.toState(ctx))

      const failedHistory: StepExecution[] = [
        {
          name: 'step1',
          status: 'completed',
          startedAt: new Date(),
          completedAt: new Date(),
          retries: 0,
        },
        {
          name: 'step2',
          status: 'failed',
          startedAt: new Date(),
          error: 'Something went wrong',
          retries: 0,
        },
      ]

      const result: FluxResult = {
        id: ctx.id,
        status: 'failed',
        data: {},
        history: failedHistory,
        duration: 500,
        error: new Error('Something went wrong'),
        version: 1,
      }

      const finalResult = await handleExecutionResult(
        def,
        ctx,
        result,
        contextManager,
        rollbackManager,
        storage
      )

      // 應該觸發 rollback，結果狀態不再是 'failed'
      expect(finalResult.status).toBe('rolled_back')
    })

    it('should return failed result when no failed step found in history', async () => {
      const def = createMockDefinition()
      const ctx = createMockContext()
      const contextManager = new ContextManager()
      const storage = new MemoryStorage()
      const traceEmitter = new TraceEmitter()
      const rollbackManager = new RollbackManager(storage, contextManager, traceEmitter)

      const result: FluxResult = {
        id: 'wf-1',
        status: 'failed',
        data: {},
        history: [{ name: 'step1', status: 'completed', retries: 0 }],
        duration: 100,
        error: new Error('Error'),
        version: 1,
      }

      const finalResult = await handleExecutionResult(
        def,
        ctx,
        result,
        contextManager,
        rollbackManager,
        storage
      )

      // 沒有找到 failed 步驟，直接返回
      expect(finalResult.status).toBe('failed')
    })
  })

  describe('persistContext', () => {
    it('should save context to storage and increment version', async () => {
      const contextManager = new ContextManager()
      const storage = new MemoryStorage()

      const ctx = contextManager.create('test', {}, 2)

      const result = await persistContext(ctx, storage, contextManager)

      expect(result.version).toBe(ctx.version + 1)

      // 確認已儲存
      const stored = await storage.load(ctx.id)
      expect(stored).not.toBeNull()
      expect(stored?.version).toBe(ctx.version + 1)
    })

    it('should throw on concurrent modification', async () => {
      const contextManager = new ContextManager()
      const storage = new MemoryStorage()

      const ctx = contextManager.create('test', {}, 2)

      // 先儲存一次
      await persistContext(ctx, storage, contextManager)

      // 再用舊 version 儲存，應拋出錯誤
      await expect(persistContext(ctx, storage, contextManager)).rejects.toThrow(
        'Concurrent modification detected'
      )
    })
  })

  describe('acquireEngineLock', () => {
    it('should return null when no lockProvider configured', async () => {
      const config: FluxConfig = {}
      const result = await acquireEngineLock(config, 'wf-1')
      expect(result).toBeNull()
    })

    it('should acquire lock when lockProvider is configured', async () => {
      const lockProvider = new MemoryLockProvider()
      const config: FluxConfig = { lockProvider }

      const lock = await acquireEngineLock(config, 'wf-1')
      expect(lock).not.toBeNull()
      expect(lock?.id).toBe('wf-1')
    })

    it('should return lock with release function', async () => {
      const lockProvider = new MemoryLockProvider()
      const config: FluxConfig = { lockProvider }

      const lock = await acquireEngineLock(config, 'wf-1')
      expect(typeof lock?.release).toBe('function')

      await lock?.release()

      // 釋放後應該能重新取得
      const newLock = await acquireEngineLock(config, 'wf-1')
      expect(newLock).not.toBeNull()
    })
  })
})
