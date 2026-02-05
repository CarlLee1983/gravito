import { beforeEach, describe, expect, it } from 'bun:test'
import { createWorkflow } from '../src/builder/WorkflowBuilder'
import { FluxEngine } from '../src/engine/FluxEngine'
import { MemoryStorage } from '../src/storage/MemoryStorage'

describe('Workflow Versioning', () => {
  describe('WorkflowBuilder.version()', () => {
    it('should set version on the workflow definition', () => {
      const workflow = createWorkflow('versioned-workflow')
        .version('1.0.0')
        .input<{ value: number }>()
        .step('process', async (ctx) => {
          ctx.data.result = ctx.input.value * 2
        })
        .build()

      expect(workflow.version).toBe('1.0.0')
    })

    it('should leave version undefined if not set', () => {
      const workflow = createWorkflow('unversioned-workflow')
        .input<{}>()
        .step('noop', async () => {})
        .build()

      expect(workflow.version).toBeUndefined()
    })

    it('should allow chaining version() with other methods', () => {
      const workflow = createWorkflow('chained-workflow')
        .input<{ id: string }>()
        .version('2.1.0')
        .data<{ processed: boolean }>()
        .step('step1', async (ctx) => {
          ctx.data.processed = true
        })
        .build()

      expect(workflow.name).toBe('chained-workflow')
      expect(workflow.version).toBe('2.1.0')
      expect(workflow.steps).toHaveLength(1)
    })
  })

  describe('WorkflowBuilder.describe()', () => {
    it('should include version in descriptor when set', () => {
      const builder = createWorkflow('versioned-descriptor')
        .version('3.0.0')
        .input<{}>()
        .step('step1', async () => {})

      const descriptor = builder.describe()

      expect(descriptor.name).toBe('versioned-descriptor')
      expect(descriptor.version).toBe('3.0.0')
      expect(descriptor.steps).toHaveLength(1)
    })

    it('should have undefined version in descriptor when not set', () => {
      const builder = createWorkflow('no-version-descriptor')
        .input<{}>()
        .step('step1', async () => {})

      const descriptor = builder.describe()

      expect(descriptor.version).toBeUndefined()
    })
  })

  describe('FluxEngine version handling', () => {
    let engine: FluxEngine
    let storage: MemoryStorage

    beforeEach(async () => {
      storage = new MemoryStorage()
      engine = new FluxEngine({ storage })
      await engine.init()
    })

    it('should store definitionVersion on execute', async () => {
      const workflow = createWorkflow('version-store-test')
        .version('1.5.0')
        .input<{ value: number }>()
        .step('process', async (ctx) => {
          ctx.data.result = ctx.input.value
        })
        .build()

      const result = await engine.execute(workflow, { value: 42 })
      expect(result.status).toBe('completed')

      const state = await engine.get(result.id)
      expect(state?.definitionVersion).toBe('1.5.0')
    })

    it('should not store definitionVersion when workflow has no version', async () => {
      const workflow = createWorkflow('no-version-store-test')
        .input<{}>()
        .step('noop', async () => {})
        .build()

      const result = await engine.execute(workflow, {})
      const state = await engine.get(result.id)

      expect(state?.definitionVersion).toBeUndefined()
    })

    it('should warn on version mismatch during resume', async () => {
      const warnings: string[] = []
      const mockLogger = {
        debug: () => {},
        info: () => {},
        warn: (msg: string) => {
          warnings.push(msg)
        },
        error: () => {},
      }

      const engineWithLogger = new FluxEngine({
        storage,
        logger: mockLogger,
      })
      await engineWithLogger.init()

      const workflowV1 = createWorkflow('version-mismatch-test')
        .version('1.0.0')
        .input<{ value: number }>()
        .step('step1', async (ctx) => {
          ctx.data.intermediate = ctx.input.value
        })
        .step('step2', async (ctx) => {
          ctx.data.result = ctx.data.intermediate * 2
        })
        .build()

      const result = await engineWithLogger.execute(workflowV1, { value: 10 })

      const workflowV2 = createWorkflow('version-mismatch-test')
        .version('2.0.0')
        .input<{ value: number }>()
        .step('step1', async (ctx) => {
          ctx.data.intermediate = ctx.input.value
        })
        .step('step2', async (ctx) => {
          ctx.data.result = ctx.data.intermediate * 2
        })
        .build()

      const state = await storage.load(result.id)
      if (state) {
        state.status = 'failed'
        state.currentStep = 1
        await storage.save(state)
      }

      await engineWithLogger.resume(workflowV2, result.id, { fromStep: 1 })

      expect(warnings.length).toBeGreaterThan(0)
      expect(warnings[0]).toContain('version mismatch')
      expect(warnings[0]).toContain('1.0.0')
      expect(warnings[0]).toContain('2.0.0')
    })

    it('should not warn when versions match', async () => {
      const warnings: string[] = []
      const mockLogger = {
        debug: () => {},
        info: () => {},
        warn: (msg: string) => {
          warnings.push(msg)
        },
        error: () => {},
      }

      const engineWithLogger = new FluxEngine({
        storage,
        logger: mockLogger,
      })
      await engineWithLogger.init()

      const workflow = createWorkflow('same-version-test')
        .version('1.0.0')
        .input<{}>()
        .step('step1', async () => {})
        .step('step2', async () => {})
        .build()

      const result = await engineWithLogger.execute(workflow, {})

      const state = await storage.load(result.id)
      if (state) {
        state.status = 'failed'
        state.currentStep = 1
        await storage.save(state)
      }

      await engineWithLogger.resume(workflow, result.id, { fromStep: 1 })

      const versionWarnings = warnings.filter((w) => w.includes('version mismatch'))
      expect(versionWarnings).toHaveLength(0)
    })
  })

  describe('MemoryStorage version filtering', () => {
    let storage: MemoryStorage
    let engine: FluxEngine

    beforeEach(async () => {
      storage = new MemoryStorage()
      engine = new FluxEngine({ storage })
      await engine.init()
    })

    it('should filter workflows by version', async () => {
      const workflowV1 = createWorkflow('filter-test')
        .version('1.0.0')
        .input<{}>()
        .step('noop', async () => {})
        .build()

      const workflowV2 = createWorkflow('filter-test')
        .version('2.0.0')
        .input<{}>()
        .step('noop', async () => {})
        .build()

      await engine.execute(workflowV1, {})
      await engine.execute(workflowV1, {})
      await engine.execute(workflowV2, {})

      const v1Results = await engine.list({ version: '1.0.0' })
      expect(v1Results).toHaveLength(2)
      for (const r of v1Results) {
        expect(r.definitionVersion).toBe('1.0.0')
      }

      const v2Results = await engine.list({ version: '2.0.0' })
      expect(v2Results).toHaveLength(1)
      expect(v2Results[0].definitionVersion).toBe('2.0.0')

      const noResults = await engine.list({ version: '3.0.0' })
      expect(noResults).toHaveLength(0)
    })

    it('should combine version filter with other filters', async () => {
      const workflow = createWorkflow('combined-filter-test')
        .version('1.0.0')
        .input<{}>()
        .step('noop', async () => {})
        .build()

      await engine.execute(workflow, {})
      await engine.execute(workflow, {})

      const results = await engine.list({
        name: 'combined-filter-test',
        version: '1.0.0',
        status: 'completed',
        limit: 1,
      })

      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('combined-filter-test')
      expect(results[0].definitionVersion).toBe('1.0.0')
      expect(results[0].status).toBe('completed')
    })
  })
})
