import { createWorkflow, FluxConsoleLogger, FluxEngine, MemoryStorage } from '@gravito/flux'

/**
 * Global flag to simulate an external service outage
 */
let isServiceDown = true

const failAndRetryWorkflow = createWorkflow('fail-and-retry-demo')
  .input<{ userId: string }>()
  .step('step-1-success', (ctx) => {
    ctx.data.step1 = 'Done'
    console.log('✅ Step 1: Initial check complete.')
  })
  .step(
    'step-2-external-api',
    async (ctx) => {
      console.log('🔄 Step 2: Calling external API...')
      if (isServiceDown) {
        throw new Error('503 Service Unavailable: External API is down')
      }
      ctx.data.apiResult = 'Success from API'
    },
    { retries: 2, timeout: 2000 }
  )
  .commit('step-3-notify', (ctx) => {
    console.log(`✅ Final Step: User ${ctx.input.userId} notified. Data: ${ctx.data.apiResult}`)
  })

async function runDemo() {
  const storage = new MemoryStorage()
  const engine = new FluxEngine({
    storage,
    logger: new FluxConsoleLogger(),
  })

  console.log('\n--- PHASE 1: Execution fails after all retries ---')
  const initialResult = await engine.execute(failAndRetryWorkflow, { userId: 'carl_123' })

  console.log(`\nWorkflow Status: ${initialResult.status}`)
  console.log(`Final Error: ${initialResult.error?.message}`)
  const workflowId = initialResult.id

  // Simulate time passing and service being fixed
  console.log('\n--- PHASE 2: Service is fixed, let us retry the failed step ---')
  console.log('🔧 Fixing the service...')
  isServiceDown = false

  console.log(`🚀 Retrying specific step "step-2-external-api" for ID: ${workflowId}`)
  const retryResult = await engine.retryStep(
    failAndRetryWorkflow,
    workflowId,
    'step-2-external-api'
  )

  if (retryResult) {
    console.log(`\nWorkflow Result after Retry: ${retryResult.status}`)
    console.log('Accumulated Data:', JSON.stringify(retryResult.data, null, 2))
  } else {
    console.log('❌ Retry failed: Could not find workflow state.')
  }
}

runDemo().catch(console.error)
