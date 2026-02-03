/**
 * @gravito/core - DLQ Query Integration Tests
 *
 * 測試 DeadLetterQueueManager 的查詢功能
 * 驗證過濾、分頁、排序等操作
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import type { ConnectionContract } from '@gravito/atlas'
import { DeadLetterQueueManager } from '../../../src/reliability/DeadLetterQueueManager'
import { createTestError, testErrors, testEvents } from './helpers/dlq-fixtures'
import {
  cleanupDlqTable,
  cleanupTestEnvironment,
  createTestEnvironment,
} from './helpers/dlq-test-db'

describe('DLQ Query Integration Tests', () => {
  let connectionName: string
  let connection: ConnectionContract
  let manager: DeadLetterQueueManager

  // 測試用 DLQ IDs
  let dlqIds: string[] = []

  beforeAll(async () => {
    const env = await createTestEnvironment()
    connectionName = env.connectionName
    connection = env.connection
    manager = new DeadLetterQueueManager(connection)
  })

  beforeEach(async () => {
    // 清理並建立測試數據
    await cleanupDlqTable(connection)
    dlqIds = []

    // 插入測試數據
    for (const event of testEvents) {
      const dlqId = await manager.moveToDlq(
        event.name,
        event.payload,
        event.options,
        createTestError(testErrors[0]),
        1
      )
      dlqIds.push(dlqId)
    }
  })

  afterEach(async () => {
    await cleanupDlqTable(connection)
  })

  afterAll(async () => {
    await cleanupTestEnvironment(connectionName)
  })

  describe('list - 基本查詢', () => {
    it('應該列出所有 DLQ 記錄', async () => {
      const records = await manager.list()

      expect(records).toBeDefined()
      expect(Array.isArray(records)).toBe(true)
      expect(records.length).toBe(testEvents.length)
    })

    it('應該返回正確的記錄結構', async () => {
      const records = await manager.list({ limit: 1 })

      expect(records.length).toBe(1)
      const record = records[0]

      expect(record).toHaveProperty('id')
      expect(record).toHaveProperty('dlq_id')
      expect(record).toHaveProperty('event_name')
      expect(record).toHaveProperty('event_payload')
      expect(record).toHaveProperty('attempt_count')
      expect(record).toHaveProperty('status')
      expect(record).toHaveProperty('failed_at')
    })

    it('應該默認返回最多 100 條記錄', async () => {
      // 插入更多記錄以超過默認限制
      for (let i = 0; i < 50; i++) {
        await manager.moveToDlq(`extra:event:${i}`, { index: i }, {}, new Error('Extra'), 1)
      }

      const records = await manager.list()

      // 7 (testEvents) + 50 (extra) = 57，但不會超過默認限制 100
      expect(records.length).toBeLessThanOrEqual(100)
    })
  })

  describe('list - 事件名稱過濾', () => {
    it('應該按事件名稱篩選', async () => {
      const records = await manager.list({ eventName: 'order:created' })

      expect(records.length).toBeGreaterThan(0)
      expect(records.every((r) => r.event_name === 'order:created')).toBe(true)
    })

    it('應該對不存在的事件名稱返回空數組', async () => {
      const records = await manager.list({ eventName: 'non:existent:event' })

      expect(records).toEqual([])
    })

    it('應該區分大小寫', async () => {
      const records = await manager.list({ eventName: 'ORDER:CREATED' })

      // SQLite 默認區分大小寫
      expect(records.length).toBe(0)
    })
  })

  describe('list - 狀態過濾', () => {
    it('應該按狀態篩選 - pending', async () => {
      const records = await manager.list({ status: 'pending' })

      expect(records.length).toBe(testEvents.length)
      expect(records.every((r) => r.status === 'pending')).toBe(true)
    })

    it('應該按狀態篩選 - requeued', async () => {
      // 先將一個事件設為 requeued
      await manager.requeue(dlqIds[0])

      const records = await manager.list({ status: 'requeued' })

      expect(records.length).toBe(1)
      expect(records[0].status).toBe('requeued')
    })

    it('應該按狀態篩選 - resolved', async () => {
      await manager.resolve(dlqIds[0], 'Test resolve')

      const records = await manager.list({ status: 'resolved' })

      expect(records.length).toBe(1)
      expect(records[0].status).toBe('resolved')
    })

    it('應該按狀態篩選 - abandoned', async () => {
      await manager.abandon(dlqIds[0], 'Test abandon')

      const records = await manager.list({ status: 'abandoned' })

      expect(records.length).toBe(1)
      expect(records[0].status).toBe('abandoned')
    })
  })

  describe('list - 組合過濾', () => {
    it('應該支持事件名稱和狀態的組合篩選', async () => {
      // 將一個 order:created 事件設為 requeued
      const orderCreatedRecords = await manager.list({ eventName: 'order:created' })
      if (orderCreatedRecords.length > 0) {
        await manager.requeue(orderCreatedRecords[0].dlq_id)
      }

      // 查詢 pending 的 order:created
      const pendingRecords = await manager.list({
        eventName: 'order:created',
        status: 'pending',
      })

      // 原本有 1 個 order:created，requeue 後應該是 0 個 pending
      expect(pendingRecords.length).toBe(0)

      // 查詢 requeued 的 order:created
      const requeuedRecords = await manager.list({
        eventName: 'order:created',
        status: 'requeued',
      })

      expect(requeuedRecords.length).toBe(1)
    })
  })

  describe('list - 分頁', () => {
    it('應該支持 limit 參數', async () => {
      const records = await manager.list({ limit: 3 })

      expect(records.length).toBe(3)
    })

    it('應該支持 offset 參數', async () => {
      const firstPage = await manager.list({ limit: 2, offset: 0 })
      const secondPage = await manager.list({ limit: 2, offset: 2 })

      expect(firstPage.length).toBe(2)
      expect(secondPage.length).toBe(2)

      // 確保兩頁的記錄不同
      const firstPageIds = firstPage.map((r) => r.dlq_id)
      const secondPageIds = secondPage.map((r) => r.dlq_id)

      expect(firstPageIds.some((id) => secondPageIds.includes(id))).toBe(false)
    })

    it('應該在 offset 超出範圍時返回空數組', async () => {
      const records = await manager.list({ offset: 1000 })

      expect(records).toEqual([])
    })

    it('應該正確處理邊界條件', async () => {
      const totalCount = testEvents.length

      // 取最後兩條
      const lastPage = await manager.list({
        limit: 2,
        offset: totalCount - 2,
      })

      expect(lastPage.length).toBe(2)

      // 取超出範圍
      const beyondPage = await manager.list({
        limit: 10,
        offset: totalCount - 1,
      })

      expect(beyondPage.length).toBe(1)
    })
  })

  describe('list - 排序', () => {
    it('應該按 failed_at 降序排列（最新的優先）', async () => {
      // 添加一些有時間間隔的記錄
      await new Promise((r) => setTimeout(r, 10))
      const newestId = await manager.moveToDlq('newest:event', {}, {}, new Error('Newest'), 1)

      const records = await manager.list()

      // 最新的應該在第一個
      expect(records[0].dlq_id).toBe(newestId)
    })
  })

  describe('list - 時間範圍過濾', () => {
    it('應該按 from 時間過濾', async () => {
      const now = new Date()
      const future = new Date(now.getTime() + 1000 * 60 * 60) // 1 小時後

      const records = await manager.list({ from: future })

      // 沒有未來的記錄
      expect(records.length).toBe(0)
    })

    it('應該按 to 時間過濾', async () => {
      const past = new Date(Date.now() - 1000 * 60 * 60) // 1 小時前

      const records = await manager.list({ to: past })

      // 所有記錄都是最近插入的
      expect(records.length).toBe(0)
    })

    it('應該支持時間範圍組合', async () => {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 1000 * 60 * 60)
      const oneHourLater = new Date(now.getTime() + 1000 * 60 * 60)

      const records = await manager.list({
        from: oneHourAgo,
        to: oneHourLater,
      })

      // 所有剛插入的記錄應該在這個範圍內
      expect(records.length).toBe(testEvents.length)
    })
  })

  describe('getCountByEvent - 計數查詢', () => {
    it('應該返回特定事件的記錄數', async () => {
      const count = await manager.getCountByEvent('order:created')

      expect(count).toBe(1)
    })

    it('應該對不存在的事件返回 0', async () => {
      const count = await manager.getCountByEvent('non:existent')

      expect(count).toBe(0)
    })

    it('應該正確計算多個相同事件', async () => {
      // 添加更多 order:created 事件
      await manager.moveToDlq('order:created', { id: 1 }, {}, new Error('E1'), 1)
      await manager.moveToDlq('order:created', { id: 2 }, {}, new Error('E2'), 1)

      const count = await manager.getCountByEvent('order:created')

      expect(count).toBe(3) // 原來 1 個 + 新增 2 個
    })
  })

  describe('getStats - 統計查詢', () => {
    it('應該返回正確的總數', async () => {
      const stats = await manager.getStats()

      expect(stats.total).toBe(testEvents.length)
    })

    it('應該按事件名稱分組統計', async () => {
      const stats = await manager.getStats()

      expect(stats.byEvent).toHaveProperty('order:created')
      expect(stats.byEvent['order:created']).toBe(1)
    })

    it('應該按狀態分組統計', async () => {
      // 修改一些狀態
      await manager.requeue(dlqIds[0])
      await manager.resolve(dlqIds[1], 'Resolved')
      await manager.abandon(dlqIds[2], 'Abandoned')

      const stats = await manager.getStats()

      expect(stats.byStatus.pending).toBe(testEvents.length - 3)
      expect(stats.byStatus.requeued).toBe(1)
      expect(stats.byStatus.resolved).toBe(1)
      expect(stats.byStatus.abandoned).toBe(1)
    })

    it('應該在空表時返回正確的統計', async () => {
      await cleanupDlqTable(connection)

      const stats = await manager.getStats()

      expect(stats.total).toBe(0)
      expect(stats.byEvent).toEqual({})
      expect(stats.byStatus).toEqual({})
    })
  })
})
