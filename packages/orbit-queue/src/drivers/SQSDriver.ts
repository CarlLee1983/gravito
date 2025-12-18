import type { SerializedJob } from '../types'
import type { QueueDriver } from './QueueDriver'

/**
 * SQS driver configuration.
 */
export interface SQSDriverConfig {
  /**
   * SQS client instance (`@aws-sdk/client-sqs`).
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
   * Queue URL prefix (used to build full queue URLs).
   */
  queueUrlPrefix?: string

  /**
   * Visibility timeout (seconds, default: 30).
   */
  visibilityTimeout?: number

  /**
   * Long-polling duration (seconds, default: 20).
   */
  waitTimeSeconds?: number
}

/**
 * SQS Driver
 *
 * Uses AWS SQS as the queue backend.
 * Supports standard/FIFO queues, long polling, DLQ setups, etc.
 *
 * Requires `@aws-sdk/client-sqs`.
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
   * Resolve the full queue URL.
   */
  private async getQueueUrl(queue: string): Promise<string> {
    if (this.queueUrls.has(queue)) {
      return this.queueUrls.get(queue)!
    }

    // Build from prefix if provided
    if (this.queueUrlPrefix) {
      const url = `${this.queueUrlPrefix}/${queue}`
      this.queueUrls.set(queue, url)
      return url
    }

    // Otherwise, assume `queue` is already a full URL
    this.queueUrls.set(queue, queue)
    return queue
  }

  /**
   * Push a job to SQS.
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

    const delaySeconds = job.delaySeconds ? Math.min(job.delaySeconds, 900) : 0 // SQS max delay is 15 minutes

    await this.client.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: payload,
        DelaySeconds: delaySeconds,
      })
    )
  }

  /**
   * Pop a job (long polling).
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
      // Store ReceiptHandle for acknowledgement
      ...(message.ReceiptHandle && { receiptHandle: message.ReceiptHandle }),
    } as SerializedJob & { receiptHandle?: string }
  }

  /**
   * Get queue size (approximate).
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
   * Clear a queue by receiving and deleting messages.
   *
   * Note: SQS does not provide a direct "purge" API via this wrapper. This method will
   * keep receiving and deleting messages until the queue is empty.
   */
  async clear(queue: string): Promise<void> {
    const { DeleteMessageCommand } = await import('@aws-sdk/client-sqs')
    const queueUrl = await this.getQueueUrl(queue)

    // Keep receiving and deleting
    while (true) {
      const job = await this.pop(queue)
      if (!job) {
        break
      }

      // Delete message
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
   * Push multiple jobs.
   */
  async pushMany(queue: string, jobs: SerializedJob[]): Promise<void> {
    if (jobs.length === 0) {
      return
    }

    const { SendMessageBatchCommand } = await import('@aws-sdk/client-sqs')
    const queueUrl = await this.getQueueUrl(queue)

    // SQS batch operations are limited to 10 entries
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
   * Acknowledge is not supported via messageId.
   */
  async acknowledge(_messageId: string): Promise<void> {
    // SQS acknowledgements require a ReceiptHandle.
    throw new Error('[SQSDriver] Use deleteMessage() with ReceiptHandle instead of acknowledge().')
  }

  /**
   * Delete a message (acknowledge processing completion).
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
