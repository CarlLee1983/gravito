import { beforeEach, describe, expect, test } from 'bun:test'
import { FluxEngine } from '../src'
import { createWorkflow } from '../src/builder/WorkflowBuilder'
import { MemoryStorage } from '../src/storage/MemoryStorage'

describe('Parallel Execution Integration', () => {
  let engine: FluxEngine

  beforeEach(() => {
    engine = new FluxEngine({
      storage: new MemoryStorage(),
      defaultRetries: 0,
    })
  })

  test('should execute parallel steps concurrently', async () => {
    const executionOrder: string[] = []
    const delays: Record<string, number> = {
      'fetch-user': 100,
      'fetch-orders': 50,
      'fetch-profile': 75,
    }

    const workflow = createWorkflow('parallel-data-fetch')
      .input<{ userId: string }>()
      .stepParallel([
        {
          name: 'fetch-user',
          handler: async (ctx) => {
            executionOrder.push('fetch-user-start')
            await new Promise((resolve) => setTimeout(resolve, delays['fetch-user']))
            ctx.data.user = { id: ctx.input.userId, name: 'John Doe' }
            executionOrder.push('fetch-user-end')
          },
        },
        {
          name: 'fetch-orders',
          handler: async (ctx) => {
            executionOrder.push('fetch-orders-start')
            await new Promise((resolve) => setTimeout(resolve, delays['fetch-orders']))
            ctx.data.orders = [{ id: '1', total: 100 }]
            executionOrder.push('fetch-orders-end')
          },
        },
        {
          name: 'fetch-profile',
          handler: async (ctx) => {
            executionOrder.push('fetch-profile-start')
            await new Promise((resolve) => setTimeout(resolve, delays['fetch-profile']))
            ctx.data.profile = { avatar: 'avatar.png' }
            executionOrder.push('fetch-profile-end')
          },
        },
      ])
      .step('aggregate', async (ctx) => {
        ctx.data.result = {
          user: ctx.data.user,
          orders: ctx.data.orders,
          profile: ctx.data.profile,
        }
      })

    const startTime = Date.now()
    const result = await engine.execute(workflow, { userId: 'user-123' })
    const duration = Date.now() - startTime

    expect(result.status).toBe('completed')
    expect(result.data.result).toEqual({
      user: { id: 'user-123', name: 'John Doe' },
      orders: [{ id: '1', total: 100 }],
      profile: { avatar: 'avatar.png' },
    })

    expect(executionOrder[0]).toBe('fetch-user-start')
    expect(executionOrder[1]).toBe('fetch-orders-start')
    expect(executionOrder[2]).toBe('fetch-profile-start')
    expect(executionOrder[3]).toBe('fetch-orders-end')
    expect(executionOrder[4]).toBe('fetch-profile-end')
    expect(executionOrder[5]).toBe('fetch-user-end')

    expect(duration).toBeLessThan(150)
  })

  test('should handle parallel step failures correctly', async () => {
    const workflow = createWorkflow('parallel-with-failure')
      .input<{ shouldFail: boolean }>()
      .stepParallel([
        {
          name: 'step1',
          handler: async (ctx) => {
            ctx.data.step1 = 'completed'
          },
        },
        {
          name: 'step2',
          handler: async (ctx) => {
            if (ctx.input.shouldFail) {
              throw new Error('Step 2 failed')
            }
            ctx.data.step2 = 'completed'
          },
        },
        {
          name: 'step3',
          handler: async (ctx) => {
            ctx.data.step3 = 'completed'
          },
        },
      ])

    const result = await engine.execute(workflow, { shouldFail: true })

    expect(result.status).toBe('failed')
    expect(result.error?.message).toBe('Step 2 failed')
    expect(result.history[0]?.status).toBe('completed')
    expect(result.history[1]?.status).toBe('failed')
    expect(result.history[2]?.status).toBe('completed')
  })

  test('should compensate parallel steps on failure', async () => {
    const compensated: string[] = []

    const workflow = createWorkflow('parallel-saga')
      .input<{ shouldFail: boolean }>()
      .stepParallel([
        {
          name: 'reserve-flight',
          handler: async (ctx) => {
            ctx.data.flightId = 'FL123'
          },
          compensate: async (_ctx) => {
            compensated.push('flight')
          },
        },
        {
          name: 'reserve-hotel',
          handler: async (ctx) => {
            ctx.data.hotelId = 'HT456'
          },
          compensate: async (_ctx) => {
            compensated.push('hotel')
          },
        },
        {
          name: 'reserve-car',
          handler: async (ctx) => {
            ctx.data.carId = 'CR789'
          },
          compensate: async (_ctx) => {
            compensated.push('car')
          },
        },
      ])
      .step('charge-payment', async (ctx) => {
        if (ctx.input.shouldFail) {
          throw new Error('Payment failed')
        }
      })

    const result = await engine.execute(workflow, { shouldFail: true })

    expect(result.status).toBe('rolled_back')
    expect(compensated).toContain('flight')
    expect(compensated).toContain('hotel')
    expect(compensated).toContain('car')
    expect(compensated.length).toBe(3)
  })

  test('should execute multiple parallel groups sequentially', async () => {
    const executionOrder: string[] = []

    const workflow = createWorkflow('multiple-parallel-groups')
      .input<{}>()
      .stepParallel([
        {
          name: 'group1-step1',
          handler: async (_ctx) => {
            executionOrder.push('group1-step1')
            await new Promise((resolve) => setTimeout(resolve, 10))
          },
        },
        {
          name: 'group1-step2',
          handler: async (_ctx) => {
            executionOrder.push('group1-step2')
            await new Promise((resolve) => setTimeout(resolve, 10))
          },
        },
      ])
      .step('sequential-middle', async (_ctx) => {
        executionOrder.push('sequential-middle')
      })
      .stepParallel([
        {
          name: 'group2-step1',
          handler: async (_ctx) => {
            executionOrder.push('group2-step1')
            await new Promise((resolve) => setTimeout(resolve, 10))
          },
        },
        {
          name: 'group2-step2',
          handler: async (_ctx) => {
            executionOrder.push('group2-step2')
            await new Promise((resolve) => setTimeout(resolve, 10))
          },
        },
      ])

    const result = await engine.execute(workflow, {})

    expect(result.status).toBe('completed')

    const group1Index = Math.max(
      executionOrder.indexOf('group1-step1'),
      executionOrder.indexOf('group1-step2')
    )
    const sequentialIndex = executionOrder.indexOf('sequential-middle')
    const group2Index = Math.min(
      executionOrder.indexOf('group2-step1'),
      executionOrder.indexOf('group2-step2')
    )

    expect(group1Index).toBeLessThan(sequentialIndex)
    expect(sequentialIndex).toBeLessThan(group2Index)
  })

  test('should verify parallel execution is faster than sequential', async () => {
    const stepDelay = 100

    const parallelWorkflow = createWorkflow('parallel-timing')
      .input<{}>()
      .stepParallel([
        {
          name: 'step1',
          handler: async () => {
            await new Promise((resolve) => setTimeout(resolve, stepDelay))
          },
        },
        {
          name: 'step2',
          handler: async () => {
            await new Promise((resolve) => setTimeout(resolve, stepDelay))
          },
        },
        {
          name: 'step3',
          handler: async () => {
            await new Promise((resolve) => setTimeout(resolve, stepDelay))
          },
        },
      ])

    const sequentialWorkflow = createWorkflow('sequential-timing')
      .input<{}>()
      .step('step1', async () => {
        await new Promise((resolve) => setTimeout(resolve, stepDelay))
      })
      .step('step2', async () => {
        await new Promise((resolve) => setTimeout(resolve, stepDelay))
      })
      .step('step3', async () => {
        await new Promise((resolve) => setTimeout(resolve, stepDelay))
      })

    const parallelStart = Date.now()
    await engine.execute(parallelWorkflow, {})
    const parallelDuration = Date.now() - parallelStart

    const sequentialStart = Date.now()
    await engine.execute(sequentialWorkflow, {})
    const sequentialDuration = Date.now() - sequentialStart

    expect(parallelDuration).toBeLessThan(stepDelay * 1.5)
    expect(sequentialDuration).toBeGreaterThan(stepDelay * 2.5)
    expect(parallelDuration).toBeLessThan(sequentialDuration / 2)
  })

  test('should handle empty parallel groups gracefully', async () => {
    const workflow = createWorkflow('empty-parallel')
      .input<{}>()
      .stepParallel([])
      .step('after', async (ctx) => {
        ctx.data.afterExecuted = true
      })

    const result = await engine.execute(workflow, {})

    expect(result.status).toBe('completed')
    expect(result.data.afterExecuted).toBe(true)
  })

  test('should maintain data consistency across parallel steps', async () => {
    const workflow = createWorkflow('parallel-data-consistency')
      .input<{ initialValue: number }>()
      .step('init', async (ctx) => {
        ctx.data.counter = ctx.input.initialValue
        ctx.data.results = []
      })
      .stepParallel([
        {
          name: 'add1',
          handler: async (ctx) => {
            const value = ctx.data.counter + 1
            await new Promise((resolve) => setTimeout(resolve, 10))
            ctx.data.results.push(value)
          },
        },
        {
          name: 'add2',
          handler: async (ctx) => {
            const value = ctx.data.counter + 2
            await new Promise((resolve) => setTimeout(resolve, 10))
            ctx.data.results.push(value)
          },
        },
        {
          name: 'add3',
          handler: async (ctx) => {
            const value = ctx.data.counter + 3
            await new Promise((resolve) => setTimeout(resolve, 10))
            ctx.data.results.push(value)
          },
        },
      ])

    const result = await engine.execute(workflow, { initialValue: 10 })

    expect(result.status).toBe('completed')
    expect(result.data.counter).toBe(10)
    expect(result.data.results.sort()).toEqual([11, 12, 13])
  })
})
