import { describe, expect, test } from 'bun:test'
import { tester } from './setup'

async function login() {
  const register = await tester().post('/auth/register', {
    name: 'Product Manager',
    email: `pm-${Date.now()}@example.com`,
    password: 'demo123',
  })
  const { token } = await register.json()
  return token
}

describe('Workflow Demo Products', () => {
  test('CRUD cycle', async () => {
    const token = await login()
    const headers = {
      Authorization: `Bearer ${token}`,
    }

    const list = await tester().get('/products', headers)
    expect(list.status).toBe(200)
    const initial = await list.json()
    expect(Array.isArray(initial.products)).toBe(true)

    const created = await tester().post(
      '/products',
      { name: 'Nova Lamp', sku: 'NOVA-LAMP', price: 89.5, inventory: 8 },
      headers
    )
    expect(created.status).toBe(201)
    const createdBody = await created.json()
    expect(createdBody.product.id).toBeDefined()

    const updated = await tester().put(
      `/products/${createdBody.product.id}`,
      { price: 99.9 },
      headers
    )
    expect(updated.status).toBe(200)
    const patchBody = await updated.json()
    expect(patchBody.product.price).toBe(99.9)

    const destroy = await tester().delete(`/products/${createdBody.product.id}`, null, headers)
    expect(destroy.status).toBe(200)
  })
})
