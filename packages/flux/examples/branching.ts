/**
 * @fileoverview Branching workflow example
 *
 * Demonstrates branching with classify + when.
 *
 * @example
 * ```bash
 * bun run examples/branching.ts
 * ```
 */

import { createWorkflow, FluxEngine, MemoryStorage } from '../src'

const workflow = createWorkflow('branching-demo')
  .input<{ type: 'email' | 'slack' | 'both' }>()
  .step('classify', async (ctx) => {
    ctx.data.route = ctx.input.type
  })
  .step(
    'send-email',
    async (_ctx) => {
      console.log('✉️  Send email')
    },
    { when: (ctx) => ctx.data.route === 'email' || ctx.data.route === 'both' }
  )
  .step(
    'send-slack',
    async (_ctx) => {
      console.log('💬 Send slack')
    },
    { when: (ctx) => ctx.data.route === 'slack' || ctx.data.route === 'both' }
  )
  .commit('audit', async (ctx) => {
    console.log('🧾 Audit:', ctx.data.route)
  })

async function main() {
  const engine = new FluxEngine({ storage: new MemoryStorage() })

  console.log('\n--- email ---')
  await engine.execute(workflow, { type: 'email' })

  console.log('\n--- slack ---')
  await engine.execute(workflow, { type: 'slack' })

  console.log('\n--- both ---')
  await engine.execute(workflow, { type: 'both' })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
