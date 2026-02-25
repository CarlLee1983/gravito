import { beforeEach, describe, expect, test } from 'bun:test'
import { RebalanceHandler } from '../../../../src/drivers/kafka/RebalanceHandler'
import type { PartitionAssignment, RebalanceEvent } from '../../../../src/drivers/kafka/types'

describe('RebalanceHandler', () => {
  let handler: RebalanceHandler
  let commitCalls: number
  let clearedBufferPartitions: PartitionAssignment[][]
  let clearedTrackingPartitions: PartitionAssignment[][]

  const mockCallbacks = () => ({
    commitOffsets: async () => {
      commitCalls++
    },
    clearPartitionBuffers: (partitions: PartitionAssignment[]) => {
      clearedBufferPartitions.push(partitions)
    },
    clearPartitionTracking: (partitions: PartitionAssignment[]) => {
      clearedTrackingPartitions.push(partitions)
    },
  })

  beforeEach(() => {
    handler = new RebalanceHandler()
    commitCalls = 0
    clearedBufferPartitions = []
    clearedTrackingPartitions = []
    handler.registerCallbacks(mockCallbacks())
  })

  // --- 初始化 ---

  describe('初始化', () => {
    test('使用預設配置建立', () => {
      const status = handler.getStatus()
      expect(status.state).toBe('stable')
      expect(status.assignedPartitions).toEqual([])
      expect(status.totalRebalances).toBe(0)
      expect(status.lastRebalanceTimestamp).toBe(0)
      expect(status.isRebalancing).toBe(false)
    })

    test('使用自訂配置建立', () => {
      const custom = new RebalanceHandler({
        revocationTimeoutMs: 5000,
        commitOnRevoke: false,
        clearBufferOnRevoke: false,
        maxConcurrentRebalances: 2,
      })
      const status = custom.getStatus()
      expect(status.state).toBe('stable')
    })
  })

  // --- 分區撤銷 ---

  describe('分區撤銷', () => {
    test('handlePartitionsRevoked 轉換狀態到 revoking', async () => {
      const events: RebalanceEvent[] = []
      handler.onRebalance((e) => events.push(e))

      const partitions: PartitionAssignment[] = [{ topic: 'topic-a', partition: 0 }]

      await handler.handlePartitionsRevoked(partitions)

      const revokingEvent = events.find((e) => e.state === 'revoking')
      expect(revokingEvent).toBeDefined()
      expect(revokingEvent?.previousState).toBe('stable')
      expect(revokingEvent?.revokedPartitions).toEqual(partitions)
    })

    test('handlePartitionsRevoked 提交 offset', async () => {
      await handler.handlePartitionsRevoked([{ topic: 'topic-a', partition: 0 }])

      expect(commitCalls).toBe(1)
    })

    test('commitOnRevoke=false 時不提交 offset', async () => {
      const noCommitHandler = new RebalanceHandler({
        commitOnRevoke: false,
      })
      noCommitHandler.registerCallbacks(mockCallbacks())

      await noCommitHandler.handlePartitionsRevoked([{ topic: 'topic-a', partition: 0 }])

      expect(commitCalls).toBe(0)
    })

    test('handlePartitionsRevoked 清除緩衝', async () => {
      const partitions: PartitionAssignment[] = [
        { topic: 'topic-a', partition: 0 },
        { topic: 'topic-b', partition: 1 },
      ]

      await handler.handlePartitionsRevoked(partitions)

      expect(clearedBufferPartitions).toHaveLength(1)
      expect(clearedBufferPartitions[0]).toEqual(partitions)
    })

    test('clearBufferOnRevoke=false 時不清除緩衝', async () => {
      const noBufferClearHandler = new RebalanceHandler({
        clearBufferOnRevoke: false,
      })
      noBufferClearHandler.registerCallbacks(mockCallbacks())

      await noBufferClearHandler.handlePartitionsRevoked([{ topic: 'topic-a', partition: 0 }])

      expect(clearedBufferPartitions).toHaveLength(0)
    })

    test('handlePartitionsRevoked 清除追蹤資料', async () => {
      const partitions: PartitionAssignment[] = [{ topic: 'topic-a', partition: 0 }]

      await handler.handlePartitionsRevoked(partitions)

      expect(clearedTrackingPartitions).toHaveLength(1)
      expect(clearedTrackingPartitions[0]).toEqual(partitions)
    })

    test('handlePartitionsRevoked 從已分配列表移除', async () => {
      // 先分配分區
      await handler.handlePartitionsAssigned([
        { topic: 'topic-a', partition: 0 },
        { topic: 'topic-a', partition: 1 },
        { topic: 'topic-b', partition: 0 },
      ])

      // 撤銷部分分區
      await handler.handlePartitionsRevoked([{ topic: 'topic-a', partition: 0 }])

      const assigned = handler.getAssignedPartitions()
      expect(assigned).toHaveLength(2)
      expect(assigned).toEqual([
        { topic: 'topic-a', partition: 1 },
        { topic: 'topic-b', partition: 0 },
      ])
    })

    test('handlePartitionsRevoked 發出 partitionsRevoked 事件', async () => {
      const revokedEvents: PartitionAssignment[][] = []
      handler.on('partitionsRevoked', (p: PartitionAssignment[]) => {
        revokedEvents.push(p)
      })

      const partitions: PartitionAssignment[] = [{ topic: 'topic-a', partition: 0 }]
      await handler.handlePartitionsRevoked(partitions)

      expect(revokedEvents).toHaveLength(1)
      expect(revokedEvents[0]).toEqual(partitions)
    })
  })

  // --- 分區分配 ---

  describe('分區分配', () => {
    test('handlePartitionsAssigned 轉換狀態到 assigning 然後 stable', async () => {
      const events: RebalanceEvent[] = []
      handler.onRebalance((e) => events.push(e))

      await handler.handlePartitionsAssigned([{ topic: 'topic-a', partition: 0 }])

      const states = events.map((e) => e.state)
      expect(states).toContain('assigning')
      expect(states).toContain('stable')
    })

    test('handlePartitionsAssigned 更新已分配列表', async () => {
      await handler.handlePartitionsAssigned([
        { topic: 'topic-a', partition: 0 },
        { topic: 'topic-b', partition: 1 },
      ])

      const assigned = handler.getAssignedPartitions()
      expect(assigned).toHaveLength(2)
      expect(assigned).toEqual([
        { topic: 'topic-a', partition: 0 },
        { topic: 'topic-b', partition: 1 },
      ])
    })

    test('handlePartitionsAssigned 不重複分配', async () => {
      await handler.handlePartitionsAssigned([{ topic: 'topic-a', partition: 0 }])
      await handler.handlePartitionsAssigned([
        { topic: 'topic-a', partition: 0 },
        { topic: 'topic-b', partition: 1 },
      ])

      const assigned = handler.getAssignedPartitions()
      expect(assigned).toHaveLength(2)
    })

    test('handlePartitionsAssigned 增加 totalRebalances', async () => {
      await handler.handlePartitionsAssigned([{ topic: 'topic-a', partition: 0 }])
      await handler.handlePartitionsAssigned([{ topic: 'topic-b', partition: 0 }])

      expect(handler.getStatus().totalRebalances).toBe(2)
    })

    test('handlePartitionsAssigned 更新 lastRebalanceTimestamp', async () => {
      const before = Date.now()

      await handler.handlePartitionsAssigned([{ topic: 'topic-a', partition: 0 }])

      const status = handler.getStatus()
      expect(status.lastRebalanceTimestamp).toBeGreaterThanOrEqual(before)
      expect(status.lastRebalanceTimestamp).toBeLessThanOrEqual(Date.now())
    })

    test('handlePartitionsAssigned 發出 partitionsAssigned 事件', async () => {
      const assignedEvents: PartitionAssignment[][] = []
      handler.on('partitionsAssigned', (p: PartitionAssignment[]) => {
        assignedEvents.push(p)
      })

      const partitions: PartitionAssignment[] = [{ topic: 'topic-a', partition: 0 }]
      await handler.handlePartitionsAssigned(partitions)

      expect(assignedEvents).toHaveLength(1)
      expect(assignedEvents[0]).toEqual(partitions)
    })
  })

  // --- 完整重新平衡 ---

  describe('完整重新平衡流程', () => {
    test('handleRebalance 執行撤銷和分配', async () => {
      // 先分配一些分區
      await handler.handlePartitionsAssigned([
        { topic: 'topic-a', partition: 0 },
        { topic: 'topic-a', partition: 1 },
      ])

      // 重新平衡：撤銷 partition 0，新增 partition 2
      await handler.handleRebalance(
        [{ topic: 'topic-a', partition: 0 }],
        [{ topic: 'topic-a', partition: 2 }]
      )

      const assigned = handler.getAssignedPartitions()
      expect(assigned).toHaveLength(2)
      expect(assigned).toEqual([
        { topic: 'topic-a', partition: 1 },
        { topic: 'topic-a', partition: 2 },
      ])
      expect(commitCalls).toBe(1) // 只在撤銷時提交
    })

    test('handleRebalance 只撤銷（無新分配）', async () => {
      await handler.handlePartitionsAssigned([{ topic: 'topic-a', partition: 0 }])

      await handler.handleRebalance([{ topic: 'topic-a', partition: 0 }], [])

      expect(handler.getAssignedPartitions()).toHaveLength(0)
      expect(handler.getStatus().totalRebalances).toBe(1) // 只有初始分配計數
    })

    test('handleRebalance 只分配（無撤銷）', async () => {
      await handler.handleRebalance([], [{ topic: 'topic-a', partition: 0 }])

      expect(handler.getAssignedPartitions()).toHaveLength(1)
      expect(commitCalls).toBe(0)
    })

    test('handleRebalance 空操作', async () => {
      await handler.handleRebalance([], [])

      expect(handler.getStatus().state).toBe('stable')
      expect(commitCalls).toBe(0)
    })
  })

  // --- 狀態管理 ---

  describe('狀態管理', () => {
    test('isRebalancing 在 revoking 期間為 true', async () => {
      let wasRebalancing = false
      handler.onRebalance((e) => {
        if (e.state === 'revoking') {
          wasRebalancing = handler.isRebalancing()
        }
      })

      await handler.handlePartitionsRevoked([{ topic: 'topic-a', partition: 0 }])

      expect(wasRebalancing).toBe(true)
    })

    test('isRebalancing 在 stable 狀態為 false', () => {
      expect(handler.isRebalancing()).toBe(false)
    })

    test('getStatus 返回不可變的分區列表', async () => {
      await handler.handlePartitionsAssigned([{ topic: 'topic-a', partition: 0 }])

      const status1 = handler.getStatus()
      status1.assignedPartitions.push({
        topic: 'hacked',
        partition: 99,
      })

      const status2 = handler.getStatus()
      expect(status2.assignedPartitions).toHaveLength(1)
      expect(status2.assignedPartitions[0].topic).toBe('topic-a')
    })

    test('getAssignedPartitions 返回不可變的列表', async () => {
      await handler.handlePartitionsAssigned([{ topic: 'topic-a', partition: 0 }])

      const assigned = handler.getAssignedPartitions()
      assigned.push({ topic: 'hacked', partition: 99 })

      expect(handler.getAssignedPartitions()).toHaveLength(1)
    })
  })

  // --- 錯誤場景 ---

  describe('錯誤場景', () => {
    test('回調錯誤轉換到 error 狀態', async () => {
      handler.registerCallbacks({
        commitOffsets: async () => {
          throw new Error('Commit failed')
        },
        clearPartitionBuffers: () => {},
        clearPartitionTracking: () => {},
      })

      await expect(
        handler.handlePartitionsRevoked([{ topic: 'topic-a', partition: 0 }])
      ).rejects.toThrow('Commit failed')

      expect(handler.getStatus().state).toBe('error')
    })

    test('超過最大並發重新平衡限制', async () => {
      const slowHandler = new RebalanceHandler({
        maxConcurrentRebalances: 1,
      })

      let resolveFirst: () => void
      const firstPromise = new Promise<void>((resolve) => {
        resolveFirst = resolve
      })

      slowHandler.registerCallbacks({
        commitOffsets: () => firstPromise,
        clearPartitionBuffers: () => {},
        clearPartitionTracking: () => {},
      })

      // 開始第一個重新平衡（不等待完成）
      const first = slowHandler.handlePartitionsRevoked([{ topic: 'topic-a', partition: 0 }])

      // 第二個應該因為超過並發限制而失敗
      await expect(
        slowHandler.handlePartitionsRevoked([{ topic: 'topic-b', partition: 0 }])
      ).rejects.toThrow('Max concurrent rebalances exceeded')

      resolveFirst?.()
      await first
    })

    test('error 狀態包含錯誤資訊', async () => {
      const events: RebalanceEvent[] = []
      handler.onRebalance((e) => events.push(e))

      handler.registerCallbacks({
        commitOffsets: async () => {
          throw new Error('Test error')
        },
        clearPartitionBuffers: () => {},
        clearPartitionTracking: () => {},
      })

      try {
        await handler.handlePartitionsRevoked([{ topic: 'topic-a', partition: 0 }])
      } catch {
        // expected
      }

      const errorEvent = events.find((e) => e.state === 'error')
      expect(errorEvent).toBeDefined()
      expect(errorEvent?.error?.message).toBe('Test error')
    })
  })

  // --- 撤銷逾時 ---

  describe('撤銷逾時', () => {
    test('撤銷操作逾時轉換到 error 狀態', async () => {
      const slowHandler = new RebalanceHandler({
        revocationTimeoutMs: 50,
      })

      slowHandler.registerCallbacks({
        commitOffsets: () => new Promise((resolve) => setTimeout(resolve, 200)),
        clearPartitionBuffers: () => {},
        clearPartitionTracking: () => {},
      })

      await expect(
        slowHandler.handlePartitionsRevoked([{ topic: 'topic-a', partition: 0 }])
      ).rejects.toThrow('Revocation timeout')

      expect(slowHandler.getStatus().state).toBe('error')
    })
  })

  // --- onRebalance 監聽器 ---

  describe('onRebalance 監聽器', () => {
    test('完整生命週期事件序列', async () => {
      const events: RebalanceState[] = []
      handler.onRebalance((e) => events.push(e.state))

      await handler.handlePartitionsAssigned([{ topic: 'topic-a', partition: 0 }])

      await handler.handlePartitionsRevoked([{ topic: 'topic-a', partition: 0 }])

      // assigning → stable (from assign)
      // revoking (from revoke)
      expect(events).toContain('assigning')
      expect(events).toContain('stable')
      expect(events).toContain('revoking')
    })
  })

  // --- reset ---

  describe('reset', () => {
    test('重置所有狀態', async () => {
      await handler.handlePartitionsAssigned([{ topic: 'topic-a', partition: 0 }])

      handler.reset()

      const status = handler.getStatus()
      expect(status.state).toBe('stable')
      expect(status.assignedPartitions).toEqual([])
      expect(status.totalRebalances).toBe(0)
      expect(status.lastRebalanceTimestamp).toBe(0)
      expect(status.isRebalancing).toBe(false)
    })

    test('reset 後可以繼續使用', async () => {
      await handler.handlePartitionsAssigned([{ topic: 'topic-a', partition: 0 }])

      handler.reset()

      await handler.handlePartitionsAssigned([{ topic: 'topic-b', partition: 0 }])

      expect(handler.getAssignedPartitions()).toHaveLength(1)
      expect(handler.getAssignedPartitions()[0].topic).toBe('topic-b')
      expect(handler.getStatus().totalRebalances).toBe(1)
    })
  })

  // --- destroy ---

  describe('destroy', () => {
    test('清理資源和監聽器', async () => {
      const events: RebalanceEvent[] = []
      handler.onRebalance((e) => events.push(e))

      await handler.handlePartitionsAssigned([{ topic: 'topic-a', partition: 0 }])
      const eventsBeforeDestroy = events.length

      handler.destroy()

      // 嘗試分配（不會觸發已移除的監聽器，但需要重新註冊回調）
      handler.registerCallbacks(mockCallbacks())
      await handler.handlePartitionsAssigned([{ topic: 'topic-b', partition: 0 }])

      // 監聽器已被移除，不應有新事件
      expect(events.length).toBe(eventsBeforeDestroy)
      // 狀態已重置
      expect(handler.getStatus().totalRebalances).toBe(1)
    })
  })

  // --- 無回調時的行為 ---

  describe('無回調時的行為', () => {
    test('沒有回調時撤銷仍正常', async () => {
      const noCallbackHandler = new RebalanceHandler()

      await noCallbackHandler.handlePartitionsRevoked([{ topic: 'topic-a', partition: 0 }])

      // 不應拋出錯誤
      expect(noCallbackHandler.getStatus().state).not.toBe('error')
    })

    test('沒有回調時分配仍正常', async () => {
      const noCallbackHandler = new RebalanceHandler()

      await noCallbackHandler.handlePartitionsAssigned([{ topic: 'topic-a', partition: 0 }])

      expect(noCallbackHandler.getAssignedPartitions()).toHaveLength(1)
    })
  })
})
