/**
 * @gravito/core - DLQ State Transition Integration Tests
 *
 * 測試 DeadLetterQueueManager 的狀態轉移功能
 * 驗證 pending -> requeued -> resolved/abandoned 的狀態流程
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import type { ConnectionContract } from '@gravito/atlas'
import { DeadLetterQueueManager } from '../../../src/reliability/DeadLetterQueueManager'
import { createTestError, testErrors } from './helpers/dlq-fixtures'
import {
  cleanupDlqTable,
  cleanupTestEnvironment,
  createTestEnvironment,
} from './helpers/dlq-test-db'

describe('DLQ State Transition Integration Tests', () => {
  let connectionName: string
  let connection: ConnectionContract
  let manager: DeadLetterQueueManager
  let testDlqId: string

  beforeAll(async () => {
    const env = await createTestEnvironment()
    connectionName = env.connectionName
    connection = env.connection
    manager = new DeadLetterQueueManager(connection)
  })

  beforeEach(async () => {
    await cleanupDlqTable(connection)

    // 創建一個測試記錄
    testDlqId = await manager.moveToDlq(
      'state:test',
      { data: 'test' },
      {},
      createTestError(testErrors[0]),
      1
    )
  })

  afterEach(async () => {
    await cleanupDlqTable(connection)
  })

  afterAll(async () => {
    await cleanupTestEnvironment(connectionName)
  })

  describe('初始狀態', () => {
    it('新記錄應該是 pending 狀態', async () => {
      const record = await manager.getById(testDlqId)
      expect(record?.status).toBe('pending')
    })

    it('新記錄應該沒有 resolution_notes', async () => {
      const record = await manager.getById(testDlqId)
      expect(record?.resolution_notes).toBeNull()
    })
  })

  describe('pending -> requeued', () => {
    it('應該能從 pending 轉移到 requeued', async () => {
      await manager.requeue(testDlqId)

      const record = await manager.getById(testDlqId)
      expect(record?.status).toBe('requeued')
    })

    it('應該記錄重新入隊的時間', async () => {
      await manager.requeue(testDlqId)

      const record = await manager.getById(testDlqId)
      expect(record?.resolution_notes).toContain('Manual requeue')
    })
  })

  describe('pending -> resolved', () => {
    it('應該能從 pending 直接轉移到 resolved', async () => {
      await manager.resolve(testDlqId, 'Fixed manually')

      const record = await manager.getById(testDlqId)
      expect(record?.status).toBe('resolved')
    })

    it('應該記錄解決說明', async () => {
      const notes = 'Issue was a transient network error, manually verified data integrity'

      await manager.resolve(testDlqId, notes)

      const record = await manager.getById(testDlqId)
      expect(record?.resolution_notes).toBe(notes)
    })

    it('應該使用默認說明如果未提供', async () => {
      await manager.resolve(testDlqId)

      const record = await manager.getById(testDlqId)
      expect(record?.resolution_notes).toContain('Resolved at')
    })
  })

  describe('pending -> abandoned', () => {
    it('應該能從 pending 直接轉移到 abandoned', async () => {
      await manager.abandon(testDlqId, 'Data corrupted, cannot recover')

      const record = await manager.getById(testDlqId)
      expect(record?.status).toBe('abandoned')
    })

    it('應該記錄放棄原因', async () => {
      const reason = 'After 10 retries, determined the external service is permanently down'

      await manager.abandon(testDlqId, reason)

      const record = await manager.getById(testDlqId)
      expect(record?.resolution_notes).toBe(reason)
    })

    it('應該使用默認原因如果未提供', async () => {
      await manager.abandon(testDlqId)

      const record = await manager.getById(testDlqId)
      expect(record?.resolution_notes).toContain('Abandoned at')
    })
  })

  describe('requeued -> resolved', () => {
    it('應該能從 requeued 轉移到 resolved', async () => {
      await manager.requeue(testDlqId)
      await manager.resolve(testDlqId, 'Retry succeeded')

      const record = await manager.getById(testDlqId)
      expect(record?.status).toBe('resolved')
    })
  })

  describe('requeued -> abandoned', () => {
    it('應該能從 requeued 轉移到 abandoned', async () => {
      await manager.requeue(testDlqId)
      await manager.abandon(testDlqId, 'Retry failed, giving up')

      const record = await manager.getById(testDlqId)
      expect(record?.status).toBe('abandoned')
    })
  })

  describe('resolved -> 其他狀態', () => {
    it('應該能從 resolved 回到 pending（通過 updateStatus）', async () => {
      await manager.resolve(testDlqId)
      await manager.updateStatus(testDlqId, 'pending', 'Reopened for investigation')

      const record = await manager.getById(testDlqId)
      expect(record?.status).toBe('pending')
    })

    it('應該能從 resolved 轉移到 requeued', async () => {
      await manager.resolve(testDlqId)
      await manager.requeue(testDlqId)

      const record = await manager.getById(testDlqId)
      expect(record?.status).toBe('requeued')
    })
  })

  describe('abandoned -> 其他狀態', () => {
    it('應該能從 abandoned 重新入隊', async () => {
      await manager.abandon(testDlqId)
      await manager.requeue(testDlqId)

      const record = await manager.getById(testDlqId)
      expect(record?.status).toBe('requeued')
    })

    it('應該能從 abandoned 轉移到 resolved', async () => {
      await manager.abandon(testDlqId)
      await manager.resolve(testDlqId, 'Found a workaround')

      const record = await manager.getById(testDlqId)
      expect(record?.status).toBe('resolved')
    })
  })

  describe('updateStatus - 通用狀態更新', () => {
    it('應該支持任意狀態轉移', async () => {
      const statuses: Array<'pending' | 'requeued' | 'resolved' | 'abandoned'> = [
        'requeued',
        'resolved',
        'abandoned',
        'pending',
      ]

      for (const status of statuses) {
        await manager.updateStatus(testDlqId, status, `Changed to ${status}`)

        const record = await manager.getById(testDlqId)
        expect(record?.status).toBe(status)
      }
    })

    it('應該在記錄不存在時拋出錯誤', async () => {
      try {
        await manager.updateStatus('non-existent', 'resolved')
        expect.unreachable('Should have thrown')
      } catch (error) {
        expect((error as Error).message).toContain('DLQ event not found')
      }
    })

    it('應該更新 updated_at 時間戳', async () => {
      const before = await manager.getById(testDlqId)
      const _beforeTime = before?.updated_at

      await new Promise((r) => setTimeout(r, 10))

      await manager.updateStatus(testDlqId, 'resolved', 'Test update')

      const after = await manager.getById(testDlqId)

      // 時間戳應該被更新
      expect(after?.updated_at).toBeDefined()
    })

    it('應該保留現有的 resolution_notes 如果未提供新值', async () => {
      // 先設置一個 notes
      await manager.resolve(testDlqId, 'Initial notes')

      // 更新狀態但不提供 notes
      await manager.updateStatus(testDlqId, 'pending')

      const record = await manager.getById(testDlqId)
      expect(record?.resolution_notes).toBe('Initial notes')
    })
  })

  describe('狀態統計', () => {
    it('應該正確反映狀態變更在統計中', async () => {
      // 創建更多測試記錄
      const id2 = await manager.moveToDlq('state:test:2', {}, {}, new Error('E2'), 1)
      const id3 = await manager.moveToDlq('state:test:3', {}, {}, new Error('E3'), 1)
      const _id4 = await manager.moveToDlq('state:test:4', {}, {}, new Error('E4'), 1)

      // 修改狀態
      await manager.requeue(testDlqId)
      await manager.resolve(id2, 'Resolved')
      await manager.abandon(id3, 'Abandoned')
      // id4 保持 pending

      const stats = await manager.getStats()

      expect(stats.byStatus.pending).toBe(1)
      expect(stats.byStatus.requeued).toBe(1)
      expect(stats.byStatus.resolved).toBe(1)
      expect(stats.byStatus.abandoned).toBe(1)
    })
  })
})
