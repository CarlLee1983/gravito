/**
 * @fileoverview 電商訂單處理工作流程
 *
 * 展示完整的訂單處理流程，包含庫存檢查、付款、通知。
 *
 * @example
 * ```bash
 * bun run examples/order-fulfillment.ts
 * ```
 */

import { createWorkflow, FluxEngine, MemoryStorage } from '../src'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface OrderInput {
  orderId: string
  userId: string
  items: { productId: string; qty: number; price: number }[]
}

// ─────────────────────────────────────────────────────────────
// Mock Services (replace with real implementations)
// ─────────────────────────────────────────────────────────────

const db = {
  products: {
    async getStock(productId: string): Promise<number> {
      console.log(`  📦 Checking stock for ${productId}`)
      return Math.floor(Math.random() * 100) + 10
    },
  },
}

const inventory = {
  async reserve(items: { productId: string; qty: number }[]): Promise<string[]> {
    console.log(`  🔒 Reserving ${items.length} items`)
    return items.map((_, i) => `RES-${Date.now()}-${i}`)
  },
  async deduct(reservationIds: string[]): Promise<void> {
    console.log(`  ✅ Deducting ${reservationIds.length} reservations`)
  },
}

const payment = {
  async charge(orderId: string, amount: number): Promise<{ transactionId: string }> {
    console.log(`  💳 Charging $${amount} for order ${orderId}`)
    await new Promise((r) => setTimeout(r, 500)) // Simulate API call
    return { transactionId: `TXN-${Date.now()}` }
  },
}

const email = {
  async send(userId: string, template: string, _data: unknown): Promise<void> {
    console.log(`  📧 Sending ${template} email to user ${userId}`)
  },
}

// ─────────────────────────────────────────────────────────────
// Workflow Definition
// ─────────────────────────────────────────────────────────────

const orderWorkflow = createWorkflow('order-fulfillment')
  .input<OrderInput>()
  .step('validate', async (ctx) => {
    console.log('\n🔍 Step: validate')

    // Check stock for all items
    for (const item of ctx.input.items) {
      const stock = await db.products.getStock(item.productId)
      if (stock < item.qty) {
        throw new Error(`庫存不足: ${item.productId}`)
      }
    }

    ctx.data.validated = true
    ctx.data.totalAmount = ctx.input.items.reduce((sum, item) => sum + item.price * item.qty, 0)
  })
  .step('reserve', async (ctx) => {
    console.log('\n🔒 Step: reserve')

    ctx.data.reservationIds = await inventory.reserve(ctx.input.items)
  })
  .step(
    'payment',
    async (ctx) => {
      console.log('\n💳 Step: payment')

      ctx.data.paymentResult = await payment.charge(
        ctx.input.orderId,
        ctx.data.totalAmount as number
      )
    },
    { retries: 3, timeout: 30000 }
  )
  .commit('deduct', async (ctx) => {
    console.log('\n✅ Step: deduct (commit)')

    await inventory.deduct(ctx.data.reservationIds as string[])
  })
  .commit('notify', async (ctx) => {
    console.log('\n📧 Step: notify (commit)')

    await email.send(ctx.input.userId, 'order-confirmed', {
      orderId: ctx.input.orderId,
      amount: ctx.data.totalAmount,
      transactionId: (ctx.data.paymentResult as { transactionId: string }).transactionId,
    })
  })

// ─────────────────────────────────────────────────────────────
// Execute
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════')
  console.log('   📦 Order Fulfillment Workflow Example')
  console.log('═══════════════════════════════════════════════════════')

  const engine = new FluxEngine({
    storage: new MemoryStorage(),
    defaultRetries: 3,
    on: {
      stepStart: (step) => console.log(`\n▶️  Starting: ${step}`),
      stepComplete: (step) => console.log(`✓  Completed: ${step}`),
      stepError: (step, _ctx, error) => console.error(`✗  Error in ${step}:`, error.message),
    },
  })

  const result = await engine.execute(orderWorkflow, {
    orderId: 'ORD-2024-001',
    userId: 'user-12345',
    items: [
      { productId: 'SKU-LAPTOP', qty: 1, price: 999 },
      { productId: 'SKU-MOUSE', qty: 2, price: 29 },
    ],
  })

  console.log('\n═══════════════════════════════════════════════════════')
  console.log('   📊 Result')
  console.log('═══════════════════════════════════════════════════════')
  console.log('Status:', result.status)
  console.log('Duration:', result.duration, 'ms')
  console.log('Data:', JSON.stringify(result.data, null, 2))

  if (result.error) {
    console.error('Error:', result.error.message)
  }
}

main().catch(console.error)
