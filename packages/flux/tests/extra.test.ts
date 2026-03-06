import { describe, expect, it, jest } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createWorkflow, MemoryStorage } from '../src'
import { ContextManager } from '../src/core/ContextManager'
import { FluxEngine } from '../src/engine/FluxEngine'
import { FluxConsoleLogger, FluxSilentLogger } from '../src/logger/FluxLogger'
import { OrbitFlux } from '../src/orbit/OrbitFlux'
import { JsonFileTraceSink } from '../src/trace/JsonFileTraceSink'
import type { WorkflowContext, WorkflowStorage } from '../src/types'

describe('ContextManager', () => {
  it('creates, updates, and restores workflow contexts', () => {
    const manager = new ContextManager()
    const ctx = manager.create('workflow', { value: 1 }, 2)

    expect(ctx.history).toHaveLength(2)
    const withName = manager.setStepName(ctx, 0, 'step-1')
    expect(withName.history[0]?.name).toBe('step-1')

    const running = manager.updateStatus(withName, 'running')
    expect(running.status).toBe('running')

    const advanced = manager.advanceStep(running)
    expect(advanced.currentStep).toBe(1)

    const state = manager.toState(advanced)
    const restored = manager.restore(state)
    expect(restored.id).toBe(ctx.id)
    expect(restored.currentStep).toBe(advanced.currentStep)
    expect(restored.version).toBe(1)
  })
})

describe('FluxLogger', () => {
  it('prefixes console output', () => {
    const originalDebug = console.debug
    const originalInfo = console.info
    const originalWarn = console.warn
    const originalError = console.error

    const debugSpy = jest.fn()
    const infoSpy = jest.fn()
    const warnSpy = jest.fn()
    const errorSpy = jest.fn()

    console.debug = debugSpy
    console.info = infoSpy
    console.warn = warnSpy
    console.error = errorSpy

    try {
      const logger = new FluxConsoleLogger('[Test]')
      logger.debug('debug')
      logger.info('info')
      logger.warn('warn')
      logger.error('error')

      expect(debugSpy as any).toHaveBeenCalled()
      expect(infoSpy as any).toHaveBeenCalled()
      expect(warnSpy as any).toHaveBeenCalled()
      expect(errorSpy as any).toHaveBeenCalled()
    } finally {
      console.debug = originalDebug
      console.info = originalInfo
      console.warn = originalWarn
      console.error = originalError
    }
  })

  it('silent logger does not throw', () => {
    const logger = new FluxSilentLogger()
    logger.debug('debug')
    logger.info('info')
    logger.warn('warn')
    logger.error('error')
    expect(true).toBe(true)
  })
})

describe('JsonFileTraceSink', () => {
  it('writes trace events to a file', async () => {
    const traceDir = mkdtempSync(join(tmpdir(), 'gravito-trace-'))
    const filePath = join(traceDir, 'trace.ndjson')

    const sink = new JsonFileTraceSink({ path: filePath })
    await sink.emit({
      type: 'workflow:start',
      timestamp: Date.now(),
      workflowId: '123',
      workflowName: 'test',
    })
    await sink.close()

    const contents = await readFile(filePath, 'utf8')
    expect(contents).toContain('"type":"workflow:start"')

    await rm(traceDir, { recursive: true, force: true })
  })
})

describe('FluxEngine extras', () => {
  it('validates input when validator is provided', async () => {
    const engine = new FluxEngine()
    const workflow = createWorkflow('validate')
      .input<{ value: number }>()
      .validate((input): input is { value: number } => (input as any)?.value > 0)
      .step('noop', (_ctx: WorkflowContext<{ value: number }, any>) => {})

    await expect(engine.execute(workflow, { value: -1 })).rejects.toThrow('Invalid input')
  })

  it('resumes and retries workflow from a step', async () => {
    const storage = new MemoryStorage()
    const engine = new FluxEngine({ storage })
    const workflow = createWorkflow('resume')
      .step('step-1', (ctx: WorkflowContext) => {
        ctx.data.count = 1
      })
      .step('step-2', (ctx: WorkflowContext) => {
        ctx.data.count = (ctx.data.count as number) + 1
      })

    const result = await engine.execute(workflow, {})
    const resumed = await engine.resume(workflow, result.id, { fromStep: 0 })
    const retried = await engine.retryStep(workflow, result.id, 'step-2')

    expect(resumed?.status).toBe('completed')
    expect(retried?.status).toBe('completed')
  })

  it('returns null when resuming unknown workflow', async () => {
    const engine = new FluxEngine()
    const workflow = createWorkflow('missing').step('noop', (_ctx: WorkflowContext) => {})

    const result = await engine.resume(workflow, 'missing-id')
    expect(result).toBeNull()
  })

  it('throws on invalid resume index', async () => {
    const storage = new MemoryStorage()
    const engine = new FluxEngine({ storage })
    const workflow = createWorkflow('invalid-index').step('noop', (_ctx: WorkflowContext) => {})
    const result = await engine.execute(workflow, {})

    await expect(engine.resume(workflow, result.id, { fromStep: 5 })).rejects.toThrow(
      'Invalid step index'
    )
  })

  it('lists and gets workflow states', async () => {
    const storage = new MemoryStorage()
    const engine = new FluxEngine({ storage })
    const workflow = createWorkflow('list').step('noop', (_ctx: WorkflowContext) => {})

    const result = await engine.execute(workflow, {})
    const state = await engine.get(result.id)
    const list = await engine.list({ status: 'completed' })

    expect(state?.id).toBe(result.id)
    expect(list.length).toBeGreaterThan(0)
  })

  it('ignores trace sink failures', async () => {
    const engine = new FluxEngine({
      trace: {
        emit: async () => {
          throw new Error('trace down')
        },
      },
    })
    const workflow = createWorkflow('trace').step('noop', (_ctx: WorkflowContext) => {})

    const result = await engine.execute(workflow, {})
    expect(result.status).toBe('completed')
  })

  it('initializes and closes storage', async () => {
    const storage: WorkflowStorage = {
      save: async () => {},
      load: async () => null,
      list: async () => [],
      delete: async () => {},
      init: jest.fn(async () => {}),
      close: jest.fn(async () => {}),
    }
    const engine = new FluxEngine({ storage })

    await engine.init()
    await engine.close()

    expect(storage.init).toHaveBeenCalled()
    expect(storage.close).toHaveBeenCalled()
  })
})

describe('OrbitFlux', () => {
  it('installs and exposes engine via core container', async () => {
    const instances = new Map<string, unknown>()
    const core = {
      container: {
        instance: (key: string, value: unknown) => instances.set(key, value),
        make: <T>(key: string) => instances.get(key) as T | undefined,
      },
      hooks: { doAction: jest.fn() },
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    }

    const orbit = OrbitFlux.configure({ exposeAs: 'flux' })
    await orbit.install(core as any)

    const engine = instances.get('flux')
    expect(engine).toBeInstanceOf(FluxEngine)
    expect(orbit.getEngine()).toBe(engine as FluxEngine)
  })
})
