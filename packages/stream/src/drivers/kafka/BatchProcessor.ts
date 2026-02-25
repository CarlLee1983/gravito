import type { SerializedJob } from '../../types'
import type { MessageBuffer } from './MessageBuffer'
import type { BatchConfig, BatchResult, BufferedMessage, KafkaProducerClient } from './types'

/**
 * 批次處理引擎，管理 Kafka 的批次發送和消費。
 *
 * 功能：
 * - 並行管線推送（pushBatches）：最多 concurrency 個並行批次發送
 * - 批次收集（collectBatch）：等待 linger 時間收集滿批次
 * - 並行回調處理（processBatch）：控制並行度 + 逾時 + 部分失敗追蹤
 *
 * @public
 */
export class BatchProcessor {
  private readonly maxBatchSize: number
  private readonly batchLingerMs: number
  private readonly concurrency: number
  private readonly enablePipeline: boolean

  constructor(config?: BatchConfig) {
    this.maxBatchSize = config?.maxBatchSize ?? 100
    this.batchLingerMs = config?.batchLingerMs ?? 50
    this.concurrency = config?.concurrency ?? 3
    this.enablePipeline = config?.enablePipeline ?? true
  }

  /**
   * 並行管線推送多個批次到 Kafka producer。
   *
   * 將 jobs 分割成 maxBatchSize 的批次，
   * 最多 concurrency 個並行發送。
   */
  async pushBatches(
    producer: KafkaProducerClient,
    topic: string,
    jobs: SerializedJob[],
    serialize: (job: SerializedJob) => string | Buffer
  ): Promise<void> {
    if (jobs.length === 0) {
      return
    }

    // 分割批次
    const batches: SerializedJob[][] = []
    for (let i = 0; i < jobs.length; i += this.maxBatchSize) {
      batches.push(jobs.slice(i, i + this.maxBatchSize))
    }

    if (!this.enablePipeline || batches.length === 1) {
      // 單一管線模式：依序發送
      for (const batch of batches) {
        await this.sendBatch(producer, topic, batch, serialize)
      }
      return
    }

    // 並行管線模式：使用信號量控制並行數
    const inFlight = new Set<Promise<void>>()

    for (const batch of batches) {
      // 如果已達並行上限，等待其中一個完成
      if (inFlight.size >= this.concurrency) {
        await Promise.race(inFlight)
      }

      const promise = this.sendBatch(producer, topic, batch, serialize).finally(() => {
        inFlight.delete(promise)
      })
      inFlight.add(promise)
    }

    // 等待所有剩餘任務完成
    if (inFlight.size > 0) {
      await Promise.all(inFlight)
    }
  }

  /**
   * 從 buffer 收集一個批次的訊息。
   *
   * 立即取出現有訊息，如果未滿則等待 linger 時間收集更多。
   */
  async collectBatch(
    buffer: MessageBuffer,
    topic: string,
    maxWaitMs: number
  ): Promise<BufferedMessage[]> {
    // 立即收集現有訊息
    const batch = buffer.dequeueMany(topic, this.maxBatchSize)
    if (batch.length >= this.maxBatchSize) {
      return batch
    }

    // 未滿，等待更多訊息到達
    const lingerDeadline = Date.now() + Math.min(this.batchLingerMs, maxWaitMs)

    while (batch.length < this.maxBatchSize) {
      const remaining = lingerDeadline - Date.now()
      if (remaining <= 0) {
        break
      }

      const msg = await buffer.dequeueBlocking(topic, remaining)
      if (msg) {
        batch.push(msg)
      } else {
        break
      }
    }

    return batch
  }

  /**
   * 並行執行批次回調並追蹤結果。
   *
   * 使用信號量控制並行度，支援逾時和部分失敗。
   */
  async processBatch(
    messages: BufferedMessage[],
    callback: (job: SerializedJob) => Promise<void>,
    options: { concurrency: number; timeoutMs: number }
  ): Promise<BatchResult> {
    const succeeded: string[] = []
    const failed: Array<{ id: string; error: Error }> = []

    let available = options.concurrency
    const waitQueue: Array<() => void> = []

    const acquire = (): Promise<void> => {
      if (available > 0) {
        available--
        return Promise.resolve()
      }
      return new Promise<void>((resolve) => {
        waitQueue.push(() => {
          available--
          resolve()
        })
      })
    }

    const release = (): void => {
      const next = waitQueue.shift()
      if (next) {
        next()
      } else {
        available++
      }
    }

    const promises = messages.map(async (msg) => {
      await acquire()

      try {
        await Promise.race([
          callback(msg.job),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Callback timeout')), options.timeoutMs)
          ),
        ])

        succeeded.push(msg.job.id)
      } catch (error) {
        failed.push({
          id: msg.job.id,
          error: error instanceof Error ? error : new Error(String(error)),
        })
      } finally {
        release()
      }
    })

    await Promise.all(promises)

    return { succeeded, failed }
  }

  /**
   * 取得當前配置快照。
   */
  getConfig(): Required<BatchConfig> {
    return {
      maxBatchSize: this.maxBatchSize,
      batchLingerMs: this.batchLingerMs,
      concurrency: this.concurrency,
      enablePipeline: this.enablePipeline,
    }
  }

  /**
   * 內部：發送單一批次到 Kafka。
   */
  private async sendBatch(
    producer: KafkaProducerClient,
    topic: string,
    batch: SerializedJob[],
    serialize: (job: SerializedJob) => string | Buffer
  ): Promise<void> {
    const messages = batch.map((job) => ({
      key: job.groupId ?? job.id,
      value: serialize(job),
    }))

    await producer.send({ topic, messages })
  }
}
