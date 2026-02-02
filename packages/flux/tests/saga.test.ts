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
    expect(result.status).toBe('compensation_failed')
    // When compensation fails, the engine catches the error and marks the workflow as failed,
    // but the step status in history remains 'compensating' as set before the compensation attempt.
    expect(result.history[0].status).toBe('compensating')
  })

  test('should handle nested saga compensations with data persistence', async () => {
    // This test simulates a complex order process:
    // 1. Reserve Inventory (Compensate: Release Inventory)
    // 2. Charge Payment (Compensate: Refund Payment)
    // 3. Generate Shipping Label (Fails -> triggers rollback)

    const inventory = [] as string[]
    const payments = [] as number[]
    const logs = [] as string[]

    const workflow = createWorkflow('complex-saga')
      .input<{ productId: string; price: number }>()
      .step(
        'reserve-inventory',
        async (ctx) => {
          inventory.push(ctx.input.productId)
          ctx.data.reservationId = `res-${ctx.input.productId}`
          logs.push('reserve')
        },
        {
          compensate: async (ctx) => {
            const index = inventory.indexOf(ctx.input.productId)
            if (index > -1) {
              inventory.splice(index, 1)
            }
            logs.push(`release-${ctx.data.reservationId}`)
          },
        }
      )
      .step(
        'charge-payment',
        async (ctx) => {
          payments.push(ctx.input.price)
          ctx.data.transactionId = `tx-${Date.now()}`
          logs.push('charge')
        },
        {
          compensate: async (ctx) => {
            const index = payments.indexOf(ctx.input.price)
            if (index > -1) {
              payments.splice(index, 1)
            }
            logs.push(`refund-${ctx.data.transactionId}`)
          },
        }
      )
      .step('ship', async () => {
        logs.push('ship-attempt')
        throw new Error('Shipping Service Unavailable')
      })

    const engine = new FluxEngine({
      storage: new MemoryStorage(),
      defaultRetries: 0,
    })

    const result = await engine.execute(workflow, { productId: 'iphone-15', price: 999 })

    expect(result.status).toBe('rolled_back')

    // Verify execution order
    // 1. reserve
    // 2. charge
    // 3. ship-attempt (failed)
    // 4. refund (compensation for charge)
    // 5. release (compensation for reserve)

    expect(logs).toEqual([
      'reserve',
      'charge',
      'ship-attempt',
      expect.stringMatching(/^refund-tx-/),
      'release-res-iphone-15',
    ])

    // Verify side effects were reversed
    expect(inventory).toHaveLength(0)
    expect(payments).toHaveLength(0)

    // Verify history status
    expect(result.history.find((h) => h.name === 'reserve-inventory')?.status).toBe('compensated')
    expect(result.history.find((h) => h.name === 'charge-payment')?.status).toBe('compensated')
    expect(result.history.find((h) => h.name === 'ship')?.status).toBe('failed')
  })
})
