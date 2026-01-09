import { createWorkflow } from '@gravito/flux'

/**
 * Global Supply-chain & Logistics Automation (GSA) Types
 */
export interface SupplyChainItem {
  sku: string
  quantity: number
  weight: number // kg
  value: number // USD
}

export interface SupplyChainInput {
  orderId: string
  origin: string // Country Code (e.g., 'US', 'CN', 'TW')
  destination: string
  items: SupplyChainItem[]
  priority: 'standard' | 'express'
}

export interface SupplyChainData {
  totalWeight: number
  totalValue: number
  shippingFee: number
  isInternational: boolean
  customs?: {
    dutyPercent: number
    dutyAmount: number
    declarationId: string
  }
  carrier?: {
    name: string
    trackingNumber: string
    estimatedDays: number
  }
  warehouseId?: string
  allocatedItems?: Record<string, number>
  paymentId?: string
  labelsGenerated?: boolean
  [key: string]: any
}

/**
 * Mock External Services
 */
const mockCustomsService = async (origin: string, dest: string) => {
  await new Promise((resolve) => setTimeout(resolve, 300))
  return {
    id: `CUSTOMS-${Math.random().toString(36).substring(7).toUpperCase()}`,
    rate: origin === 'US' ? 0.05 : 0.15,
  }
}

const mockCarrierSystems = {
  attemptCount: 0,
  async book(priority: string) {
    this.attemptCount++
    await new Promise((resolve) => setTimeout(resolve, 200))

    // Simulate high failure rate for the first 2 attempts to test retries
    if (this.attemptCount <= 2) {
      throw new Error('Carrier API: Connection Timeout (Carrier system under heavy load)')
    }

    return {
      carrier: priority === 'express' ? 'FedEx' : 'DHL Global',
      tracking: `TRK-${Date.now()}`,
      eta: priority === 'express' ? 3 : 10,
    }
  },
}

/**
 * Supply Chain Workflow Definition
 */
export const supplyChainWorkflow = createWorkflow('global-supply-chain')
  .input<SupplyChainInput>()
  .data<SupplyChainData>()
  .step('initialize-and-validate', (ctx) => {
    const totalWeight = ctx.input.items.reduce((sum, i) => sum + i.weight * i.quantity, 0)
    const totalValue = ctx.input.items.reduce((sum, i) => sum + i.value * i.quantity, 0)

    if (totalWeight > 500 && ctx.input.priority === 'express') {
      throw new Error('Express shipping not available for loads over 500kg')
    }

    ctx.data.totalWeight = totalWeight
    ctx.data.totalValue = totalValue
    ctx.data.isInternational = ctx.input.origin !== ctx.input.destination
  })
  .step(
    'calculate-customs',
    async (ctx) => {
      const result = await mockCustomsService(ctx.input.origin, ctx.input.destination)
      ctx.data.customs = {
        declarationId: result.id,
        dutyPercent: result.rate,
        dutyAmount: ctx.data.totalValue * result.rate,
      }
    },
    {
      // Only execute if it's an international order
      when: (ctx) => ctx.data.isInternational === true,
      timeout: 5000,
    }
  )
  .step('regional-pricing', (ctx) => {
    const baseRate = 10 // USD per kg
    const multiplier = (ctx.input.priority as string) === 'express' ? 2.5 : 1.0
    const internationalSurcharge = ctx.data.isInternational ? 50 : 0

    ctx.data.shippingFee = ctx.data.totalWeight * baseRate * multiplier + internationalSurcharge
  })
  .step(
    'reserve-carrier-slot',
    async (ctx) => {
      const booking = await mockCarrierSystems.book(ctx.input.priority)
      ctx.data.carrier = {
        name: booking.carrier,
        trackingNumber: booking.tracking,
        estimatedDays: booking.eta,
      }
    },
    {
      retries: 3, // Experience the retry logic
      timeout: 3000,
    }
  )
  .step('warehouse-allocation', (ctx) => {
    // Logic to select warehouse based on region
    const warehouseMap: Record<string, string> = {
      US: 'WH-NORTH-AMERICA-01',
      TW: 'WH-ASIA-PACIFIC-08',
      CN: 'WH-MAINLAND-02',
    }

    ctx.data.warehouseId = warehouseMap[ctx.input.origin] || 'WH-GLOBAL-DEFAULT'

    // Mock item allocation
    ctx.data.allocatedItems = ctx.input.items.reduce(
      (acc, item) => {
        acc[item.sku] = item.quantity
        return acc
      },
      {} as Record<string, number>
    )
  })
  .commit('process-billing', async (ctx) => {
    // Final non-reversible payment action
    await new Promise((resolve) => setTimeout(resolve, 500))
    ctx.data.paymentId = `PAY-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
  })
  .commit('generate-documentation', async (ctx) => {
    // Generate shipping labels, invoices, etc.
    await new Promise((resolve) => setTimeout(resolve, 100))
    ctx.data.labelsGenerated = true
  })

export default supplyChainWorkflow
