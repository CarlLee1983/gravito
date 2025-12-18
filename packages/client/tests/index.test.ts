import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { createGravitoClient } from '../src/index'
import type { AppType } from './mock-app' // We will mock types locally within the test scope if needed, or define inline

// Simulate a backend app type for testing
const app = new Hono()
  .get('/hello', (c) => c.json({ message: 'world' }))
  .post('/data', (c) => c.json({ id: 1 }))

type TestAppType = typeof app

describe('@gravito/client', () => {
  test('createGravitoClient should return a client instance', () => {
    const client = createGravitoClient<TestAppType>('http://localhost:3000')
    expect(client).toBeDefined()
    expect(client.hello).toBeDefined()
  })

  test('client should have correct methods inferred', () => {
    const client = createGravitoClient<TestAppType>('http://localhost:3000')
    // We can't easily test TYPES at runtime, but we can check if the proxy is structurally sound
    expect(typeof client.hello.$get).toBe('function')
    expect(typeof client.data.$post).toBe('function')
  })

  test('client should accept options', () => {
    const client = createGravitoClient<TestAppType>('http://localhost:3000', {
      headers: { 'X-Custom': 'Value' },
    })
    expect(client).toBeDefined()
  })
})
