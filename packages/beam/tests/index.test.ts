import { describe, expect, test } from 'bun:test'
import { Photon } from '@gravito/photon'
import { createBeam, createGravitoClient } from '../src/index'

// Simulate AppType pattern (simple scenario)
const app = new Photon()
  .get('/hello', (c) => c.json({ message: 'world' }))
  .post('/data', (c) => c.json({ id: 1 }))

type TestAppType = typeof app

// Simulate AppRoutes pattern (recommended, matches template usage)
const userRoute = new Photon().get('/profile', (c) => c.json({ name: 'User' }))
const apiRoute = new Photon().get('/health', (c) => c.json({ status: 'ok' }))

function _createTypeOnlyApp() {
  const app = new Photon()
  const routes = app.route('/api/users', userRoute).route('/api', apiRoute)
  return routes
}

type TestAppRoutes = ReturnType<typeof _createTypeOnlyApp>

describe('@gravito/beam', () => {
  describe('AppType pattern (simple)', () => {
    test('createBeam should return a client instance', () => {
      const client = createBeam<TestAppType>('http://localhost:3000')
      expect(client).toBeDefined()
      expect(client.hello).toBeDefined()
    })

    test('createGravitoClient (alias) should return a client instance', () => {
      const client = createGravitoClient<TestAppType>('http://localhost:3000')
      expect(client).toBeDefined()
    })

    test('client should have correct methods inferred', () => {
      const client = createBeam<TestAppType>('http://localhost:3000')
      // We can't easily test TYPES at runtime, but we can check if the proxy is structurally sound
      expect(typeof client.hello.$get).toBe('function')
      expect(typeof client.data.$post).toBe('function')
    })

    test('client should accept options', () => {
      const client = createBeam<TestAppType>('http://localhost:3000', {
        headers: { 'X-Custom': 'Value' },
      })
      expect(client).toBeDefined()
    })
  })

  describe('AppRoutes pattern (recommended)', () => {
    test('createBeam should return a client instance with nested routes', () => {
      const client = createBeam<TestAppRoutes>('http://localhost:3000')
      expect(client).toBeDefined()
      expect(client.api).toBeDefined()
      expect(client.api.users).toBeDefined()
    })

    test('client should have correct nested route methods', () => {
      const client = createBeam<TestAppRoutes>('http://localhost:3000')
      // Verify nested route structure
      expect(typeof client.api.users.profile.$get).toBe('function')
      expect(typeof client.api.health.$get).toBe('function')
    })

    test('client should accept options with AppRoutes', () => {
      const client = createBeam<TestAppRoutes>('http://localhost:3000', {
        headers: { Authorization: 'Bearer token' },
      })
      expect(client).toBeDefined()
      expect(client.api).toBeDefined()
    })
  })
})
