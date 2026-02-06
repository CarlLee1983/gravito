import { beforeEach, describe, expect, it } from 'bun:test'
import { BatchExecutor, createWorkflow, FluxEngine, type WorkflowContext } from '../src'

describe('BatchExecutor', () => {
  let engine: FluxEngine

  beforeEach(() => {
    engine = new FluxEngine({ defaultRetries: 0 })
  })

  describe('execute()', () => {
    it('should execute all inputs in parallel', async () => {
      const workflow = createWorkflow('double')
        .input<{ value: number }>()
        .step('process', (ctx: WorkflowContext<{ value: number }, any>) => {
          ctx.data.result = ctx.input.value * 2
        })

      const executor = new BatchExecutor(engine)
      const result = await executor.execute(workflow, [
        { value: 1 },
        { value: 2 },
        { value: 3 },
        { value: 4 },
        { value: 5 },
      ])

      expect(result.total).toBe(5)
      expect(result.succeeded).toBe(5)
      expect(result.failed).toBe(0)
      expect(result.results).toHaveLength(5)
      expect(result.results[0]?.result?.data.result).toBe(2)
      expect(result.results[4]?.result?.data.result).toBe(10)
      expect(result.duration).toBeGreaterThanOrEqual(0)
    })

    it('should respect concurrency limit', async () => {
      let maxConcurrent = 0
      let currentConcurrent = 0

      const workflow = createWorkflow('concurrent')
        .input<{ id: number }>()
        .step('process', async (ctx: WorkflowContext<{ id: number }, any>) => {
          currentConcurrent++
          maxConcurrent = Math.max(maxConcurrent, currentConcurrent)
          await new Promise((r) => setTimeout(r, 50))
          ctx.data.id = ctx.input.id
          currentConcurrent--
        })

      const executor = new BatchExecutor(engine)
      const inputs = Array.from({ length: 10 }, (_, i) => ({ id: i }))

      await executor.execute(workflow, inputs, { concurrency: 3 })

      expect(maxConcurrent).toBeLessThanOrEqual(3)
    })

    it('should continue on error when continueOnError=true', async () => {
      const workflow = createWorkflow('may-fail')
        .input<{ value: number }>()
        .step('process', (ctx: WorkflowContext<{ value: number }, any>) => {
          if (ctx.input.value === 3) {
            throw new Error('Value 3 is not allowed')
          }
          ctx.data.result = ctx.input.value
        })

      const executor = new BatchExecutor(engine)
      const result = await executor.execute(
        workflow,
        [{ value: 1 }, { value: 2 }, { value: 3 }, { value: 4 }, { value: 5 }],
        { continueOnError: true }
      )

      expect(result.total).toBe(5)
      expect(result.succeeded).toBe(4)
      expect(result.failed).toBe(1)
      expect(result.results[2]?.success).toBe(false)
      expect(result.results[2]?.error?.message).toBe('Value 3 is not allowed')
    })

    it('should stop on first error when continueOnError=false', async () => {
      const workflow = createWorkflow('stop-on-error')
        .input<{ value: number }>()
        .step('process', async (ctx: WorkflowContext<{ value: number }, any>) => {
          await new Promise((r) => setTimeout(r, 10))
          if (ctx.input.value === 2) {
            throw new Error('Stop here')
          }
          ctx.data.result = ctx.input.value
        })

      const executor = new BatchExecutor(engine)
      const result = await executor.execute(
        workflow,
        [{ value: 1 }, { value: 2 }, { value: 3 }, { value: 4 }, { value: 5 }],
        { continueOnError: false, concurrency: 1 }
      )

      expect(result.failed).toBeGreaterThanOrEqual(1)
      const abortedItems = result.results.filter((r) => r.error?.message === 'Execution aborted')
      expect(abortedItems.length).toBeGreaterThan(0)
    })

    it('should call onProgress callback', async () => {
      const progressCalls: Array<{ completed: number; total: number }> = []

      const workflow = createWorkflow('progress')
        .input<{ id: number }>()
        .step('process', (ctx: WorkflowContext<{ id: number }, any>) => {
          ctx.data.id = ctx.input.id
        })

      const executor = new BatchExecutor(engine)
      await executor.execute(workflow, [{ id: 1 }, { id: 2 }, { id: 3 }], {
        onProgress: (completed, total, _result) => {
          progressCalls.push({ completed, total })
        },
      })

      expect(progressCalls).toHaveLength(3)
      expect(progressCalls[2]).toEqual({ completed: 3, total: 3 })
    })

    it('should respect AbortSignal', async () => {
      const controller = new AbortController()

      const workflow = createWorkflow('abortable')
        .input<{ id: number }>()
        .step('process', async (ctx: WorkflowContext<{ id: number }, any>) => {
          await new Promise((r) => setTimeout(r, 100))
          ctx.data.id = ctx.input.id
        })

      const executor = new BatchExecutor(engine)

      setTimeout(() => controller.abort(), 50)

      const result = await executor.execute(
        workflow,
        [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
        { signal: controller.signal, concurrency: 1 }
      )

      const abortedItems = result.results.filter((r) => r.error?.message === 'Execution aborted')
      expect(abortedItems.length).toBeGreaterThan(0)
    })
  })

  describe('executeMany()', () => {
    it('should execute different workflows', async () => {
      const doubleWorkflow = createWorkflow('double')
        .input<{ value: number }>()
        .step('process', (ctx: WorkflowContext<{ value: number }, any>) => {
          ctx.data.result = ctx.input.value * 2
        })
        .build()

      const tripleWorkflow = createWorkflow('triple')
        .input<{ value: number }>()
        .step('process', (ctx: WorkflowContext<{ value: number }, any>) => {
          ctx.data.result = ctx.input.value * 3
        })
        .build()

      const executor = new BatchExecutor(engine)
      const result = await executor.executeMany([
        { workflow: doubleWorkflow, input: { value: 5 } },
        { workflow: tripleWorkflow, input: { value: 5 } },
        { workflow: doubleWorkflow, input: { value: 10 } },
      ])

      expect(result.total).toBe(3)
      expect(result.succeeded).toBe(3)
      expect(result.results[0]?.result?.data.result).toBe(10)
      expect(result.results[1]?.result?.data.result).toBe(15)
      expect(result.results[2]?.result?.data.result).toBe(20)
    })
  })
})

describe('FluxEngine.executeBatch()', () => {
  it('should work as convenience wrapper', async () => {
    const engine = new FluxEngine()

    const workflow = createWorkflow('batch-test')
      .input<{ n: number }>()
      .step('square', (ctx: WorkflowContext<{ n: number }, any>) => {
        ctx.data.result = ctx.input.n * ctx.input.n
      })

    const result = await engine.executeBatch(workflow, [{ n: 2 }, { n: 3 }, { n: 4 }])

    expect(result.total).toBe(3)
    expect(result.succeeded).toBe(3)
    expect(result.results[0]?.result?.data.result).toBe(4)
    expect(result.results[1]?.result?.data.result).toBe(9)
    expect(result.results[2]?.result?.data.result).toBe(16)
  })
})
