/**
 * @fileoverview Trace Viewer example
 *
 * Generates a trace file for the Flux Dev Viewer.
 *
 * @example
 * ```bash
 * bun run examples/trace-viewer.ts
 * flux dev --trace ./.flux/trace.ndjson --port 4280
 * ```
 */

import { resolve } from 'node:path'
import { createWorkflow, FluxEngine, JsonFileTraceSink, MemoryStorage } from '../src'

const tracePath = resolve('./.flux/trace.ndjson')

const workflow = createWorkflow('event-routing')
  .input<{ payload: { type: string; priority: number } }>()
  .step('classify', async (ctx) => {
    ctx.data.route = ctx.input.payload.priority > 7 ? 'risk' : 'auto'
  })
  .step(
    'auto-handle',
    async (ctx) => {
      ctx.data.result = await autoProcess(ctx.input.payload)
    },
    { when: (ctx) => ctx.data.route === 'auto' }
  )
  .step(
    'risk-audit',
    async (ctx) => {
      ctx.data.auditId = await auditQueue.enqueue(ctx.input.payload)
    },
    { when: (ctx) => ctx.data.route === 'risk' }
  )
  .commit('notify', async (ctx) => {
    await notifier.send(ctx.data)
  })

let flakyAttempt = 0
const retryFlow = createWorkflow('retry-demo')
  .input<{ orderId: string }>()
  .step(
    'charge',
    async () => {
      flakyAttempt += 1
      if (flakyAttempt < 2) {
        throw new Error('Transient failure')
      }
    },
    { retries: 2, timeout: 5000 }
  )

const engine = new FluxEngine({
  storage: new MemoryStorage(),
  trace: new JsonFileTraceSink({ path: tracePath, reset: true }),
})

async function main() {
  console.log('Writing trace to:', tracePath)
  await engine.execute(workflow, { payload: { type: 'order.created', priority: 3 } })
  await engine.execute(retryFlow, { orderId: 'ORD-001' })
  console.log('Trace ready. Run: flux dev --trace ./.flux/trace.ndjson --port 4280')
}

const autoProcess = async (_payload: unknown) => ({ ok: true })
const auditQueue = {
  async enqueue(_payload: unknown) {
    return `audit-${Date.now()}`
  },
}
const notifier = {
  async send(_data: unknown) {},
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
