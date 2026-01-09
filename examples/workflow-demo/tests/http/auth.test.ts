import { describe, expect, test } from 'bun:test'
import { tester } from './setup'

describe('Workflow Demo Auth', () => {
  test('register and login flow', async () => {
    const email = `demo-${Date.now()}@example.com`
    const register = await tester().post('/auth/register', {
      name: 'Demo User',
      email,
      password: 'secret',
    })
    expect(register.status).toBe(200)
    const body = await register.json()
    expect(body.token).toBeDefined()

    const login = await tester().post('/auth/login', {
      email,
      password: 'secret',
    })
    expect(login.status).toBe(200)
    const loginBody = await login.json()
    expect(loginBody.token).toBeDefined()
  })
})
