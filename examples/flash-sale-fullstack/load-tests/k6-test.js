/* eslint-disable no-undef */
/* biome-ignore lint/correctness/noUndeclaredVariables: K6 globals (__ENV, __VU) */
/**
 * K6 性能測試腳本
 *
 * 搶購系統的負載測試，逐步增加併發數
 *
 * 執行方式：
 * bun run test:load
 * 或：k6 run load-tests/k6-test.js
 */

import { check, sleep } from 'k6'
import http from 'k6/http'
import { Counter, Gauge, Rate, Trend } from 'k6/metrics'

// ─────────────────────────────────────────────────────────────────────────
// 自訂指標
// ─────────────────────────────────────────────────────────────────────────

const errorRate = new Rate('errors')
const successRate = new Rate('success')
const requestDuration = new Trend('request_duration')
const activeConnections = new Gauge('active_connections')
const totalRequests = new Counter('total_requests')

// ─────────────────────────────────────────────────────────────────────────
// 輔助函數
// ─────────────────────────────────────────────────────────────────────────

/**
 * 生成指定範圍內的隨機整數（負載測試用，非安全關鍵場景）
 * @param {number} min - 最小值（包含）
 * @param {number} max - 最大值（包含）
 * @returns {number} 隨機整數
 */
function randomIntBetween(min, max) {
  // 負載測試場景：使用 Math.random() 生成測試數據，非安全關鍵用途
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 生成隨機浮點數（0 到 1 之間，負載測試用，非安全關鍵場景）
 * @returns {number} 隨機浮點數
 */
function randomFloat() {
  // 負載測試場景：使用 Math.random() 分配測試流量，非安全關鍵用途
  return Math.random()
}

// ─────────────────────────────────────────────────────────────────────────
// 測試配置
// ─────────────────────────────────────────────────────────────────────────

export const options = {
  stages: [
    // Warm up：逐步增加到 50 VU
    { duration: '2m', target: 50, name: 'Warm up' },

    // Ramp up：增加到 500 VU
    { duration: '3m', target: 500, name: 'Ramp up' },

    // Spike：突增到 1000 VU (搶購高峰)
    { duration: '1m', target: 1000, name: 'Spike' },

    // Stress：維持 1000 VU 5 分鐘
    { duration: '5m', target: 1000, name: 'Stress' },

    // Ramp down：逐步回到 0
    { duration: '2m', target: 0, name: 'Ramp down' },
  ],

  // 阈值設定
  thresholds: {
    http_req_duration: ['p(99)<500', 'p(95)<300'], // P99 < 500ms, P95 < 300ms
    http_req_failed: ['rate<0.1'], // 失敗率 < 10%
    errors: ['rate<0.05'], // 錯誤率 < 5%
  },
}

// ─────────────────────────────────────────────────────────────────────────
// 測試場景
// ─────────────────────────────────────────────────────────────────────────

// biome-ignore lint/correctness/noUndeclaredVariables: K6 globals
const API_BASE = __ENV.API_BASE || 'http://localhost:3000'

/**
 * 場景 1：查詢商品列表
 */
export function scenarioListProducts() {
  const response = http.get(`${API_BASE}/api/products`)

  const isSuccess = check(response, {
    'list products - status is 200': (r) => r.status === 200,
    'list products - response time < 500ms': (r) => r.timings.duration < 500,
    'list products - has products': (r) => r.json().data?.length > 0,
  })

  successRate.add(isSuccess)
  errorRate.add(!isSuccess)
  requestDuration.add(response.timings.duration)
  totalRequests.add(1)

  sleep(1)
}

/**
 * 場景 2：建立訂單（搶購核心流程）
 */
export function scenarioCreateOrder() {
  const payload = JSON.stringify({
    productId: `product-${randomIntBetween(0, 9)}`,
    quantity: 1,
    userId: `user-${randomIntBetween(0, 999)}`,
  })

  const response = http.post(`${API_BASE}/api/orders`, payload, {
    headers: { 'Content-Type': 'application/json' },
  })

  const isSuccess = check(response, {
    'create order - status is 201': (r) => r.status === 201,
    'create order - has order id': (r) => r.json().data?.orderId,
    'create order - response time < 1s': (r) => r.timings.duration < 1000,
  })

  successRate.add(isSuccess)
  errorRate.add(!isSuccess)
  requestDuration.add(response.timings.duration)
  totalRequests.add(1)

  sleep(2)
}

/**
 * 場景 3：查詢訂單
 */
export function scenarioGetOrder() {
  const orderId = `order-${randomIntBetween(0, 9999)}`

  const response = http.get(`${API_BASE}/api/orders/${orderId}`)

  const isSuccess = check(response, {
    'get order - status is 200 or 404': (r) => [200, 404].includes(r.status),
    'get order - response time < 200ms': (r) => r.timings.duration < 200,
  })

  successRate.add(isSuccess)
  errorRate.add(!isSuccess)
  requestDuration.add(response.timings.duration)
  totalRequests.add(1)

  sleep(1)
}

// ─────────────────────────────────────────────────────────────────────────
// 主測試函數
// ─────────────────────────────────────────────────────────────────────────

export default function main() {
  // 更新活躍連線數
  // biome-ignore lint/correctness/noUndeclaredVariables: K6 globals
  activeConnections.add(__VU)

  // 分配測試流量
  const randomScenario = randomFloat()

  if (randomScenario < 0.3) {
    // 30% 查詢商品
    scenarioListProducts()
  } else if (randomScenario < 0.7) {
    // 40% 建立訂單（核心流程）
    scenarioCreateOrder()
  } else {
    // 30% 查詢訂單
    scenarioGetOrder()
  }

  // 減少活躍連線數
  activeConnections.add(-1)
}

// ─────────────────────────────────────────────────────────────────────────
// 結果總結
// ─────────────────────────────────────────────────────────────────────────

export function handleSummary(data) {
  console.log('======== Performance Test Results ========')
  console.log(`Total Requests: ${data.metrics.total_requests.value}`)
  console.log(`Success Rate: ${(data.metrics.success.value * 100).toFixed(2)}%`)
  console.log(`Error Rate: ${(data.metrics.errors.value * 100).toFixed(2)}%`)
  console.log(`P99 Latency: ${data.metrics.request_duration.values['p(99)']?.toFixed(2)}ms`)
  console.log(`P95 Latency: ${data.metrics.request_duration.values['p(95)']?.toFixed(2)}ms`)
  console.log('========================================')

  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  }
}

/**
 * 簡單的文字總結
 */
function textSummary(data, options) {
  const { indent = '' } = options
  let summary = ''

  summary += `\n${indent}Performance Summary\n`
  summary += `${indent}====================\n`
  summary += `${indent}Total Requests: ${data.metrics.total_requests.value}\n`
  summary += `${indent}Success Rate: ${(data.metrics.success.value * 100).toFixed(2)}%\n`
  summary += `${indent}Error Rate: ${(data.metrics.errors.value * 100).toFixed(2)}%\n`

  return summary
}
