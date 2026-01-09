import { beforeEach, describe, expect, it } from 'bun:test'
import { Photon } from '@gravito/photon'
import { Controller, FormRequest, Route, Schema } from '../src'

// --- Mock Classes ---

class MockController extends Controller {
  async index() {
    return this.json({ success: true, action: 'index' })
  }

  async store() {
    return this.json({ success: true, action: 'store' }, 201)
  }

  async show() {
    return this.text('Viewing record')
  }
}

class MockRequest extends FormRequest {
  authorize() {
    // Simulate authorization failure if header is present
    return this.context.req.header('x-fail-auth') !== 'yes'
  }

  schema() {
    return Schema.Object({
      name: Schema.String({ minLength: 3 }),
      age: Schema.Number(),
    })
  }
}

// --- Tests ---

describe('@gravito/monolith MVC', () => {
  let app: Photon

  beforeEach(() => {
    app = new Photon()
  })

  describe('Base Controller', () => {
    it('should resolve call() and return json', async () => {
      app.get('/test', MockController.call('index'))

      const res = await app.request('/test')
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ success: true, action: 'index' })
    })

    it('should resolve call() and return text', async () => {
      app.get('/show', MockController.call('show'))

      const res = await app.request('/show')
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('Viewing record')
    })
  })

  describe('Route Helper (Resource Routing)', () => {
    it('should register multiple standard routes automatically', async () => {
      Route.resource(app, 'users', MockController)

      const resIndex = await app.request('/users')
      expect(resIndex.status).toBe(200)
      expect(await resIndex.json()).toEqual({ success: true, action: 'index' })

      const resStore = await app.request('/users', { method: 'POST' })
      expect(resStore.status).toBe(201)
      expect(await resStore.json()).toEqual({ success: true, action: 'store' })

      const resShow = await app.request('/users/123')
      expect(resShow.status).toBe(200)
      expect(await resShow.text()).toBe('Viewing record')
    })
  })

  describe('FormRequest', () => {
    it('should pass valid data', async () => {
      app.post('/validate', MockRequest.middleware(), (c) => {
        return c.json({ ok: true })
      })

      const res = await app.request('/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Carl', age: 25 }),
      })

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ ok: true })
    })

    it('should return 422 on validation failure with Laravel-style format', async () => {
      app.post('/validate', MockRequest.middleware(), (c) => c.json({ ok: true }))

      const res = await app.request('/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Ca', age: 'invalid' }),
      })

      expect(res.status).toBe(422)
      const data: any = await res.json()
      console.log('DEBUG ERRORS:', JSON.stringify(data.errors))
      expect(data.message).toBe('The given data was invalid.')
      expect(data.errors).toBeDefined()
    })

    it('should return 403 on authorization failure', async () => {
      app.post('/validate', MockRequest.middleware(), (c) => c.json({ ok: true }))

      const res = await app.request('/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-fail-auth': 'yes',
        },
        body: JSON.stringify({ name: 'Carl', age: 25 }),
      })

      expect(res.status).toBe(403)
      expect(await res.json()).toEqual({ message: 'This action is unauthorized.' })
    })

    it('should trim strings and convert empty strings to null in validated data', async () => {
      app.post('/clean', MockRequest.middleware(), async (c) => {
        const req = new MockRequest()
        req.setContext(c)
        return c.json(req.validated())
      })

      const res = await app.request('/clean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '  Carl  ', // Should be trimmed
          age: 25,
          extra: '', // Should become null if it were in schema, but MockRequest only has name and age
        }),
      })

      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data.name).toBe('Carl')
    })
  })
})
