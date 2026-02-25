import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { BatchProcessor } from '../../../../src/drivers/kafka/BatchProcessor'
import { MessageBuffer } from '../../../../src/drivers/kafka/MessageBuffer'
import type { BufferedMessage, KafkaProducerClient } from '../../../../src/drivers/kafka/types'
import type { SerializedJob } from '../../../../src/types'

// 輔助函數
function createJob(id: string, groupId?: string): SerializedJob {
  return {
    id,
    type: 'json',
    data: JSON.stringify({ value: id }),
    createdAt: Date.now(),
    groupId,
  }
}

function createBufferedMessage(
  id: string,
  topic: string,
  partition = 0,
  offset = '0'
): BufferedMessage {
  return {
    job: createJob(id),
    topic,
    partition,
    offset,
    timestamp: Date.now(),
    acknowledged: false,
  }
}

function createMockProducer(): KafkaProducerClient {
  const sendCalls: Array<{
    topic: string
    messages: Array<{ key: string; value: string | Buffer }>
  }> = []

  return {
    connect: mock(() => Promise.resolve()),
    send: mock(async (args) => {
      sendCalls.push(args)
      return args.messages.map((_: unknown, i: number) => ({
        topicName: args.topic,
        partition: 0,
        errorCode: 0,
        offset: String(i),
      }))
    }),
    disconnect: mock(() => Promise.resolve()),
    _sendCalls: sendCalls,
  } as unknown as KafkaProducerClient & { _sendCalls: typeof sendCalls }
}

describe('BatchProcessor', () => {
  let processor: BatchProcessor

  beforeEach(() => {
    processor = new BatchProcessor()
  })

  describe('Initialization', () => {
    test('should use default config values', () => {
      const config = processor.getConfig()
      expect(config.maxBatchSize).toBe(100)
      expect(config.batchLingerMs).toBe(50)
      expect(config.concurrency).toBe(3)
      expect(config.enablePipeline).toBe(true)
    })

    test('should accept custom config', () => {
      const custom = new BatchProcessor({
        maxBatchSize: 50,
        batchLingerMs: 100,
        concurrency: 5,
        enablePipeline: false,
      })
      const config = custom.getConfig()
      expect(config.maxBatchSize).toBe(50)
      expect(config.batchLingerMs).toBe(100)
      expect(config.concurrency).toBe(5)
      expect(config.enablePipeline).toBe(false)
    })

    test('should handle partial config', () => {
      const partial = new BatchProcessor({ maxBatchSize: 25 })
      const config = partial.getConfig()
      expect(config.maxBatchSize).toBe(25)
      expect(config.concurrency).toBe(3) // 預設值
    })
  })

  describe('pushBatches', () => {
    test('should handle empty jobs array', async () => {
      const producer = createMockProducer()
      await processor.pushBatches(producer, 'test', [], JSON.stringify)
      expect(producer.send).not.toHaveBeenCalled()
    })

    test('should send single batch when under maxBatchSize', async () => {
      const producer = createMockProducer() as KafkaProducerClient & {
        _sendCalls: Array<{ topic: string; messages: unknown[] }>
      }
      const jobs = [createJob('1'), createJob('2'), createJob('3')]

      await processor.pushBatches(producer, 'test-topic', jobs, JSON.stringify)

      expect(producer.send).toHaveBeenCalledTimes(1)
      expect(producer._sendCalls[0].topic).toBe('test-topic')
      expect(producer._sendCalls[0].messages.length).toBe(3)
    })

    test('should split into multiple batches', async () => {
      const small = new BatchProcessor({ maxBatchSize: 2 })
      const producer = createMockProducer()
      const jobs = [createJob('1'), createJob('2'), createJob('3'), createJob('4'), createJob('5')]

      await small.pushBatches(producer, 'test', jobs, JSON.stringify)

      expect(producer.send).toHaveBeenCalledTimes(3) // 2+2+1
    })

    test('should use job.groupId as key when available', async () => {
      const producer = createMockProducer() as KafkaProducerClient & {
        _sendCalls: Array<{
          topic: string
          messages: Array<{ key: string; value: string }>
        }>
      }
      const jobs = [createJob('id-1', 'group-A')]

      await processor.pushBatches(producer, 'test', jobs, JSON.stringify)

      expect(producer._sendCalls[0].messages[0].key).toBe('group-A')
    })

    test('should use job.id as key when groupId not available', async () => {
      const producer = createMockProducer() as KafkaProducerClient & {
        _sendCalls: Array<{
          topic: string
          messages: Array<{ key: string; value: string }>
        }>
      }
      const jobs = [createJob('id-1')]

      await processor.pushBatches(producer, 'test', jobs, JSON.stringify)

      expect(producer._sendCalls[0].messages[0].key).toBe('id-1')
    })

    test('should use custom serialize function', async () => {
      const producer = createMockProducer() as KafkaProducerClient & {
        _sendCalls: Array<{
          topic: string
          messages: Array<{ key: string; value: string }>
        }>
      }
      const jobs = [createJob('1')]
      const customSerialize = (job: SerializedJob) => `custom:${job.id}`

      await processor.pushBatches(producer, 'test', jobs, customSerialize)

      expect(producer._sendCalls[0].messages[0].value).toBe('custom:1')
    })

    test('should run sequentially when pipeline is disabled', async () => {
      const sequential = new BatchProcessor({
        maxBatchSize: 2,
        enablePipeline: false,
      })
      const callOrder: number[] = []
      let callCount = 0
      const producer = {
        connect: mock(() => Promise.resolve()),
        send: mock(async () => {
          const idx = callCount++
          callOrder.push(idx)
          await new Promise((r) => setTimeout(r, 10))
          return [{ topicName: 'test', partition: 0, errorCode: 0, offset: '0' }]
        }),
        disconnect: mock(() => Promise.resolve()),
      } as unknown as KafkaProducerClient
      const jobs = [createJob('1'), createJob('2'), createJob('3'), createJob('4')]

      await sequential.pushBatches(producer, 'test', jobs, JSON.stringify)

      expect(callOrder).toEqual([0, 1])
    })

    test('should run in parallel when pipeline is enabled', async () => {
      const parallel = new BatchProcessor({
        maxBatchSize: 1,
        concurrency: 3,
        enablePipeline: true,
      })
      let maxConcurrent = 0
      let current = 0
      const producer = {
        connect: mock(() => Promise.resolve()),
        send: mock(async () => {
          current++
          maxConcurrent = Math.max(maxConcurrent, current)
          await new Promise((r) => setTimeout(r, 20))
          current--
          return [{ topicName: 'test', partition: 0, errorCode: 0, offset: '0' }]
        }),
        disconnect: mock(() => Promise.resolve()),
      } as unknown as KafkaProducerClient
      const jobs = [createJob('1'), createJob('2'), createJob('3'), createJob('4'), createJob('5')]

      await parallel.pushBatches(producer, 'test', jobs, JSON.stringify)

      expect(maxConcurrent).toBeGreaterThan(1)
      expect(maxConcurrent).toBeLessThanOrEqual(3)
    })

    test('should enforce concurrency limit', async () => {
      const limited = new BatchProcessor({
        maxBatchSize: 1,
        concurrency: 2,
        enablePipeline: true,
      })
      let maxConcurrent = 0
      let current = 0
      const producer = {
        connect: mock(() => Promise.resolve()),
        send: mock(async () => {
          current++
          maxConcurrent = Math.max(maxConcurrent, current)
          await new Promise((r) => setTimeout(r, 30))
          current--
          return [{ topicName: 'test', partition: 0, errorCode: 0, offset: '0' }]
        }),
        disconnect: mock(() => Promise.resolve()),
      } as unknown as KafkaProducerClient
      const jobs = Array.from({ length: 6 }, (_, i) => createJob(String(i)))

      await limited.pushBatches(producer, 'test', jobs, JSON.stringify)

      expect(maxConcurrent).toBeLessThanOrEqual(2)
    })

    test('should propagate send errors', async () => {
      const producer = {
        connect: mock(() => Promise.resolve()),
        send: mock(async () => {
          throw new Error('Send failed')
        }),
        disconnect: mock(() => Promise.resolve()),
      } as unknown as KafkaProducerClient

      await expect(
        processor.pushBatches(producer, 'test', [createJob('1')], JSON.stringify)
      ).rejects.toThrow('Send failed')
    })
  })

  describe('collectBatch', () => {
    test('should return immediately when batch is full', async () => {
      const small = new BatchProcessor({ maxBatchSize: 3 })
      const buffer = new MessageBuffer(100)

      for (let i = 0; i < 5; i++) {
        buffer.enqueue('test', createBufferedMessage(String(i), 'test', 0, String(i)))
      }

      const batch = await small.collectBatch(buffer, 'test', 5000)
      expect(batch.length).toBe(3)
      expect(buffer.size('test')).toBe(2) // 剩餘 2 個
    })

    test('should return partial batch when buffer has fewer messages', async () => {
      const buffer = new MessageBuffer(100)
      buffer.enqueue('test', createBufferedMessage('1', 'test'))
      buffer.enqueue('test', createBufferedMessage('2', 'test'))

      const batch = await processor.collectBatch(buffer, 'test', 100)
      expect(batch.length).toBe(2)
    })

    test('should return empty batch when buffer is empty', async () => {
      const buffer = new MessageBuffer(100)
      const batch = await processor.collectBatch(buffer, 'test', 50)
      expect(batch.length).toBe(0)
    })

    test('should wait for linger time and collect arriving messages', async () => {
      const linger = new BatchProcessor({
        maxBatchSize: 5,
        batchLingerMs: 200,
      })
      const buffer = new MessageBuffer(100)

      // 先放 1 個
      buffer.enqueue('test', createBufferedMessage('1', 'test'))

      // 50ms 後再放 1 個
      setTimeout(() => {
        buffer.enqueue('test', createBufferedMessage('2', 'test'))
      }, 30)

      const batch = await linger.collectBatch(buffer, 'test', 5000)
      expect(batch.length).toBeGreaterThanOrEqual(1)
    })

    test('should respect maxWaitMs limit', async () => {
      const linger = new BatchProcessor({
        maxBatchSize: 100,
        batchLingerMs: 5000, // 長 linger
      })
      const buffer = new MessageBuffer(100)

      const start = Date.now()
      const batch = await linger.collectBatch(buffer, 'test', 100) // 短 maxWait
      const elapsed = Date.now() - start

      expect(batch.length).toBe(0)
      expect(elapsed).toBeLessThan(300)
    })
  })

  describe('processBatch', () => {
    test('should process all messages successfully', async () => {
      const messages = [
        createBufferedMessage('1', 'test'),
        createBufferedMessage('2', 'test'),
        createBufferedMessage('3', 'test'),
      ]
      const callback = mock(async () => {})

      const result = await processor.processBatch(messages, callback, {
        concurrency: 2,
        timeoutMs: 5000,
      })

      expect(result.succeeded.length).toBe(3)
      expect(result.failed.length).toBe(0)
      expect(callback).toHaveBeenCalledTimes(3)
    })

    test('should handle all failures', async () => {
      const messages = [createBufferedMessage('1', 'test'), createBufferedMessage('2', 'test')]
      const callback = mock(async () => {
        throw new Error('Processing error')
      })

      const result = await processor.processBatch(messages, callback, {
        concurrency: 1,
        timeoutMs: 5000,
      })

      expect(result.succeeded.length).toBe(0)
      expect(result.failed.length).toBe(2)
      expect(result.failed[0].error.message).toBe('Processing error')
    })

    test('should handle mixed success and failure', async () => {
      const messages = [
        createBufferedMessage('ok-1', 'test'),
        createBufferedMessage('fail-1', 'test'),
        createBufferedMessage('ok-2', 'test'),
      ]
      const callback = mock(async (job: SerializedJob) => {
        if (job.id.startsWith('fail')) {
          throw new Error('Failed')
        }
      })

      const result = await processor.processBatch(messages, callback, {
        concurrency: 1,
        timeoutMs: 5000,
      })

      expect(result.succeeded).toContain('ok-1')
      expect(result.succeeded).toContain('ok-2')
      expect(result.failed.length).toBe(1)
      expect(result.failed[0].id).toBe('fail-1')
    })

    test('should enforce concurrency limit', async () => {
      let maxConcurrent = 0
      let current = 0

      const messages = Array.from({ length: 6 }, (_, i) => createBufferedMessage(String(i), 'test'))
      const callback = mock(async () => {
        current++
        maxConcurrent = Math.max(maxConcurrent, current)
        await new Promise((r) => setTimeout(r, 20))
        current--
      })

      await processor.processBatch(messages, callback, { concurrency: 2, timeoutMs: 5000 })

      expect(maxConcurrent).toBeLessThanOrEqual(2)
    })

    test('should handle callback timeout', async () => {
      const messages = [createBufferedMessage('slow', 'test')]
      const callback = mock(async () => {
        await new Promise((r) => setTimeout(r, 500))
      })

      const result = await processor.processBatch(messages, callback, {
        concurrency: 1,
        timeoutMs: 50,
      })

      expect(result.failed.length).toBe(1)
      expect(result.failed[0].error.message).toBe('Callback timeout')
    })

    test('should handle empty messages array', async () => {
      const callback = mock(async () => {})

      const result = await processor.processBatch([], callback, { concurrency: 1, timeoutMs: 5000 })

      expect(result.succeeded.length).toBe(0)
      expect(result.failed.length).toBe(0)
      expect(callback).not.toHaveBeenCalled()
    })

    test('should track correct job IDs in results', async () => {
      const messages = [
        createBufferedMessage('alpha', 'test'),
        createBufferedMessage('beta', 'test'),
        createBufferedMessage('gamma', 'test'),
      ]
      const callback = mock(async () => {})

      const result = await processor.processBatch(messages, callback, {
        concurrency: 3,
        timeoutMs: 5000,
      })

      expect(result.succeeded).toEqual(['alpha', 'beta', 'gamma'])
    })

    test('should handle non-Error throws as wrapped errors', async () => {
      const messages = [createBufferedMessage('1', 'test')]
      const callback = mock(async () => {
        throw 'string error'
      })

      const result = await processor.processBatch(messages, callback, {
        concurrency: 1,
        timeoutMs: 5000,
      })

      expect(result.failed[0].error.message).toBe('string error')
    })
  })

  describe('Edge cases', () => {
    test('should handle single batch not using pipeline', async () => {
      const producer = createMockProducer()
      const jobs = [createJob('1')]

      // 單一批次即使啟用管線也應該直接發送
      await processor.pushBatches(producer, 'test', jobs, JSON.stringify)

      expect(producer.send).toHaveBeenCalledTimes(1)
    })

    test('should handle exact batch size division', async () => {
      const exact = new BatchProcessor({ maxBatchSize: 3 })
      const producer = createMockProducer()
      const jobs = [
        createJob('1'),
        createJob('2'),
        createJob('3'),
        createJob('4'),
        createJob('5'),
        createJob('6'),
      ]

      await exact.pushBatches(producer, 'test', jobs, JSON.stringify)

      expect(producer.send).toHaveBeenCalledTimes(2) // 3+3
    })

    test('should handle large batch count with concurrency', async () => {
      const large = new BatchProcessor({
        maxBatchSize: 1,
        concurrency: 5,
        enablePipeline: true,
      })
      let sendCount = 0
      const producer = {
        connect: mock(() => Promise.resolve()),
        send: mock(async () => {
          sendCount++
          return [{ topicName: 'test', partition: 0, errorCode: 0, offset: '0' }]
        }),
        disconnect: mock(() => Promise.resolve()),
      } as unknown as KafkaProducerClient

      const jobs = Array.from({ length: 20 }, (_, i) => createJob(String(i)))
      await large.pushBatches(producer, 'test', jobs, JSON.stringify)

      expect(sendCount).toBe(20)
    })
  })
})
