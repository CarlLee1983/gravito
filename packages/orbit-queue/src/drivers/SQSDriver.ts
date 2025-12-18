import type { SerializedJob } from '../types'
import type { QueueDriver } from './QueueDriver'

/**
 * SQS Driver 配置
 */
export interface SQSDriverConfig {
  /**
   * SQS 客戶端實例（@aws-sdk/client-sqs）
   */
  client: {
    send: (command: unknown) => Promise<{
      MessageId?: string
      Messages?: Array<{
        MessageId?: string
        ReceiptHandle?: string
        Body?: string
      }>
    }>
  }

  /**
   * 隊列 URL 前綴（用於構建完整的隊列 URL）
   */
  queueUrlPrefix?: string

  /**
   * 可見性超時（秒，預設：30）
   */
  visibilityTimeout?: number

  /**
   * 長輪詢時間（秒，預設：20）
   */
  waitTimeSeconds?: number
}

/**
 * SQS Driver
 *
 * 使用 AWS SQS 作為隊列儲存。
 * 支援標準隊列和 FIFO 隊列、長輪詢、死信隊列等企業級功能。
 *
 * **要求**：需要安裝 `@aws-sdk/client-sqs` 套件。
 *
 * @example
 * ```typescript
 * import { SQSClient } from '@aws-sdk/client-sqs'
 *
 * const sqs = new SQSClient({
 *   region: 'us-east-1',
 *   credentials: {
 *     accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
 *     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
 *   }
 * })
 *
 * const driver = new SQSDriver({ client: sqs })
 * await driver.push('default', serializedJob)
 * ```
 */
export class SQSDriver implements QueueDriver {
  private client: SQSDriverConfig['client']
  private queueUrlPrefix: string
  private visibilityTimeout: number
  private waitTimeSeconds: number
  private queueUrls = new Map<string, string>()

  constructor(config: SQSDriverConfig) {
    this.client = config.client
    this.queueUrlPrefix = config.queueUrlPrefix ?? ''
    this.visibilityTimeout = config.visibilityTimeout ?? 30
    this.waitTimeSeconds = config.waitTimeSeconds ?? 20

    if (!this.client) {
      throw new Error(
        '[SQSDriver] SQS client is required. Please install @aws-sdk/client-sqs package.'
      )
    }
  }

  /**
   * 取得隊列 URL
   */
  private async getQueueUrl(queue: string): Promise<string> {
    if (this.queueUrls.has(queue)) {
      return this.queueUrls.get(queue)!
    }

    // 嘗試從前綴構建 URL
    if (this.queueUrlPrefix) {
      const url = `${this.queueUrlPrefix}/${queue}`
      this.queueUrls.set(queue, url)
      return url
    }

    // 如果沒有前綴，假設 queue 已經是完整的 URL
    this.queueUrls.set(queue, queue)
    return queue
  }

  /**
   * 推送 Job 到隊列
   */
  async push(queue: string, job: SerializedJob): Promise<void> {
    const { SendMessageCommand } = await import('@aws-sdk/client-sqs')
    const queueUrl = await this.getQueueUrl(queue)

    const payload = JSON.stringify({
      id: job.id,
      type: job.type,
      data: job.data,
      className: job.className,
      createdAt: job.createdAt,
      delaySeconds: job.delaySeconds,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
    })

    const delaySeconds = job.delaySeconds ? Math.min(job.delaySeconds, 900) : 0 // SQS 最大延遲 15 分鐘

    await this.client.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: payload,
        DelaySeconds: delaySeconds,
      })
    )
  }

  /**
   * 從隊列取出 Job（長輪詢）
   */
  async pop(queue: string): Promise<SerializedJob | null> {
    const { ReceiveMessageCommand } = await import('@aws-sdk/client-sqs')
    const queueUrl = await this.getQueueUrl(queue)

    const response = await this.client.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: this.waitTimeSeconds,
        VisibilityTimeout: this.visibilityTimeout,
      })
    )

    if (!response.Messages || response.Messages.length === 0) {
      return null
    }

    const message = response.Messages[0]!
    const payload = JSON.parse(message.Body ?? '{}')

    return {
      id: payload.id ?? message.MessageId,
      type: payload.type,
      data: payload.data,
      className: payload.className,
      createdAt: payload.createdAt,
      delaySeconds: payload.delaySeconds,
      attempts: payload.attempts,
      maxAttempts: payload.maxAttempts,
      // 儲存 ReceiptHandle 用於確認
      ...(message.ReceiptHandle && { receiptHandle: message.ReceiptHandle }),
    } as SerializedJob & { receiptHandle?: string }
  }

  /**
   * 取得隊列大小（近似值）
   */
  async size(queue: string): Promise<number> {
    const { GetQueueAttributesCommand } = await import('@aws-sdk/client-sqs')
    const queueUrl = await this.getQueueUrl(queue)

    try {
      const response = await this.client.send(
        new GetQueueAttributesCommand({
          QueueUrl: queueUrl,
          AttributeNames: ['ApproximateNumberOfMessages'],
        })
      )

      return parseInt(response.Attributes?.ApproximateNumberOfMessages ?? '0', 10)
    } catch (error) {
      console.error('[SQSDriver] Error getting queue size:', error)
      return 0
    }
  }

  /**
   * 清空隊列（刪除所有消息）
   *
   * **注意**：SQS 不直接支援清空操作，此方法會持續接收並刪除消息直到隊列為空。
   */
  async clear(queue: string): Promise<void> {
    const { DeleteMessageCommand } = await import('@aws-sdk/client-sqs')
    const queueUrl = await this.getQueueUrl(queue)

    // 持續接收並刪除消息
    while (true) {
      const job = await this.pop(queue)
      if (!job) {
        break
      }

      // 刪除消息
      if ((job as SerializedJob & { receiptHandle?: string }).receiptHandle) {
        await this.client.send(
          new DeleteMessageCommand({
            QueueUrl: queueUrl,
            ReceiptHandle: (job as SerializedJob & { receiptHandle?: string }).receiptHandle,
          })
        )
      }
    }
  }

  /**
   * 批量推送 Job
   */
  async pushMany(queue: string, jobs: SerializedJob[]): Promise<void> {
    if (jobs.length === 0) {
      return
    }

    const { SendMessageBatchCommand } = await import('@aws-sdk/client-sqs')
    const queueUrl = await this.getQueueUrl(queue)

    // SQS 批量操作最多 10 條消息
    const batchSize = 10
    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize)
      const entries = batch.map((job, index) => {
        const payload = JSON.stringify({
          id: job.id,
          type: job.type,
          data: job.data,
          className: job.className,
          createdAt: job.createdAt,
          delaySeconds: job.delaySeconds,
          attempts: job.attempts,
          maxAttempts: job.maxAttempts,
        })

        return {
          Id: `${job.id}-${index}`,
          MessageBody: payload,
          DelaySeconds: job.delaySeconds ? Math.min(job.delaySeconds, 900) : 0,
        }
      })

      await this.client.send(
        new SendMessageBatchCommand({
          QueueUrl: queueUrl,
          Entries: entries,
        })
      )
    }
  }

  /**
   * 確認消息已處理
   */
  async acknowledge(_messageId: string): Promise<void> {
    // SQS 使用 ReceiptHandle 來確認消息
    // 此方法需要從消息中取得 ReceiptHandle
    // 實際使用時應該在 pop() 返回的 job 中包含 receiptHandle
    throw new Error('[SQSDriver] Use deleteMessage() with ReceiptHandle instead of acknowledge().')
  }

  /**
   * 刪除消息（確認處理完成）
   */
  async deleteMessage(queue: string, receiptHandle: string): Promise<void> {
    const { DeleteMessageCommand } = await import('@aws-sdk/client-sqs')
    const queueUrl = await this.getQueueUrl(queue)

    await this.client.send(
      new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
      })
    )
  }
}
