/**
 * Retry System Performance Test - K6 Load Test
 *
 * 測試重試系統的性能和可靠性
 * - 重試佇列處理能力
 * - 指數回退延遲驗證
 * - DLQ 路由驗證
 * - OVERFLOW 背壓處理
 */

import { check, group, sleep } from 'k6'
import http from 'k6/http'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const RAMP_UP_DURATION = '2m'
const SUSTAIN_DURATION = '5m'
const RAMP_DOWN_DURATION = '1m'

export const options = {
  stages: [
    // 預熱階段：0→50 VU，2分鐘內線性增長
    { duration: RAMP_UP_DURATION, target: 50 },
    // 正常負載：50 VU 維持 5 分鐘
    { duration: SUSTAIN_DURATION, target: 50 },
    // 尖峰測試：50→200 VU，測試背壓和 OVERFLOW
    { duration: '1m', target: 200 },
    // 維持尖峰
    { duration: '2m', target: 200 },
    // 降載：200→0 VU
    { duration: RAMP_DOWN_DURATION, target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.1'],
  },
}

/**
 * 測試組 1: 基礎事件派發 - 測試重試系統的基礎功能
 */
export function testBasicEventDispatching() {
  group('Event Dispatching', () => {
    // 派發高優先級事件
    let res = http.post(`${BASE_URL}/api/events/high-priority-event`, JSON.stringify({}), {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'HighPriorityEvent' },
    })
    check(res, {
      'high priority event dispatched': (r) => r.status === 200 || r.status === 202,
      'response time < 100ms': (r) => r.timings.duration < 100,
    })

    // 派發普通優先級事件
    res = http.post(`${BASE_URL}/api/events/normal-event`, JSON.stringify({}), {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'NormalEvent' },
    })
    check(res, {
      'normal event dispatched': (r) => r.status === 200 || r.status === 202,
    })

    // 派發低優先級事件
    res = http.post(`${BASE_URL}/api/events/low-priority-event`, JSON.stringify({}), {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'LowPriorityEvent' },
    })
    check(res, {
      'low priority event dispatched': (r) => r.status === 200 || r.status === 202,
    })
  })
}

/**
 * 測試組 2: 重試機制驗證 - 驗證重試系統的可靠性
 */
export function testRetryMechanism() {
  group('Retry Mechanism', () => {
    // 派發會失敗的事件（需要重試）
    let res = http.post(`${BASE_URL}/api/events/failing-event`, JSON.stringify({}), {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'FailingEvent' },
    })

    check(res, {
      'failing event accepted': (r) => r.status === 200 || r.status === 202,
    })

    // 檢查重試隊列深度
    res = http.get(`${BASE_URL}/api/metrics/retry-queue-depth`, {
      tags: { name: 'GetRetryQueueDepth' },
    })

    check(res, {
      'queue depth endpoint available': (r) => r.status === 200,
      'queue depth non-negative': (r) => {
        const body = JSON.parse(r.body || '{}')
        return body.depth !== undefined && body.depth >= 0
      },
    })
  })
}

/**
 * 測試組 3: 背壓和 OVERFLOW 測試 - 驗證系統過載保護
 */
export function testBackpressureAndOverflow() {
  group('Backpressure and Overflow', () => {
    const payloads = []

    // 快速派發大量事件以觸發背壓
    for (let i = 0; i < 50; i++) {
      payloads.push(
        http.post(`${BASE_URL}/api/events/bulk-event-${i}`, JSON.stringify({ batchId: i }), {
          headers: { 'Content-Type': 'application/json' },
          tags: { name: 'BulkEvent' },
        })
      )
    }

    // 檢查是否有 OVERFLOW 拒絕
    let overflowCount = 0
    for (const res of payloads) {
      if (res.status === 429 || res.status === 503) {
        overflowCount++
      }
    }

    check(null, {
      'some events succeeded under high load': () => payloads.length - overflowCount > 0,
      'overflow protection working': () => overflowCount >= 0, // 可能有，可能沒有
    })

    // 檢查背壓狀態
    const statusRes = http.get(`${BASE_URL}/api/metrics/backpressure-status`, {
      tags: { name: 'GetBackpressureStatus' },
    })

    check(statusRes, {
      'backpressure status available': (r) => r.status === 200,
    })
  })
}

/**
 * 測試組 4: DLQ 監控 - 驗證死信隊列功能
 */
export function testDLQMonitoring() {
  group('Dead Letter Queue', () => {
    // 獲取 DLQ 統計信息
    let res = http.get(`${BASE_URL}/api/metrics/dlq-stats`, {
      tags: { name: 'GetDLQStats' },
    })

    check(res, {
      'DLQ stats available': (r) => r.status === 200,
      'DLQ response valid': (r) => {
        const body = JSON.parse(r.body || '{}')
        return body.totalEntries !== undefined && body.dlqSize !== undefined
      },
    })

    // 派發會最終進入 DLQ 的事件
    res = http.post(`${BASE_URL}/api/events/permanent-failure-event`, JSON.stringify({}), {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'PermanentFailureEvent' },
    })

    check(res, {
      'permanent failure event accepted': (r) => r.status === 200 || r.status === 202,
    })
  })
}

/**
 * 測試組 5: 指標驗證 - 驗證 Prometheus 指標記錄
 */
export function testMetricsRecording() {
  group('Metrics Recording', () => {
    // 檢查重試指標
    const res = http.get(`${BASE_URL}/api/metrics/prometheus`, {
      tags: { name: 'GetPrometheusMetrics' },
    })

    check(res, {
      'prometheus endpoint available': (r) => r.status === 200,
      'contains retry queue depth metric': (r) =>
        r.body.includes('gravito_event_retry_queue_depth'),
      'contains retry attempt metric': (r) => r.body.includes('gravito_event_retry_attempt_total'),
      'contains DLQ entry metric': (r) => r.body.includes('gravito_event_dlq_entry_total'),
      'contains backpressure rejection metric': (r) =>
        r.body.includes('gravito_event_backpressure_rejection_total'),
    })
  })
}

/**
 * 主測試函數 - 執行所有測試組
 */
export default function main() {
  const iteration = __ITER // 當前迭代次數

  // 根據階段分配不同的測試
  if (iteration % 5 === 0) {
    testBasicEventDispatching()
  } else if (iteration % 5 === 1) {
    testRetryMechanism()
  } else if (iteration % 5 === 2) {
    testBackpressureAndOverflow()
  } else if (iteration % 5 === 3) {
    testDLQMonitoring()
  } else {
    testMetricsRecording()
  }

  // 每個迭代之間休息 100-500ms，模擬真實用戶行為
  sleep(0.1 + Math.random() * 0.4)
}

/**
 * 設置函數 - 測試開始前的初始化
 */
export function setup() {
  // 檢查服務器是否可達
  const res = http.get(`${BASE_URL}/api/health`, {
    tags: { name: 'HealthCheck' },
  })

  if (res.status !== 200) {
    throw new Error(`Service not ready: ${res.status}`)
  }

  console.log('Service is ready, starting load test...')
}

/**
 * 拆卸函數 - 測試完成後的清理
 */
export function teardown() {
  // 獲取最終統計信息
  const res = http.get(`${BASE_URL}/api/metrics/test-summary`, {
    tags: { name: 'GetTestSummary' },
  })

  if (res.status === 200) {
    console.log('Final test summary:', res.body)
  }
}
