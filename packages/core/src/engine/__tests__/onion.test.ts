import { expect, test } from 'bun:test'
import { Gravito } from '../Gravito'

test('Gravito Engine > Middleware > should follow Onion Model execution order', async () => {
  const app = new Gravito()
  const order: string[] = []

  // Middleware 1 (Outer)
  app.use(async (c, next) => {
    order.push('1-start')
    const res = await next()
    order.push('1-end')
    return res
  })

  // Middleware 2 (Inner)
  app.use(async (c, next) => {
    order.push('2-start')
    const res = await next()
    order.push('2-end')
    return res
  })

  // Handler (Core)
  app.get('/', (c) => {
    order.push('handler')
    return c.json({ ok: true })
  })

  const req = new Request('http://localhost/')
  await app.fetch(req)

  // Expected: 1-start -> 2-start -> handler -> 2-end -> 1-end
  // Current (Broken): 1-start -> 2-start -> 2-end -> 1-end -> handler (or similar broken order)
  expect(order).toEqual(['1-start', '2-start', 'handler', '2-end', '1-end'])
})
