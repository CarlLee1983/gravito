/**
 * @gravito/core - DLQ End-to-End Integration Tests
 *
 * 測試 DeadLetterQueueManager 的完整工作流程
 * 模擬真實場景的事件處理和錯誤恢復
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import type { ConnectionContract } from '@gravito/atlas'
import {
  DeadLetterQueueManager,
  type DLQRecord,
} from '../../../src/reliability/DeadLetterQueueManager'
import type { RetryPolicy } from '../../../src/reliability/RetryPolicy'
import { createTestError, testErrors, testRetryPolicies } from './helpers/dlq-fixtures'
import {
  cleanupDlqTable,
  cleanupTestEnvironment,
  createTestEnvironment,
  getRecordCount,
} from './helpers/dlq-test-db'

describe('DLQ End-to-End Integration Tests', () => {
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

  describe('場景 1: 訂單處理失敗與恢復', () => {
    const orderEvent = {
      name: 'order:created',
      payload: {
        orderId: 'ORD-E2E-001',
        customerId: 'CUST-001',
        items: [
          { productId: 'PROD-001', quantity: 2, price: 99.99 },
          { productId: 'PROD-002', quantity: 1, price: 149.99 },
        ],
        total: 349.97,
      },
      retryPolicy: testRetryPolicies[0],
    }

    it('應該完成失敗 -> DLQ -> 重試 -> 成功 的完整流程', async () => {
      // 1. 事件處理失敗，移至 DLQ
      const dlqId = await manager.moveToDlq(
        orderEvent.name,
        orderEvent.payload,
        {},
        createTestError(testErrors[0]),
        1,
        orderEvent.retryPolicy
      )

      // 驗證事件在 DLQ 中
      let record = await manager.getById(dlqId)
      expect(record?.status).toBe('pending')
      expect(record?.attempt_count).toBe(1)

      // 2. 模擬自動重試失敗（第二次）
      // 更新嘗試次數（實際中由重試引擎處理）
      await connection
        .table('event_dlq')
        .where('dlq_id', dlqId)
        .update({
          attempt_count: 2,
          last_error: JSON.stringify({
            message: 'Second attempt failed',
            timestamp: new Date().toISOString(),
          }),
        })

      record = await manager.getById(dlqId)
      expect(record?.attempt_count).toBe(2)

      // 3. 手動重新入隊
      await manager.requeue(dlqId)

      record = await manager.getById(dlqId)
      expect(record?.status).toBe('requeued')

      // 4. 模擬重試成功，標記為已解決
      await manager.resolve(dlqId, 'Manual retry succeeded after fixing upstream service')

      record = await manager.getById(dlqId)
      expect(record?.status).toBe('resolved')
      expect(record?.resolution_notes).toContain('Manual retry succeeded')
    })

    it('應該完成失敗 -> DLQ -> 超過重試 -> 放棄 的流程', async () => {
      const retryPolicy: RetryPolicy = {
        maxRetries: 3,
        backoff: 'exponential',
        initialDelayMs: 1000,
        maxDelayMs: 30000,
      }

      // 1. 事件處理失敗，移至 DLQ
      const dlqId = await manager.moveToDlq(
        orderEvent.name,
        orderEvent.payload,
        {},
        createTestError(testErrors[1]),
        3, // 已經是第 3 次嘗試
        retryPolicy
      )

      let record = await manager.getById(dlqId)
      expect(record?.status).toBe('pending')
      expect(record?.next_retry_at).toBeNull() // 已達最大重試

      // 2. 管理員決定放棄
      await manager.abandon(
        dlqId,
        'After manual investigation: external service is deprecated, data will be handled offline'
      )

      record = await manager.getById(dlqId)
      expect(record?.status).toBe('abandoned')
    })
  })

  describe('場景 2: 批量支付事件處理', () => {
    it('應該能處理多個失敗的支付事件並批量重試', async () => {
      // 1. 模擬多個支付事件失敗
      const paymentIds: string[] = []

      for (let i = 1; i <= 5; i++) {
        const dlqId = await manager.moveToDlq(
          'payment:processed',
          {
            paymentId: `PAY-BATCH-${String(i).padStart(3, '0')}`,
            orderId: `ORD-BATCH-${String(i).padStart(3, '0')}`,
            amount: 100 * i,
            status: 'failed',
          },
          { priority: 'high' },
          createTestError(testErrors[2]),
          1
        )
        paymentIds.push(dlqId)
      }

      // 驗證所有都在 DLQ 中
      const stats = await manager.getStats()
      expect(stats.byEvent['payment:processed']).toBe(5)

      // 2. 批量重新入隊所有支付事件
      const result = await manager.retryBatch({ eventName: 'payment:processed' })

      expect(result.total).toBe(5)
      expect(result.succeeded).toBe(5)

      // 3. 驗證所有都被標記為 requeued
      const requeuedRecords = await manager.list({
        eventName: 'payment:processed',
        status: 'requeued',
      })
      expect(requeuedRecords.length).toBe(5)

      // 4. 模擬部分成功，部分失敗
      await manager.resolve(paymentIds[0], 'Retry succeeded')
      await manager.resolve(paymentIds[1], 'Retry succeeded')
      await manager.abandon(paymentIds[2], 'Customer disputed, refund initiated')

      // 5. 驗證最終統計
      const finalStats = await manager.getStats()
      expect(finalStats.byStatus.resolved).toBe(2)
      expect(finalStats.byStatus.abandoned).toBe(1)
      expect(finalStats.byStatus.requeued).toBe(2)
    })
  })

  describe('場景 3: 事件數據完整性', () => {
    it('應該在整個生命週期中保持事件數據完整', async () => {
      const complexPayload = {
        orderId: 'ORD-INTEGRITY-001',
        customer: {
          id: 'CUST-001',
          name: '測試用戶',
          email: 'test@example.com',
          addresses: [
            { type: 'billing', city: '台北' },
            { type: 'shipping', city: '新北' },
          ],
        },
        items: Array.from({ length: 10 }, (_, i) => ({
          id: `ITEM-${i}`,
          name: `商品 ${i}`,
          price: Math.random() * 1000,
        })),
        metadata: {
          source: 'e2e-test',
          timestamp: new Date().toISOString(),
          nested: {
            deep: {
              value: 'test',
            },
          },
        },
      }

      // 1. 創建事件
      const dlqId = await manager.moveToDlq(
        'order:complex',
        complexPayload,
        { retry: { maxRetries: 3 } },
        new Error('Complex payload test'),
        1
      )

      // 2. 讀取並驗證
      const record = await manager.getById(dlqId)
      const payload =
        typeof record?.event_payload === 'string'
          ? JSON.parse(record.event_payload as string)
          : record?.event_payload

      expect(payload.customer.name).toBe('測試用戶')
      expect(payload.items.length).toBe(10)
      expect(payload.metadata.nested.deep.value).toBe('test')

      // 3. 經過狀態變更後仍保持數據完整
      await manager.requeue(dlqId)
      await manager.resolve(dlqId, 'Test completed')

      const finalRecord = await manager.getById(dlqId)
      const finalPayload =
        typeof finalRecord?.event_payload === 'string'
          ? JSON.parse(finalRecord.event_payload as string)
          : finalRecord?.event_payload

      expect(finalPayload).toMatchObject(complexPayload)
    })
  })

  describe('場景 4: 監控和報告', () => {
    it('應該能生成完整的 DLQ 報告', async () => {
      // 1. 創建多種類型的事件
      const eventTypes = [
        { name: 'order:created', count: 5 },
        { name: 'payment:processed', count: 3 },
        { name: 'inventory:low', count: 2 },
        { name: 'notification:send', count: 4 },
      ]

      const allIds: string[] = []

      for (const eventType of eventTypes) {
        for (let i = 0; i < eventType.count; i++) {
          const dlqId = await manager.moveToDlq(
            eventType.name,
            { index: i },
            {},
            createTestError(testErrors[i % testErrors.length]),
            1
          )
          allIds.push(dlqId)
        }
      }

      // 2. 修改一些狀態
      await manager.requeue(allIds[0])
      await manager.requeue(allIds[1])
      await manager.resolve(allIds[2], 'Fixed')
      await manager.abandon(allIds[3], 'Abandoned')

      // 3. 獲取完整報告
      const stats = await manager.getStats()

      // 驗證總數
      expect(stats.total).toBe(14)

      // 驗證按事件分組
      expect(stats.byEvent['order:created']).toBe(5)
      expect(stats.byEvent['payment:processed']).toBe(3)
      expect(stats.byEvent['inventory:low']).toBe(2)
      expect(stats.byEvent['notification:send']).toBe(4)

      // 驗證按狀態分組
      expect(stats.byStatus.pending).toBe(10)
      expect(stats.byStatus.requeued).toBe(2)
      expect(stats.byStatus.resolved).toBe(1)
      expect(stats.byStatus.abandoned).toBe(1)
    })

    it('應該支持分頁瀏覽大量 DLQ 記錄', async () => {
      // 1. 創建大量記錄
      for (let i = 0; i < 50; i++) {
        await manager.moveToDlq(
          `pagination:test:${i % 5}`, // 5 種不同的事件類型
          { index: i },
          {},
          new Error(`Error ${i}`),
          1
        )
      }

      // 2. 分頁瀏覽
      const pageSize = 10
      const allRecords: DLQRecord[] = []

      for (let page = 0; page < 5; page++) {
        const records = await manager.list({
          limit: pageSize,
          offset: page * pageSize,
        })
        allRecords.push(...records)
      }

      // 3. 驗證獲取了所有記錄（無重複）
      const uniqueIds = new Set(allRecords.map((r) => r.dlq_id))
      expect(uniqueIds.size).toBe(50)
    })
  })

  describe('場景 5: 清理舊數據', () => {
    it('應該能清理已解決的舊事件', async () => {
      // 1. 創建並解決一些事件
      const resolvedIds: string[] = []
      for (let i = 0; i < 10; i++) {
        const dlqId = await manager.moveToDlq(
          'cleanup:test',
          { index: i },
          {},
          new Error(`Error ${i}`),
          1
        )

        if (i < 5) {
          await manager.resolve(dlqId, 'Resolved')
          resolvedIds.push(dlqId)
        }
      }

      // 2. 驗證初始狀態
      const beforeStats = await manager.getStats()
      expect(beforeStats.byStatus.pending).toBe(5)
      expect(beforeStats.byStatus.resolved).toBe(5)

      // 3. 刪除已解決的事件
      await manager.deleteEntries(resolvedIds)

      // 4. 驗證清理結果
      const afterStats = await manager.getStats()
      expect(afterStats.total).toBe(5)
      expect(afterStats.byStatus.pending).toBe(5)
      expect(afterStats.byStatus.resolved).toBeUndefined()
    })

    it('應該能選擇性清空不同狀態的事件', async () => {
      // 1. 創建各種狀態的事件
      for (let i = 0; i < 5; i++) {
        await manager.moveToDlq('state:pending', { i }, {}, new Error('E'), 1)
      }

      for (let i = 0; i < 3; i++) {
        const id = await manager.moveToDlq('state:resolved', { i }, {}, new Error('E'), 1)
        await manager.resolve(id, 'R')
      }

      for (let i = 0; i < 2; i++) {
        const id = await manager.moveToDlq('state:abandoned', { i }, {}, new Error('E'), 1)
        await manager.abandon(id, 'A')
      }

      // 2. 只清空 pending
      const cleared = await manager.clear(false)
      expect(cleared).toBe(5)

      // 3. 驗證 resolved 和 abandoned 還在
      const count = await getRecordCount(connection)
      expect(count).toBe(5) // 3 resolved + 2 abandoned

      // 4. 清空所有
      const clearedAll = await manager.clear(true)
      expect(clearedAll).toBe(5)

      const finalCount = await getRecordCount(connection)
      expect(finalCount).toBe(0)
    })
  })
})
