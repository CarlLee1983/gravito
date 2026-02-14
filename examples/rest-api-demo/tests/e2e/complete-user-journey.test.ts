/**
 * 完整用戶旅程 E2E 測試
 * 模擬現實用戶場景：註冊 -> 登入 -> 購物 -> 支付
 */

import { describe, expect, it } from 'vitest'

interface ApiResponse {
  success: boolean
  data: any
  error?: string
  nextCursor?: string
}

describe('完整用戶旅程 E2E 測試', () => {
  let authToken: string
  let userId: string
  let orderId: string

  describe('使用者完整購物流程', () => {
    it('Step 1: 用戶註冊', async () => {
      // Act
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `user-${Date.now()}@test.com`,
          name: 'Test User',
          password: 'SecurePassword123!',
        }),
      })

      // Assert
      expect(response.status).toBe(201)
      const data = (await response.json()) as ApiResponse
      expect(data.success).toBe(true)
      userId = data.data.id
    })

    it('Step 2: 用戶登入', async () => {
      // Act
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `user-${Date.now()}@test.com`,
          password: 'SecurePassword123!',
        }),
      })

      // Assert
      expect(response.status).toBe(200)
      const data = (await response.json()) as ApiResponse
      expect(data.success).toBe(true)
      authToken = data.data.token
    })

    it('Step 3: 瀏覽產品列表', async () => {
      // Act
      const response = await fetch('/api/products?page=1&limit=20', {
        headers: { Authorization: `Bearer ${authToken}` },
      })

      // Assert
      expect(response.status).toBe(200)
      const data = (await response.json()) as ApiResponse
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.data.length).toBeGreaterThan(0)
    })

    it('Step 4: 查看產品詳情', async () => {
      // 獲取第一個產品
      const listRes = await fetch('/api/products?limit=1', {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      const listData = (await listRes.json()) as ApiResponse
      const productId = listData.data[0].id

      // 查看詳情
      const response = await fetch(`/api/products/${productId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })

      expect(response.status).toBe(200)
      const data = (await response.json()) as ApiResponse
      expect(data.data.id).toBe(productId)
      expect(data.data.price).toBeDefined()
    })

    it('Step 5: 建立訂單', async () => {
      // 獲取第一個產品 ID
      const listRes = await fetch('/api/products?limit=1', {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      const listData = (await listRes.json()) as ApiResponse
      const productId = listData.data[0].id

      // 建立訂單
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          userId,
          items: [{ productId, quantity: 1 }],
          shippingAddress: {
            name: 'John Doe',
            email: 'john@test.com',
            phone: '+1234567890',
            address: '123 Main St',
            city: 'New York',
            state: 'NY',
            postalCode: '10001',
            country: 'US',
          },
        }),
      })

      expect(response.status).toBe(201)
      const data = (await response.json()) as ApiResponse
      expect(data.success).toBe(true)
      orderId = data.data.id
    })

    it('Step 6: 查看訂單詳情', async () => {
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })

      expect(response.status).toBe(200)
      const data = (await response.json()) as ApiResponse
      expect(data.data.id).toBe(orderId)
      expect(data.data.status).toBe('pending')
      expect(data.data.total).toBeGreaterThan(0)
    })

    it('Step 7: 支付訂單', async () => {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          orderId,
          amount: 100.0,
          paymentMethod: 'credit_card',
          cardToken: 'tok_test_123',
        }),
      })

      expect(response.status).toBe(200)
      const data = (await response.json()) as ApiResponse
      expect(data.data.status).toBe('completed')
    })

    it('Step 8: 驗證訂單已更新', async () => {
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })

      const data = (await response.json()) as ApiResponse
      expect(data.data.status).toBe('paid')
    })

    it('Step 9: 查看用戶個人資料', async () => {
      const response = await fetch('/api/users/profile', {
        headers: { Authorization: `Bearer ${authToken}` },
      })

      expect(response.status).toBe(200)
      const data = (await response.json()) as ApiResponse
      expect(data.data.id).toBe(userId)
    })

    it('Step 10: 登出', async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      })

      expect(response.status).toBe(200)

      // 驗證 token 已作廢
      const profileRes = await fetch('/api/users/profile', {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      expect(profileRes.status).toBe(401)
    })
  })

  describe('錯誤處理驗證', () => {
    it('無效的 token 應返回 401', async () => {
      const response = await fetch('/api/users/profile', {
        headers: { Authorization: 'Bearer invalid-token' },
      })

      expect(response.status).toBe(401)
    })

    it('缺少必要欄位應返回 422', async () => {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          userId,
          // 缺少 items 和 shippingAddress
        }),
      })

      expect(response.status).toBe(422)
    })

    it('無效資源 ID 應返回 404', async () => {
      const response = await fetch('/api/products/invalid-id', {
        headers: { Authorization: `Bearer ${authToken}` },
      })

      expect(response.status).toBe(404)
    })
  })
})
