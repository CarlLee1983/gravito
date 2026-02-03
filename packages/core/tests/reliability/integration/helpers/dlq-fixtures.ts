/**
 * @gravito/core - DLQ Integration Test Fixtures
 *
 * 提供測試夾具（預設數據），用於 DLQ 整合測試
 */

import type { EventOptions } from '../../../../src/events/EventOptions'
import type { RetryPolicy } from '../../../../src/reliability/RetryPolicy'

/**
 * 測試事件數據
 */
export interface TestEvent {
  name: string
  payload: Record<string, unknown>
  options: EventOptions
}

/**
 * 測試錯誤數據
 */
export interface TestError {
  message: string
  code?: string
  stack?: string
}

/**
 * 預設測試事件
 */
export const testEvents: TestEvent[] = [
  {
    name: 'order:created',
    payload: {
      orderId: 'ORD-001',
      customerId: 'CUST-001',
      total: 199.99,
      items: [{ productId: 'PROD-001', quantity: 2, price: 99.99 }],
      createdAt: '2026-02-03T10:00:00Z',
    },
    options: {
      priority: 'high',
      retry: { maxRetries: 3, backoff: 'exponential' },
    },
  },
  {
    name: 'order:updated',
    payload: {
      orderId: 'ORD-002',
      customerId: 'CUST-002',
      status: 'processing',
      updatedAt: '2026-02-03T11:00:00Z',
    },
    options: {
      priority: 'normal',
    },
  },
  {
    name: 'payment:processed',
    payload: {
      paymentId: 'PAY-001',
      orderId: 'ORD-001',
      amount: 199.99,
      currency: 'TWD',
      method: 'credit_card',
      status: 'completed',
    },
    options: {
      priority: 'high',
      retry: { maxRetries: 5, backoff: 'linear' },
    },
  },
  {
    name: 'payment:failed',
    payload: {
      paymentId: 'PAY-002',
      orderId: 'ORD-003',
      amount: 299.99,
      currency: 'TWD',
      method: 'bank_transfer',
      errorCode: 'INSUFFICIENT_FUNDS',
    },
    options: {
      priority: 'critical',
    },
  },
  {
    name: 'inventory:low',
    payload: {
      productId: 'PROD-001',
      currentStock: 5,
      threshold: 10,
      warehouseId: 'WH-001',
    },
    options: {
      priority: 'normal',
    },
  },
  {
    name: 'user:registered',
    payload: {
      userId: 'USER-001',
      email: 'test@example.com',
      registeredAt: '2026-02-03T09:00:00Z',
    },
    options: {},
  },
  {
    name: 'notification:send',
    payload: {
      notificationId: 'NOTIF-001',
      type: 'email',
      recipient: 'user@example.com',
      subject: 'Order Confirmation',
      body: 'Your order has been confirmed.',
    },
    options: {
      retry: { maxRetries: 2, backoff: 'fixed' },
    },
  },
]

/**
 * 預設測試錯誤
 */
export const testErrors: TestError[] = [
  {
    message: 'Service unavailable',
    code: 'SERVICE_UNAVAILABLE',
    stack: 'Error: Service unavailable\n    at processEvent (/app/events.ts:42:11)',
  },
  {
    message: 'Database connection timeout',
    code: 'DB_TIMEOUT',
    stack: 'Error: Database connection timeout\n    at query (/app/db.ts:128:15)',
  },
  {
    message: 'External API rate limited',
    code: 'RATE_LIMITED',
    stack: 'Error: External API rate limited\n    at callExternalApi (/app/api.ts:56:9)',
  },
  {
    message: 'Validation failed: invalid email format',
    code: 'VALIDATION_ERROR',
  },
  {
    message: 'Network error: connection reset',
    code: 'NETWORK_ERROR',
  },
  {
    message: 'Unexpected null value in payload',
    code: 'NULL_POINTER',
  },
  {
    message: 'Permission denied: insufficient privileges',
    code: 'PERMISSION_DENIED',
  },
]

/**
 * 預設重試策略
 */
export const testRetryPolicies: RetryPolicy[] = [
  {
    maxRetries: 3,
    backoff: 'exponential',
    initialDelayMs: 1000,
    maxDelayMs: 30000,
  },
  {
    maxRetries: 5,
    backoff: 'linear',
    initialDelayMs: 500,
    maxDelayMs: 10000,
  },
  {
    maxRetries: 2,
    backoff: 'fixed',
    initialDelayMs: 2000,
    maxDelayMs: 2000,
  },
  {
    maxRetries: 10,
    backoff: 'exponential',
    initialDelayMs: 100,
    maxDelayMs: 60000,
    jitter: true,
  },
]

/**
 * 創建測試錯誤實例
 *
 * @param errorData - 錯誤數據
 * @returns Error 實例
 */
export function createTestError(errorData: TestError): Error {
  const error = new Error(errorData.message) as Error & { code?: string }
  if (errorData.code) {
    error.code = errorData.code
  }
  if (errorData.stack) {
    error.stack = errorData.stack
  }
  return error
}

/**
 * 獲取隨機測試事件
 *
 * @returns 隨機的測試事件
 */
export function getRandomEvent(): TestEvent {
  return testEvents[Math.floor(Math.random() * testEvents.length)]
}

/**
 * 獲取隨機測試錯誤
 *
 * @returns 隨機的測試錯誤
 */
export function getRandomError(): TestError {
  return testErrors[Math.floor(Math.random() * testErrors.length)]
}

/**
 * 獲取隨機重試策略
 *
 * @returns 隨機的重試策略
 */
export function getRandomRetryPolicy(): RetryPolicy {
  return testRetryPolicies[Math.floor(Math.random() * testRetryPolicies.length)]
}

/**
 * 按事件名稱獲取測試事件
 *
 * @param eventName - 事件名稱
 * @returns 匹配的測試事件或 undefined
 */
export function getEventByName(eventName: string): TestEvent | undefined {
  return testEvents.find((e) => e.name === eventName)
}

/**
 * 獲取特定類型的所有事件
 *
 * @param prefix - 事件名稱前綴（如 'order:', 'payment:'）
 * @returns 匹配的測試事件列表
 */
export function getEventsByPrefix(prefix: string): TestEvent[] {
  return testEvents.filter((e) => e.name.startsWith(prefix))
}

/**
 * 生成批量測試事件
 *
 * @param count - 要生成的數量
 * @param baseEvent - 基礎事件（可選）
 * @returns 測試事件列表
 */
export function generateBulkEvents(count: number, baseEvent?: Partial<TestEvent>): TestEvent[] {
  const events: TestEvent[] = []

  for (let i = 0; i < count; i++) {
    const randomEvent = getRandomEvent()
    events.push({
      name: baseEvent?.name || randomEvent.name,
      payload: {
        ...randomEvent.payload,
        ...baseEvent?.payload,
        _testIndex: i,
        _generatedAt: new Date().toISOString(),
      },
      options: baseEvent?.options || randomEvent.options,
    })
  }

  return events
}

/**
 * 生成帶有時間間隔的測試事件
 *
 * 用於測試時間範圍查詢
 *
 * @param count - 要生成的數量
 * @param intervalMs - 時間間隔（毫秒）
 * @returns 帶有不同時間戳的測試事件列表
 */
export function generateTimedEvents(
  count: number,
  intervalMs = 1000
): Array<TestEvent & { timestamp: Date }> {
  const events: Array<TestEvent & { timestamp: Date }> = []
  const baseTime = Date.now()

  for (let i = 0; i < count; i++) {
    const randomEvent = getRandomEvent()
    events.push({
      ...randomEvent,
      payload: {
        ...randomEvent.payload,
        _testIndex: i,
      },
      timestamp: new Date(baseTime - i * intervalMs),
    })
  }

  return events
}

/**
 * 大型負載測試數據
 *
 * 用於測試大數據量的處理
 */
export const largePayload = {
  orderId: 'ORD-LARGE-001',
  items: Array.from({ length: 100 }, (_, i) => ({
    productId: `PROD-${String(i + 1).padStart(5, '0')}`,
    name: `Product ${i + 1}`,
    description: `This is a detailed description for product ${i + 1}. `.repeat(10),
    quantity: Math.floor(Math.random() * 10) + 1,
    price: Math.round(Math.random() * 10000) / 100,
    metadata: {
      sku: `SKU-${i + 1}`,
      category: ['electronics', 'clothing', 'food', 'home'][i % 4],
      tags: [`tag-${i}`, `tag-${i + 1}`, `tag-${i + 2}`],
    },
  })),
  customer: {
    id: 'CUST-LARGE-001',
    name: 'Large Order Customer',
    email: 'large-order@example.com',
    addresses: Array.from({ length: 5 }, (_, i) => ({
      type: ['billing', 'shipping', 'default'][i % 3],
      street: `${i + 1} Main Street`,
      city: 'Test City',
      country: 'Test Country',
      postalCode: `1000${i}`,
    })),
  },
  metadata: {
    source: 'integration-test',
    version: '1.0.0',
    largeArray: Array.from({ length: 1000 }, (_, i) => i),
  },
}

/**
 * 特殊字符測試數據
 *
 * 用於測試特殊字符的處理
 */
export const specialCharacterPayload = {
  unicode: {
    chinese: '中文測試',
    japanese: 'テスト',
    korean: '테스트',
    emoji: '🚀 🎉 ✨ 💻 🔥',
    arabic: 'اختبار',
  },
  sql: {
    injection1: "'; DROP TABLE users; --",
    injection2: "1' OR '1'='1",
    quotes: 'It\'s a "test"',
  },
  special: {
    newlines: 'line1\nline2\r\nline3',
    tabs: 'col1\tcol2\tcol3',
    backslash: 'path\\to\\file',
    nullChar: 'test\x00null',
  },
  html: {
    script: '<script>alert("xss")</script>',
    tags: '<div onclick="evil()">Click</div>',
  },
}
