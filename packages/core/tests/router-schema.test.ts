import { describe, expect, test } from 'bun:test'
import { PlanetCore } from '@gravito/core'
import { z } from 'zod'

describe('Router Schema Metadata (Phase 30)', () => {
  test('should capture zod schemas in router.compile()', async () => {
    const core = new PlanetCore()

    const bodySchema = z.object({ email: z.string().email() })
    const responseSchema = z.object({ id: z.number() })

    core.router
      .post('/register', (c) => c.text('ok'))
      .name('auth.register')
      .schema({
        body: bodySchema,
        response: responseSchema,
      })

    const routes = core.router.compile()
    const route = routes.find((r) => r.path === '/register')

    expect(route).toBeDefined()
    expect(route?.schema).toBeDefined()
    expect(route?.schema?.body).toBe(bodySchema)
    expect(route?.schema?.response).toBe(responseSchema)
  })

  test('should merge schemas from multiple calls', async () => {
    const core = new PlanetCore()

    const querySchema = z.object({ search: z.string() })
    const paramsSchema = z.object({ id: z.string() })

    core.router
      .get('/users/:id', (c) => c.text('ok'))
      .schema({ query: querySchema })
      .schema({ params: paramsSchema })

    const routes = core.router.compile()
    const route = routes.find((r) => r.path === '/users/:id')

    expect(route?.schema?.query).toBe(querySchema)
    expect(route?.schema?.params).toBe(paramsSchema)
  })

  test('should preserve body, params, query, and response schemas independently', async () => {
    const core = new PlanetCore()

    const bodySchema = z.object({ title: z.string() })
    const paramsSchema = z.object({ id: z.string() })
    const querySchema = z.object({ include: z.boolean() })
    const responseSchema = z.object({ count: z.number() })

    core.router
      .post('/items/:id', (c) => c.text('ok'))
      .schema({
        body: bodySchema,
        params: paramsSchema,
        query: querySchema,
        response: responseSchema,
      })

    const route = core.router.compile().find((r) => r.path === '/items/:id')

    expect(route?.schema?.body).toBe(bodySchema)
    expect(route?.schema?.params).toBe(paramsSchema)
    expect(route?.schema?.query).toBe(querySchema)
    expect(route?.schema?.response).toBe(responseSchema)
  })

  test('should retain schema on unnamed routes', async () => {
    const core = new PlanetCore()

    const bodySchema = z.object({ title: z.string() })

    core.router.post('/drafts', (c) => c.text('ok')).schema({ body: bodySchema })

    const route = core.router.compile().find((r) => r.path === '/drafts')

    expect(route?.schema).toBeDefined()
    expect(route?.name).toBeUndefined()
    expect(route?.schema?.body).toBe(bodySchema)
  })

  test('should return empty schema when no schema attached', async () => {
    const core = new PlanetCore()

    core.router.get('/plain', (c) => c.text('ok'))

    const route = core.router.compile().find((r) => r.path === '/plain')

    expect(route).toBeDefined()
    expect(route?.schema).toBeUndefined()
  })
})
