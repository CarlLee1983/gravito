/**
 * REST API Demo K6 性能測試
 * 測試場景：
 * 1. 預熱（1 分鐘，10 VU）
 * 2. 正常負載（5 分鐘，50 VU）
 * 3. 尖峰測試（1 分鐘，200 VU）
 * 4. 降載（2 分鐘，0 VU）
 */

import { check, group, sleep } from 'k6'
import http from 'k6/http'

export const options = {
  vus: 10,
  stages: [
    { duration: '1m', target: 10 }, // 預熱
    { duration: '5m', target: 50 }, // 正常負載
    { duration: '1m', target: 200 }, // 尖峰
    { duration: '2m', target: 0 }, // 降載
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.1'], // 失敗率 < 10%
    checks: ['rate>0.95'], // 檢查通過率 > 95%
  },
}

const BASE_URL = 'http://localhost:3000/api'
let authToken = ''
let userId = ''

export default function () {
  // =========================================================================
  // 1. 認證（如果還未認證）
  // =========================================================================
  if (!authToken) {
    group('認證流程', () => {
      const registerRes = http.post(`${BASE_URL}/auth/register`, {
        email: `user-${Date.now()}-${Math.random()}@test.com`,
        name: 'Load Test User',
        password: 'TestPassword123!',
      })

      check(registerRes, {
        註冊成功: (r) => r.status === 201,
      })

      if (registerRes.status === 201) {
        const registerData = JSON.parse(registerRes.body)
        userId = registerData.data.id

        const loginRes = http.post(`${BASE_URL}/auth/login`, {
          email: registerData.data.email,
          password: 'TestPassword123!',
        })

        check(loginRes, {
          登入成功: (r) => r.status === 200,
        })

        if (loginRes.status === 200) {
          const loginData = JSON.parse(loginRes.body)
          authToken = loginData.data.token
        }
      }
    })
  }

  // =========================================================================
  // 2. 產品列表（快取命中測試）
  // =========================================================================
  group('產品操作', () => {
    const headers = { Authorization: `Bearer ${authToken}` }

    // 獲取產品列表
    const listRes = http.get(`${BASE_URL}/products?page=1&limit=20`, { headers })
    check(listRes, {
      獲取產品列表: (r) => r.status === 200,
      返回產品數組: (r) => {
        try {
          const data = JSON.parse(r.body)
          return Array.isArray(data.data)
        } catch {
          return false
        }
      },
    })

    sleep(1)
  })

  // =========================================================================
  // 3. 產品詳情（測試 Eager Loading）
  // =========================================================================
  group('產品詳情', () => {
    const headers = { Authorization: `Bearer ${authToken}` }

    const detailRes = http.get(`${BASE_URL}/products/1`, { headers })
    check(detailRes, {
      獲取產品詳情: (r) => r.status === 200 || r.status === 404,
      響應時間合理: (r) => r.timings.duration < 500,
    })

    sleep(1)
  })

  // =========================================================================
  // 4. 訂單操作（測試完整流程）
  // =========================================================================
  group('訂單操作', () => {
    const headers = { Authorization: `Bearer ${authToken}` }

    const orderRes = http.post(
      `${BASE_URL}/orders`,
      {
        userId,
        items: [{ productId: '1', quantity: 1 }],
        shippingAddress: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '+1234567890',
          address: '123 Test St',
          city: 'Test City',
          state: 'TC',
          postalCode: '12345',
          country: 'US',
        },
      },
      { headers }
    )

    check(orderRes, {
      建立訂單: (r) => r.status === 201 || r.status === 422,
      應返回訂單數據: (r) => {
        try {
          const data = JSON.parse(r.body)
          return data.data?.id || data.errors
        } catch {
          return false
        }
      },
    })

    sleep(1)
  })

  // =========================================================================
  // 5. 用戶個人資料（測試認證）
  // =========================================================================
  group('用戶個人資料', () => {
    const headers = { Authorization: `Bearer ${authToken}` }

    const profileRes = http.get(`${BASE_URL}/users/profile`, { headers })
    check(profileRes, {
      獲取個人資料: (r) => r.status === 200,
      '返回用戶 ID': (r) => {
        try {
          const data = JSON.parse(r.body)
          return !!data.data?.id
        } catch {
          return false
        }
      },
    })

    sleep(1)
  })

  sleep(Math.random() * 3)
}

/**
 * 性能測試結果摘要：
 *
 * 預期結果（如果通過所有閾值）：
 * - HTTP 請求 P95 延遲 < 500ms
 * - HTTP 請求 P99 延遲 < 1000ms
 * - 失敗率 < 10%
 * - 檢查通過率 > 95%
 *
 * 如果實際結果未達標，檢查清單：
 * 1. 數據庫連接池是否預熱？
 * 2. Redis 快取是否命中？
 * 3. 是否有 N+1 查詢問題？
 * 4. 伺服器是否有足夠資源？
 */
