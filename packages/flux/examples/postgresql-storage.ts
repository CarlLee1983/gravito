/**
 * PostgreSQL Storage Example
 *
 * This example demonstrates how to use PostgreSQL as a persistent storage backend for Flux workflows.
 *
 * Prerequisites:
 * - PostgreSQL server running
 * - Database created (e.g., CREATE DATABASE flux_demo;)
 * - Connection URL set via environment variable or configuration
 *
 * Installation:
 *   npm install @gravito/flux pg
 *   # or
 *   bun add @gravito/flux pg
 *
 * Run:
 *   POSTGRES_URL="postgresql://user:password@localhost:5432/flux_demo" bun run examples/postgresql-storage.ts
 */

import { createWorkflow, FluxEngine } from '../src/index.node'
import { PostgreSQLStorage } from '../src/storage/PostgreSQLStorage'

const connectionString = process.env.POSTGRES_URL ?? 'postgresql://localhost:5432/flux_demo'

const storage = new PostgreSQLStorage({
  connectionString,
  tableName: 'flux_workflows',
})

const engine = new FluxEngine({ storage })

const orderWorkflow = createWorkflow('order-processing')
  .input<{ orderId: string; items: Array<{ productId: string; quantity: number }> }>()
  .step('validate-inventory', async (ctx) => {
    console.log(`[Step 1/4] Validating inventory for order ${ctx.input.orderId}`)
    ctx.data.validated = true
  })
  .step(
    'reserve-items',
    async (ctx) => {
      console.log(`[Step 2/4] Reserving ${ctx.input.items.length} items`)
      ctx.data.reservationId = `rsv_${Date.now()}`
    },
    {
      compensate: async (ctx) => {
        console.log(`[Compensation] Releasing reservation ${ctx.data.reservationId}`)
      },
    }
  )
  .commit('charge-payment', async (ctx) => {
    console.log('[Step 3/4] Charging payment')
    ctx.data.paymentId = `pay_${Date.now()}`
  })
  .commit('send-confirmation', async (ctx) => {
    console.log('[Step 4/4] Sending confirmation email')
    ctx.data.emailSent = true
  })

async function main() {
  console.log('🔌 Connecting to PostgreSQL...')
  await storage.init()
  console.log('✅ Connected to PostgreSQL\n')

  console.log('📦 Executing order workflow...')
  const result = await engine.execute(orderWorkflow, {
    orderId: 'ORD-12345',
    items: [
      { productId: 'PROD-001', quantity: 2 },
      { productId: 'PROD-002', quantity: 1 },
    ],
  })

  console.log('\n📊 Workflow Result:')
  console.log(`  Status: ${result.status}`)
  console.log(`  Workflow ID: ${result.id}`)
  console.log(`  Data:`, result.data)

  console.log('\n🔍 Querying workflows from PostgreSQL...')
  const allWorkflows = await storage.list({ limit: 10 })
  console.log(`  Found ${allWorkflows.length} workflow(s)`)

  const completedWorkflows = await storage.list({ status: 'completed' })
  console.log(`  Completed: ${completedWorkflows.length}`)

  const runningWorkflows = await storage.list({ status: 'running' })
  console.log(`  Running: ${runningWorkflows.length}`)

  console.log('\n💾 Loading workflow from storage...')
  const loaded = await storage.load(result.id)
  if (loaded) {
    console.log(`  Loaded workflow: ${loaded.name}`)
    console.log(`  Status: ${loaded.status}`)
    console.log(`  Steps completed: ${loaded.history.length}`)
  }

  console.log('\n🧹 Cleaning up...')
  await storage.close()
  console.log('✅ Done!')
}

main().catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})
