import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
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
    key: Buffer.from(job.id),
    value: Buffer.from(JSON.stringify(job)),
    offset,
    timestamp: String(Date.now()),
  }
}

function createMockKafkaClient(): {
  client: KafkaClientFactory
  simulateMessage: (topic: string, partition: number, message: KafkaMessage) => Promise<void>
} {
  let eachMessageHandler:
    | ((args: { topic: string; partition: number; message: KafkaMessage }) => Promise<void>)
    | null = null

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

/**
 * 存取 KafkaDriver 的內部 errorRecovery 狀態（測試用）。
 */
function getCircuitState(driver: KafkaDriver): string {
  return (driver as any).errorRecovery.getState().circuitState
}

function getConsecutiveFailures(driver: KafkaDriver): number {
  return (driver as any).errorRecovery.getState().consecutiveFailures
}

/**
 * 啟動消費者、填充緩衝區、啟動 subscribe、等待處理、停止。
 */
async function runSubscribeWithCallbacks(
  driver: KafkaDriver,
  mockClient: ReturnType<typeof createMockKafkaClient>,
  queue: string,
  jobs: SerializedJob[],
  callback: (job: SerializedJob) => Promise<void>,
  processTimeMs = 300
): Promise<void> {
  // 啟動消費者以註冊 eachMessageHandler
  await driver.pop(queue)

  // 填充緩衝區
  for (let i = 0; i < jobs.length; i++) {
    const msg = createKafkaMessage(jobs[i], String(i))
    await mockClient.simulateMessage(queue, 0, msg)
  }

  // 啟動 subscribe（背景迴圈消費）
  const subscribePromise = driver.subscribe(queue, callback)

  // 等待回呼處理完成
  await new Promise((resolve) => setTimeout(resolve, processTimeMs))

  // 停止 driver 以終止迴圈
  await driver.disconnect()

  // 等待 subscribe 結束
  await Promise.race([
    subscribePromise.catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, 1000)),
  ])
}

describe('Phase 6F-4: Callback Failure Circuit Integration', () => {
  let driver: KafkaDriver
  let mockClient: ReturnType<typeof createMockKafkaClient>

  beforeEach(() => {
    mockClient = createMockKafkaClient()
    driver = new KafkaDriver({
      client: mockClient.client,
      consumerGroupId: 'test-callback-circuit',
      bufferSize: 100,
      callbackCircuitThreshold: 3,
    })
  })

  afterEach(async () => {
    try {
      await driver.disconnect()
    } catch {
      // 忽略已斷線的錯誤
    }
  })

  describe('回呼失敗計數追蹤', () => {
    it('should initialize with empty callback failure counts', () => {
      const counts = driver.getCallbackFailureCounts()
      expect(counts.size).toBe(0)
    })

    it('should increment failure count on callback error', async () => {
      const jobs = [createTestJob('fail-1')]

      await runSubscribeWithCallbacks(driver, mockClient, 'test-queue', jobs, async () => {
        throw new Error('Callback processing failed')
      })

      const counts = driver.getCallbackFailureCounts()
      const count = counts.get('test-queue') ?? 0
      expect(count).toBeGreaterThanOrEqual(1)
    })

    it('should reset failure count after successful callback', async () => {
      const jobs = Array.from({ length: 4 }, (_, i) => createTestJob(`job-${i}`))
      let callCount = 0

      await runSubscribeWithCallbacks(
        driver,
        mockClient,
        'test-queue',
        jobs,
        async () => {
          callCount++
          // 前 2 次失敗，之後成功
          if (callCount <= 2) {
            throw new Error('Temporary failure')
          }
        },
        500
      )

      // 成功後計數應重置為 0
      const counts = driver.getCallbackFailureCounts()
      const count = counts.get('test-queue') ?? 0
      expect(count).toBe(0)
    })
  })

  describe('電路斷路器觸發', () => {
    it('should not trigger circuit below threshold', async () => {
      // callbackCircuitThreshold = 3，只觸發 2 次失敗
      const jobs = Array.from({ length: 2 }, (_, i) => createTestJob(`fail-${i}`))

      await runSubscribeWithCallbacks(driver, mockClient, 'test-queue', jobs, async () => {
        throw new Error('Callback failed')
      })

      // 電路應保持關閉（2 次失敗 < 閾值 3）
      expect(getCircuitState(driver)).toBe('CLOSED')
    })

    it('should trigger circuit at threshold', async () => {
      // callbackCircuitThreshold = 3，產生足夠訊息以觸發
      const jobs = Array.from({ length: 5 }, (_, i) => createTestJob(`fail-${i}`))

      await runSubscribeWithCallbacks(
        driver,
        mockClient,
        'test-queue',
        jobs,
        async () => {
          throw new Error('Persistent callback failure')
        },
        600
      )

      const counts = driver.getCallbackFailureCounts()
      const failCount = counts.get('test-queue') ?? 0
      // 至少 3 次連續失敗應觸發電路
      expect(failCount).toBeGreaterThanOrEqual(3)
    })

    it('should track failures independently per queue', async () => {
      await driver.pop('queue-a')

      // 填充 queue-a 一個訊息
      const jobA = createTestJob('a-1')
      await mockClient.simulateMessage('queue-a', 0, createKafkaMessage(jobA, '0'))

      // subscribe queue-a 失敗
      const subPromise = driver.subscribe('queue-a', async () => {
        throw new Error('Queue A failure')
      })
      await new Promise((resolve) => setTimeout(resolve, 300))
      await driver.disconnect()
      await Promise.race([subPromise.catch(() => {}), new Promise((r) => setTimeout(r, 500))])

      const counts = driver.getCallbackFailureCounts()
      const countA = counts.get('queue-a') ?? 0
      const countB = counts.get('queue-b') ?? 0

      expect(countA).toBeGreaterThanOrEqual(1)
      expect(countB).toBe(0)
    })

    it('should record errorRecovery success on successful callback', async () => {
      const jobs = [createTestJob('ok-1')]

      await runSubscribeWithCallbacks(
        driver,
        mockClient,
        'test-queue',
        jobs,
        async () => {
          // 成功的回呼
        },
        300
      )

      // 成功回呼應呼叫 errorRecovery.recordSuccess()，電路保持健康
      expect(getCircuitState(driver)).toBe('CLOSED')
      expect(getConsecutiveFailures(driver)).toBe(0)
    })
  })
})
