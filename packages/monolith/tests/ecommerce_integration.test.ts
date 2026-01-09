import { beforeAll, describe, expect, it } from 'bun:test'
import { Photon } from '@gravito/photon'
import { Controller, FormRequest, Schema } from '../src'

// --- 模擬電商控制器與請求 ---

class StoreProductRequest extends FormRequest {
  schema() {
    return Schema.Object({
      name: Schema.String({ minLength: 3 }),
      price: Schema.Number({ minimum: 0 }),
    })
  }
}

class ProductController extends Controller {
  async store() {
    const request = new StoreProductRequest().setContext(this.context)
    const data = request.validated()
    return this.json({ success: true, product: data }, 201)
  }
}

// --- 測試 ---

describe('Ecommerce MVC Integration (Shared Environment)', () => {
  let app: Photon

  beforeAll(() => {
    app = new Photon()
    // 手動註冊路由以驗證
    app.post('/products', StoreProductRequest.middleware(), ProductController.call('store'))
  })

  it('should return 422 when data is invalid', async () => {
    const res = await app.request('/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hi', price: -1 }),
    })

    expect(res.status).toBe(422)
    const data: any = await res.json()
    expect(data.message).toBe('The given data was invalid.')
  })

  it('should return 201 and sanitized data when valid', async () => {
    const res = await app.request('/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '  Galaxy Pro  ', price: 999 }),
    })

    expect(res.status).toBe(201)
    const data: any = await res.json()
    expect(data.product.name).toBe('Galaxy Pro') // 驗證自動 Trim
  })
})
