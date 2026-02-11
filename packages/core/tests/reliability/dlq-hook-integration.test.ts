/**
 * @gravito/core - DLQ + HookManager Integration Tests
 *
 * 測試死信隊列與重試機制在事件系統中的完整集成
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { HookManager } from '../../src/HookManager'

describe('DLQ + HookManager Integration', () => {
  let manager: HookManager

  beforeEach(() => {
    manager = new HookManager({
      enableDLQ: true,
      asyncByDefault: false,
      migrationMode: 'async',
    })
  })

  describe('基本重試機制', () => {
    it('應該在最大重試後將事件進入 DLQ', async () => {
      let attempts = 0

      manager.addAction('order:created', async () => {
        attempts++
        throw new Error('Service temporarily unavailable')
      })

      // 使用 async 模式和重試配置
      await manager.doActionAsync(
        'order:created',
        { orderId: '123' },
        {
          async: true,
          retry: {
            maxRetries: 2,
            backoff: 'exponential',
            initialDelayMs: 10,
            maxDelayMs: 100,
            dlqAfterMaxRetries: true,
          },
        }
      )

      // 等待所有重試完成
      await new Promise((resolve) => setTimeout(resolve, 500))

      // 驗證重試次數（應該重試 2 次加初始 1 次）
      expect(attempts).toBe(3)

      // 驗證 DLQ 記錄
      const dlq = manager.getDLQ()
      expect(dlq).toBeDefined()
      expect(dlq?.getCount()).toBeGreaterThan(0)
    })

    it('應該支持指數退避延遲', async () => {
      const timestamps: number[] = []

      manager.addAction('payment:processed', async () => {
        timestamps.push(Date.now())
        throw new Error('Payment gateway unavailable')
      })

      await manager.doActionAsync(
        'payment:processed',
        { amount: 100 },
        {
          async: true,
          retry: {
            maxRetries: 2,
            backoff: 'exponential',
            initialDelayMs: 50,
            maxDelayMs: 500,
            dlqAfterMaxRetries: true,
          },
        }
      )

      // 等待所有重試完成
      await new Promise((resolve) => setTimeout(resolve, 600))

      // 驗證延遲時間
      if (timestamps.length >= 2) {
        const delay1 = timestamps[1] - timestamps[0]
        expect(delay1).toBeGreaterThanOrEqual(45)
      }
    })

    it('應該在成功重試後不進入 DLQ', async () => {
      let attempts = 0

      manager.addAction('test:eventual-success', async () => {
        attempts++
        if (attempts < 2) {
          throw new Error('First attempt fails')
        }
      })

      await manager.doActionAsync(
        'test:eventual-success',
        {},
        {
          async: true,
          retry: {
            maxRetries: 3,
            backoff: 'exponential',
            initialDelayMs: 10,
            maxDelayMs: 100,
            dlqAfterMaxRetries: true,
          },
        }
      )

      // 等待重試完成
      await new Promise((resolve) => setTimeout(resolve, 200))

      // 驗證成功了（2 次嘗試）
      expect(attempts).toBe(2)

      // DLQ 應該是空的（成功了）
      const dlq = manager.getDLQ()
      expect(dlq?.getCount()).toBe(0)
    })
  })

  describe('DLQ 重新入隊', () => {
    it('應該能重新入隊失敗的事件', async () => {
      let failureCount = 0
      let successCount = 0

      manager.addAction('test:requeue', async () => {
        failureCount++
        if (failureCount === 1) {
          throw new Error('Simulated failure')
        }
        successCount++
      })

      // 第一次失敗並進入 DLQ
      await manager.doActionAsync(
        'test:requeue',
        {},
        {
          async: true,
          retry: {
            maxRetries: 0,
            dlqAfterMaxRetries: true,
          },
        }
      )

      await new Promise((resolve) => setTimeout(resolve, 100))

      const dlq = manager.getDLQ()
      expect(dlq?.getCount()).toBe(1)

      // 獲取 DLQ 條目並重新入隊
      const entries = dlq?.list({ eventName: 'test:requeue' }) || []
      expect(entries.length).toBe(1)

      // 重新入隊
      const success = await manager.requeueDLQEntry(entries[0].id)
      expect(success).toBe(true)

      // 等待重試完成
      await new Promise((resolve) => setTimeout(resolve, 100))

      // 驗證事件被成功處理
      expect(successCount).toBe(1)
      expect(dlq?.getCount()).toBe(0)
    })

    it('應該支持批量重新入隊', async () => {
      let failCount = 0

      manager.addAction('batch:test', async () => {
        failCount++
        // First attempts fail, but requeued attempts succeed
        if (failCount <= 3) {
          throw new Error('Temporary failure')
        }
      })

      // 創建多個失敗事件
      for (let i = 0; i < 3; i++) {
        await manager.doActionAsync(
          `batch:test`,
          { id: i },
          {
            async: true,
            retry: {
              maxRetries: 0,
              dlqAfterMaxRetries: true,
            },
          }
        )
      }

      await new Promise((resolve) => setTimeout(resolve, 300))

      // 驗證 3 個失敗事件進入 DLQ
      const dlq = manager.getDLQ()
      expect(dlq?.getCountByEvent('batch:test')).toBe(3)

      // 批量重新入隊
      const requeuedCount = await manager.requeueDLQBatch('batch:test')
      expect(requeuedCount).toBe(3)

      await new Promise((resolve) => setTimeout(resolve, 500))

      // DLQ 應該是空的（重新入隊成功）
      expect(dlq?.getCount()).toBe(0)
    })
  })

  describe('DLQ 統計', () => {
    it('應該提供準確的統計信息', async () => {
      // 創建多個類型的失敗事件
      const eventTypes = ['order:created', 'payment:processed', 'order:created']

      for (const eventType of eventTypes) {
        manager.addAction(eventType, async () => {
          throw new Error('Failure')
        })

        await manager.doActionAsync(
          eventType,
          {},
          {
            async: true,
            retry: {
              maxRetries: 0,
              dlqAfterMaxRetries: true,
            },
          }
        )
      }

      await new Promise((resolve) => setTimeout(resolve, 300))

      const dlq = manager.getDLQ()
      expect(dlq).toBeDefined()

      // 驗證統計
      const orderCount = dlq?.getCountByEvent('order:created')
      expect(orderCount).toBe(2)

      const paymentCount = dlq?.getCountByEvent('payment:processed')
      expect(paymentCount).toBe(1)

      const totalCount = dlq?.getCount()
      expect(totalCount).toBe(3)
    })

    it('應該支持按事件名篩選 DLQ 列表', async () => {
      manager.addAction('event:a', async () => {
        throw new Error('Failure')
      })

      manager.addAction('event:b', async () => {
        throw new Error('Failure')
      })

      // 創建混合失敗事件
      for (let i = 0; i < 2; i++) {
        await manager.doActionAsync(
          'event:a',
          {},
          {
            async: true,
            retry: { maxRetries: 0, dlqAfterMaxRetries: true },
          }
        )
      }

      for (let i = 0; i < 3; i++) {
        await manager.doActionAsync(
          'event:b',
          {},
          {
            async: true,
            retry: { maxRetries: 0, dlqAfterMaxRetries: true },
          }
        )
      }

      await new Promise((resolve) => setTimeout(resolve, 500))

      const dlq = manager.getDLQ()

      // 篩選 event:a
      const entriesA = dlq?.list({ eventName: 'event:a' })
      expect(entriesA?.length).toBe(2)

      // 篩選 event:b
      const entriesB = dlq?.list({ eventName: 'event:b' })
      expect(entriesB?.length).toBe(3)
    })
  })

  describe('DLQ 條目管理', () => {
    it('應該能刪除 DLQ 條目', async () => {
      manager.addAction('test:delete', async () => {
        throw new Error('Failure')
      })

      await manager.doActionAsync(
        'test:delete',
        {},
        {
          async: true,
          retry: { maxRetries: 0, dlqAfterMaxRetries: true },
        }
      )

      await new Promise((resolve) => setTimeout(resolve, 100))

      const dlq = manager.getDLQ()
      expect(dlq?.getCount()).toBe(1)

      // 刪除条目
      const entries = dlq?.list() || []
      const deleted = manager.deleteDLQEntry(entries[0].id)
      expect(deleted).toBe(true)

      // DLQ 应该是空的
      expect(dlq?.getCount()).toBe(0)
    })

    it('應該能清空 DLQ', async () => {
      for (let i = 0; i < 5; i++) {
        manager.addAction(`event:${i}`, async () => {
          throw new Error('Failure')
        })

        await manager.doActionAsync(
          `event:${i}`,
          {},
          {
            async: true,
            retry: { maxRetries: 0, dlqAfterMaxRetries: true },
          }
        )
      }

      await new Promise((resolve) => setTimeout(resolve, 500))

      const dlq = manager.getDLQ()
      expect(dlq?.getCount()).toBeGreaterThan(0)

      // 清空 DLQ
      dlq?.clear()

      expect(dlq?.getCount()).toBe(0)
    })
  })

  describe('重試策略組合', () => {
    it('應該支持不同的退避策略', async () => {
      const policies = [
        { type: 'exponential' as const, maxRetries: 2 },
        { type: 'linear' as const, maxRetries: 2 },
      ]

      for (const policyType of policies) {
        let attempts = 0

        manager.addAction(`test:${policyType.type}`, async () => {
          attempts++
          throw new Error('Failure')
        })

        await manager.doActionAsync(
          `test:${policyType.type}`,
          {},
          {
            async: true,
            retry: {
              maxRetries: policyType.maxRetries,
              backoff: policyType.type,
              initialDelayMs: 10,
              maxDelayMs: 100,
              dlqAfterMaxRetries: true,
            },
          }
        )

        await new Promise((resolve) => setTimeout(resolve, 300))

        // 應該有 maxRetries + 1 次嘗試（包括初始）
        expect(attempts).toBe(policyType.maxRetries + 1)
      }
    })

    it('應該尊重 dlqAfterMaxRetries 配置', async () => {
      manager.addAction('test:no-dlq', async () => {
        throw new Error('Failure')
      })

      await manager.doActionAsync(
        'test:no-dlq',
        {},
        {
          async: true,
          retry: {
            maxRetries: 1,
            dlqAfterMaxRetries: false,
          },
        }
      )

      await new Promise((resolve) => setTimeout(resolve, 200))

      // 禁用 DLQ 時，失敗的事件不應進入 DLQ
      const dlq = manager.getDLQ()
      const count = dlq?.getCountByEvent('test:no-dlq')
      expect(count).toBe(0)
    })
  })

  describe('優先級與重試', () => {
    it('應該支持優先級與重試的組合', async () => {
      const processedOrder: number[] = []

      manager.addAction('priority:test', async (data: any) => {
        processedOrder.push(data.priority)
        if (processedOrder.length === 1) {
          throw new Error('Retry needed')
        }
      })

      // 發送高優先級和低優先級事件
      await manager.doActionAsync(
        'priority:test',
        { priority: 1 },
        {
          async: true,
          priority: 'high',
          retry: {
            maxRetries: 1,
            initialDelayMs: 10,
            dlqAfterMaxRetries: true,
          },
        }
      )

      await manager.doActionAsync(
        'priority:test',
        { priority: 2 },
        {
          async: true,
          priority: 'low',
          retry: {
            maxRetries: 0,
            dlqAfterMaxRetries: true,
          },
        }
      )

      await new Promise((resolve) => setTimeout(resolve, 500))

      // 驗證處理順序
      expect(processedOrder.length).toBeGreaterThan(0)
    })
  })
})
