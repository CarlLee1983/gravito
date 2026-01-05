import { createWorkflow, Flux, FluxEngine, MemoryStorage } from '../src'

// 1. Define Workflow
const approvalWorkflow = createWorkflow('expense-approval')
  .input<{ requestor: string; amount: number }>()
  .step('notify-manager', async (ctx) => {
    console.log(
      `[Flux] Sending approval request for $${ctx.input.amount} from ${ctx.input.requestor}`
    )
  })
  .step('wait-for-approval', async () => {
    // This step suspends the workflow!
    return Flux.wait('approval-signal')
  })
  .commit('process-payment', async (ctx) => {
    // We can access the signal payload from the history of the previous step
    // (In a real app, we might write a helper to extract this easily)
    const signalData = ctx.history[ctx.currentStep - 1].output as { approved: boolean }

    if (signalData.approved) {
      console.log(`[Flux] Payment PROCESSED for $${ctx.input.amount}`)
      ctx.data.status = 'paid'
    } else {
      console.log(`[Flux] Payment REJECTED`)
      ctx.data.status = 'rejected'
    }
  })

async function main() {
  const storage = new MemoryStorage()
  const engine = new FluxEngine({
    storage,
    logger: {
      debug: () => {},
      info: console.log,
      warn: console.warn,
      error: console.error,
    },
  })

  console.log('\n--- 1. Starting Workflow ---')
  const result1 = await engine.execute(approvalWorkflow, { requestor: 'Alice', amount: 500 })

  console.log(`Workflow ID: ${result1.id}`)
  console.log(`Status: ${result1.status}`)

  if (result1.status !== 'suspended') {
    console.error('Execution Failed Details:', JSON.stringify(result1, null, 2))
    throw new Error('Workflow should be suspended!')
  }

  // Simulate some delay or user interaction
  console.log('\n... Waiting for manager (simulated) ...')

  // Check state in storage
  const state = await engine.get(result1.id)
  console.log(`Storage Status: ${state?.status}`)
  console.log(`Waiting For: ${state?.history[1].waitingFor}`)

  console.log('\n--- 2. Sending "Reject" Signal ---')
  // Let's try rejecting first? Or approving. Let's approve.
  const result2 = await engine.signal(approvalWorkflow, result1.id, 'approval-signal', {
    approved: true,
  })

  console.log(`Status: ${result2.status}`)
  console.log(`Final Data:`, result2.data)

  if (result2.status !== 'completed') {
    throw new Error('Workflow should be completed!')
  }
}

main().catch(console.error)
