import { FluxConsoleLogger, FluxEngine, MemoryStorage } from '@gravito/flux'
import { supplyChainWorkflow } from '../src/workflows/supply-chain'

async function main() {
  console.log('🚀 Starting Global Supply Chain Workflow Execution...')

  // Initialize engine with a console logger to see the action
  const engine = new FluxEngine({
    storage: new MemoryStorage(),
    logger: new FluxConsoleLogger(),
    on: {
      stepStart: (name) => console.log(`[Step] START: ${name}`),
      stepComplete: (name, _ctx, result) =>
        console.log(`[Step] COMPLETE: ${name} (${result.duration}ms)`),
      stepError: (name, _ctx, err) => console.log(`[Step] FAILED: ${name} - ${err.message}`),
      workflowComplete: (ctx) => console.log(`✅ Workflow Completed: ${ctx.id}`),
    },
  })

  // 1. Test International Express Order (The most complex path)
  console.log('\n--- Scenario 1: International Express Order (Complex) ---')
  const internationalResult = await engine.execute(supplyChainWorkflow, {
    orderId: 'ORD-INT-001',
    origin: 'US',
    destination: 'TW',
    items: [
      { sku: 'LAPTOP-PRO', quantity: 2, weight: 2.5, value: 2500 },
      { sku: 'MONITOR-4K', quantity: 1, weight: 8.0, value: 600 },
    ],
    priority: 'express',
  } as const)

  console.log('\nFinal Data Summary (International):')
  console.log(JSON.stringify(internationalResult.data, null, 2))

  // 2. Test Domestic Standard Order (Skips customs)
  console.log('\n--- Scenario 2: Domestic Standard Order (Simplified) ---')
  const domesticResult = await engine.execute(supplyChainWorkflow, {
    orderId: 'ORD-DOM-002',
    origin: 'TW',
    destination: 'TW',
    items: [{ sku: 'TEA-LEAVES', quantity: 5, weight: 0.5, value: 50 }],
    priority: 'standard',
  } as const)

  console.log('\nFinal Data Summary (Domestic):')
  console.log(`Is International: ${domesticResult.data.isInternational}`)
  console.log(`Customs Declaration: ${domesticResult.data.customs ? 'YES' : 'NO'}`)
  console.log(`Shipping Fee: $${domesticResult.data.shippingFee}`)
}

main().catch(console.error)
