import { beforeEach, describe, expect, it } from 'bun:test'
import { KafkaDriver } from '../../../../src/drivers/kafka/KafkaDriver'
import type {
  KafkaAdminClient,
  KafkaClientFactory,
  KafkaConsumerClient,
  KafkaMessage,
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

function createKafkaMessage(job: SerializedJob, offset = '0'): KafkaMessage {
  return {
    value: Buffer.from(JSON.stringify(job)),
    offset,
  }
}

function createMockKafkaClient(): {
  client: KafkaClientFactory
  simulateMessage: (topic: string, partition: number, message: KafkaMessage) => Promise<void>
} {
  let eachMessageHandler: Function | null = null

  const producer: Partial<KafkaProducerClient> = {
    connect: async () => {},
    send: async (args: any) =>
      args.messages.map((_: any, i: number) => ({
        topicName: args.topic,
        partition: 0,
        errorCode: 0,
        offset: String(i),
      })),
    disconnect: async () => {},
  }

  const consumer: Partial<KafkaConsumerClient> = {
    connect: async () => {},
    subscribe: async () => {},
    run: async ({ eachMessage }: any) => {
      eachMessageHandler = eachMessage
    },
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

  const simulateMessage = async (topic: string, partition: number, message: KafkaMessage) => {
    if (eachMessageHandler) {
      await eachMessageHandler({ topic, partition, message })
    }
  }

  return { client, simulateMessage }
}

describe('Phase 6F-3: Serialization Error DLQ Pipeline', () => {
  let driver: KafkaDriver
  let mockClient: ReturnType<typeof createMockKafkaClient>

  beforeEach(async () => {
    mockClient = createMockKafkaClient()
    driver = new KafkaDriver({
      client: mockClient.client,
      consumerGroupId: 'test-dlq',
      bufferSize: 100,
      maxDlqBufferSize: 10,
    })
    // 啟動消費者以接收訊息
    await driver.pop('test-topic')
  })

  describe('序列化錯誤 DLQ 路由', () => {
    it('should route invalid JSON to serialization DLQ', async () => {
      const invalidMessage: KafkaMessage = {
        value: Buffer.from('not valid json'),
        offset: '0',
      }
      await mockClient.simulateMessage('test-topic', 0, invalidMessage)

      const dlq = driver.getSerializationDlq()
      expect(dlq).toHaveLength(1)
      expect(dlq[0].topic).toBe('test-topic')
      expect(dlq[0].partition).toBe(0)
      expect(dlq[0].offset).toBe('0')
      expect(dlq[0].rawPayload).toBe('not valid json')
      expect(dlq[0].category).toBe('serialization')
      expect(dlq[0].error).toBeDefined()
      expect(dlq[0].timestamp).toBeGreaterThan(0)
    })

    it('should accumulate multiple serialization errors', async () => {
      for (let i = 0; i < 3; i++) {
        const msg: KafkaMessage = {
          value: Buffer.from(`bad-${i}`),
          offset: String(i),
        }
        await mockClient.simulateMessage('test-topic', 0, msg)
      }

      const dlq = driver.getSerializationDlq()
      expect(dlq).toHaveLength(3)
      expect(dlq[0].offset).toBe('0')
      expect(dlq[1].offset).toBe('1')
      expect(dlq[2].offset).toBe('2')
    })

    it('should not add valid messages to serialization DLQ', async () => {
      const validJob = createTestJob('valid-1')
      const validMessage = createKafkaMessage(validJob, '0')
      await mockClient.simulateMessage('test-topic', 0, validMessage)

      const dlq = driver.getSerializationDlq()
      expect(dlq).toHaveLength(0)
    })

    it('should respect maxDlqBufferSize limit', async () => {
      // maxDlqBufferSize 設為 10
      for (let i = 0; i < 15; i++) {
        const msg: KafkaMessage = {
          value: Buffer.from(`overflow-${i}`),
          offset: String(i),
        }
        await mockClient.simulateMessage('test-topic', 0, msg)
      }

      const dlq = driver.getSerializationDlq()
      expect(dlq).toHaveLength(10)
      // 只保留前 10 條
      expect(dlq[0].rawPayload).toBe('overflow-0')
      expect(dlq[9].rawPayload).toBe('overflow-9')
    })
  })

  describe('Per-partition 錯誤追蹤', () => {
    it('should track per-partition serialization errors', async () => {
      const msg1: KafkaMessage = { value: Buffer.from('bad-1'), offset: '0' }
      const msg2: KafkaMessage = { value: Buffer.from('bad-2'), offset: '1' }

      await mockClient.simulateMessage('test-topic', 0, msg1)
      await mockClient.simulateMessage('test-topic', 1, msg2)

      const errors = driver.getPartitionSerializationErrors()
      expect(errors.get('test-topic:0')).toBe(1)
      expect(errors.get('test-topic:1')).toBe(1)
    })

    it('should increment partition error counts', async () => {
      for (let i = 0; i < 5; i++) {
        const msg: KafkaMessage = { value: Buffer.from(`bad-${i}`), offset: String(i) }
        await mockClient.simulateMessage('test-topic', 2, msg)
      }

      const errors = driver.getPartitionSerializationErrors()
      expect(errors.get('test-topic:2')).toBe(5)
    })

    it('should track independently across partitions', async () => {
      // Partition 0: 3 errors
      for (let i = 0; i < 3; i++) {
        await mockClient.simulateMessage('test-topic', 0, {
          value: Buffer.from(`bad-p0-${i}`),
          offset: String(i),
        })
      }

      // Partition 1: 1 error
      await mockClient.simulateMessage('test-topic', 1, {
        value: Buffer.from('bad-p1'),
        offset: '0',
      })

      const errors = driver.getPartitionSerializationErrors()
      expect(errors.get('test-topic:0')).toBe(3)
      expect(errors.get('test-topic:1')).toBe(1)
    })

    it('should return empty map when no errors', () => {
      const errors = driver.getPartitionSerializationErrors()
      expect(errors.size).toBe(0)
    })
  })
})
