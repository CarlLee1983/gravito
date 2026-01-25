import { describe, expect, it } from 'bun:test'
import { Photon } from '@gravito/photon'
import { Schema, validate } from '../src/index'

describe('validate middleware', () => {
  describe('JSON validation', () => {
    it('should pass valid JSON body', async () => {
      const app = new Photon()
      const schema = Schema.Object({
        name: Schema.String({ minLength: 1 }),
        age: Schema.Number({ minimum: 0 }),
      })

      app.post('/test', validate('json', schema), (c) => {
        const data = c.req.valid('json')
        return c.json({ success: true, data })
      })

      const res = await app.request('/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'John', age: 30 }),
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toEqual({
        success: true,
        data: { name: 'John', age: 30 },
      })
    })

    it('should reject invalid JSON body with 400', async () => {
      const app = new Photon()
      const schema = Schema.Object({
        name: Schema.String({ minLength: 1 }),
        age: Schema.Number({ minimum: 0 }),
      })

      app.post('/test', validate('json', schema), (c) => {
        return c.json({ success: true })
      })

      const res = await app.request('/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '', age: -5 }),
      })

      expect(res.status).toBe(400)
    })

    it('should handle nested object validation', async () => {
      const app = new Photon()
      const schema = Schema.Object({
        user: Schema.Object({
          name: Schema.String(),
          email: Schema.String(),
        }),
      })

      app.post('/test', validate('json', schema), (c) => {
        const data = c.req.valid('json')
        return c.json({ success: true, data })
      })

      const res = await app.request('/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: { name: 'Alice', email: 'alice@example.com' },
        }),
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data.user.name).toBe('Alice')
    })

    it('should handle array validation', async () => {
      const app = new Photon()
      const schema = Schema.Object({
        items: Schema.Array(Schema.String()),
      })

      app.post('/test', validate('json', schema), (c) => {
        const data = c.req.valid('json')
        return c.json({ success: true, count: data.items.length })
      })

      const res = await app.request('/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: ['a', 'b', 'c'] }),
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.count).toBe(3)
    })
  })

  describe('Query validation', () => {
    it('should parse and validate query parameters', async () => {
      const app = new Photon()
      const schema = Schema.Object({
        q: Schema.String(),
        page: Schema.Optional(Schema.String()),
      })

      app.get('/search', validate('query', schema), (c) => {
        const query = c.req.valid('query')
        return c.json({ query })
      })

      const res = await app.request('/search?q=test&page=2')
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.query.q).toBe('test')
      expect(json.query.page).toBe('2')
    })

    it('should handle optional parameters', async () => {
      const app = new Photon()
      const schema = Schema.Object({
        q: Schema.String(),
        limit: Schema.Optional(Schema.String()),
      })

      app.get('/search', validate('query', schema), (c) => {
        const query = c.req.valid('query')
        return c.json({ query })
      })

      const res = await app.request('/search?q=hello')
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.query.q).toBe('hello')
      expect(json.query.limit).toBeUndefined()
    })
  })

  describe('Param validation', () => {
    it('should validate route parameters', async () => {
      const app = new Photon()
      const schema = Schema.Object({
        id: Schema.String(),
      })

      app.get('/users/:id', validate('param', schema), (c) => {
        const params = c.req.valid('param')
        return c.json({ userId: params.id })
      })

      const res = await app.request('/users/123')
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.userId).toBe('123')
    })
  })

  describe('Custom hooks', () => {
    it('should call hook with validation result', async () => {
      const app = new Photon()
      const schema = Schema.Object({
        name: Schema.String(),
      })

      let hookCalled = false

      app.post(
        '/test',
        validate('json', schema, () => {
          hookCalled = true
          return undefined
        }),
        (c) => c.json({ success: true })
      )

      await app.request('/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test' }),
      })

      expect(hookCalled).toBe(true)
    })

    it('should allow custom error response', async () => {
      const app = new Photon()
      const schema = Schema.Object({
        email: Schema.String(),
      })

      app.post(
        '/test',
        validate('json', schema, (result, c) => {
          return c.json({ custom: 'error', code: 'VALIDATION_FAILED' }, 422)
        }),
        (c) => c.json({ success: true })
      )

      const res = await app.request('/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: 'data' }),
      })

      expect(res.status).toBe(422)
      const json = await res.json()
      expect(json.code).toBe('VALIDATION_FAILED')
    })
  })
})
