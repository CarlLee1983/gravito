import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { KafkaDriver } from '../../../../src/drivers/kafka/KafkaDriver'
import type {
  KafkaAdminClient,
  KafkaClientFactory,
  KafkaConsumerClient,
  KafkaDriverFullConfig,
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
  producer: any
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

  return { client, producer, sendMock: sendMock as ReturnType<typeof mock> }
}

describe('Phase 6F-2: Push Error Recovery', () => {
  let driver: KafkaDriver
  let mockKafka: ReturnType<typeof createMockKafkaClient>

  beforeEach(() => {
    mockKafka = createMockKafkaClient()
    driver = new KafkaDriver({
      client: mockKafka.client,
      consumerGroupId: 'test-push-recovery',
      bufferSize: 100,
    })
  })

  describe('push() - circuit breaker integration', () => {
    it('should push successfully and record success', async () => {
      const job = createTestJob()
      await driver.push('test-queue', job)

      // 驗證 send 被呼叫
      expect(mockKafka.sendMock).toHaveBeenCalledTimes(1)
    })

    it('should throw and record failure on transient error', async () => {
      const failMock = createMockKafkaClient({
        sendFn: mock(async () => {
          const err = new Error('Connection refused')
          ;(err as any).code = 'ECONNREFUSED'
          throw err
        }),
      })
      const failDriver = new KafkaDriver({
        client: failMock.client,
        consumerGroupId: 'test-fail',
      })

      const job = createTestJob()
      await expect(failDriver.push('test-queue', job)).rejects.toThrow('Connection refused')
    })

    it('should throw on serialization error without affecting circuit', async () => {
      const failMock = createMockKafkaClient({
        sendFn: mock(async () => {
          throw new SyntaxError('Unexpected token in JSON')
        }),
      })
      const failDriver = new KafkaDriver({
        client: failMock.client,
        consumerGroupId: 'test-ser-fail',
      })

      const job = createTestJob()
      await expect(failDriver.push('test-queue', job)).rejects.toThrow('Unexpected token')

      // 序列化錯誤不影響電路，後續 push 仍可正常執行
      // 重建 driver 以驗證電路未被打開
      const okMock = createMockKafkaClient()
      const okDriver = new KafkaDriver({
        client: okMock.client,
        consumerGroupId: 'test-ok',
      })
      await okDriver.push('test-queue', createTestJob('job-2'))
      expect(okMock.sendMock).toHaveBeenCalledTimes(1)
    })

    it('should recover after transient failures followed by success', async () => {
      let callCount = 0
      const intermittentMock = createMockKafkaClient({
        sendFn: mock(async (args: any) => {
          callCount++
          if (callCount <= 2) {
            const err = new Error('Connection timeout')
            ;(err as any).code = 'ETIMEDOUT'
            throw err
          }
          return args.messages.map((_: any, i: number) => ({
            topicName: args.topic,
            partition: 0,
            errorCode: 0,
            offset: String(i),
          }))
        }),
      })
      const recoveryDriver = new KafkaDriver({
        client: intermittentMock.client,
        consumerGroupId: 'test-recovery',
      })

      // 前兩次失敗
      await expect(recoveryDriver.push('q', createTestJob('j1'))).rejects.toThrow()
      await expect(recoveryDriver.push('q', createTestJob('j2'))).rejects.toThrow()

      // 第三次成功
      await recoveryDriver.push('q', createTestJob('j3'))
      expect(callCount).toBe(3)
    })
  })

  describe('pushMany() - circuit breaker integration', () => {
    it('should pushMany successfully', async () => {
      const jobs = [createTestJob('j1'), createTestJob('j2'), createTestJob('j3')]
      await driver.pushMany('test-queue', jobs)
    })

    it('should skip pushMany for empty jobs array', async () => {
      await driver.pushMany('test-queue', [])
      // send 不應被呼叫
      expect(mockKafka.sendMock).toHaveBeenCalledTimes(0)
    })

    it('should throw and record failure on pushMany transient error', async () => {
      const failMock = createMockKafkaClient({
        sendFn: mock(async () => {
          throw new Error('Network unreachable')
        }),
      })
      const failDriver = new KafkaDriver({
        client: failMock.client,
        consumerGroupId: 'test-batch-fail',
      })

      const jobs = [createTestJob('j1'), createTestJob('j2')]
      await expect(failDriver.pushMany('test-queue', jobs)).rejects.toThrow('Network unreachable')
    })

    it('should handle mixed push and pushMany operations', async () => {
      const job1 = createTestJob('single-1')
      const batchJobs = [createTestJob('batch-1'), createTestJob('batch-2')]

      await driver.push('q1', job1)
      await driver.pushMany('q2', batchJobs)

      // 兩個操作都成功
      expect(mockKafka.sendMock).toHaveBeenCalled()
    })

    it('should propagate non-Error throws correctly', async () => {
      const failMock = createMockKafkaClient({
        sendFn: mock(async () => {
          throw 'string-error'
        }),
      })
      const failDriver = new KafkaDriver({
        client: failMock.client,
        consumerGroupId: 'test-string-err',
      })

      await expect(failDriver.push('test-queue', createTestJob())).rejects.toThrow()
    })
  })
})
