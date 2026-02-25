import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { BackpressureController } from '../../../../src/drivers/kafka/BackpressureController'
import { ConsumerLifecycleManager } from '../../../../src/drivers/kafka/ConsumerLifecycleManager'
import { ErrorRecoveryManager } from '../../../../src/drivers/kafka/ErrorRecoveryManager'
import { HeartbeatManager } from '../../../../src/drivers/kafka/HeartbeatManager'
import { KafkaDriver } from '../../../../src/drivers/kafka/KafkaDriver'
import { KafkaMetrics } from '../../../../src/drivers/kafka/KafkaMetrics'
import { MessageBuffer } from '../../../../src/drivers/kafka/MessageBuffer'
import type {
  KafkaAdminClient,
  KafkaClientFactory,
  KafkaConsumerClient,
  KafkaMessage,
  KafkaProducerClient,
} from '../../../../src/drivers/kafka/types'
import type { SerializedJob } from '../../../../src/types'

// --- 測試輔助工具 ---

function createTestJob(id = 'job-1', groupId?: string): SerializedJob {
  return {
    id,
    type: 'json',
    data: '{"test": true}',
    createdAt: Date.now(),
    groupId,
  }
}

function createKafkaMessage(job: SerializedJob, offset = '0'): KafkaMessage {
  return {
    key: Buffer.from(job.id),
    value: Buffer.from(JSON.stringify(job)),
    offset,
    timestamp: String(Date.now()),
  }
}

/**
 * 建立模擬 Kafka 客戶端工廠。
 * 提供對內部處理函數的存取以便在測試中模擬訊息到達。
 */
function createMockKafkaClient() {
  const sentMessages: Array<{ topic: string; messages: any[] }> = []
  let eachMessageHandler:
    | ((args: { topic: string; partition: number; message: KafkaMessage }) => Promise<void>)
    | null = null

  const producerSendMock = mock(async (args: any) => {
    sentMessages.push(args)
    return args.messages.map((_: any, i: number) => ({
      topicName: args.topic,
      partition: 0,
      errorCode: 0,
      offset: String(i),
    }))
  })

  const consumerRunMock = mock(async (args: any) => {
    eachMessageHandler = args.eachMessage
  })

  const consumerPauseMock = mock(() => {})
  const consumerResumeMock = mock(() => {})

  const producer: KafkaProducerClient = {
    connect: async () => {},
    send: producerSendMock as any,
    disconnect: async () => {},
  }

  const consumer: KafkaConsumerClient = {
    connect: async () => {},
    subscribe: async () => {},
    run: consumerRunMock as any,
    commitOffsets: async () => {},
    seek: () => {},
    pause: consumerPauseMock as any,
    resume: consumerResumeMock as any,
    disconnect: async () => {},
  }

  const admin: KafkaAdminClient = {
    connect: async () => {},
    createTopics: async () => true,
    deleteTopics: async () => {},
    fetchTopicOffsets: async () => [],
    fetchOffsets: async () => [],
    listTopics: async () => [],
    disconnect: async () => {},
  }

  const client: KafkaClientFactory = {
    producer: () => producer,
    consumer: () => consumer,
    admin: () => admin,
  }

  return {
    client,
    producer,
    consumer,
    admin,
    sentMessages,
    getEachMessageHandler: () => eachMessageHandler,
    simulateMessage: async (topic: string, partition: number, message: KafkaMessage) => {
      if (eachMessageHandler) {
        await eachMessageHandler({ topic, partition, message })
      }
    },
    consumerPauseMock,
    consumerResumeMock,
  }
}

// ==========================================================================
// Phase 6D 整合測試
// ==========================================================================

describe('Phase 6D 整合測試', () => {
  // ------------------------------------------------------------------
  // 1. HeartbeatManager + KafkaMetrics 協作
  // ------------------------------------------------------------------
  describe('HeartbeatManager + KafkaMetrics 協作', () => {
    let heartbeat: HeartbeatManager
    let metrics: KafkaMetrics

    beforeEach(() => {
      heartbeat = new HeartbeatManager({ interval: 50, maxMissed: 3, sessionTimeout: 300 })
      metrics = new KafkaMetrics()
    })

    afterEach(async () => {
      await heartbeat.stop()
    })

    it('訊息處理成功時同步更新心跳和指標', async () => {
      await heartbeat.start('consumer-1', ['topic-a'])

      // 模擬處理 5 筆訊息
      for (let i = 0; i < 5; i++) {
        const latency = 10 + i * 5
        metrics.recordMessage('topic-a', latency)
        heartbeat.beat()
      }

      const status = heartbeat.getStatus()
      expect(status.isAlive).toBe(true)
      expect(status.missedCount).toBe(0)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.totalProcessed).toBe(5)
      expect(snapshot.latency.min).toBeGreaterThan(0)
    })

    it('無訊息處理時心跳逾時且指標顯示零吞吐量', async () => {
      await heartbeat.start('consumer-1', ['topic-a'])

      // 等待足夠時間讓心跳遺漏
      await new Promise((resolve) => setTimeout(resolve, 200))

      const status = heartbeat.getStatus()
      expect(status.missedCount).toBeGreaterThanOrEqual(2)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.totalProcessed).toBe(0)
    })

    it('錯誤事件同時記錄到心跳和指標', async () => {
      await heartbeat.start('consumer-1', ['topic-a'])

      // 模擬失敗：不呼叫 beat() 但記錄錯誤
      for (let i = 0; i < 3; i++) {
        metrics.recordError('callback')
      }

      // 不呼叫 beat(), 讓心跳遺漏
      await new Promise((resolve) => setTimeout(resolve, 130))

      const status = heartbeat.getStatus()
      expect(status.missedCount).toBeGreaterThanOrEqual(1)

      const snapshot = metrics.getSnapshot()
      expect(snapshot.errors.callback).toBe(3)
      expect(snapshot.totalFailed).toBe(3)
    })
  })

  // ------------------------------------------------------------------
  // 2. ErrorRecoveryManager + KafkaMetrics 協作
  // ------------------------------------------------------------------
  describe('ErrorRecoveryManager + KafkaMetrics 協作', () => {
    let recovery: ErrorRecoveryManager
    let metrics: KafkaMetrics

    beforeEach(() => {
      recovery = new ErrorRecoveryManager({
        failureThreshold: 3,
        resetTimeoutMs: 80,
        initialBackoffMs: 10,
        maxBackoffMs: 100,
        backoffMultiplier: 2,
        jitter: false,
        maxRetries: 5,
      })
      metrics = new KafkaMetrics()
    })

    afterEach(() => {
      recovery.destroy()
    })

    it('連續失敗觸發電路打開並記錄錯誤指標', () => {
      const error = new Error('connection lost')

      for (let i = 0; i < 3; i++) {
        recovery.recordFailure(error)
        metrics.recordError('connection')
      }

      expect(recovery.getState().circuitState).toBe('OPEN')
      expect(metrics.getSnapshot().errors.connection).toBe(3)
      expect(metrics.getSnapshot().errors.total).toBe(3)
    })

    it('電路恢復後指標反映成功恢復', async () => {
      const error = new Error('connection lost')

      for (let i = 0; i < 3; i++) {
        recovery.recordFailure(error)
        metrics.recordError('connection')
      }

      // 等待轉到 HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 120))
      expect(recovery.getState().circuitState).toBe('HALF_OPEN')

      // 成功恢復
      recovery.recordSuccess()
      metrics.recordMessage('topic-a', 5)

      expect(recovery.getState().circuitState).toBe('CLOSED')
      expect(recovery.getState().totalRecoveries).toBe(1)
      expect(metrics.getSnapshot().totalProcessed).toBe(1)
    })

    it('退避期間不記錄新的處理指標', async () => {
      const error = new Error('failure')

      for (let i = 0; i < 3; i++) {
        recovery.recordFailure(error)
      }

      expect(recovery.canProceed()).toBe(false)
      // 電路打開期間不應處理訊息
      const snapshot = metrics.getSnapshot()
      expect(snapshot.totalProcessed).toBe(0)
    })
  })

  // ------------------------------------------------------------------
  // 3. ErrorRecoveryManager + HeartbeatManager 協作
  // ------------------------------------------------------------------
  describe('ErrorRecoveryManager + HeartbeatManager 協作', () => {
    let recovery: ErrorRecoveryManager
    let heartbeat: HeartbeatManager

    beforeEach(() => {
      recovery = new ErrorRecoveryManager({
        failureThreshold: 3,
        resetTimeoutMs: 80,
        initialBackoffMs: 10,
        maxBackoffMs: 100,
        jitter: false,
      })
      heartbeat = new HeartbeatManager({ interval: 50, maxMissed: 3, sessionTimeout: 300 })
    })

    afterEach(async () => {
      await heartbeat.stop()
      recovery.destroy()
    })

    it('電路打開時心跳繼續運作但可能逾時', async () => {
      await heartbeat.start('consumer-1', ['topic-a'])

      const error = new Error('failure')
      for (let i = 0; i < 3; i++) {
        recovery.recordFailure(error)
      }
      expect(recovery.getState().circuitState).toBe('OPEN')

      // 電路打開但心跳仍在執行
      expect(heartbeat.getStatus().isAlive).toBe(true)

      // 不呼叫 beat()，等待心跳逾時
      await new Promise((resolve) => setTimeout(resolve, 200))
      expect(heartbeat.getStatus().missedCount).toBeGreaterThanOrEqual(2)
    })

    it('電路恢復後心跳也恢復正常', async () => {
      await heartbeat.start('consumer-1', ['topic-a'])

      const error = new Error('failure')
      for (let i = 0; i < 3; i++) {
        recovery.recordFailure(error)
      }

      // 等待電路半開
      await new Promise((resolve) => setTimeout(resolve, 120))

      // 成功恢復
      recovery.recordSuccess()
      heartbeat.beat()

      expect(recovery.getState().circuitState).toBe('CLOSED')
      expect(heartbeat.getStatus().missedCount).toBe(0)
      expect(heartbeat.getStatus().isAlive).toBe(true)
    })
  })

  // ------------------------------------------------------------------
  // 4. BackpressureController + ErrorRecoveryManager 協作
  // ------------------------------------------------------------------
  describe('BackpressureController + ErrorRecoveryManager 協作', () => {
    let backpressure: BackpressureController
    let recovery: ErrorRecoveryManager

    beforeEach(() => {
      backpressure = new BackpressureController(100, {
        highWatermark: 0.8,
        lowWatermark: 0.5,
        maxInFlight: 5,
      })
      recovery = new ErrorRecoveryManager({
        failureThreshold: 3,
        resetTimeoutMs: 80,
        initialBackoffMs: 10,
        jitter: false,
      })
    })

    afterEach(() => {
      recovery.destroy()
    })

    it('背壓暫停和電路打開可以同時生效', () => {
      // 觸發背壓
      backpressure.evaluate(85, ['topic-a'])
      expect(backpressure.isPaused()).toBe(true)

      // 同時觸發電路打開
      const error = new Error('failure')
      for (let i = 0; i < 3; i++) {
        recovery.recordFailure(error)
      }

      expect(backpressure.isPaused()).toBe(true)
      expect(recovery.canProceed()).toBe(false)
    })

    it('電路恢復不影響背壓狀態', async () => {
      // 先觸發背壓
      backpressure.evaluate(85, ['topic-a'])
      expect(backpressure.isPaused()).toBe(true)

      // 觸發電路打開
      const error = new Error('failure')
      for (let i = 0; i < 3; i++) {
        recovery.recordFailure(error)
      }

      // 電路恢復
      await new Promise((resolve) => setTimeout(resolve, 120))
      recovery.recordSuccess()

      // 電路恢復但背壓仍然暫停
      expect(recovery.canProceed()).toBe(true)
      expect(backpressure.isPaused()).toBe(true)
    })

    it('in-flight 限制和電路狀態獨立運作', () => {
      // 佔滿 in-flight 名額
      for (let i = 0; i < 5; i++) {
        expect(backpressure.acquireSlot()).toBe(true)
      }
      expect(backpressure.acquireSlot()).toBe(false)

      // 電路仍然正常
      expect(recovery.canProceed()).toBe(true)

      // 觸發電路打開
      const error = new Error('failure')
      for (let i = 0; i < 3; i++) {
        recovery.recordFailure(error)
      }

      // 兩者都阻塞
      expect(backpressure.acquireSlot()).toBe(false)
      expect(recovery.canProceed()).toBe(false)
    })
  })

  // ------------------------------------------------------------------
  // 5. ConsumerLifecycleManager + HeartbeatManager 協作
  // ------------------------------------------------------------------
  describe('ConsumerLifecycleManager + HeartbeatManager 協作', () => {
    let lifecycle: ConsumerLifecycleManager
    let heartbeat: HeartbeatManager

    beforeEach(() => {
      lifecycle = new ConsumerLifecycleManager()
      heartbeat = new HeartbeatManager({ interval: 50, maxMissed: 3, sessionTimeout: 300 })
    })

    afterEach(async () => {
      await heartbeat.stop()
      if (lifecycle.isRunning()) {
        await lifecycle.stop()
      }
    })

    it('生命週期啟動和心跳同步開始', async () => {
      await lifecycle.start()
      await heartbeat.start('consumer-1', ['topic-a'])

      expect(lifecycle.isRunning()).toBe(true)
      expect(heartbeat.getStatus().isAlive).toBe(true)
    })

    it('生命週期停止時心跳也停止', async () => {
      await lifecycle.start()
      await heartbeat.start('consumer-1', ['topic-a'])

      await lifecycle.stop()
      await heartbeat.stop()

      expect(lifecycle.isStopped()).toBe(true)
      expect(heartbeat.getStatus().isAlive).toBe(false)
    })

    it('心跳 stale 事件可觸發生命週期狀態變更', async () => {
      const staleDetected: boolean[] = []

      await lifecycle.start()
      await heartbeat.start('consumer-1', ['topic-a'])

      heartbeat.on('stale', () => {
        staleDetected.push(true)
      })

      // 不呼叫 beat()，等待 stale 事件
      await new Promise((resolve) => setTimeout(resolve, 220))

      expect(staleDetected.length).toBeGreaterThanOrEqual(1)
      // 生命週期仍在運作（stale 不自動停止）
      expect(lifecycle.isRunning()).toBe(true)
    })
  })

  // ------------------------------------------------------------------
  // 6. KafkaDriver 整合 - 訊息處理完整流程
  // ------------------------------------------------------------------
  describe('KafkaDriver 訊息處理完整流程', () => {
    let driver: KafkaDriver
    let mockClient: ReturnType<typeof createMockKafkaClient>

    beforeEach(() => {
      mockClient = createMockKafkaClient()
      driver = new KafkaDriver({
        client: mockClient.client,
        bufferSize: 100,
        autoCommitInterval: 500,
      })
    })

    afterEach(async () => {
      await driver.disconnect()
    })

    it('push → consumer 接收 → buffer → pop → complete 完整流程', async () => {
      const job = createTestJob('integration-job-1')

      // 推送訊息
      await driver.push('test-topic', job)
      expect(mockClient.sentMessages.length).toBe(1)

      // 初始化 consumer（透過 pop 觸發）
      await driver.pop('test-topic')

      // 模擬 Kafka consumer 接收訊息
      const message = createKafkaMessage(job, '0')
      await mockClient.simulateMessage('test-topic', 0, message)

      // 從 buffer 中取出
      const popped = await driver.pop('test-topic')
      expect(popped).not.toBeNull()
      expect(popped?.id).toBe('integration-job-1')

      // 完成處理
      await driver.complete('test-topic', popped!)
    })

    it('多筆訊息順序處理', async () => {
      // 初始化 consumer
      await driver.pop('test-topic')

      const jobs = Array.from({ length: 5 }, (_, i) => createTestJob(`job-${i}`))

      // 模擬 consumer 接收 5 筆訊息
      for (let i = 0; i < jobs.length; i++) {
        const message = createKafkaMessage(jobs[i]!, String(i))
        await mockClient.simulateMessage('test-topic', 0, message)
      }

      // 依序取出
      const results: SerializedJob[] = []
      for (let i = 0; i < 5; i++) {
        const popped = await driver.pop('test-topic')
        if (popped) {
          results.push(popped)
        }
      }

      expect(results.length).toBe(5)
      expect(results[0]?.id).toBe('job-0')
      expect(results[4]?.id).toBe('job-4')
    })

    it('訊息處理失敗進入 DLQ', async () => {
      // 初始化 consumer
      await driver.pop('test-topic')

      const job = createTestJob('fail-job')
      const message = createKafkaMessage(job, '0')
      await mockClient.simulateMessage('test-topic', 0, message)

      const popped = await driver.pop('test-topic')
      expect(popped).not.toBeNull()

      // 標記失敗
      await driver.fail('test-topic', popped!)

      // 驗證 DLQ 發送
      const dlqSent = mockClient.sentMessages.find((m) => m.topic === 'test-topic.dlq')
      expect(dlqSent).toBeDefined()
    })

    it('DLQ 訊息可重試', async () => {
      // 初始化 consumer
      await driver.pop('test-topic')

      const job = createTestJob('retry-job')
      const message = createKafkaMessage(job, '0')
      await mockClient.simulateMessage('test-topic', 0, message)

      const popped = await driver.pop('test-topic')
      await driver.fail('test-topic', popped!)

      // 重試
      const retried = await driver.retryFailed('test-topic')
      expect(retried).toBeGreaterThanOrEqual(0)
    })
  })

  // ------------------------------------------------------------------
  // 7. KafkaDriver 整合 - ErrorRecovery 在訊息處理中的作用
  // ------------------------------------------------------------------
  describe('KafkaDriver ErrorRecovery 整合', () => {
    let driver: KafkaDriver
    let mockClient: ReturnType<typeof createMockKafkaClient>

    beforeEach(() => {
      mockClient = createMockKafkaClient()
      driver = new KafkaDriver({
        client: mockClient.client,
        bufferSize: 100,
        autoCommitInterval: 500,
      })
    })

    afterEach(async () => {
      await driver.disconnect()
    })

    it('成功處理訊息時 errorRecovery 記錄成功', async () => {
      await driver.pop('test-topic')

      const job = createTestJob('success-job')
      const message = createKafkaMessage(job, '0')
      await mockClient.simulateMessage('test-topic', 0, message)

      // 驗證 errorRecovery 狀態保持 CLOSED
      const recoveryState = driver.errorRecovery.getState()
      expect(recoveryState.circuitState).toBe('CLOSED')
      expect(recoveryState.consecutiveFailures).toBe(0)
    })

    it('無效訊息（序列化錯誤）不影響電路斷路器', async () => {
      await driver.pop('test-topic')

      // 傳送無效 JSON 訊息（序列化錯誤不影響電路）
      const invalidMessage: KafkaMessage = {
        value: Buffer.from('invalid json{{{'),
        offset: '0',
      }
      await mockClient.simulateMessage('test-topic', 0, invalidMessage)

      const recoveryState = driver.errorRecovery.getState()
      // Phase 6F: 序列化錯誤不再遞增電路失敗計數
      expect(recoveryState.consecutiveFailures).toBe(0)
      expect(recoveryState.circuitState).toBe('CLOSED')
    })

    it('連續無效訊息（序列化）不觸發電路打開', async () => {
      await driver.pop('test-topic')

      // Phase 6F: 序列化錯誤不影響電路，即使超過 failureThreshold
      for (let i = 0; i < 6; i++) {
        const invalidMessage: KafkaMessage = {
          value: Buffer.from(`invalid-${i}`),
          offset: String(i),
        }
        await mockClient.simulateMessage('test-topic', 0, invalidMessage)
      }

      const recoveryState = driver.errorRecovery.getState()
      // 序列化錯誤被分類後跳過電路，電路仍為 CLOSED
      expect(recoveryState.circuitState).toBe('CLOSED')
      expect(recoveryState.consecutiveFailures).toBe(0)
    })

    it('有效訊息後電路保持健康狀態', async () => {
      await driver.pop('test-topic')

      // Phase 6F: 序列化錯誤不影響電路，consecutiveFailures 保持 0
      for (let i = 0; i < 3; i++) {
        const invalidMessage: KafkaMessage = {
          value: Buffer.from(`invalid-${i}`),
          offset: String(i),
        }
        await mockClient.simulateMessage('test-topic', 0, invalidMessage)
      }

      // 序列化錯誤不遞增失敗計數
      expect(driver.errorRecovery.getState().consecutiveFailures).toBe(0)

      // 傳送有效訊息
      const validJob = createTestJob('valid-job')
      const validMessage = createKafkaMessage(validJob, '10')
      await mockClient.simulateMessage('test-topic', 0, validMessage)

      expect(driver.errorRecovery.getState().consecutiveFailures).toBe(0)
      expect(driver.errorRecovery.getState().circuitState).toBe('CLOSED')
    })
  })

  // ------------------------------------------------------------------
  // 8. KafkaDriver 整合 - Metrics 在訊息處理中的追蹤
  // ------------------------------------------------------------------
  describe('KafkaDriver Metrics 整合', () => {
    let driver: KafkaDriver
    let mockClient: ReturnType<typeof createMockKafkaClient>

    beforeEach(() => {
      mockClient = createMockKafkaClient()
      driver = new KafkaDriver({
        client: mockClient.client,
        bufferSize: 100,
        autoCommitInterval: 500,
      })
    })

    afterEach(async () => {
      await driver.disconnect()
    })

    it('無效訊息增加序列化錯誤計數', async () => {
      await driver.pop('test-topic')

      const invalidMessage: KafkaMessage = {
        value: Buffer.from('not-json'),
        offset: '0',
      }
      await mockClient.simulateMessage('test-topic', 0, invalidMessage)

      const metricsSnapshot = driver.getMetrics()
      expect(metricsSnapshot.errors.serialization).toBe(1)
      expect(metricsSnapshot.totalFailed).toBe(1)
    })

    it('stats() 反映完整的處理狀態', async () => {
      await driver.pop('test-topic')

      // 處理一些有效訊息
      for (let i = 0; i < 3; i++) {
        const job = createTestJob(`stats-job-${i}`)
        const message = createKafkaMessage(job, String(i))
        await mockClient.simulateMessage('test-topic', 0, message)
      }

      const stats = await driver.stats('test-topic')
      expect(stats.queue).toBe('test-topic')
      expect(stats.size).toBe(3) // 3 筆在 buffer 中
    })

    it('getMetrics() 返回完整的指標快照', () => {
      const metrics = driver.getMetrics()
      expect(metrics).toBeDefined()
      expect(typeof metrics.timestamp).toBe('number')
      expect(typeof metrics.totalProcessed).toBe('number')
      expect(typeof metrics.totalFailed).toBe('number')
      expect(typeof metrics.inFlight).toBe('number')
      expect(metrics.errors).toBeDefined()
      expect(metrics.latency).toBeDefined()
      expect(metrics.buffer).toBeDefined()
      expect(metrics.rateLimits).toBeDefined()
    })
  })

  // ------------------------------------------------------------------
  // 9. KafkaDriver 整合 - 優雅關閉（所有元件清理）
  // ------------------------------------------------------------------
  describe('KafkaDriver 優雅關閉', () => {
    it('disconnect 清理所有 Phase 6D 元件', async () => {
      const mockClient = createMockKafkaClient()
      const driver = new KafkaDriver({
        client: mockClient.client,
        bufferSize: 100,
      })

      // 初始化 consumer
      await driver.pop('test-topic')

      // 優雅關閉
      await driver.disconnect()

      // 驗證 errorRecovery 已清理（監聽器清除）
      expect(driver.errorRecovery.listenerCount('circuit:open')).toBe(0)
    })

    it('disconnect 後再次呼叫不會出錯', async () => {
      const mockClient = createMockKafkaClient()
      const driver = new KafkaDriver({
        client: mockClient.client,
      })

      await driver.disconnect()
      await driver.disconnect()
      // 不應丟出例外
    })

    it('有活躍訊息時 disconnect 不會遺失狀態', async () => {
      const mockClient = createMockKafkaClient()
      const driver = new KafkaDriver({
        client: mockClient.client,
        bufferSize: 100,
      })

      // 初始化 consumer 並推入一些訊息
      await driver.pop('test-topic')

      for (let i = 0; i < 3; i++) {
        const job = createTestJob(`shutdown-job-${i}`)
        const message = createKafkaMessage(job, String(i))
        await mockClient.simulateMessage('test-topic', 0, message)
      }

      expect(await driver.size('test-topic')).toBe(3)

      // 優雅關閉
      await driver.disconnect()
      // 不應丟出例外
    })
  })

  // ------------------------------------------------------------------
  // 10. 全元件端對端場景
  // ------------------------------------------------------------------
  describe('全元件端對端場景', () => {
    it('正常流量: push → receive → pop → complete → metrics 更新', async () => {
      const mockClient = createMockKafkaClient()
      const driver = new KafkaDriver({
        client: mockClient.client,
        bufferSize: 100,
      })

      // 推送訊息
      const job = createTestJob('e2e-job-1')
      await driver.push('e2e-topic', job)

      // 初始化 consumer
      await driver.pop('e2e-topic')

      // consumer 接收
      const message = createKafkaMessage(job, '0')
      await mockClient.simulateMessage('e2e-topic', 0, message)

      // pop 取出
      const popped = await driver.pop('e2e-topic')
      expect(popped).not.toBeNull()
      expect(popped?.id).toBe('e2e-job-1')

      // complete
      await driver.complete('e2e-topic', popped!)

      // 驗證指標
      const metrics = driver.getMetrics()
      expect(metrics.errors.total).toBe(0)

      // 驗證 errorRecovery 健康
      expect(driver.errorRecovery.getState().circuitState).toBe('CLOSED')

      await driver.disconnect()
    })

    it('失敗流量: 序列化錯誤記錄指標但不影響電路', async () => {
      const mockClient = createMockKafkaClient()
      const driver = new KafkaDriver({
        client: mockClient.client,
        bufferSize: 100,
      })

      await driver.pop('error-topic')

      // 傳送 6 筆無效訊息
      for (let i = 0; i < 6; i++) {
        const invalidMessage: KafkaMessage = {
          value: Buffer.from(`bad-data-${i}`),
          offset: String(i),
        }
        await mockClient.simulateMessage('error-topic', 0, invalidMessage)
      }

      // Phase 6F: 序列化錯誤不影響電路
      expect(driver.errorRecovery.getState().circuitState).toBe('CLOSED')
      expect(driver.errorRecovery.getState().consecutiveFailures).toBe(0)

      // 驗證錯誤指標仍然被記錄
      const metrics = driver.getMetrics()
      expect(metrics.errors.serialization).toBe(6)

      await driver.disconnect()
    })

    it('混合流量: 正常和錯誤交替 → 電路保持關閉', async () => {
      const mockClient = createMockKafkaClient()
      const driver = new KafkaDriver({
        client: mockClient.client,
        bufferSize: 100,
      })

      await driver.pop('mixed-topic')

      // 交替正常和錯誤訊息，以有效訊息結尾
      for (let i = 0; i < 10; i++) {
        if (i % 2 === 0) {
          // 有效訊息
          const job = createTestJob(`valid-${i}`)
          const msg = createKafkaMessage(job, String(i))
          await mockClient.simulateMessage('mixed-topic', 0, msg)
        } else {
          // 無效訊息
          const badMsg: KafkaMessage = {
            value: Buffer.from(`bad-${i}`),
            offset: String(i),
          }
          await mockClient.simulateMessage('mixed-topic', 0, badMsg)
        }
      }

      // 最後一筆是 i=9 (奇數, 無效)，所以 consecutiveFailures=1
      // 但電路不會打開，因為閾值未達
      expect(driver.errorRecovery.getState().circuitState).toBe('CLOSED')

      // 再傳一筆有效訊息確認重置
      const finalJob = createTestJob('final-valid')
      const finalMsg = createKafkaMessage(finalJob, '100')
      await mockClient.simulateMessage('mixed-topic', 0, finalMsg)
      expect(driver.errorRecovery.getState().consecutiveFailures).toBe(0)

      // 指標反映混合結果
      const metrics = driver.getMetrics()
      expect(metrics.errors.serialization).toBe(5)

      await driver.disconnect()
    })

    it('高吞吐量場景: 快速推入大量訊息', async () => {
      const mockClient = createMockKafkaClient()
      const driver = new KafkaDriver({
        client: mockClient.client,
        bufferSize: 1000,
      })

      await driver.pop('throughput-topic')

      const count = 100
      for (let i = 0; i < count; i++) {
        const job = createTestJob(`batch-${i}`)
        const msg = createKafkaMessage(job, String(i))
        await mockClient.simulateMessage('throughput-topic', 0, msg)
      }

      expect(await driver.size('throughput-topic')).toBe(count)

      // 全部取出
      const popped = await driver.popMany('throughput-topic', count)
      expect(popped.length).toBe(count)

      // 驗證電路仍然健康
      expect(driver.errorRecovery.getState().circuitState).toBe('CLOSED')

      await driver.disconnect()
    })

    it('buffer 滿時暫停 consumer', async () => {
      const mockClient = createMockKafkaClient()
      const driver = new KafkaDriver({
        client: mockClient.client,
        bufferSize: 5, // 很小的 buffer
      })

      await driver.pop('pause-topic')

      // 填滿 buffer
      for (let i = 0; i < 6; i++) {
        const job = createTestJob(`fill-${i}`)
        const msg = createKafkaMessage(job, String(i))
        await mockClient.simulateMessage('pause-topic', 0, msg)
      }

      // 第 6 筆應觸發 pause
      expect(mockClient.consumerPauseMock).toHaveBeenCalled()

      await driver.disconnect()
    })
  })

  // ------------------------------------------------------------------
  // 11. 元件獨立性驗證
  // ------------------------------------------------------------------
  describe('元件獨立性驗證', () => {
    it('每個 Phase 6D 元件可獨立建構和使用', () => {
      const heartbeat = new HeartbeatManager()
      const metrics = new KafkaMetrics()
      const recovery = new ErrorRecoveryManager()
      const backpressure = new BackpressureController(100)
      const lifecycle = new ConsumerLifecycleManager()
      const buffer = new MessageBuffer(100)

      expect(heartbeat).toBeDefined()
      expect(metrics).toBeDefined()
      expect(recovery).toBeDefined()
      expect(backpressure).toBeDefined()
      expect(lifecycle).toBeDefined()
      expect(buffer).toBeDefined()

      // 清理
      recovery.destroy()
    })

    it('一個元件的錯誤不影響其他元件', () => {
      const metrics = new KafkaMetrics()
      const recovery = new ErrorRecoveryManager({
        failureThreshold: 2,
        resetTimeoutMs: 50,
        jitter: false,
      })

      // 觸發 recovery 電路打開
      const error = new Error('test')
      recovery.recordFailure(error)
      recovery.recordFailure(error)
      expect(recovery.getState().circuitState).toBe('OPEN')

      // metrics 不受影響
      metrics.recordMessage('topic', 10)
      expect(metrics.getSnapshot().totalProcessed).toBe(1)
      expect(metrics.getSnapshot().errors.total).toBe(0)

      recovery.destroy()
    })

    it('元件可以按任意順序初始化', () => {
      // 先建 metrics, 後建 recovery
      const metrics = new KafkaMetrics()
      const recovery = new ErrorRecoveryManager()
      const heartbeat = new HeartbeatManager()

      metrics.recordMessage('topic', 5)
      recovery.recordSuccess()
      expect(heartbeat.getStatus().isAlive).toBe(false) // 未啟動

      recovery.destroy()
    })
  })

  // ------------------------------------------------------------------
  // 12. 邊界情況
  // ------------------------------------------------------------------
  describe('邊界情況', () => {
    it('空訊息 (null value) 不會觸發 errorRecovery 失敗', async () => {
      const mockClient = createMockKafkaClient()
      const driver = new KafkaDriver({
        client: mockClient.client,
        bufferSize: 100,
      })

      await driver.pop('null-topic')

      const nullMessage: KafkaMessage = {
        value: null,
        offset: '0',
      }
      await mockClient.simulateMessage('null-topic', 0, nullMessage)

      // null value 直接返回，不記錄失敗
      expect(driver.errorRecovery.getState().consecutiveFailures).toBe(0)

      await driver.disconnect()
    })

    it('極大 offset 值不影響追蹤', async () => {
      const mockClient = createMockKafkaClient()
      const driver = new KafkaDriver({
        client: mockClient.client,
        bufferSize: 100,
      })

      await driver.pop('big-offset-topic')

      const job = createTestJob('big-offset-job')
      const message = createKafkaMessage(job, '9999999999999')
      await mockClient.simulateMessage('big-offset-topic', 0, message)

      const popped = await driver.pop('big-offset-topic')
      expect(popped).not.toBeNull()
      expect(popped?.id).toBe('big-offset-job')

      await driver.disconnect()
    })

    it('多個 topic 同時處理不會交叉污染', async () => {
      const mockClient = createMockKafkaClient()
      const driver = new KafkaDriver({
        client: mockClient.client,
        bufferSize: 100,
      })

      await driver.pop('topic-a')
      await driver.pop('topic-b')

      // topic-a 收到有效訊息
      const jobA = createTestJob('job-a')
      await mockClient.simulateMessage('topic-a', 0, createKafkaMessage(jobA, '0'))

      // topic-b 收到無效訊息
      const badMsg: KafkaMessage = { value: Buffer.from('bad'), offset: '0' }
      await mockClient.simulateMessage('topic-b', 0, badMsg)

      // topic-a 的訊息應該正常存在
      const poppedA = await driver.pop('topic-a')
      expect(poppedA).not.toBeNull()
      expect(poppedA?.id).toBe('job-a')

      // topic-b 的 buffer 應該是空的
      const poppedB = await driver.pop('topic-b')
      expect(poppedB).toBeNull()

      await driver.disconnect()
    })
  })
})
