import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { SQSDriver } from '../../src/drivers/SQSDriver'
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

// --- Mock: @aws-sdk/client-sqs 命令類別 ---
// SQSDriver 使用 dynamic import，因此我們需要透過 mock module 方式處理
// 但因為 Bun 的限制，我們透過直接 mock client.send 行為來測試

// --- Helper: 建立 mock SQS client ---
function createMockSQSClient() {
  return {
    send: mock((_command: unknown) =>
      Promise.resolve({
        MessageId: 'msg-123',
        Messages: [],
      })
    ),
  }
}

describe('SQSDriver', () => {
  let driver: SQSDriver
  let mockClient: ReturnType<typeof createMockSQSClient>

  beforeEach(() => {
    mockClient = createMockSQSClient()
    driver = new SQSDriver({
      client: mockClient,
      queueUrlPrefix: 'https://sqs.us-east-1.amazonaws.com/123456789',
      visibilityTimeout: 30,
      waitTimeSeconds: 5,
    })
  })

  afterEach(() => {
    mockClient.send.mockClear()
  })

  // --- 建構函式測試 ---
  describe('constructor', () => {
    test('應使用提供的設定建立實例', () => {
      const d = new SQSDriver({
        client: mockClient,
        queueUrlPrefix: 'https://sqs.example.com',
        visibilityTimeout: 60,
        waitTimeSeconds: 10,
      })
      expect(d).toBeDefined()
    })

    test('應在未提供可選參數時使用預設值', () => {
      const d = new SQSDriver({ client: mockClient })
      expect(d).toBeDefined()
    })

    test('應在未提供 client 時拋出錯誤', () => {
      expect(() => new SQSDriver({ client: null as any })).toThrow(
        '[SQSDriver] SQS client is required'
      )
    })

    test('應在 client 為 undefined 時拋出錯誤', () => {
      expect(() => new SQSDriver({ client: undefined as any })).toThrow(
        '[SQSDriver] SQS client is required'
      )
    })
  })

  // --- push 測試 ---
  describe('push', () => {
    test('應發送 SendMessageCommand 到正確的 queue URL', async () => {
      const job = createMockJob()
      await driver.push('test-queue', job)

      expect(mockClient.send).toHaveBeenCalledTimes(1)
      const command = mockClient.send.mock.calls[0]?.[0] as any
      expect(command.input.QueueUrl).toBe(
        'https://sqs.us-east-1.amazonaws.com/123456789/test-queue'
      )
      expect(command.input.DelaySeconds).toBe(0)

      const body = JSON.parse(command.input.MessageBody)
      expect(body.id).toBe('job-1')
      expect(body.type).toBe('json')
    })

    test('應設定 DelaySeconds（最大 900 秒）', async () => {
      const job = createMockJob({ delaySeconds: 60 })
      await driver.push('test-queue', job)

      const command = mockClient.send.mock.calls[0]?.[0] as any
      expect(command.input.DelaySeconds).toBe(60)
    })

    test('應將 DelaySeconds 限制在 900 秒以內', async () => {
      const job = createMockJob({ delaySeconds: 1800 })
      await driver.push('test-queue', job)

      const command = mockClient.send.mock.calls[0]?.[0] as any
      expect(command.input.DelaySeconds).toBe(900)
    })

    test('應在 delaySeconds 為 0 時設定 DelaySeconds 為 0', async () => {
      const job = createMockJob({ delaySeconds: 0 })
      await driver.push('test-queue', job)

      const command = mockClient.send.mock.calls[0]?.[0] as any
      expect(command.input.DelaySeconds).toBe(0)
    })

    test('應在未提供 queueUrlPrefix 時直接使用 queue 名稱作為 URL', async () => {
      const d = new SQSDriver({ client: mockClient })
      const job = createMockJob()
      await d.push('https://sqs.custom.com/queue', job)

      const command = mockClient.send.mock.calls[0]?.[0] as any
      expect(command.input.QueueUrl).toBe('https://sqs.custom.com/queue')
    })

    test('應快取已解析的 queue URL', async () => {
      const job1 = createMockJob({ id: 'j1' })
      const job2 = createMockJob({ id: 'j2' })

      await driver.push('cached-queue', job1)
      await driver.push('cached-queue', job2)

      // 兩次呼叫都應使用相同的 queue URL
      const cmd1 = mockClient.send.mock.calls[0]?.[0] as any
      const cmd2 = mockClient.send.mock.calls[1]?.[0] as any
      expect(cmd1.input.QueueUrl).toBe(cmd2.input.QueueUrl)
    })
  })

  // --- pop 測試 ---
  describe('pop', () => {
    test('應在有訊息時回傳 SerializedJob', async () => {
      const jobPayload = {
        id: 'job-1',
        type: 'json',
        data: '{"test":true}',
        className: 'TestJob',
        createdAt: Date.now(),
        attempts: 0,
        maxAttempts: 3,
      }

      mockClient.send.mockImplementation(async (command: any) => {
        if (
          command.constructor?.name === 'ReceiveMessageCommand' ||
          command.input?.MaxNumberOfMessages
        ) {
          return {
            Messages: [
              {
                MessageId: 'sqs-msg-1',
                ReceiptHandle: 'receipt-123',
                Body: JSON.stringify(jobPayload),
              },
            ],
          }
        }
        return {}
      })

      const result = await driver.pop('test-queue')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('job-1')
      expect(result?.type).toBe('json')
      expect(result?.data).toBe('{"test":true}')
      expect((result as any).receiptHandle).toBe('receipt-123')
    })

    test('應在沒有訊息時回傳 null', async () => {
      mockClient.send.mockImplementation(async () => ({
        Messages: [],
      }))

      const result = await driver.pop('empty-queue')
      expect(result).toBeNull()
    })

    test('應在 Messages 為 undefined 時回傳 null', async () => {
      mockClient.send.mockImplementation(async () => ({}))

      const result = await driver.pop('empty-queue')
      expect(result).toBeNull()
    })

    test('應在 payload 缺少 id 時使用 MessageId', async () => {
      mockClient.send.mockImplementation(async () => ({
        Messages: [
          {
            MessageId: 'sqs-fallback-id',
            ReceiptHandle: 'receipt-456',
            Body: JSON.stringify({ type: 'json', data: '{}' }),
          },
        ],
      }))

      const result = await driver.pop('test-queue')
      expect(result).not.toBeNull()
      expect(result?.id).toBe('sqs-fallback-id')
    })
  })

  // --- popMany 測試 ---
  describe('popMany', () => {
    test('應回傳多筆 jobs', async () => {
      mockClient.send.mockImplementation(async () => ({
        Messages: [
          {
            MessageId: 'msg-1',
            ReceiptHandle: 'r1',
            Body: JSON.stringify({ id: 'j1', type: 'json', data: '{}', createdAt: Date.now() }),
          },
          {
            MessageId: 'msg-2',
            ReceiptHandle: 'r2',
            Body: JSON.stringify({ id: 'j2', type: 'json', data: '{}', createdAt: Date.now() }),
          },
        ],
      }))

      const results = await driver.popMany('test-queue', 5)
      expect(results).toHaveLength(2)
      expect(results[0]?.id).toBe('j1')
      expect(results[1]?.id).toBe('j2')
    })

    test('應將 count 限制在 10 以內（SQS 限制）', async () => {
      mockClient.send.mockImplementation(async (command: any) => {
        // 驗證 MaxNumberOfMessages 被限制
        expect(command.input.MaxNumberOfMessages).toBeLessThanOrEqual(10)
        return { Messages: [] }
      })

      await driver.popMany('test-queue', 20)
    })

    test('應在沒有訊息時回傳空陣列', async () => {
      mockClient.send.mockImplementation(async () => ({
        Messages: [],
      }))

      const results = await driver.popMany('test-queue', 5)
      expect(results).toEqual([])
    })

    test('應在 Messages 為 undefined 時回傳空陣列', async () => {
      mockClient.send.mockImplementation(async () => ({}))

      const results = await driver.popMany('test-queue', 5)
      expect(results).toEqual([])
    })
  })

  // --- size 測試 ---
  describe('size', () => {
    test('應回傳近似訊息數量', async () => {
      mockClient.send.mockImplementation(async () => ({
        Attributes: {
          ApproximateNumberOfMessages: '42',
        },
      }))

      const result = await driver.size('test-queue')
      expect(result).toBe(42)
    })

    test('應在 Attributes 缺失時回傳 0', async () => {
      mockClient.send.mockImplementation(async () => ({}))

      const result = await driver.size('test-queue')
      expect(result).toBe(0)
    })

    test('應在 send 失敗時回傳 0', async () => {
      mockClient.send.mockImplementation(async () => {
        throw new Error('AWS Error')
      })

      const result = await driver.size('test-queue')
      expect(result).toBe(0)
    })
  })

  // --- clear 測試 ---
  describe('clear', () => {
    test('應持續接收並刪除訊息直到佇列為空', async () => {
      let callCount = 0

      mockClient.send.mockImplementation(async (command: any) => {
        // 第一次 pop 回傳一筆，第二次回傳空
        if (command.input?.MaxNumberOfMessages) {
          callCount++
          if (callCount === 1) {
            return {
              Messages: [
                {
                  MessageId: 'msg-1',
                  ReceiptHandle: 'receipt-1',
                  Body: JSON.stringify({
                    id: 'j1',
                    type: 'json',
                    data: '{}',
                    createdAt: Date.now(),
                  }),
                },
              ],
            }
          }
          return { Messages: [] }
        }
        // DeleteMessageCommand
        return {}
      })

      await driver.clear('test-queue')
      // 至少呼叫了 ReceiveMessage + DeleteMessage + ReceiveMessage（空）
      expect(mockClient.send.mock.calls.length).toBeGreaterThanOrEqual(2)
    })

    test('應在佇列已為空時立即返回', async () => {
      mockClient.send.mockImplementation(async () => ({
        Messages: [],
      }))

      await driver.clear('empty-queue')
      // 只有一次 ReceiveMessage 呼叫
      expect(mockClient.send).toHaveBeenCalledTimes(1)
    })
  })

  // --- pushMany 測試 ---
  describe('pushMany', () => {
    test('應批次發送多個 jobs', async () => {
      const jobs = [
        createMockJob({ id: 'j1' }),
        createMockJob({ id: 'j2' }),
        createMockJob({ id: 'j3' }),
      ]

      await driver.pushMany('test-queue', jobs)

      expect(mockClient.send).toHaveBeenCalledTimes(1)
      const command = mockClient.send.mock.calls[0]?.[0] as any
      expect(command.input.Entries).toHaveLength(3)
    })

    test('應在空陣列時提前返回', async () => {
      await driver.pushMany('test-queue', [])
      expect(mockClient.send).not.toHaveBeenCalled()
    })

    test('應在超過 10 筆時分批發送', async () => {
      const jobs = Array.from({ length: 15 }, (_, i) => createMockJob({ id: `j${i}` }))

      await driver.pushMany('test-queue', jobs)

      // 15 筆應分成 2 批（10 + 5）
      expect(mockClient.send).toHaveBeenCalledTimes(2)

      const batch1 = (mockClient.send.mock.calls[0]?.[0] as any).input.Entries
      const batch2 = (mockClient.send.mock.calls[1]?.[0] as any).input.Entries
      expect(batch1).toHaveLength(10)
      expect(batch2).toHaveLength(5)
    })

    test('應為每個 job 設定正確的 DelaySeconds', async () => {
      const jobs = [
        createMockJob({ id: 'j1', delaySeconds: 120 }),
        createMockJob({ id: 'j2', delaySeconds: 2000 }), // 超過 900
        createMockJob({ id: 'j3', delaySeconds: 0 }),
      ]

      await driver.pushMany('test-queue', jobs)

      const entries = (mockClient.send.mock.calls[0]?.[0] as any).input.Entries
      expect(entries[0].DelaySeconds).toBe(120)
      expect(entries[1].DelaySeconds).toBe(900) // 被限制
      expect(entries[2].DelaySeconds).toBe(0)
    })
  })

  // --- acknowledge 測試 ---
  describe('acknowledge', () => {
    test('應拋出錯誤因為 SQS 需要 ReceiptHandle', async () => {
      await expect(driver.acknowledge('msg-123')).rejects.toThrow(
        '[SQSDriver] Use deleteMessage() with ReceiptHandle instead of acknowledge()'
      )
    })
  })

  // --- deleteMessage 測試 ---
  describe('deleteMessage', () => {
    test('應發送 DeleteMessageCommand', async () => {
      await driver.deleteMessage('test-queue', 'receipt-abc')

      expect(mockClient.send).toHaveBeenCalledTimes(1)
      const command = mockClient.send.mock.calls[0]?.[0] as any
      expect(command.input.QueueUrl).toBe(
        'https://sqs.us-east-1.amazonaws.com/123456789/test-queue'
      )
      expect(command.input.ReceiptHandle).toBe('receipt-abc')
    })
  })
})
