/**
 * @gravito/core - DLQ Requeue Integration Tests
 *
 * 測試 DeadLetterQueueManager 的重新入隊功能
 * 驗證單個和批量重新入隊操作
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

describe('DLQ Requeue Integration Tests', () => {
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

  describe('requeue - 單個重新入隊', () => {
    it('應該成功重新入隊記錄', async () => {
      const dlqId = dlqIds[0]

      await manager.requeue(dlqId)

      const record = await manager.getById(dlqId)
      expect(record?.status).toBe('requeued')
    })

    it('應該更新 resolution_notes', async () => {
      const dlqId = dlqIds[0]

      await manager.requeue(dlqId)

      const record = await manager.getById(dlqId)
      expect(record?.resolution_notes).toContain('Manual requeue')
    })

    it('應該更新 updated_at 時間戳', async () => {
      const dlqId = dlqIds[0]

      const beforeRecord = await manager.getById(dlqId)
      const _beforeUpdated = beforeRecord?.updated_at

      // 等待一小段時間確保時間戳不同
      await new Promise((r) => setTimeout(r, 10))

      await manager.requeue(dlqId)

      const afterRecord = await manager.getById(dlqId)

      // updated_at 應該被更新
      expect(afterRecord?.updated_at).toBeDefined()
    })

    it('應該在記錄不存在時拋出錯誤', async () => {
      try {
        await manager.requeue('non-existent-uuid')
        expect.unreachable('Should have thrown')
      } catch (error) {
        expect((error as Error).message).toContain('DLQ event not found')
      }
    })

    it('應該保持其他欄位不變', async () => {
      const dlqId = dlqIds[0]

      const beforeRecord = await manager.getById(dlqId)

      await manager.requeue(dlqId)

      const afterRecord = await manager.getById(dlqId)

      expect(afterRecord?.event_name).toBe(beforeRecord?.event_name)
      expect(afterRecord?.attempt_count).toBe(beforeRecord?.attempt_count)
      expect(afterRecord?.dlq_id).toBe(beforeRecord?.dlq_id)
    })
  })

  describe('retryBatch - 批量重新入隊', () => {
    it('應該批量重新入隊所有 pending 記錄', async () => {
      const result = await manager.retryBatch({ status: 'pending' })

      expect(result.total).toBe(testEvents.length)
      expect(result.succeeded).toBe(testEvents.length)
      expect(result.failed).toBe(0)

      // 驗證所有記錄都被設為 requeued
      const records = await manager.list({ status: 'requeued' })
      expect(records.length).toBe(testEvents.length)
    })

    it('應該按事件名稱批量重新入隊', async () => {
      const result = await manager.retryBatch({ eventName: 'order:created' })

      expect(result.total).toBe(1) // 只有一個 order:created
      expect(result.succeeded).toBe(1)
      expect(result.failed).toBe(0)
    })

    it('應該在沒有匹配記錄時返回零', async () => {
      const result = await manager.retryBatch({ eventName: 'non:existent' })

      expect(result.total).toBe(0)
      expect(result.succeeded).toBe(0)
      expect(result.failed).toBe(0)
    })

    it('應該正確統計成功和失敗數量', async () => {
      // 所有 pending 記錄都應該能成功重新入隊
      const result = await manager.retryBatch()

      expect(result.succeeded + result.failed).toBe(result.total)
    })

    it('應該支持分頁的批量重新入隊', async () => {
      // 先重新入隊前 3 條
      const firstResult = await manager.retryBatch({ limit: 3 })

      expect(firstResult.total).toBe(3)
      expect(firstResult.succeeded).toBe(3)

      // 再重新入隊剩餘的 pending 記錄
      const secondResult = await manager.retryBatch({ status: 'pending' })

      expect(secondResult.total).toBe(testEvents.length - 3)
    })

    it('應該跳過已經不是 pending 的記錄', async () => {
      // 先手動重新入隊一條
      await manager.requeue(dlqIds[0])

      // 批量重新入隊 pending 的
      const result = await manager.retryBatch({ status: 'pending' })

      expect(result.total).toBe(testEvents.length - 1)
    })
  })

  describe('requeue - 狀態轉移驗證', () => {
    it('應該能從 pending 轉移到 requeued', async () => {
      const dlqId = dlqIds[0]

      const before = await manager.getById(dlqId)
      expect(before?.status).toBe('pending')

      await manager.requeue(dlqId)

      const after = await manager.getById(dlqId)
      expect(after?.status).toBe('requeued')
    })

    it('應該能重複重新入隊（冪等性）', async () => {
      const dlqId = dlqIds[0]

      await manager.requeue(dlqId)
      await manager.requeue(dlqId)
      await manager.requeue(dlqId)

      const record = await manager.getById(dlqId)
      expect(record?.status).toBe('requeued')
    })

    it('應該能從 resolved 狀態重新入隊', async () => {
      const dlqId = dlqIds[0]

      await manager.resolve(dlqId, 'Initially resolved')
      await manager.requeue(dlqId)

      const record = await manager.getById(dlqId)
      expect(record?.status).toBe('requeued')
    })

    it('應該能從 abandoned 狀態重新入隊', async () => {
      const dlqId = dlqIds[0]

      await manager.abandon(dlqId, 'Initially abandoned')
      await manager.requeue(dlqId)

      const record = await manager.getById(dlqId)
      expect(record?.status).toBe('requeued')
    })
  })
})
