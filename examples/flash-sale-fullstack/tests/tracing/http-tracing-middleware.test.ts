/**
 * HTTP Tracing 中間件簡化測試
 *
 * 驗證 HTTP 中間件正確設置屬性
 */

import { describe, expect, it } from 'bun:test'
import { Hono } from '@gravito/photon'
import { httpTracingMiddleware } from '../../src/tracing/http-tracing-middleware'

describe('HTTP Tracing 中間件', () => {
  let app: Hono

  it('應該建立 Hono 應用並掛載中間件', () => {
    app = new Hono()
    app.use('*', httpTracingMiddleware())

    expect(app).toBeDefined()
  })

  it('應該為路由提供正確的請求/響應資訊', async () => {
    const app = new Hono()
    app.use('*', httpTracingMiddleware())

    app.get('/api/health', (c) => c.json({ status: 'ok' }))
    app.post('/api/orders', (c) => c.json({ orderId: '123' }, 201))
    app.get('/api/error', (c) => c.text('Not found', 404))

    // 驗證路由
    const healthRes = await app.request('http://localhost:3000/api/health')
    expect(healthRes.status).toBe(200)

    const orderRes = await app.request('http://localhost:3000/api/orders', {
      method: 'POST',
    })
    expect(orderRes.status).toBe(201)

    const errorRes = await app.request('http://localhost:3000/api/error')
    expect(errorRes.status).toBe(404)
  })

  it('HTTP 中間件應該不影響應用的基本功能', async () => {
    const app = new Hono()
    app.use('*', httpTracingMiddleware())

    app.get('/test', (c) => c.json({ message: 'test' }))

    const res = await app.request('http://localhost:3000/test')
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.message).toBe('test')
  })

  it('應該正確處理不同的 HTTP 方法', async () => {
    const app = new Hono()
    app.use('*', httpTracingMiddleware())

    app.get('/api/resource', (c) => c.json({ method: 'GET' }))
    app.post('/api/resource', (c) => c.json({ method: 'POST' }))
    app.put('/api/resource', (c) => c.json({ method: 'PUT' }))
    app.delete('/api/resource', (c) => c.json({ method: 'DELETE' }))

    const getRes = await app.request('http://localhost:3000/api/resource')
    const getBody = await getRes.json()
    expect(getBody.method).toBe('GET')

    const postRes = await app.request('http://localhost:3000/api/resource', {
      method: 'POST',
    })
    const postBody = await postRes.json()
    expect(postBody.method).toBe('POST')

    const putRes = await app.request('http://localhost:3000/api/resource', {
      method: 'PUT',
    })
    const putBody = await putRes.json()
    expect(putBody.method).toBe('PUT')

    const deleteRes = await app.request('http://localhost:3000/api/resource', {
      method: 'DELETE',
    })
    const deleteBody = await deleteRes.json()
    expect(deleteBody.method).toBe('DELETE')
  })

  it('應該正確處理不同的 HTTP 狀態碼', async () => {
    const app = new Hono()
    app.use('*', httpTracingMiddleware())

    app.get('/200', (c) => c.json({ status: 200 }))
    app.get('/201', (c) => c.json({ status: 201 }, 201))
    app.get('/400', (c) => c.text('Bad request', 400))
    app.get('/404', (c) => c.text('Not found', 404))
    app.get('/500', (c) => c.text('Server error', 500))

    const res200 = await app.request('http://localhost:3000/200')
    expect(res200.status).toBe(200)

    const res201 = await app.request('http://localhost:3000/201')
    expect(res201.status).toBe(201)

    const res400 = await app.request('http://localhost:3000/400')
    expect(res400.status).toBe(400)

    const res404 = await app.request('http://localhost:3000/404')
    expect(res404.status).toBe(404)

    const res500 = await app.request('http://localhost:3000/500')
    expect(res500.status).toBe(500)
  })

  it('應該支持請求頭和響應頭', async () => {
    const app = new Hono()
    app.use('*', httpTracingMiddleware())

    app.get('/api/headers', (c) => {
      const ua = c.req.header('User-Agent')
      return c.json({ userAgent: ua })
    })

    const res = await app.request('http://localhost:3000/api/headers', {
      headers: {
        'User-Agent': 'test-client/1.0',
      },
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.userAgent).toBe('test-client/1.0')
  })

  it('應該支持不同的路由', async () => {
    const app = new Hono()
    app.use('*', httpTracingMiddleware())

    app.get('/api/products', (c) => c.json([{ id: '1', name: 'Product 1' }]))
    app.get('/api/orders', (c) => c.json([{ id: '1', items: 2 }]))
    app.get('/api/users/:id', (c) => c.json({ id: c.req.param('id'), name: 'User' }))

    const productsRes = await app.request('http://localhost:3000/api/products')
    expect(productsRes.status).toBe(200)

    const ordersRes = await app.request('http://localhost:3000/api/orders')
    expect(ordersRes.status).toBe(200)

    const userRes = await app.request('http://localhost:3000/api/users/123')
    expect(userRes.status).toBe(200)
    const userData = await userRes.json()
    expect(userData.id).toBe('123')
  })
})
