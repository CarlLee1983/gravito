import { expect, it } from 'bun:test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { createFluxEngine } from '../src/flux'
import { orderWorkflow } from '../src/workflows/order'

it('executes the enterprise order workflow end-to-end', async () => {
  const traceDir = join(import.meta.dir, '..', '.flux-test')
  await mkdir(traceDir, { recursive: true })
  const tracePath = join(traceDir, 'trace.ndjson')

  const engine = createFluxEngine({ tracePath })
  const payload = {
    orderId: 'test-order-1',
    userId: 'tester',
    items: [
      { productId: 'widget-a', qty: 1 },
      { productId: 'widget-b', qty: 1 },
    ],
  }

  const result = await engine.execute(orderWorkflow, payload)
  expect(result.status).toBe('completed')
  expect(result.history.length).toBeGreaterThanOrEqual(4)
})

it('fails when stock is insufficient', async () => {
  const engine = createFluxEngine({
    tracePath: join(import.meta.dir, '..', '.flux-test2', 'trace.ndjson'),
  })
  const result = await engine.execute(orderWorkflow, {
    orderId: 'bad-order',
    userId: 'tester',
    items: [{ productId: 'widget-a', qty: 100 }],
  })

  expect(result.status).toBe('failed')
  expect(result.error?.message).toContain('Not enough stock')
})
