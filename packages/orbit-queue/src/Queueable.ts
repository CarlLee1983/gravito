/**
 * Queueable 介面
 *
 * 實作此介面的類別可以被推送到隊列中執行。
 * 這個介面提供了設定隊列、連接和延遲的方法。
 *
 * @example
 * ```typescript
 * class MyJob implements Queueable {
 *   queueName?: string
 *   connectionName?: string
 *   delaySeconds?: number
 *
 *   onQueue(queue: string): this {
 *     this.queueName = queue
 *     return this
 *   }
 *
 *   onConnection(connection: string): this {
 *     this.connectionName = connection
 *     return this
 *   }
 *
 *   delay(seconds: number): this {
 *     this.delaySeconds = seconds
 *     return this
 *   }
 * }
 * ```
 */
export interface Queueable {
  /**
   * 隊列名稱，Job 應該被推送到這個隊列
   */
  queueName?: string

  /**
   * 連接名稱，Job 應該使用這個連接
   */
  connectionName?: string

  /**
   * 延遲執行時間（秒）
   */
  delaySeconds?: number

  /**
   * 設定目標隊列
   * @param queue - 隊列名稱
   * @returns 返回自身以支援鏈式調用
   */
  onQueue(queue: string): this

  /**
   * 設定目標連接
   * @param connection - 連接名稱
   * @returns 返回自身以支援鏈式調用
   */
  onConnection(connection: string): this

  /**
   * 設定延遲執行時間（秒）
   * @param delay - 延遲秒數
   * @returns 返回自身以支援鏈式調用
   */
  delay(delay: number): this
}
