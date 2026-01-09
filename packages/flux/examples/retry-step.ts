/**
 * @fileoverview Retry step example
 *
 * Demonstrates rerunning a specific step after a failure.
 *
 * @example
 * ```bash
 * bun run examples/retry-step.ts
 * ```
 */

import { createWorkflow, FluxEngine, MemoryStorage } from '../src'

let shouldFail = true

const workflow = createWorkflow('retry-demo')
  .input<{ orderId: string }>()
  .step('charge', async () => {
    if (shouldFail) {
      throw new Error('Transient failure')
    }
  })
  .commit('notify', async () => {})

async function main() {
  const engine = new FluxEngine({ storage: new MemoryStorage() })

  const first = await engine.execute(workflow, { orderId: 'ORD-001' })
  console.log('First status:', first.status, first.error?.message ?? '')

  shouldFail = false
  const retry = await engine.retryStep(workflow, first.id, 'charge')

  console.log('Retry status:', retry?.status)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
