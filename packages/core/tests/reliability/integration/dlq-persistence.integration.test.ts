/**
 * @gravito/core - DLQ Persistence Integration Tests
 *
 * 測試 DeadLetterQueueManager 與真實數據庫的持久化操作
 * 驗證數據正確寫入和讀取
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { ConnectionContract } from '@gravito/atlas'
import { DeadLetterQueueManager } from '../../../src/reliability/DeadLetterQueueManager'
import {
  createTestError,
  largePayload,
  specialCharacterPayload,
  testErrors,
  testEvents,
  testRetryPolicies,
} from './helpers/dlq-fixtures'
import {
  cleanupDlqTable,
  cleanupTestEnvironment,
  createTestEnvironment,
  getRecordCount,
} from './helpers/dlq-test-db'

describe('DLQ Persistence Integration Tests', () => {
  let connectionName: string
  let connection: ConnectionContract
  let manager: DeadLetterQueueManager

  beforeAll(async () => {
    const env = await createTestEnvironment()
    connectionName = env.connectionName
    connection = env.connection
    manager = new DeadLetterQueueManager(connection)
  })

  afterEach(async () => {
    await cleanupDlqTable(connection)
  })

  afterAll(async () => {
    await cleanupTestEnvironment(connectionName)
  })

  describe('moveToDlq - 基本持久化', () => {
    it('應該成功將事件持久化到數據庫', async () => {
      const event = testEvents[0]
      const error = createTestError(testErrors[0])

      const dlqId = await manager.moveToDlq(event.name, event.payload, event.options, error, 1)

      expect(dlqId).toBeTruthy()
      expect(typeof dlqId).toBe('string')

      // 驗證數據庫中有記錄
      const count = await getRecordCount(connection)
      expect(count).toBe(1)
    })

    it('應該返回有效的 UUID 格式', async () => {
      const dlqId = await manager.moveToDlq(
        'test:event',
        { data: 'test' },
        {},
        new Error('Test'),
        1
      )

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      expect(uuidRegex.test(dlqId)).toBe(true)
    })

    it('應該存儲完整的事件負載', async () => {
      const event = testEvents[0]
      const error = createTestError(testErrors[0])

      const dlqId = await manager.moveToDlq(
        event.name,
        event.payload,
        event.options,
        error,
        2,
        testRetryPolicies[0]
      )

      const record = await manager.getById(dlqId)

      expect(record).toBeDefined()
      expect(record?.event_name).toBe(event.name)
      expect(record?.attempt_count).toBe(2)
      expect(record?.status).toBe('pending')

      // 驗證負載（可能被 JSON 序列化/反序列化）
      const payload =
        typeof record?.event_payload === 'string'
          ? JSON.parse(record.event_payload as string)
          : record?.event_payload

      expect(payload).toMatchObject(event.payload)
    })

    it('應該記錄完整的錯誤信息', async () => {
      const errorData = testErrors[0]
      const error = createTestError(errorData)

      const dlqId = await manager.moveToDlq('error:test', { test: true }, {}, error, 1)

      const record = await manager.getById(dlqId)
      const lastError =
        typeof record?.last_error === 'string'
          ? JSON.parse(record.last_error as string)
          : record?.last_error

      expect(lastError).toBeDefined()
      expect(lastError.message).toBe(errorData.message)
      expect(lastError.timestamp).toBeDefined()
    })

    it('應該正確設置默認狀態為 pending', async () => {
      const dlqId = await manager.moveToDlq('status:test', {}, {}, new Error('Test'), 1)

      const record = await manager.getById(dlqId)
      expect(record?.status).toBe('pending')
    })
  })

  describe('moveToDlq - 重試策略', () => {
    it('應該根據重試策略計算 next_retry_at', async () => {
      const retryPolicy = testRetryPolicies[0] // exponential, maxRetries: 3

      const dlqId = await manager.moveToDlq('retry:test', {}, {}, new Error('Test'), 1, retryPolicy)

      const record = await manager.getById(dlqId)

      // 因為 attemptCount(1) + 1 = 2 < maxRetries(3)，應該有 next_retry_at
      expect(record?.next_retry_at).toBeDefined()
    })

    it('應該在達到最大重試次數時不設置 next_retry_at', async () => {
      const retryPolicy = { ...testRetryPolicies[0], maxRetries: 2 }

      const dlqId = await manager.moveToDlq(
        'retry:max',
        {},
        {},
        new Error('Test'),
        2, // 已經重試 2 次，達到最大值
        retryPolicy
      )

      const record = await manager.getById(dlqId)

      // next_retry_at 應該為 null
      expect(record?.next_retry_at).toBeNull()
    })

    it('應該在沒有重試策略時不設置 next_retry_at', async () => {
      const dlqId = await manager.moveToDlq(
        'no:retry',
        {},
        {},
        new Error('Test'),
        1
        // 不提供 retryPolicy
      )

      const record = await manager.getById(dlqId)
      expect(record?.next_retry_at).toBeNull()
    })
  })

  describe('moveToDlq - 特殊數據處理', () => {
    it('應該處理大型負載', async () => {
      const dlqId = await manager.moveToDlq(
        'large:payload',
        largePayload,
        {},
        new Error('Large payload test'),
        1
      )

      const record = await manager.getById(dlqId)
      expect(record).toBeDefined()

      const payload =
        typeof record?.event_payload === 'string'
          ? JSON.parse(record.event_payload as string)
          : record?.event_payload

      expect(payload.items).toHaveLength(100)
    })

    it('應該處理特殊字符', async () => {
      const dlqId = await manager.moveToDlq(
        'special:characters',
        specialCharacterPayload,
        {},
        new Error('Special characters test'),
        1
      )

      const record = await manager.getById(dlqId)
      expect(record).toBeDefined()

      const payload =
        typeof record?.event_payload === 'string'
          ? JSON.parse(record.event_payload as string)
          : record?.event_payload

      // 驗證 Unicode 字符被正確存儲
      expect(payload.unicode.chinese).toBe('中文測試')
      expect(payload.unicode.emoji).toBe('🚀 🎉 ✨ 💻 🔥')

      // 驗證 SQL 注入字符被正確存儲（不會被執行）
      expect(payload.sql.injection1).toBe("'; DROP TABLE users; --")
    })

    it('應該處理空負載', async () => {
      const dlqId = await manager.moveToDlq('empty:payload', {}, {}, new Error('Empty payload'), 1)

      const record = await manager.getById(dlqId)
      expect(record).toBeDefined()
    })

    it('應該處理 null 值的選項', async () => {
      const dlqId = await manager.moveToDlq(
        'null:options',
        { data: 'test' },
        { priority: undefined } as any,
        new Error('Null options test'),
        1
      )

      const record = await manager.getById(dlqId)
      expect(record).toBeDefined()
    })
  })

  describe('getById - 讀取驗證', () => {
    it('應該正確讀取已存儲的記錄', async () => {
      const event = testEvents[2]
      const error = createTestError(testErrors[1])

      const dlqId = await manager.moveToDlq(
        event.name,
        event.payload,
        event.options,
        error,
        3,
        testRetryPolicies[1]
      )

      const record = await manager.getById(dlqId)

      expect(record).toBeDefined()
      expect(record?.dlq_id).toBe(dlqId)
      expect(record?.event_name).toBe(event.name)
      expect(record?.attempt_count).toBe(3)
      expect(record?.max_retries).toBe(testRetryPolicies[1].maxRetries)
    })

    it('應該為不存在的 ID 返回 undefined', async () => {
      const record = await manager.getById('non-existent-uuid')
      expect(record).toBeUndefined()
    })

    it('應該處理無效的 UUID 格式', async () => {
      const record = await manager.getById('invalid-id')
      expect(record).toBeUndefined()
    })
  })

  describe('批量插入性能', () => {
    it('應該能處理 100 條記錄的批量插入', async () => {
      const startTime = Date.now()

      for (let i = 0; i < 100; i++) {
        await manager.moveToDlq(
          `bulk:event:${i}`,
          { index: i },
          {},
          new Error(`Bulk error ${i}`),
          1
        )
      }

      const duration = Date.now() - startTime
      const count = await getRecordCount(connection)

      expect(count).toBe(100)
      // 100 條記錄應該在 5 秒內完成
      expect(duration).toBeLessThan(5000)
    })
  })
})
