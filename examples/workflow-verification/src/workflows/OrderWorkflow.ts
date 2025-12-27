import { createWorkflow } from '@gravito/flux'

export interface OrderInput {
  productId: string
  quantity: number
  email: string
  paymentToken: string
}

export interface OrderData {
  unitPrice: number
  totalAmount: number
  status: string
  trackingNumber?: string
}

export const OrderWorkflow = createWorkflow<OrderInput, OrderData>('order-process')
  .step('check-stock', async (ctx) => {
    console.log(`[Workflow] Checking stock for ${ctx.input.productId}...`)
    // Mock stock check
    if (ctx.input.productId === 'out-of-stock') {
      throw new Error('PRODUCT_OUT_OF_STOCK')
    }
    ctx.data.unitPrice = 100
    ctx.data.totalAmount = ctx.data.unitPrice * ctx.input.quantity
  })
  .step('process-payment', async (ctx) => {
    console.log(`[Workflow] Charging ${ctx.data.totalAmount} to token ${ctx.input.paymentToken}...`)
    // Mock payment
    if (ctx.input.paymentToken === 'fail-token') {
      throw new Error('PAYMENT_FAILED')
    }
    ctx.data.status = 'PAID'
  })
  .commit('fulfill', async (ctx) => {
    console.log(`[Workflow] Fulfilling order for ${ctx.input.email}...`)
    ctx.data.trackingNumber = `TRK-${Math.random().toString(36).substring(7).toUpperCase()}`
    ctx.data.status = 'SHIPPED'
  })
