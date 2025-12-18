import type { Job } from './Job'

/**
 * Worker 選項
 */
export interface WorkerOptions {
  /**
   * 最大重試次數
   */
  maxAttempts?: number

  /**
   * Job 超時時間（秒）
   */
  timeout?: number

  /**
   * 失敗回調
   */
  onFailed?: (job: Job, error: Error) => Promise<void>
}

/**
 * Worker 基礎類別
 *
 * 負責執行 Job 的邏輯。
 * 提供錯誤處理、重試機制和超時處理。
 *
 * @example
 * ```typescript
 * const worker = new Worker({
 *   maxAttempts: 3,
 *   timeout: 60
 * })
 *
 * await worker.process(job)
 * ```
 */
export class Worker {
  constructor(private options: WorkerOptions = {}) {}

  /**
   * 處理 Job
   * @param job - Job 實例
   */
  async process(job: Job): Promise<void> {
    const maxAttempts = this.options.maxAttempts ?? 3
    const timeout = this.options.timeout

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        job.attempts = attempt
        job.maxAttempts = maxAttempts

        // 執行 Job（支援超時）
        if (timeout) {
          await Promise.race([
            job.handle(),
            new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error(`Job timeout after ${timeout} seconds`)),
                timeout * 1000
              )
            ),
          ])
        } else {
          await job.handle()
        }

        // 成功，返回
        return
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // 如果是最後一次嘗試，調用失敗處理
        if (attempt === maxAttempts) {
          await this.handleFailure(job, lastError)
          throw lastError
        }

        // 等待後重試（指數退避）
        const delay = Math.min(1000 * 2 ** (attempt - 1), 30000)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  /**
   * 處理失敗
   */
  private async handleFailure(job: Job, error: Error): Promise<void> {
    // 調用 Job 的 failed 方法
    try {
      await job.failed(error)
    } catch (failedError) {
      console.error('[Worker] Error in job.failed():', failedError)
    }

    // 調用選項中的失敗回調
    if (this.options.onFailed) {
      try {
        await this.options.onFailed(job, error)
      } catch (callbackError) {
        console.error('[Worker] Error in onFailed callback:', callbackError)
      }
    }
  }
}
