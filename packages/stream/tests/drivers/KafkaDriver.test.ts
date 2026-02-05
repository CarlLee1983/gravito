import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { KafkaDriver } from '../../src/drivers/KafkaDriver'
import type { SerializedJob } from '../../src/types'

// --- Helper: 建立 mock SerializedJob ---
function createMockJob(overrides: Partial<SerializedJob> = {}): SerializedJob {
  return {
    id: 'job-1',
    type: 'json',
    data: '{"key":"value"}',
    className: 'TestJob',
    createdAt: Date.now(),
    delaySeconds: 0,
    attempts: 0,
    maxAttempts: 3,
    ...overrides,
  }
}

// --- Helper: 建立 mock Kafka client ---
function createMockKafkaClient() {
  const mockProducer = {
    connect: mock(() => Promise.resolve()),
    send: mock(() => Promise.resolve()),
    disconnect: mock(() => Promise.resolve()),
  }

  const mockAdmin = {
    connect: mock(() => Promise.resolve()),
    createTopics: mock(() => Promise.resolve()),
    deleteTopics: mock(() => Promise.resolve()),
    disconnect: mock(() => Promise.resolve()),
  }

  const mockConsumer = {
    connect: mock(() => Promise.resolve()),
    subscribe: mock(() => Promise.resolve()),
    run: mock(() => Promise.resolve()),
    disconnect: mock(() => Promise.resolve()),
  }

  return {
    client: {
      producer: mock(() => mockProducer),
      admin: mock(() => mockAdmin),
      consumer: mock((_args: { groupId: string }) => mockConsumer),
    },
    mockProducer,
    mockAdmin,
    mockConsumer,
  }
}

describe('KafkaDriver', () => {
  let driver: KafkaDriver
  let kafkaMocks: ReturnType<typeof createMockKafkaClient>

  beforeEach(() => {
    kafkaMocks = createMockKafkaClient()
    driver = new KafkaDriver({
      client: kafkaMocks.client,
      consumerGroupId: 'test-group',
    })
  })

  afterEach(() => {
    // 清理 mock 狀態
    kafkaMocks.mockProducer.connect.mockClear()
    kafkaMocks.mockProducer.send.mockClear()
    kafkaMocks.mockAdmin.connect.mockClear()
    kafkaMocks.mockAdmin.createTopics.mockClear()
    kafkaMocks.mockAdmin.deleteTopics.mockClear()
  })

  // --- 建構函式測試 ---
  describe('constructor', () => {
    test('應使用提供的 consumerGroupId 建立實例', () => {
      const d = new KafkaDriver({
        client: kafkaMocks.client,
        consumerGroupId: 'custom-group',
      })
      expect(d).toBeDefined()
    })

    test('應在未提供 consumerGroupId 時使用預設值', () => {
      const d = new KafkaDriver({ client: kafkaMocks.client })
      expect(d).toBeDefined()
    })

    test('應在未提供 client 時拋出錯誤', () => {
      expect(() => new KafkaDriver({ client: null as any })).toThrow(
        '[KafkaDriver] Kafka client is required'
      )
    })

    test('應在 client 為 undefined 時拋出錯誤', () => {
      expect(() => new KafkaDriver({ client: undefined as any })).toThrow(
        '[KafkaDriver] Kafka client is required'
      )
    })
  })

  // --- push 測試 ---
  describe('push', () => {
    test('應將單一 job 推送到 Kafka topic', async () => {
      const job = createMockJob()
      await driver.push('test-topic', job)

      expect(kafkaMocks.client.producer).toHaveBeenCalledTimes(1)
      expect(kafkaMocks.mockProducer.connect).toHaveBeenCalledTimes(1)
      expect(kafkaMocks.mockProducer.send).toHaveBeenCalledTimes(1)

      const sendCall = kafkaMocks.mockProducer.send.mock.calls[0]?.[0] as any
      expect(sendCall.topic).toBe('test-topic')
      expect(sendCall.messages).toHaveLength(1)
      expect(sendCall.messages[0].key).toBe('job-1')

      const payload = JSON.parse(sendCall.messages[0].value)
      expect(payload.id).toBe('job-1')
      expect(payload.type).toBe('json')
      expect(payload.data).toBe('{"key":"value"}')
    })

    test('應在第二次 push 時重複使用已連線的 producer', async () => {
      const job1 = createMockJob({ id: 'job-1' })
      const job2 = createMockJob({ id: 'job-2' })

      await driver.push('topic-a', job1)
      await driver.push('topic-b', job2)

      // producer 只建立一次
      expect(kafkaMocks.client.producer).toHaveBeenCalledTimes(1)
      expect(kafkaMocks.mockProducer.connect).toHaveBeenCalledTimes(1)
      // send 被呼叫兩次
      expect(kafkaMocks.mockProducer.send).toHaveBeenCalledTimes(2)
    })

    test('應序列化包含延遲和重試資訊的 job', async () => {
      const job = createMockJob({
        delaySeconds: 60,
        attempts: 2,
        maxAttempts: 5,
      })

      await driver.push('delayed-topic', job)

      const sendCall = kafkaMocks.mockProducer.send.mock.calls[0]?.[0] as any
      const payload = JSON.parse(sendCall.messages[0].value)
      expect(payload.delaySeconds).toBe(60)
      expect(payload.attempts).toBe(2)
      expect(payload.maxAttempts).toBe(5)
    })
  })

  // --- pop 測試 ---
  describe('pop', () => {
    test('應拋出錯誤因為 Kafka 使用 push-based 模型', async () => {
      await expect(driver.pop('test-topic')).rejects.toThrow(
        '[KafkaDriver] Kafka uses push-based model'
      )
    })
  })

  // --- size 測試 ---
  describe('size', () => {
    test('應始終回傳 0 因為 Kafka 不直接支援 queue size', async () => {
      const result = await driver.size('test-topic')
      expect(result).toBe(0)
    })
  })

  // --- clear 測試 ---
  describe('clear', () => {
    test('應透過刪除 topic 來清空佇列', async () => {
      await driver.clear('test-topic')

      expect(kafkaMocks.client.admin).toHaveBeenCalledTimes(1)
      expect(kafkaMocks.mockAdmin.connect).toHaveBeenCalledTimes(1)
      expect(kafkaMocks.mockAdmin.deleteTopics).toHaveBeenCalledWith({
        topics: ['test-topic'],
      })
    })

    test('應在第二次 clear 時重複使用已連線的 admin', async () => {
      await driver.clear('topic-a')
      await driver.clear('topic-b')

      expect(kafkaMocks.client.admin).toHaveBeenCalledTimes(1)
      expect(kafkaMocks.mockAdmin.connect).toHaveBeenCalledTimes(1)
      expect(kafkaMocks.mockAdmin.deleteTopics).toHaveBeenCalledTimes(2)
    })
  })

  // --- pushMany 測試 ---
  describe('pushMany', () => {
    test('應批次推送多個 jobs 到同一 topic', async () => {
      const jobs = [
        createMockJob({ id: 'job-1' }),
        createMockJob({ id: 'job-2' }),
        createMockJob({ id: 'job-3' }),
      ]

      await driver.pushMany('batch-topic', jobs)

      expect(kafkaMocks.mockProducer.send).toHaveBeenCalledTimes(1)
      const sendCall = kafkaMocks.mockProducer.send.mock.calls[0]?.[0] as any
      expect(sendCall.topic).toBe('batch-topic')
      expect(sendCall.messages).toHaveLength(3)
      expect(sendCall.messages[0].key).toBe('job-1')
      expect(sendCall.messages[1].key).toBe('job-2')
      expect(sendCall.messages[2].key).toBe('job-3')
    })

    test('應在空陣列時提前返回不呼叫 producer', async () => {
      await driver.pushMany('batch-topic', [])

      expect(kafkaMocks.client.producer).not.toHaveBeenCalled()
      expect(kafkaMocks.mockProducer.send).not.toHaveBeenCalled()
    })

    test('應正確序列化每個 job 的 payload', async () => {
      const jobs = [
        createMockJob({ id: 'j1', data: '{"a":1}' }),
        createMockJob({ id: 'j2', data: '{"b":2}' }),
      ]

      await driver.pushMany('batch-topic', jobs)

      const sendCall = kafkaMocks.mockProducer.send.mock.calls[0]?.[0] as any
      const payload1 = JSON.parse(sendCall.messages[0].value)
      const payload2 = JSON.parse(sendCall.messages[1].value)
      expect(payload1.data).toBe('{"a":1}')
      expect(payload2.data).toBe('{"b":2}')
    })
  })

  // --- createTopic 測試 ---
  describe('createTopic', () => {
    test('應使用預設選項建立 topic', async () => {
      await driver.createTopic('new-topic')

      expect(kafkaMocks.mockAdmin.createTopics).toHaveBeenCalledWith({
        topics: [
          {
            topic: 'new-topic',
            numPartitions: 1,
            replicationFactor: 1,
          },
        ],
      })
    })

    test('應使用自訂 partitions 和 replicationFactor', async () => {
      await driver.createTopic('new-topic', {
        partitions: 6,
        replicationFactor: 3,
      })

      expect(kafkaMocks.mockAdmin.createTopics).toHaveBeenCalledWith({
        topics: [
          {
            topic: 'new-topic',
            numPartitions: 6,
            replicationFactor: 3,
          },
        ],
      })
    })

    test('應在 options 為空物件時使用預設值', async () => {
      await driver.createTopic('new-topic', {})

      const call = kafkaMocks.mockAdmin.createTopics.mock.calls[0]?.[0] as any
      expect(call.topics[0].numPartitions).toBe(1)
      expect(call.topics[0].replicationFactor).toBe(1)
    })
  })

  // --- deleteTopic 測試 ---
  describe('deleteTopic', () => {
    test('應刪除指定的 topic', async () => {
      await driver.deleteTopic('old-topic')

      expect(kafkaMocks.mockAdmin.deleteTopics).toHaveBeenCalledWith({
        topics: ['old-topic'],
      })
    })
  })

  // --- subscribe 測試 ---
  describe('subscribe', () => {
    test('應建立 consumer 並訂閱指定 topic', async () => {
      const callback = mock(() => Promise.resolve())

      // 設定 consumer.run 以模擬 eachBatch 行為
      kafkaMocks.mockConsumer.run.mockImplementation(async (args: any) => {
        // 模擬一個 batch 的到達
        const message = {
          key: Buffer.from('job-1'),
          value: Buffer.from(
            JSON.stringify({
              id: 'job-1',
              type: 'json',
              data: '{"test":true}',
              className: 'TestJob',
              createdAt: Date.now(),
              attempts: 0,
              maxAttempts: 3,
            })
          ),
          offset: '0',
        }

        await args.eachBatch({
          batch: { messages: [message] },
          resolveOffset: mock(() => {}),
          heartbeat: mock(() => Promise.resolve()),
          isRunning: () => true,
        })
      })

      await driver.subscribe('sub-topic', callback)

      expect(kafkaMocks.client.consumer).toHaveBeenCalledWith({
        groupId: 'test-group',
      })
      expect(kafkaMocks.mockConsumer.connect).toHaveBeenCalledTimes(1)
      expect(kafkaMocks.mockConsumer.subscribe).toHaveBeenCalledWith({
        topics: ['sub-topic'],
      })
      expect(kafkaMocks.mockConsumer.run).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledTimes(1)
    })

    test('應在 isRunning 回傳 false 時跳過訊息', async () => {
      const callback = mock(() => Promise.resolve())

      kafkaMocks.mockConsumer.run.mockImplementation(async (args: any) => {
        const message = {
          key: Buffer.from('job-1'),
          value: Buffer.from(JSON.stringify({ id: 'job-1' })),
          offset: '0',
        }

        await args.eachBatch({
          batch: { messages: [message] },
          resolveOffset: mock(() => {}),
          heartbeat: mock(() => Promise.resolve()),
          isRunning: () => false,
        })
      })

      await driver.subscribe('sub-topic', callback)
      expect(callback).not.toHaveBeenCalled()
    })

    test('應在訊息 value 為 null 時跳過', async () => {
      const callback = mock(() => Promise.resolve())

      kafkaMocks.mockConsumer.run.mockImplementation(async (args: any) => {
        const message = {
          key: Buffer.from('job-1'),
          value: null,
          offset: '0',
        }

        await args.eachBatch({
          batch: { messages: [message] },
          resolveOffset: mock(() => {}),
          heartbeat: mock(() => Promise.resolve()),
          isRunning: () => true,
        })
      })

      await driver.subscribe('sub-topic', callback)
      expect(callback).not.toHaveBeenCalled()
    })

    test('應在 callback 失敗時繼續處理（不中斷）', async () => {
      const callback = mock(() => Promise.reject(new Error('callback error')))

      kafkaMocks.mockConsumer.run.mockImplementation(async (args: any) => {
        const message = {
          key: Buffer.from('job-1'),
          value: Buffer.from(
            JSON.stringify({
              id: 'job-1',
              type: 'json',
              data: '{}',
              createdAt: Date.now(),
            })
          ),
          offset: '0',
        }

        await args.eachBatch({
          batch: { messages: [message] },
          resolveOffset: mock(() => {}),
          heartbeat: mock(() => Promise.resolve()),
          isRunning: () => true,
        })
      })

      // subscribe 不應因 callback 錯誤而拋出
      await driver.subscribe('sub-topic', callback)
      expect(callback).toHaveBeenCalledTimes(1)
    })
  })
})
