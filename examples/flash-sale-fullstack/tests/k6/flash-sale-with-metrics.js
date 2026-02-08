/**
 * Flash Sale K6 性能測試 - 含 Prometheus 指標驗證
 *
 * 測試場景：
 * 1. main_load: 模擬搶購流量
 * 2. metrics_verification: 驗證 Prometheus 端點和指標收集
 *
 * 運行方式：
 * k6 run tests/k6/flash-sale-with-metrics.js
 *
 * 或使用自定義配置：
 * k6 run -e BASE_URL=http://localhost:3000 -e PROMETHEUS_URL=http://localhost:9090 tests/k6/flash-sale-with-metrics.js
 */

import { check, group, sleep } from 'k6'
import http from 'k6/http'
import { Rate, Trend } from 'k6/metrics'

// ─────────────────────────────────────────────────────────────────────────
// 自定義指標
// ─────────────────────────────────────────────────────────────────────────

const metricsEndpointSuccess = new Rate('metrics_endpoint_success')
const prometheusMetricsCount = new Trend('prometheus_metrics_count')
const orderCreationTime = new Trend('order_creation_time')
const metricsResponseTime = new Trend('metrics_response_time')

// ─────────────────────────────────────────────────────────────────────────
// 配置
// ─────────────────────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const PROMETHEUS_URL = __ENV.PROMETHEUS_URL || 'http://localhost:9090'

export const options = {
  stages: [
    // 預熱階段：2 分鐘，從 0 到 10 VU
    { duration: '2m', target: 10 },
    // 正常負載：3 分鐘，10 VU
    { duration: '3m', target: 10 },
    // 尖峰：1 分鐘，100 VU
    { duration: '1m', target: 100 },
    // 壓力測試：5 分鐘，500 VU
    { duration: '5m', target: 500 },
    // 冷卻：2 分鐘，回到 0 VU
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.1'],
    metrics_endpoint_success: ['rate>0.99'],
  },
}

// ─────────────────────────────────────────────────────────────────────────
// 工具函數
// ─────────────────────────────────────────────────────────────────────────

function getRandomProduct() {
  const products = ['product-1', 'product-2', 'product-3', 'product-4', 'product-5']
  return products[Math.floor(Math.random() * products.length)]
}

function parsePrometheusMetrics(metricsText) {
  if (!metricsText) {
    return 0
  }

  // 計算 gravito_event_ 開頭的指標行數
  const lines = metricsText.split('\n')
  return lines.filter((line) => line.startsWith('gravito_event_')).length
}

// ─────────────────────────────────────────────────────────────────────────
// 測試場景 1: 主要負載 - 搶購流程
// ─────────────────────────────────────────────────────────────────────────

export function mainLoad() {
  // 獲取商品列表
  group('Get Products', () => {
    const productRes = http.get(`${BASE_URL}/api/products`)
    check(productRes, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
    })
  })

  sleep(1)

  // 創建訂單
  group('Create Order', () => {
    const orderPayload = {
      userId: `user-${__VU}-${__ITER}`,
      productId: getRandomProduct(),
      quantity: Math.floor(Math.random() * 5) + 1,
    }

    const orderRes = http.post(`${BASE_URL}/api/orders`, JSON.stringify(orderPayload), {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    orderCreationTime.add(orderRes.timings.duration)

    check(orderRes, {
      'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'has order id': (r) => r.json('id') !== undefined,
      'response time < 1000ms': (r) => r.timings.duration < 1000,
    })
  })

  sleep(2)
}

// ─────────────────────────────────────────────────────────────────────────
// 測試場景 2: Prometheus 指標驗證
// ─────────────────────────────────────────────────────────────────────────

export function verifyMetrics() {
  group('Verify Prometheus Endpoint', () => {
    const startTime = Date.now()
    const metricsRes = http.get(`${PROMETHEUS_URL}/metrics`)
    const endTime = Date.now()

    metricsResponseTime.add(endTime - startTime)

    const success = check(metricsRes, {
      'metrics endpoint status 200': (r) => r.status === 200,
      'response type is text': (r) => r.headers['Content-Type'].includes('text'),
      'has dispatch duration metric': (r) =>
        r.body.includes('gravito_event_dispatch_duration_seconds'),
      'has queue depth metric': (r) => r.body.includes('gravito_event_queue_depth'),
      'has circuit breaker state metric': (r) =>
        r.body.includes('gravito_event_circuit_breaker_state'),
      'has listener duration metric': (r) =>
        r.body.includes('gravito_event_listener_duration_seconds'),
      'has circuit breaker failures metric': (r) =>
        r.body.includes('gravito_event_circuit_breaker_failures_total'),
      'has circuit breaker successes metric': (r) =>
        r.body.includes('gravito_event_circuit_breaker_successes_total'),
      'has circuit breaker transitions metric': (r) =>
        r.body.includes('gravito_event_circuit_breaker_transitions_total'),
      'has circuit breaker open duration metric': (r) =>
        r.body.includes('gravito_event_circuit_breaker_open_duration_seconds'),
    })

    metricsEndpointSuccess.add(success)

    // 計算和驗證指標計數
    const metricsCount = parsePrometheusMetrics(metricsRes.body)
    prometheusMetricsCount.add(metricsCount)

    if (metricsCount < 8) {
      console.warn(`⚠️  只發現 ${metricsCount} 個 gravito_event_ 指標，預期至少 8 個`)
    }
  })

  sleep(5)
}

// ─────────────────────────────────────────────────────────────────────────
// 導出總結函數
// ─────────────────────────────────────────────────────────────────────────

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', percentiles: ['p(95)', 'p(99)'] }),
  }
}

// 簡單的文本總結
function textSummary(data, _options) {
  const metrics = data.metrics
  let summary = '\n📊 K6 性能測試總結\n'
  summary += `${'═'.repeat(50)}\n`

  if (metrics.http_req_duration) {
    const values = metrics.http_req_duration.values
    summary += `HTTP 請求延遲 (ms):\n`
    summary += `  平均: ${Math.round(values.avg) || 'N/A'}\n`
    summary += `  最小: ${Math.round(values.min) || 'N/A'}\n`
    summary += `  最大: ${Math.round(values.max) || 'N/A'}\n`
  }

  if (metrics.metrics_endpoint_success) {
    const rate = (metrics.metrics_endpoint_success.value * 100).toFixed(2)
    summary += `Prometheus 端點成功率: ${rate}%\n`
  }

  if (metrics.prometheus_metrics_count) {
    const values = metrics.prometheus_metrics_count.values
    summary += `Prometheus 指標計數: ${Math.round(values.avg) || 'N/A'} (avg)\n`
  }

  summary += `${'═'.repeat(50)}\n`
  return summary
}
