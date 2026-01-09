import { formatBytes, WorkflowProfiler } from '../../../packages/flux/src/profiler/WorkflowProfiler'
import { orderWorkflow } from '../src/workflows/order'

// Quick helper since we didn't export formatBytes cleanly from package yet (it was internal logic)
// But wait, I can just use the output form the profiler.
// Let's re-implement the script using the class.

import { WorkflowProfiler as Profiler } from '../../../packages/flux/src/profiler/WorkflowProfiler'

async function runProfile() {
  console.log('🔍 Initializing Workflow Profiler (Framework Component)...')

  const profiler = new Profiler()

  // Prepare Payload
  const payload = {
    userId: 'profile-user',
    items: [
      { productId: 'widget-a', quantity: 1 },
      { productId: 'widget-b', quantity: 2 },
    ],
    totalAmount: 300,
  }

  console.log('🚀 Running profile...')

  // EXECUTE
  const metrics = await profiler.profile(orderWorkflow, payload)
  const recommendation = profiler.recommend(metrics)

  console.log('\n===============================================================')
  console.log(`📊 Workflow Performance Report: [ ORDER ]`)
  console.log('===============================================================')
  console.log(`⏱️  Wall Time:   ${metrics.durationMs.toFixed(2)} ms`)
  console.log(`⚙️  CPU Time:    ${(metrics.cpuUserMs + metrics.cpuSysMs).toFixed(2)} ms`)
  console.log(`   └─ Ratio:    ${(metrics.cpuRatio * 100).toFixed(1)}%`)
  console.log(`💾  Mem Delta:   ${(metrics.memDeltaBytes / 1024).toFixed(2)} KB`)
  console.log('---------------------------------------------------------------')

  console.log('💡 Analysis:')
  console.log(`   Type: ${recommendation.type}`)
  console.log(`   Reason: ${recommendation.reason}`)

  console.log('\n🚀 Recommendation:')
  console.log(`   Suggested Concurrency: [ ${recommendation.suggestedConcurrency} ]`)
  console.log('===============================================================')

  process.exit(0)
}

runProfile().catch(console.error)
