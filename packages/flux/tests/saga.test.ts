import { describe, expect, jest, test } from 'bun:test'
import { createWorkflow, FluxEngine, MemoryStorage } from '../src'

describe('FluxEngine Saga Pattern', () => {
  test('should execute compensate handlers on failure', async () => {
    const compensateStep1 = jest.fn()
    const compensateStep2 = jest.fn()

    const workflow = createWorkflow('saga-flow')
      .step('step1', async () => {}, { compensate: compensateStep1 })
      .step('step2', async () => {}, { compensate: compensateStep2 })
      .step('step3', async () => {
        throw new Error('Boom!')
      })

    const engine = new FluxEngine({
      storage: new MemoryStorage(),
      defaultRetries: 0,
    })
    const result = await engine.execute(workflow, {})

    expect(result.status).toBe('rolled_back')
    expect(compensateStep2).toHaveBeenCalled()
    expect(compensateStep1).toHaveBeenCalled()

    // Check history statuses
    expect(result.history[0].status).toBe('compensated')
    expect(result.history[1].status).toBe('compensated')
    expect(result.history[2].status).toBe('failed')
  })

  test('should not compensate steps that did not complete', async () => {
    const compensateStep1 = jest.fn()
    const compensateStep2 = jest.fn() // Should NOT be called because step 2 fails

    const workflow = createWorkflow('partial-saga')
      .step('step1', async () => {}, { compensate: compensateStep1 })
      .step(
        'step2',
        async () => {
          throw new Error('Fail here')
        },
        { compensate: compensateStep2 }
      )

    const engine = new FluxEngine({
      storage: new MemoryStorage(),
      defaultRetries: 0,
    })
    const result = await engine.execute(workflow, {})

    expect(result.status).toBe('rolled_back')
    expect(compensateStep1).toHaveBeenCalled()
    expect(compensateStep2).not.toHaveBeenCalled()

    expect(result.history[0].status).toBe('compensated')
    expect(result.history[1].status).toBe('failed')
  })

  test('should handle compensation failure', async () => {
    const workflow = createWorkflow('broken-saga')
      .step('step1', async () => {}, {
        compensate: async () => {
          throw new Error('Compensate failed!')
        },
      })
      .step('step2', async () => {
        throw new Error('Original error')
      })

    const engine = new FluxEngine({
      storage: new MemoryStorage(),
      defaultRetries: 0,
    })
    const result = await engine.execute(workflow, {})

    // If compensation fails, the whole workflow fails (critical failure)
    expect(result.status).toBe('failed')
    expect(result.history[0].status).toBe('compensating') // Stuck in compensating or failed?
    // Types set it to compensating before call. Engine catches error and sets WF to failed.
    // Step status remains 'compensating' in memory if using MemoryStorage ref,
    // or whatever the implementation decides.
    // Let's check status.
  })
})
