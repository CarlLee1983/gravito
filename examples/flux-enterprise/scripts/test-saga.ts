import { FluxConsoleLogger, FluxEngine, MemoryStorage } from '@gravito/flux'
import { sagaTravelWorkflow } from '../src/workflows/saga-travel'

async function main() {
  const engine = new FluxEngine({
    storage: new MemoryStorage(),
    logger: new FluxConsoleLogger(),
  })

  console.log('--- SCENARIO: Travel Booking with Manual Approval ---')

  // 1. Initial Attempt: Should pause at Approval
  let result = await engine.execute(sagaTravelWorkflow, {
    userId: 'carl_007',
    destination: 'Tokyo',
    budget: 3000,
    isPremium: true,
  })

  console.log(`\nStatus after Step 3: ${result.status}`)
  console.log(`Error: ${result.error?.message}`)
  console.log(`Current Total Cost: $${result.data.totalCost}`)
  console.log(`Approval Needed: ${result.data.approvalNeeded}`)

  const workflowId = result.id

  // 2. Simulate User Approval
  console.log('\n--- Action: User Approves Budget ---')
  const state = await engine.get(workflowId)
  if (state) {
    state.data.approved = true
    state.data.approvalNeeded = false
    // Persist the approval back to storage
    await engine.saveState(state)
  }

  // 3. Resume Workflow: Should fail at Car Rental (Simulating Saga scenario)
  console.log('\n--- Action: Resuming Workflow to Book Car ---')
  result = (await engine.resume(sagaTravelWorkflow, workflowId)) || result

  console.log(`\nStatus after Step 4: ${result.status}`)
  console.log(`Failed Source: ${result.data.errorSource}`)
  console.log(`Error: ${result.error?.message}`)

  // 4. Critical Logic: Saga Compensation
  // If the car rental fails permanently, we need to cancel the flight and hotel
  console.log('\n--- Action: Initiating Saga Compensation (Rollback) ---')

  const failState = await engine.get(workflowId)
  if (failState) {
    failState.data.triggerCompensation = true
    await engine.saveState(failState)
  }

  // We point the retry to our Compensation Executor step
  const finalResult = await engine.retryStep(
    sagaTravelWorkflow,
    workflowId,
    'saga-compensation-executor'
  )

  console.log(`\nFinal Workflow Status: ${finalResult?.status}`)
  console.log('--- Demo Completed ---')
}

main().catch(console.error)
