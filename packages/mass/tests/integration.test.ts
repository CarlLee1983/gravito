import { describe, expect, it } from 'bun:test'
import { Photon } from '@gravito/photon'
import { Schema, validate } from '../src/index'

describe('Mass + Photon integration', () => {
  it('should work with app.get()', async () => {
    const app = new Photon()

    app.get(
      '/users',
      validate('query', Schema.Object({ limit: Schema.Optional(Schema.String()) })),
      (c) => {
        const { limit } = c.req.valid('query')
        return c.json({ limit: limit ?? '10' })
      }
    )

    const res = await app.request('/users?limit=20')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.limit).toBe('20')
  })

  it('should work with app.post()', async () => {
    const app = new Photon()

    app.post('/users', validate('json', Schema.Object({ name: Schema.String() })), (c) => {
      const { name } = c.req.valid('json')
      return c.json({ created: name })
    })

    const res = await app.request('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice' }),
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.created).toBe('Alice')
  })

  it('should work with app.route()', async () => {
    const app = new Photon()
    const api = new Photon()

    api.post('/login', validate('json', Schema.Object({ username: Schema.String() })), (c) => {
      const { username } = c.req.valid('json')
      return c.json({ user: username })
    })

    const routes = app.route('/api', api)

    const res = await routes.request('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'bob' }),
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.user).toBe('bob')
  })

  it('should maintain type inference through route composition', async () => {
    const app = new Photon()
    const userRoute = new Photon()

    userRoute.get('/:id', validate('param', Schema.Object({ id: Schema.String() })), (c) => {
      const { id } = c.req.valid('param')
      return c.json({ userId: id })
    })

    app.route('/users', userRoute)

    const res = await app.request('/users/42')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.userId).toBe('42')
  })
})
