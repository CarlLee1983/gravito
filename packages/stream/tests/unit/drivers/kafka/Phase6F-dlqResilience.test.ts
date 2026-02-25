import { describe, expect, it, mock } from 'bun:test'
import { KafkaDriver } from '../../../../src/drivers/kafka/KafkaDriver'
import type {
  KafkaAdminClient,
  KafkaClientFactory,
  KafkaConsumerClient,
  KafkaProducerClient,
} from '../../../../src/drivers/kafka/types'
import type { SerializedJob } from '../../../../src/types'

function createTestJob(id = 'job-1'): SerializedJob {
  return {
    id,
    type: 'json',
    data: '{"test": true}',
    createdAt: Date.now(),
  }
}

function createMockKafkaClient(overrides?: { sendFn?: (...args: any[]) => Promise<any> }): {
  client: KafkaClientFactory
  sendMock: ReturnType<typeof mock>
} {
  const sendMock =
    overrides?.sendFn ??
    mock(async (args: any) =>
      args.messages.map((_: any, i: number) => ({
        topicName: args.topic,
        partition: 0,
        errorCode: 0,
        offset: String(i),
      }))
    )

  const producer: Partial<KafkaProducerClient> = {
    connect: async () => {},
    send: sendMock as any,
    disconnect: async () => {},
  }

  const consumer: Partial<KafkaConsumerClient> = {
    connect: async () => {},
    subscribe: async () => {},
    run: async () => {},
    commitOffsets: async () => {},
    seek: () => {},
    pause: () => {},
    resume: () => {},
    disconnect: async () => {},
  }

  const admin: Partial<KafkaAdminClient> = {
    connect: async () => {},
    createTopics: async () => true,
    deleteTopics: async () => {},
    fetchTopicOffsets: async () => [],
    fetchOffsets: async () => [],
    listTopics: async () => [],
    disconnect: async () => {},
  }

  const client: KafkaClientFactory = {
    producer: () => producer as KafkaProducerClient,
    consumer: () => consumer as KafkaConsumerClient,
    admin: () => admin as KafkaAdminClient,
  }

  return { client, sendMock: sendMock as ReturnType<typeof mock> }
}

describe('Phase 6F-5: DLQ Resilience with Size Limits', () => {
  describe('getDlqStats()', () => {
    it('should return empty stats when no DLQ items', () => {
      const { client } = createMockKafkaClient()
      const driver = new KafkaDriver({
        client,
        consumerGroupId: 'test-dlq-stats',
      })

      const stats = driver.getDlqStats()
      expect(stats.totalBuffered).toBe(0)
      expect(Object.keys(stats.perTopic)).toHaveLength(0)
      expect(stats.retryEnabled).toBe(true)
      expect(stats.retryIntervalMs).toBe(60000)
    })

    it('should reflect custom config values', () => {
      const { client } = createMockKafkaClient()
      const driver = new KafkaDriver({
        client,
        consumerGroupId: 'test-custom-config',
        dlqRetryEnabled: false,
        dlqRetryIntervalMs: 30000,
      })

      const stats = driver.getDlqStats()
      expect(stats.retryEnabled).toBe(false)
      expect(stats.retryIntervalMs).toBe(30000)
    })

    it('should count buffered DLQ items per topic', async () => {
      // 建立一個永遠失敗的 producer，讓 fail() 將訊息放入 dlqBuffer
      const failMock = createMockKafkaClient({
        sendFn: mock(async () => {
          throw new Error('Broker unavailable')
        }),
      })
      const driver = new KafkaDriver({
        client: failMock.client,
        consumerGroupId: 'test-dlq-count',
        maxDlqBufferSize: 100,
      })

      // fail 3 個 job 到 queue-a 和 2 個到 queue-b
      for (let i = 0; i < 3; i++) {
        await driver.fail('queue-a', createTestJob(`a-${i}`))
      }
      for (let i = 0; i < 2; i++) {
        await driver.fail('queue-b', createTestJob(`b-${i}`))
      }

      const stats = driver.getDlqStats()
      expect(stats.totalBuffered).toBe(5)
      expect(stats.perTopic['queue-a.dlq']).toBe(3)
      expect(stats.perTopic['queue-b.dlq']).toBe(2)
    })
  })

  describe('DLQ 緩衝區溢位', () => {
    it('should discard oldest items when exceeding maxDlqBufferSize', async () => {
      const failMock = createMockKafkaClient({
        sendFn: mock(async () => {
          throw new Error('Broker unavailable')
        }),
      })
      const driver = new KafkaDriver({
        client: failMock.client,
        consumerGroupId: 'test-overflow',
        maxDlqBufferSize: 5,
      })

      // 放入 8 個 job，超過上限 5
      for (let i = 0; i < 8; i++) {
        await driver.fail('test-queue', createTestJob(`job-${i}`))
      }

      const stats = driver.getDlqStats()
      expect(stats.totalBuffered).toBe(5)
      // 應保留最新的 5 個（job-3 到 job-7）
      expect(stats.perTopic['test-queue.dlq']).toBe(5)
    })

    it('should keep newest items when buffer overflows', async () => {
      const failMock = createMockKafkaClient({
        sendFn: mock(async () => {
          throw new Error('Broker unavailable')
        }),
      })
      const driver = new KafkaDriver({
        client: failMock.client,
        consumerGroupId: 'test-newest',
        maxDlqBufferSize: 3,
      })

      for (let i = 0; i < 6; i++) {
        await driver.fail('q', createTestJob(`job-${i}`))
      }

      // 存取 dlqBuffer 以驗證內容
      const buffer = (driver as any).dlqBuffer.get('q.dlq') as SerializedJob[]
      expect(buffer).toHaveLength(3)
      // 最舊的被丟棄，保留最新 3 個
      expect(buffer[0].id).toBe('job-3')
      expect(buffer[1].id).toBe('job-4')
      expect(buffer[2].id).toBe('job-5')
    })
  })

  describe('flushDlqBuffer()', () => {
    it('should flush buffered DLQ items to Kafka', async () => {
      let callCount = 0
      const intermittentMock = createMockKafkaClient({
        sendFn: mock(async (args: any) => {
          callCount++
          // 前 3 次失敗（填充緩衝區），之後成功（flush）
          if (callCount <= 3) {
            throw new Error('Broker unavailable')
          }
          return args.messages.map((_: any, i: number) => ({
            topicName: args.topic,
            partition: 0,
            errorCode: 0,
            offset: String(i),
          }))
        }),
      })
      const driver = new KafkaDriver({
        client: intermittentMock.client,
        consumerGroupId: 'test-flush',
        maxDlqBufferSize: 100,
      })

      // 3 次 fail 會進入緩衝區
      for (let i = 0; i < 3; i++) {
        await driver.fail('test-queue', createTestJob(`job-${i}`))
      }

      expect(driver.getDlqStats().totalBuffered).toBe(3)

      // flush（此時 send 會成功）
      const result = await driver.flushDlqBuffer()
      expect(result.flushed).toBe(3)
      expect(result.remaining).toBe(0)
      expect(driver.getDlqStats().totalBuffered).toBe(0)
    })

    it('should keep items if flush fails', async () => {
      const alwaysFailMock = createMockKafkaClient({
        sendFn: mock(async () => {
          throw new Error('Broker still down')
        }),
      })
      const driver = new KafkaDriver({
        client: alwaysFailMock.client,
        consumerGroupId: 'test-flush-fail',
        maxDlqBufferSize: 100,
      })

      // 填充 2 個
      for (let i = 0; i < 2; i++) {
        await driver.fail('q', createTestJob(`job-${i}`))
      }

      const result = await driver.flushDlqBuffer()
      expect(result.flushed).toBe(0)
      expect(result.remaining).toBe(2)
      expect(driver.getDlqStats().totalBuffered).toBe(2)
    })

    it('should return zero counts when buffer is empty', async () => {
      const { client } = createMockKafkaClient()
      const driver = new KafkaDriver({
        client,
        consumerGroupId: 'test-flush-empty',
      })

      const result = await driver.flushDlqBuffer()
      expect(result.flushed).toBe(0)
      expect(result.remaining).toBe(0)
    })
  })

  describe('startDlqRetryLoop()', () => {
    it('should not start when dlqRetryEnabled is false', () => {
      const { client } = createMockKafkaClient()
      const driver = new KafkaDriver({
        client,
        consumerGroupId: 'test-no-retry',
        dlqRetryEnabled: false,
      })

      driver.startDlqRetryLoop()
      // timer 不應被建立
      expect((driver as any).dlqRetryTimer).toBeNull()
    })

    it('should not start duplicate timers', () => {
      const { client } = createMockKafkaClient()
      const driver = new KafkaDriver({
        client,
        consumerGroupId: 'test-no-dup',
        dlqRetryEnabled: true,
        dlqRetryIntervalMs: 60000,
      })

      driver.startDlqRetryLoop()
      const firstTimer = (driver as any).dlqRetryTimer
      expect(firstTimer).not.toBeNull()

      driver.startDlqRetryLoop()
      const secondTimer = (driver as any).dlqRetryTimer
      // 應該是同一個 timer，未被重複建立
      expect(secondTimer).toBe(firstTimer)

      // 清理
      clearInterval(firstTimer)
      ;(driver as any).dlqRetryTimer = null
    })
  })

  describe('disconnect() DLQ cleanup', () => {
    it('should stop DLQ retry timer on disconnect', async () => {
      const { client } = createMockKafkaClient()
      const driver = new KafkaDriver({
        client,
        consumerGroupId: 'test-disconnect',
        dlqRetryEnabled: true,
        dlqRetryIntervalMs: 60000,
      })

      driver.startDlqRetryLoop()
      expect((driver as any).dlqRetryTimer).not.toBeNull()

      await driver.disconnect()
      expect((driver as any).dlqRetryTimer).toBeNull()
    })
  })
})
