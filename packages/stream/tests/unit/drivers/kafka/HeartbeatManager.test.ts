import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { HeartbeatManager } from '../../../../src/drivers/kafka/HeartbeatManager'
import type { HeartbeatStatus } from '../../../../src/drivers/kafka/types'

describe('HeartbeatManager', () => {
  let manager: HeartbeatManager

  beforeEach(() => {
    manager = new HeartbeatManager({
      interval: 50,
      sessionTimeout: 300,
      maxMissed: 3,
    })
  })

  afterEach(async () => {
    await manager.stop()
  })

  // --- 初始化與生命週期 ---

  describe('初始化', () => {
    test('使用預設配置建立', () => {
      const defaultManager = new HeartbeatManager()
      const status = defaultManager.getStatus()
      expect(status.consumerId).toBe('')
      expect(status.missedCount).toBe(0)
      expect(status.isAlive).toBe(false)
      expect(status.uptime).toBe(0)
      expect(status.queues).toEqual([])
    })

    test('使用自訂配置建立', () => {
      const customManager = new HeartbeatManager({
        interval: 1000,
        sessionTimeout: 10000,
        maxMissed: 5,
      })
      const status = customManager.getStatus()
      expect(status.consumerId).toBe('')
      expect(status.isAlive).toBe(false)
    })
  })

  describe('start/stop 生命週期', () => {
    test('start() 開始心跳迴圈', async () => {
      await manager.start('consumer-1', ['topic-a', 'topic-b'])
      const status = manager.getStatus()
      expect(status.consumerId).toBe('consumer-1')
      expect(status.isAlive).toBe(true)
      expect(status.queues).toEqual(['topic-a', 'topic-b'])
      expect(status.missedCount).toBe(0)
    })

    test('stop() 停止心跳迴圈', async () => {
      await manager.start('consumer-1', ['topic-a'])
      await manager.stop()
      const status = manager.getStatus()
      expect(status.isAlive).toBe(false)
      expect(status.uptime).toBe(0)
    })

    test('冪等 start - 重複呼叫不會出錯', async () => {
      await manager.start('consumer-1', ['topic-a'])
      await manager.start('consumer-1', ['topic-b'])
      const status = manager.getStatus()
      // 第二次呼叫被忽略，queues 仍為第一次的值
      expect(status.queues).toEqual(['topic-a'])
    })

    test('冪等 stop - 重複呼叫不會出錯', async () => {
      await manager.stop()
      await manager.stop()
      // 不應丟出例外
      expect(true).toBe(true)
    })

    test('start 後 stop 後再 start', async () => {
      await manager.start('consumer-1', ['topic-a'])
      await manager.stop()
      await manager.start('consumer-2', ['topic-b'])
      const status = manager.getStatus()
      expect(status.consumerId).toBe('consumer-2')
      expect(status.queues).toEqual(['topic-b'])
      expect(status.isAlive).toBe(true)
    })
  })

  // --- 心跳發射 ---

  describe('心跳發射', () => {
    test('定期發送心跳事件', async () => {
      const heartbeats: HeartbeatStatus[] = []
      manager.on('heartbeat', (status: HeartbeatStatus) => {
        heartbeats.push(status)
      })

      await manager.start('consumer-1', ['topic-a'])

      // 等待至少 2 個心跳週期
      await new Promise((resolve) => setTimeout(resolve, 130))

      expect(heartbeats.length).toBeGreaterThanOrEqual(2)
      expect(heartbeats[0].consumerId).toBe('consumer-1')
    })

    test('stop 後不再發送心跳事件', async () => {
      const heartbeats: HeartbeatStatus[] = []
      manager.on('heartbeat', (status: HeartbeatStatus) => {
        heartbeats.push(status)
      })

      await manager.start('consumer-1', ['topic-a'])
      await new Promise((resolve) => setTimeout(resolve, 70))
      await manager.stop()

      const countAfterStop = heartbeats.length
      await new Promise((resolve) => setTimeout(resolve, 120))

      // 停止後不應有新的心跳
      expect(heartbeats.length).toBe(countAfterStop)
    })
  })

  // --- 遺漏偵測 ---

  describe('遺漏偵測', () => {
    test('沒有 beat() 呼叫導致遺漏計數增加', async () => {
      await manager.start('consumer-1', ['topic-a'])

      // 等待幾個心跳週期，不呼叫 beat()
      await new Promise((resolve) => setTimeout(resolve, 130))

      const status = manager.getStatus()
      expect(status.missedCount).toBeGreaterThanOrEqual(1)
    })

    test('beat() 呼叫重置遺漏計數', async () => {
      await manager.start('consumer-1', ['topic-a'])

      // 等待遺漏產生
      await new Promise((resolve) => setTimeout(resolve, 130))
      expect(manager.getStatus().missedCount).toBeGreaterThanOrEqual(1)

      // 呼叫 beat 重置
      manager.beat()
      expect(manager.getStatus().missedCount).toBe(0)
    })

    test('定期 beat() 保持遺漏計數為 0', async () => {
      await manager.start('consumer-1', ['topic-a'])

      // 每 30ms 呼叫一次 beat（小於 50ms 的心跳間隔）
      const beatInterval = setInterval(() => {
        manager.beat()
      }, 30)

      await new Promise((resolve) => setTimeout(resolve, 200))

      clearInterval(beatInterval)

      const status = manager.getStatus()
      expect(status.missedCount).toBe(0)
      expect(status.isAlive).toBe(true)
    })
  })

  // --- Stale 事件 ---

  describe('Stale 事件', () => {
    test('當遺漏計數達到 maxMissed 時發出 stale 事件', async () => {
      const staleEvents: HeartbeatStatus[] = []
      manager.on('stale', (status: HeartbeatStatus) => {
        staleEvents.push(status)
      })

      await manager.start('consumer-1', ['topic-a'])

      // 等待足夠的時間讓遺漏計數達到 maxMissed (3)
      // interval=50ms, maxMissed=3, 需要 ~150ms
      await new Promise((resolve) => setTimeout(resolve, 220))

      expect(staleEvents.length).toBeGreaterThanOrEqual(1)
      expect(staleEvents[0].missedCount).toBeGreaterThanOrEqual(3)
    })

    test('stale 事件後 beat() 可以恢復', async () => {
      const staleEvents: HeartbeatStatus[] = []
      manager.on('stale', (status: HeartbeatStatus) => {
        staleEvents.push(status)
      })

      await manager.start('consumer-1', ['topic-a'])

      // 等待 stale 事件
      await new Promise((resolve) => setTimeout(resolve, 220))
      expect(staleEvents.length).toBeGreaterThanOrEqual(1)

      // beat() 恢復
      manager.beat()
      const status = manager.getStatus()
      expect(status.missedCount).toBe(0)
      expect(status.isAlive).toBe(true)
    })
  })

  // --- onStateChange ---

  describe('onStateChange', () => {
    test('stale 時觸發 stateChange 事件', async () => {
      const changes: HeartbeatStatus[] = []
      manager.onStateChange((status) => {
        changes.push(status)
      })

      await manager.start('consumer-1', ['topic-a'])
      await new Promise((resolve) => setTimeout(resolve, 220))

      expect(changes.length).toBeGreaterThanOrEqual(1)
      expect(changes[0].isAlive).toBe(false)
    })
  })

  // --- getStatus 精確度 ---

  describe('getStatus() 精確度', () => {
    test('未啟動時返回正確的預設狀態', () => {
      const status = manager.getStatus()
      expect(status.consumerId).toBe('')
      expect(status.lastHeartbeat).toBe(0)
      expect(status.missedCount).toBe(0)
      expect(status.isAlive).toBe(false)
      expect(status.uptime).toBe(0)
      expect(status.queues).toEqual([])
    })

    test('啟動後返回正確的狀態', async () => {
      await manager.start('consumer-1', ['topic-a', 'topic-b'])
      const status = manager.getStatus()
      expect(status.consumerId).toBe('consumer-1')
      expect(status.lastHeartbeat).toBeGreaterThan(0)
      expect(status.isAlive).toBe(true)
      expect(status.uptime).toBeGreaterThanOrEqual(0)
      expect(status.queues).toEqual(['topic-a', 'topic-b'])
    })

    test('queues 是不可變的複本', async () => {
      const queues = ['topic-a']
      await manager.start('consumer-1', queues)

      // 修改原始陣列不影響內部狀態
      queues.push('topic-b')
      expect(manager.getStatus().queues).toEqual(['topic-a'])

      // 修改返回值不影響內部狀態
      const statusQueues = manager.getStatus().queues
      statusQueues.push('topic-c')
      expect(manager.getStatus().queues).toEqual(['topic-a'])
    })
  })

  // --- 工作階段逾時 ---

  describe('工作階段逾時', () => {
    test('超過 sessionTimeout 後發出 stale 事件', async () => {
      const shortTimeoutManager = new HeartbeatManager({
        interval: 50,
        sessionTimeout: 120,
        maxMissed: 10, // 設定很高，讓 sessionTimeout 先觸發
      })

      const staleEvents: HeartbeatStatus[] = []
      shortTimeoutManager.on('stale', (status: HeartbeatStatus) => {
        staleEvents.push(status)
      })

      await shortTimeoutManager.start('consumer-1', ['topic-a'])

      // 等待 sessionTimeout 超過
      await new Promise((resolve) => setTimeout(resolve, 200))

      await shortTimeoutManager.stop()
      expect(staleEvents.length).toBeGreaterThanOrEqual(1)
    })
  })

  // --- 計時器清理 ---

  describe('計時器清理', () => {
    test('stop() 後無洩漏的計時器', async () => {
      await manager.start('consumer-1', ['topic-a'])
      await manager.stop()

      // 驗證內部計時器已清除（通過確認 stop 後沒有新事件發出）
      const heartbeats: HeartbeatStatus[] = []
      manager.on('heartbeat', (status: HeartbeatStatus) => {
        heartbeats.push(status)
      })

      await new Promise((resolve) => setTimeout(resolve, 120))
      expect(heartbeats.length).toBe(0)
    })

    test('多次 start/stop 週期不會洩漏計時器', async () => {
      for (let i = 0; i < 5; i++) {
        await manager.start(`consumer-${i}`, ['topic-a'])
        await manager.stop()
      }

      const heartbeats: HeartbeatStatus[] = []
      manager.on('heartbeat', (status: HeartbeatStatus) => {
        heartbeats.push(status)
      })

      await new Promise((resolve) => setTimeout(resolve, 120))
      expect(heartbeats.length).toBe(0)
    })
  })
})
