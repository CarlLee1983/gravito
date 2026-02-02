import { afterEach, beforeEach, describe, expect, jest, spyOn, test } from 'bun:test'
import { createWorkflow, FluxEngine, MemoryLockProvider } from '../src'

describe('Flux v1.1 - New Features', () => {
  test('Cron Trigger - should execute scheduled workflow', async () => {
    const engine = new FluxEngine()
    await engine.init()

    let executed = false
    const workflow = createWorkflow('cron-test')
      .step('test', () => {
        executed = true
      })
      .build()

    // Schedule to run every second (actually we will just trigger it manually if we could,
    // but here we wait for a short bit. cron-parser supports seconds if 6 parts are provided)
    // "* * * * * *" means every second in some parsers, but cron-parser default is 5 parts.
    // We use "* * * * * *" for 6 parts.
    engine.schedule('* * * * * *', workflow, {}, 'test-schedule')

    // Wait for up to 2 seconds
    await new Promise((resolve) => setTimeout(resolve, 2000))

    expect(executed).toBe(true)
    await engine.close()
  })

  test('Data Optimizer - should optimize large data during persistence', async () => {
    const engine = new FluxEngine({
      optimizer: {
        enabled: true,
        threshold: 100, // 100 bytes
      },
    })

    const largeObject = { text: 'a'.repeat(200) } // > 100 bytes
    const workflow = createWorkflow('optimizer-test')
      .data<{ payload: any }>()
      .step('modify', (ctx) => {
        ctx.data.payload = largeObject
      })
      .build()

    const result = await engine.execute(workflow, {})
    expect(result.status).toBe('completed')

    const state = await engine.get(result.id)
    expect(state?.data.payload.__ref).toBe(true) // Should be a reference
  })

  test('Cluster Mode - should acquire lock during execution', async () => {
    const lockProvider = new MemoryLockProvider()
    const acquireSpy = spyOn(lockProvider, 'acquire')

    const engine = new FluxEngine({
      lockProvider,
    })

    const workflow = createWorkflow('lock-test')
      .step('slow', async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
      })
      .build()

    await engine.execute(workflow, {})

    expect(acquireSpy).toHaveBeenCalled()
  })

  test('Compensation Failed Status', async () => {
    const engine = new FluxEngine({
      defaultRetries: 0,
    })

    const workflow = createWorkflow('comp-fail-test')
      .step('s1', () => {}, {
        compensate: () => {
          throw new Error('Compensation backup failed')
        },
      })
      .step('s2', () => {
        throw new Error('Force fail')
      })
      .build()

    const result = await engine.execute(workflow, {})
    expect(result.status).toBe('compensation_failed')
  })
})
