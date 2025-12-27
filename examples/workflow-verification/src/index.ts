import { FluxEngine } from '@gravito/flux'
import { Schema, validate } from '@gravito/mass'
import { PlanetCore } from 'gravito-core'
import { StoreOrderRequest } from './requests/StoreOrderRequest'
import { OrderWorkflow } from './workflows/OrderWorkflow'

const port = parseInt(process.env.PORT || '3006', 10)
const core = new PlanetCore()
const engine = new FluxEngine()

// Add a test endpoint for mass validation
core.router.post(
  '/validate-only',
  validate(
    'json',
    Schema.Object({
      token: Schema.String({ minLength: 10 }),
      amount: Schema.Number({ minimum: 0 }),
    })
  ),
  async (c) => {
    const data = c.req.valid('json')
    return c.json({ success: true, data })
  }
)

core.router.post('/orders', StoreOrderRequest, async (c) => {
  // 1. Get validated data from impulse
  const input = c.get('validated' as any)

  console.log('[Server] Validation passed, starting workflow...')

  // 2. Execute workflow via flux
  try {
    const result = await engine.execute(OrderWorkflow, input)
    console.log('[Server] Workflow result status:', result.status)

    if (result.status === 'failed') {
      return c.json(
        {
          success: false,
          error: result.error?.message,
          lastStep: result.lastStep,
        },
        400
      )
    }

    return c.json({
      success: true,
      order: result.data,
      steps: result.history.map((s) => s.name),
    })
  } catch (e: any) {
    console.error('[Server] Workflow execution failed:', e)
    return c.json({ success: false, error: e.message }, 500)
  }
})

// Start
const liftoff = core.liftoff(port)
Bun.serve(liftoff)

console.log(`[WorkflowServer] Ready on port ${port}`)
