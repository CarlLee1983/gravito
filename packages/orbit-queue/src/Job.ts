import type { Queueable } from './Queueable'

/**
 * Job 基礎類別
 *
 * 所有需要推送到隊列的任務都應該繼承此類別。
 * 實作了 Queueable 介面，提供流暢的 API 來設定隊列、連接和延遲。
 *
 * @example
 * ```typescript
 * class SendWelcomeEmail extends Job {
 *   constructor(private userId: string) {
 *     super()
 *   }
 *
 *   async handle(): Promise<void> {
 *     const user = await User.find(this.userId)
 *     await mail.send(new WelcomeEmail(user))
 *   }
 * }
 *
 * // 使用
 * await queue.push(new SendWelcomeEmail('123'))
 *   .onQueue('emails')
 *   .delay(60)
 * ```
 */
export abstract class Job implements Queueable {
  /**
   * 隊列名稱
   */
  queueName?: string

  /**
   * 連接名稱
   */
  connectionName?: string

  /**
   * 延遲執行時間（秒）
   */
  delaySeconds?: number

  /**
   * 重試次數
   */
  attempts?: number

  /**
   * 最大重試次數
   */
  maxAttempts?: number

  /**
   * 設定目標隊列
   */
  onQueue(queue: string): this {
    this.queueName = queue
    return this
  }

  /**
   * 設定目標連接
   */
  onConnection(connection: string): this {
    this.connectionName = connection
    return this
  }

  /**
   * 設定延遲執行時間（秒）
   */
  delay(delay: number): this {
    this.delaySeconds = delay
    return this
  }

  /**
   * 處理 Job 的邏輯
   *
   * 子類別必須實作此方法來定義 Job 的實際處理邏輯。
   */
  abstract handle(): Promise<void>

  /**
   * Job 失敗時的處理邏輯（可選）
   *
   * 當 Job 執行失敗且達到最大重試次數時，會調用此方法。
   * 子類別可以覆寫此方法來實作自訂的失敗處理邏輯。
   *
   * @param error - 錯誤物件
   */
  async failed(_error: Error): Promise<void> {
    // 預設不做任何處理，子類別可以覆寫
  }
}
