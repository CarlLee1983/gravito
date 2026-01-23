import { describe, expect, test } from 'bun:test'
import { createWorkflow, Flux, FluxEngine, MemoryStorage } from '../src'
import type { WorkflowContext } from '../src/types'

describe('FluxEngine Async Signals', () => {
  test('should suspend workflow when step returns Flux.wait', async () => {
    const workflow = createWorkflow('suspend-flow')
      .step('step1', (_ctx: WorkflowContext<any, any>) => {})
      .step('wait', (_ctx: WorkflowContext<any, any>) => Flux.wait('signal-a'))
      .step('step3', (_ctx: WorkflowContext<any, any>) => {})

    const engine = new FluxEngine({ storage: new MemoryStorage() })
    const result = await engine.execute(workflow, {})

    expect(result.status).toBe('suspended')
    expect(result.history[1].status).toBe('suspended')
    expect(result.history[1].waitingFor).toBe('signal-a')
    expect(result.history[2].status).toBe('pending')
  })

  test('should resume suspended workflow via signal', async () => {
    const workflow = createWorkflow('signal-flow')
      .input<{ value: number }>()
      .step('wait', (_ctx: WorkflowContext<{ value: number }, any>) => Flux.wait('proceed'))
      .step('finish', (ctx: WorkflowContext<{ value: number }, any>) => {
        const signalData = ctx.history[0].output as { multiplier: number }
        ctx.data.result = ctx.input.value * signalData.multiplier
      })

    const engine = new FluxEngine({ storage: new MemoryStorage() })

    const startResult = await engine.execute(workflow, { value: 10 })
    expect(startResult.status).toBe('suspended')

    const endResult = await engine.signal(workflow, startResult.id, 'proceed', { multiplier: 2 })

    expect(endResult.status).toBe('completed')
    expect(endResult.data.result).toBe(20)
    expect(endResult.history[0].status).toBe('completed')
    expect(endResult.history[0].output).toEqual({ multiplier: 2 })
  })

  test('should fail if signaling wrong workflow', async () => {
    const workflow = createWorkflow('fail-flow').step('s1', (_ctx: WorkflowContext<any, any>) => {})
    const engine = new FluxEngine({ storage: new MemoryStorage() })

    const result = await engine.execute(workflow, {})

    expect(engine.signal(workflow, result.id, 'any')).rejects.toThrow('Workflow is not suspended')
  })

  test('should fail if sending wrong signal name', async () => {
    const workflow = createWorkflow('wrong-signal').step(
      'wait',
      (_ctx: WorkflowContext<any, any>) => Flux.wait('correct-signal')
    )

    const engine = new FluxEngine({ storage: new MemoryStorage() })
    const result = await engine.execute(workflow, {})

    expect(engine.signal(workflow, result.id, 'wrong-signal')).rejects.toThrow(
      'Workflow waiting for signal "correct-signal", received "wrong-signal"'
    )
  })
})
