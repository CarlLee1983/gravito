import { createWorkflow, FluxEngine, MemoryStorage, type WorkflowContext } from '../src'

const workflow = createWorkflow('benchmark')
  .input<{ n: number }>()
  .step('step1', async (ctx: WorkflowContext) => {
    ctx.data.r1 = 1
  })
  .step('step2', async (ctx: WorkflowContext) => {
    ctx.data.r2 = 2
  })
  .step('step3', async (ctx: WorkflowContext) => {
    ctx.data.r3 = 3
  })
  .step('step4', async (ctx: WorkflowContext) => {
    ctx.data.r4 = 4
  })
  .step('step5', async (ctx: WorkflowContext) => {
    ctx.data.r5 = 5
  })
  .build()

async function benchmarkSingle() {
  const engine = new FluxEngine({ storage: new MemoryStorage() })
  const start = performance.now()
  await engine.execute(workflow, { n: 1 })
  return performance.now() - start
}

async function benchmarkConcurrent(count: number) {
  const engine = new FluxEngine({ storage: new MemoryStorage() })
  const start = performance.now()
  await Promise.all(Array.from({ length: count }, (_, i) => engine.execute(workflow, { n: i })))
  return performance.now() - start
}

async function benchmarkMemory(count: number) {
  const engine = new FluxEngine({ storage: new MemoryStorage() })
  const before = process.memoryUsage().heapUsed
  for (let i = 0; i < count; i++) {
    await engine.execute(workflow, { n: i })
  }
  return process.memoryUsage().heapUsed - before
}

async function run() {
  console.log('--- Flux Performance Benchmarks ---')

  const singleTime = await benchmarkSingle()
  console.log(`Single execution: ${singleTime.toFixed(2)}ms`)

  const concurrentCount = 100
  const concurrentTime = await benchmarkConcurrent(concurrentCount)
  console.log(
    `${concurrentCount} concurrent executions: ${concurrentTime.toFixed(2)}ms (${(concurrentTime / concurrentCount).toFixed(2)}ms per flow)`
  )

  const memoryFlows = 1000
  const memoryDelta = await benchmarkMemory(memoryFlows)
  console.log(
    `${memoryFlows} sequential flows memory delta: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB (${(memoryDelta / memoryFlows).toFixed(2)} bytes per flow)`
  )
}

run().catch(console.error)
