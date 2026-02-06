import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { RabbitMQDriver } from '../../src/drivers/RabbitMQDriver'
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

// --- Helper: 建立 mock AMQP channel ---
function createMockChannel() {
  return {
    assertQueue: mock(() =>
      Promise.resolve({ queue: 'test-queue', messageCount: 0, consumerCount: 0 })
    ),
    assertExchange: mock(() => Promise.resolve()),
    bindQueue: mock(() => Promise.resolve()),
    sendToQueue: mock(() => true),
    publish: mock(() => true),
    get: mock(() => Promise.resolve(null)),
    ack: mock(() => {}),
    nack: mock(() => {}),
    reject: mock(() => {}),
    consume: mock(() => Promise.resolve({ consumerTag: 'tag-1' })),
    prefetch: mock(() => Promise.resolve()),
    checkQueue: mock(() =>
      Promise.resolve({ queue: 'test-queue', messageCount: 5, consumerCount: 1 })
    ),
    purgeQueue: mock(() => Promise.resolve({ messageCount: 5 })),
  }
}

// --- Helper: 建立 mock AMQP connection ---
function createMockConnection(channel: ReturnType<typeof createMockChannel>) {
  return {
    createChannel: mock(() => Promise.resolve(channel)),
  }
}

describe('RabbitMQDriver', () => {
  let driver: RabbitMQDriver
  let mockChannel: ReturnType<typeof createMockChannel>
  let mockConnection: ReturnType<typeof createMockConnection>

  beforeEach(() => {
    mockChannel = createMockChannel()
    mockConnection = createMockConnection(mockChannel)
    driver = new RabbitMQDriver({
      client: mockConnection,
    })
  })

  afterEach(() => {
    // 清理所有 mock
    for (const fn of Object.values(mockChannel)) {
      if (typeof fn === 'function' && 'mockClear' in fn) {
        ;(fn as any).mockClear()
      }
    }
    mockConnection.createChannel.mockClear()
  })

  // --- 建構函式測試 ---
  describe('constructor', () => {
    test('應使用 connection 建立實例', () => {
      const d = new RabbitMQDriver({ client: mockConnection })
      expect(d).toBeDefined()
    })

    test('應在未提供 client 時拋出錯誤', () => {
      expect(() => new RabbitMQDriver({ client: null })).toThrow(
        '[RabbitMQDriver] RabbitMQ connection is required'
      )
    })

    test('應在 client 為 undefined 時拋出錯誤', () => {
      expect(() => new RabbitMQDriver({ client: undefined })).toThrow(
        '[RabbitMQDriver] RabbitMQ connection is required'
      )
    })

    test('應支援 exchange 設定', () => {
      const d = new RabbitMQDriver({
        client: mockConnection,
        exchange: 'test-exchange',
        exchangeType: 'direct',
      })
      expect(d).toBeDefined()
    })

    test('應使用預設 exchangeType 為 fanout', () => {
      const d = new RabbitMQDriver({
        client: mockConnection,
        exchange: 'test-exchange',
      })
      expect(d).toBeDefined()
    })
  })

  // --- ensureChannel 測試 ---
  describe('ensureChannel', () => {
    test('應從 connection 建立 channel', async () => {
      const channel = await driver.ensureChannel()
      expect(mockConnection.createChannel).toHaveBeenCalledTimes(1)
      expect(channel).toBeDefined()
    })

    test('應在第二次呼叫時重複使用已存在的 channel', async () => {
      await driver.ensureChannel()
      await driver.ensureChannel()
      expect(mockConnection.createChannel).toHaveBeenCalledTimes(1)
    })

    test('應在 client 本身就是 channel 時直接使用', async () => {
      // 如果 client 沒有 createChannel 方法，就當作 channel 使用
      const directChannel = createMockChannel()
      const d = new RabbitMQDriver({ client: directChannel })

      const channel = await d.ensureChannel()
      expect(channel).toBe(directChannel)
    })

    test('應在設定 exchange 時自動 assert exchange', async () => {
      const d = new RabbitMQDriver({
        client: mockConnection,
        exchange: 'my-exchange',
        exchangeType: 'topic',
      })

      await d.ensureChannel()
      expect(mockChannel.assertExchange).toHaveBeenCalledWith('my-exchange', 'topic', {
        durable: true,
      })
    })
  })

  // --- getRawConnection 測試 ---
  describe('getRawConnection', () => {
    test('應回傳原始 connection 物件', () => {
      expect(driver.getRawConnection()).toBe(mockConnection)
    })
  })

  // --- push 測試（無 exchange） ---
  describe('push (without exchange)', () => {
    test('應使用 sendToQueue 推送 job', async () => {
      const job = createMockJob()
      await driver.push('test-queue', job)

      expect(mockChannel.assertQueue).toHaveBeenCalledWith('test-queue', { durable: true })
      expect(mockChannel.sendToQueue).toHaveBeenCalledTimes(1)

      const args = mockChannel.sendToQueue.mock.calls[0]!
      expect(args[0]).toBe('test-queue')
      expect(args[2]).toEqual({ persistent: true })

      const payload = JSON.parse(args[1].toString())
      expect(payload.id).toBe('job-1')
      expect(payload.type).toBe('json')
    })

    test('應將 job 序列化為 Buffer', async () => {
      const job = createMockJob()
      await driver.push('test-queue', job)

      const bufferArg = mockChannel.sendToQueue.mock.calls[0]?.[1]
      expect(Buffer.isBuffer(bufferArg)).toBe(true)
    })
  })

  // --- push 測試（有 exchange） ---
  describe('push (with exchange)', () => {
    let exchangeDriver: RabbitMQDriver

    beforeEach(() => {
      exchangeDriver = new RabbitMQDriver({
        client: mockConnection,
        exchange: 'my-exchange',
        exchangeType: 'fanout',
      })
    })

    test('應使用 publish 推送到 exchange', async () => {
      const job = createMockJob()
      await exchangeDriver.push('test-queue', job)

      expect(mockChannel.assertQueue).toHaveBeenCalledWith('test-queue', { durable: true })
      expect(mockChannel.bindQueue).toHaveBeenCalledWith('test-queue', 'my-exchange', '')
      expect(mockChannel.publish).toHaveBeenCalledTimes(1)

      const publishArgs = mockChannel.publish.mock.calls[0]!
      expect(publishArgs[0]).toBe('my-exchange')
      expect(publishArgs[1]).toBe('')
      expect(publishArgs[3]).toEqual({ persistent: true })
    })
  })

  // --- pop 測試 ---
  describe('pop', () => {
    test('應在有訊息時回傳 SerializedJob', async () => {
      const jobPayload = createMockJob()
      mockChannel.get.mockImplementation(async () => ({
        content: Buffer.from(JSON.stringify(jobPayload)),
        fields: { deliveryTag: 1 },
        properties: {},
      }))

      const result = await driver.pop('test-queue')

      expect(mockChannel.assertQueue).toHaveBeenCalledWith('test-queue', { durable: true })
      expect(mockChannel.get).toHaveBeenCalledWith('test-queue', { noAck: false })
      expect(result).not.toBeNull()
      expect(result?.id).toBe('job-1')
      expect(result?.type).toBe('json')
      expect((result as any)._raw).toBeDefined()
    })

    test('應在佇列為空時回傳 null', async () => {
      mockChannel.get.mockImplementation(async () => false)

      const result = await driver.pop('empty-queue')
      expect(result).toBeNull()
    })

    test('應在回傳 null（falsy）時回傳 null', async () => {
      mockChannel.get.mockImplementation(async () => null)

      const result = await driver.pop('empty-queue')
      expect(result).toBeNull()
    })
  })

  // --- popMany 測試 ---
  describe('popMany', () => {
    test('應回傳指定數量的 jobs', async () => {
      let callCount = 0
      mockChannel.get.mockImplementation(async () => {
        callCount++
        if (callCount <= 3) {
          return {
            content: Buffer.from(JSON.stringify(createMockJob({ id: `job-${callCount}` }))),
            fields: { deliveryTag: callCount },
            properties: {},
          }
        }
        return false
      })

      const results = await driver.popMany('test-queue', 3)
      expect(results).toHaveLength(3)
      expect(results[0]?.id).toBe('job-1')
      expect(results[1]?.id).toBe('job-2')
      expect(results[2]?.id).toBe('job-3')
    })

    test('應在佇列提早變空時回傳已取得的 jobs', async () => {
      let callCount = 0
      mockChannel.get.mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          return {
            content: Buffer.from(JSON.stringify(createMockJob({ id: 'only-job' }))),
            fields: { deliveryTag: 1 },
            properties: {},
          }
        }
        return false
      })

      const results = await driver.popMany('test-queue', 5)
      expect(results).toHaveLength(1)
      expect(results[0]?.id).toBe('only-job')
    })

    test('應在佇列為空時回傳空陣列', async () => {
      mockChannel.get.mockImplementation(async () => false)

      const results = await driver.popMany('empty-queue', 3)
      expect(results).toEqual([])
    })

    test('每個回傳的 job 都應附帶 _raw 屬性', async () => {
      mockChannel.get.mockImplementation(async () => ({
        content: Buffer.from(JSON.stringify(createMockJob())),
        fields: { deliveryTag: 1 },
        properties: {},
      }))

      // 只取一筆讓 mock 不用處理多次
      const results = await driver.popMany('test-queue', 1)
      expect(results).toHaveLength(1)
      expect((results[0] as any)._raw).toBeDefined()
    })
  })

  // --- acknowledge 測試 ---
  describe('acknowledge', () => {
    test('應在傳入物件時呼叫 channel.ack', async () => {
      const rawMsg = { fields: { deliveryTag: 1 }, content: Buffer.from('{}'), properties: {} }
      await driver.acknowledge(rawMsg as any)

      expect(mockChannel.ack).toHaveBeenCalledWith(rawMsg)
    })

    test('應在傳入字串時不呼叫 channel.ack', async () => {
      await driver.acknowledge('string-id')
      expect(mockChannel.ack).not.toHaveBeenCalled()
    })
  })

  // --- nack 測試 ---
  describe('nack', () => {
    test('應呼叫 channel.nack 並預設 requeue 為 true', async () => {
      const rawMsg = { fields: { deliveryTag: 1 } }
      await driver.nack(rawMsg)

      expect(mockChannel.nack).toHaveBeenCalledWith(rawMsg, false, true)
    })

    test('應支援 requeue 為 false', async () => {
      const rawMsg = { fields: { deliveryTag: 1 } }
      await driver.nack(rawMsg, false)

      expect(mockChannel.nack).toHaveBeenCalledWith(rawMsg, false, false)
    })
  })

  // --- reject 測試 ---
  describe('reject', () => {
    test('應呼叫 channel.reject 並預設 requeue 為 true', async () => {
      const rawMsg = { fields: { deliveryTag: 1 } }
      await driver.reject(rawMsg)

      expect(mockChannel.reject).toHaveBeenCalledWith(rawMsg, true)
    })

    test('應支援 requeue 為 false', async () => {
      const rawMsg = { fields: { deliveryTag: 1 } }
      await driver.reject(rawMsg, false)

      expect(mockChannel.reject).toHaveBeenCalledWith(rawMsg, false)
    })
  })

  // --- subscribe 測試 ---
  describe('subscribe', () => {
    test('應訂閱佇列並處理訊息（autoAck 預設為 true）', async () => {
      const callback = mock(() => Promise.resolve())

      mockChannel.consume.mockImplementation(
        async (_queue: string, handler: any, _options: any) => {
          // 模擬一則訊息到達
          const msg = {
            content: Buffer.from(
              JSON.stringify({
                id: 'sub-job-1',
                type: 'json',
                data: '{"subscribed":true}',
                createdAt: Date.now(),
              })
            ),
            fields: { deliveryTag: 1 },
            properties: {},
          }
          await handler(msg)
          return { consumerTag: 'tag-1' }
        }
      )

      await driver.subscribe('sub-queue', callback)

      expect(mockChannel.assertQueue).toHaveBeenCalledWith('sub-queue', { durable: true })
      expect(mockChannel.consume).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledTimes(1)

      const callbackArg = callback.mock.calls[0]?.[0] as SerializedJob
      expect(callbackArg.id).toBe('sub-job-1')
      // autoAck = true，所以 ack 應該被呼叫
      expect(mockChannel.ack).toHaveBeenCalledTimes(1)
    })

    test('應支援 prefetch 選項', async () => {
      await driver.subscribe('sub-queue', async () => {}, { prefetch: 10 })

      expect(mockChannel.prefetch).toHaveBeenCalledWith(10)
    })

    test('應在設定 exchange 時 bind queue', async () => {
      const exchangeDriver = new RabbitMQDriver({
        client: mockConnection,
        exchange: 'my-exchange',
      })

      await exchangeDriver.subscribe('sub-queue', async () => {})

      expect(mockChannel.bindQueue).toHaveBeenCalledWith('sub-queue', 'my-exchange', '')
    })

    test('應在 msg 為 null 時不呼叫 callback', async () => {
      const callback = mock(() => Promise.resolve())

      mockChannel.consume.mockImplementation(async (_queue: string, handler: any) => {
        await handler(null)
        return { consumerTag: 'tag-1' }
      })

      await driver.subscribe('sub-queue', callback)
      expect(callback).not.toHaveBeenCalled()
      expect(mockChannel.ack).not.toHaveBeenCalled()
    })

    test('應在 autoAck 為 false 時不自動 ack', async () => {
      const callback = mock(() => Promise.resolve())

      mockChannel.consume.mockImplementation(async (_queue: string, handler: any) => {
        const msg = {
          content: Buffer.from(JSON.stringify(createMockJob())),
          fields: { deliveryTag: 1 },
          properties: {},
        }
        await handler(msg)
        return { consumerTag: 'tag-1' }
      })

      await driver.subscribe('sub-queue', callback, { autoAck: false })

      expect(callback).toHaveBeenCalledTimes(1)
      expect(mockChannel.ack).not.toHaveBeenCalled()
    })
  })

  // --- size 測試 ---
  describe('size', () => {
    test('應回傳佇列中的訊息數量', async () => {
      mockChannel.checkQueue.mockImplementation(async () => ({
        queue: 'test-queue',
        messageCount: 42,
        consumerCount: 2,
      }))

      const result = await driver.size('test-queue')
      expect(result).toBe(42)
    })

    test('應在佇列為空時回傳 0', async () => {
      mockChannel.checkQueue.mockImplementation(async () => ({
        queue: 'test-queue',
        messageCount: 0,
        consumerCount: 0,
      }))

      const result = await driver.size('test-queue')
      expect(result).toBe(0)
    })
  })

  // --- clear 測試 ---
  describe('clear', () => {
    test('應呼叫 purgeQueue 清空佇列', async () => {
      await driver.clear('test-queue')

      expect(mockChannel.purgeQueue).toHaveBeenCalledWith('test-queue')
    })
  })
})
