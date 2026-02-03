/**
 * @gravito/core - DLQ Batch Operations Integration Tests
 *
 * 測試 DeadLetterQueueManager 的批量操作功能
 * 驗證批量刪除、清空等操作
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import type { ConnectionContract } from '@gravito/atlas'
import { DeadLetterQueueManager } from '../../../src/reliability/DeadLetterQueueManager'
import { createTestError, testErrors, testEvents } from './helpers/dlq-fixtures'
import {
  cleanupDlqTable,
  cleanupTestEnvironment,
  createTestEnvironment,
  getRecordCount,
} from './helpers/dlq-test-db'

describe('DLQ Batch Operations Integration Tests', () => {
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

  describe('deleteEntry - 單個刪除', () => {
    it('應該成功刪除存在的記錄', async () => {
      const dlqId = dlqIds[0]

      const deleted = await manager.deleteEntry(dlqId)

      expect(deleted).toBe(true)

      const record = await manager.getById(dlqId)
      expect(record).toBeUndefined()
    })

    it('應該對不存在的記錄返回 false', async () => {
      const deleted = await manager.deleteEntry('non-existent-uuid')

      expect(deleted).toBe(false)
    })

    it('應該減少總記錄數', async () => {
      const beforeCount = await getRecordCount(connection)

      await manager.deleteEntry(dlqIds[0])

      const afterCount = await getRecordCount(connection)
      expect(afterCount).toBe(beforeCount - 1)
    })

    it('應該能刪除任何狀態的記錄', async () => {
      // 測試刪除不同狀態的記錄
      await manager.requeue(dlqIds[0])
      await manager.resolve(dlqIds[1], 'Resolved')
      await manager.abandon(dlqIds[2], 'Abandoned')

      // 都應該能成功刪除
      expect(await manager.deleteEntry(dlqIds[0])).toBe(true)
      expect(await manager.deleteEntry(dlqIds[1])).toBe(true)
      expect(await manager.deleteEntry(dlqIds[2])).toBe(true)
    })
  })

  describe('deleteEntries - 批量刪除', () => {
    it('應該批量刪除多個記錄', async () => {
      const idsToDelete = [dlqIds[0], dlqIds[1], dlqIds[2]]

      const deletedCount = await manager.deleteEntries(idsToDelete)

      expect(deletedCount).toBe(3)
    })

    it('應該返回實際刪除的數量', async () => {
      // 包含一些不存在的 ID
      const idsToDelete = [dlqIds[0], 'non-existent-1', 'non-existent-2']

      const deletedCount = await manager.deleteEntries(idsToDelete)

      // 只有一個實際存在
      expect(deletedCount).toBe(1)
    })

    it('應該處理空數組', async () => {
      const deletedCount = await manager.deleteEntries([])

      expect(deletedCount).toBe(0)
    })

    it('應該處理全部不存在的 ID', async () => {
      const deletedCount = await manager.deleteEntries(['fake-1', 'fake-2', 'fake-3'])

      expect(deletedCount).toBe(0)
    })

    it('應該減少總記錄數', async () => {
      const beforeCount = await getRecordCount(connection)

      await manager.deleteEntries([dlqIds[0], dlqIds[1]])

      const afterCount = await getRecordCount(connection)
      expect(afterCount).toBe(beforeCount - 2)
    })

    it('應該支持大批量刪除', async () => {
      // 添加更多記錄
      const moreIds: string[] = []
      for (let i = 0; i < 50; i++) {
        const id = await manager.moveToDlq(
          `batch:delete:${i}`,
          { index: i },
          {},
          new Error(`Error ${i}`),
          1
        )
        moreIds.push(id)
      }

      // 刪除所有新增的記錄
      const deletedCount = await manager.deleteEntries(moreIds)

      expect(deletedCount).toBe(50)

      // 原來的記錄應該還在
      const remaining = await getRecordCount(connection)
      expect(remaining).toBe(testEvents.length)
    })
  })

  describe('clear - 清空操作', () => {
    it('應該清空所有 pending 記錄', async () => {
      const cleared = await manager.clear(false)

      expect(cleared).toBe(testEvents.length)

      const count = await getRecordCount(connection)
      expect(count).toBe(0)
    })

    it('應該只清空 pending 記錄，保留其他狀態', async () => {
      // 修改一些記錄的狀態
      await manager.resolve(dlqIds[0], 'Resolved')
      await manager.abandon(dlqIds[1], 'Abandoned')

      // 清空 pending
      const cleared = await manager.clear(false)

      // 只清空 pending 的（總數 - 2）
      expect(cleared).toBe(testEvents.length - 2)

      // 驗證 resolved 和 abandoned 還在
      const resolvedRecord = await manager.getById(dlqIds[0])
      const abandonedRecord = await manager.getById(dlqIds[1])

      expect(resolvedRecord).toBeDefined()
      expect(abandonedRecord).toBeDefined()
    })

    it('應該在 includeResolved=true 時清空所有記錄', async () => {
      // 修改一些記錄的狀態
      await manager.resolve(dlqIds[0], 'Resolved')
      await manager.abandon(dlqIds[1], 'Abandoned')
      await manager.requeue(dlqIds[2])

      // 清空所有
      const cleared = await manager.clear(true)

      expect(cleared).toBe(testEvents.length)

      const count = await getRecordCount(connection)
      expect(count).toBe(0)
    })

    it('應該在空表時返回 0', async () => {
      await cleanupDlqTable(connection)

      const cleared = await manager.clear(false)

      expect(cleared).toBe(0)
    })

    it('應該正確處理混合狀態', async () => {
      // 創建混合狀態
      await manager.requeue(dlqIds[0]) // requeued
      await manager.resolve(dlqIds[1]) // resolved
      await manager.abandon(dlqIds[2]) // abandoned
      // dlqIds[3-6] 保持 pending

      // 清空 pending（不包括 resolved）
      const cleared = await manager.clear(false)

      // 只有 pending 的被清空
      expect(cleared).toBe(testEvents.length - 3)

      // 驗證其他狀態的記錄還在
      const remaining = await getRecordCount(connection)
      expect(remaining).toBe(3)
    })
  })

  describe('批量操作性能', () => {
    it('應該在合理時間內完成 100 條記錄的批量刪除', async () => {
      // 插入 100 條記錄
      const ids: string[] = []
      for (let i = 0; i < 100; i++) {
        const id = await manager.moveToDlq(
          `perf:test:${i}`,
          { index: i },
          {},
          new Error(`Error ${i}`),
          1
        )
        ids.push(id)
      }

      const startTime = Date.now()

      await manager.deleteEntries(ids)

      const duration = Date.now() - startTime

      // 應該在 2 秒內完成
      expect(duration).toBeLessThan(2000)
    })

    it('應該在合理時間內完成清空操作', async () => {
      // 插入 100 條記錄
      for (let i = 0; i < 100; i++) {
        await manager.moveToDlq(`perf:clear:${i}`, { index: i }, {}, new Error(`Error ${i}`), 1)
      }

      const startTime = Date.now()

      await manager.clear(true)

      const duration = Date.now() - startTime

      // 應該在 2 秒內完成
      expect(duration).toBeLessThan(2000)
    })
  })
})
