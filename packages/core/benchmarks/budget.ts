import { FastContext } from '../src/engine/FastContext'
import { Gravito } from '../src/engine/Gravito'

// Thresholds (Strict Engine Budget)
// Goal: Total p99 latency < 1.5ms (1500µs).
// Engine overhead budget: < 2.5µs per request (Router + Middleware + Context).
const BUDGET = {
  CONTEXT_CREATION: 500, // ns
  MIDDLEWARE_CHAIN: 2500, // ns (for 3 layers + routing)
}

const app = new Gravito()
const req = new Request('http://localhost/api/test')

// Prepare middleware chain
app.use(async (_c, next) => await next())
app.use(async (_c, next) => await next())
app.use(async (_c, next) => await next())
app.get('/api/test', (c) => c.json({ ok: true }))

// Warmup
await app.warmup(['/api/test'])

// We use a custom runner/sampler because mitata doesn't easily expose raw stats for assertions in a simple script
// We'll trust mitata's output for human review, but implement a simple tight loop for budget assertion.

async function checkBudget() {
  console.log('Running Performance Budget Verification...')

  // 1. Context Creation Check
  const startCtx = performance.now()
  const iterations = 100_000
  const ctx = new FastContext()
  for (let i = 0; i < iterations; i++) {
    ctx.init(req, {}, '/api/test')
    ctx.reset()
  }
  const endCtx = performance.now()
  const avgCtxNs = ((endCtx - startCtx) * 1_000_000) / iterations

  console.log(`Context Creation: ${avgCtxNs.toFixed(2)} ns (Budget: ${BUDGET.CONTEXT_CREATION} ns)`)
  if (avgCtxNs > BUDGET.CONTEXT_CREATION) {
    throw new Error(`PERFORMANCE REGRESSION: Context creation took ${avgCtxNs}ns`)
  }

  // 2. Middleware Chain Check
  const startMw = performance.now()
  for (let i = 0; i < iterations; i++) {
    await app.fetch(req)
  }
  const endMw = performance.now()
  const avgMwNs = ((endMw - startMw) * 1_000_000) / iterations

  console.log(`Middleware Chain: ${avgMwNs.toFixed(2)} ns (Budget: ${BUDGET.MIDDLEWARE_CHAIN} ns)`)
  if (avgMwNs > BUDGET.MIDDLEWARE_CHAIN) {
    throw new Error(`PERFORMANCE REGRESSION: Middleware chain took ${avgMwNs}ns`)
  }

  console.log('✅ Performance Budget Met')
}

await checkBudget()
