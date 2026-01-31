import { describe, expect, it } from 'bun:test'
import { ParallelExecutor } from '../src/engine/ParallelExecutor'
import type { StepDefinition, StepExecution, WorkflowContext } from '../src/types'

describe('ParallelExecutor', () => {
  const createMockContext = (): WorkflowContext => ({
    id: 'test-id',
    name: 'test-workflow',
    input: {},
    data: {},
    status: 'running',
    currentStep: 0,
    history: [],
    version: 1,
  })

  const createMockStep = (name: string): StepDefinition => ({
    name,
    handler: async () => {},
    commit: false,
  })

  const createMockExecution = (
    name: string,
    status: 'completed' | 'failed' = 'completed'
  ): StepExecution => ({
    name,
    status,
    startedAt: new Date(),
    completedAt: status === 'completed' ? new Date() : undefined,
    error: status === 'failed' ? 'Test error' : undefined,
    retries: 0,
  })

  it('should execute all steps in parallel successfully', async () => {
    const executor = new ParallelExecutor()
    const ctx = createMockContext()

    const steps = [createMockStep('step1'), createMockStep('step2'), createMockStep('step3')]

    let executionCount = 0
    const executeStep = async (step: StepDefinition, _ctx: WorkflowContext) => {
      executionCount++
      return {
        ctx,
        execution: createMockExecution(step.name),
      }
    }

    const result = await executor.executeGroup(steps, ctx, executeStep)

    expect(result.successes).toHaveLength(3)
    expect(result.failures).toHaveLength(0)
    expect(executionCount).toBe(3)
  })

  it('should handle partial failures in parallel execution', async () => {
    const executor = new ParallelExecutor()
    const ctx = createMockContext()

    const steps = [createMockStep('step1'), createMockStep('step2'), createMockStep('step3')]

    const executeStep = async (step: StepDefinition, _ctx: WorkflowContext) => {
      if (step.name === 'step2') {
        throw new Error('Step 2 failed')
      }
      return {
        ctx,
        execution: createMockExecution(step.name),
      }
    }

    const result = await executor.executeGroup(steps, ctx, executeStep)

    expect(result.successes).toHaveLength(2)
    expect(result.failures).toHaveLength(1)
    expect(result.failures[0].error.message).toBe('Step 2 failed')
  })

  it('should handle all steps failing', async () => {
    const executor = new ParallelExecutor()
    const ctx = createMockContext()

    const steps = [createMockStep('step1'), createMockStep('step2')]

    const executeStep = async (_step: StepDefinition, _ctx: WorkflowContext) => {
      throw new Error('All steps fail')
    }

    const result = await executor.executeGroup(steps, ctx, executeStep)

    expect(result.successes).toHaveLength(0)
    expect(result.failures).toHaveLength(2)
  })

  it('should execute steps concurrently', async () => {
    const executor = new ParallelExecutor()
    const ctx = createMockContext()

    const steps = [createMockStep('step1'), createMockStep('step2'), createMockStep('step3')]

    const startTimes: number[] = []
    const executeStep = async (step: StepDefinition, _ctx: WorkflowContext) => {
      startTimes.push(Date.now())
      await new Promise((resolve) => setTimeout(resolve, 50))
      return {
        ctx,
        execution: createMockExecution(step.name),
      }
    }

    const start = Date.now()
    await executor.executeGroup(steps, ctx, executeStep)
    const duration = Date.now() - start

    expect(duration).toBeLessThan(200)

    const maxTimeDiff = Math.max(...startTimes) - Math.min(...startTimes)
    expect(maxTimeDiff).toBeLessThan(50)
  })

  it('should handle non-Error rejections', async () => {
    const executor = new ParallelExecutor()
    const ctx = createMockContext()

    const steps = [createMockStep('step1')]

    const executeStep = async (_step: StepDefinition, _ctx: WorkflowContext) => {
      throw 'String error'
    }

    const result = await executor.executeGroup(steps, ctx, executeStep)

    expect(result.successes).toHaveLength(0)
    expect(result.failures).toHaveLength(1)
    expect(result.failures[0].error.message).toBe('String error')
  })

  it('should preserve execution results for successful steps', async () => {
    const executor = new ParallelExecutor()
    const ctx = createMockContext()

    const steps = [createMockStep('step1'), createMockStep('step2')]

    const executeStep = async (step: StepDefinition, _ctx: WorkflowContext) => {
      const execution = createMockExecution(step.name)
      execution.completedAt = new Date()
      return { ctx, execution }
    }

    const result = await executor.executeGroup(steps, ctx, executeStep)

    expect(result.successes).toHaveLength(2)
    expect(result.successes[0].completedAt).toBeInstanceOf(Date)
    expect(result.successes[1].completedAt).toBeInstanceOf(Date)
  })
})
