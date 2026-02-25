import type { RedisClient, RedisClientOptions } from '../types'

/**
 * 提供存取 RedisClient 底層連線的介面
 * @internal
 */
export interface PubSubCommandsContext {
  getClient(): RedisClient
  handleException(error: unknown, command?: string): Error
  buildConnectionUrl(): string
  buildClientOptions(): RedisClientOptions
  getRedisClientClass(): Promise<any>
}

/**
 * Redis Pub/Sub 指令模組
 *
 * 封裝所有 Redis 發布/訂閱（Pub/Sub）機制的操作，
 * 包括 PUBLISH、SUBSCRIBE、UNSUBSCRIBE 等。
 *
 * Bun.redis 的訂閱操作需要專用的獨立連線，
 * 此模組負責管理該訂閱連線的生命週期。
 *
 * @internal
 */
export class PubSubCommands {
  /** 專用訂閱連線 */
  private subscriber: RedisClient | null = null
  /** 頻道 → 回調函式的對映表 */
  private subscriptions = new Map<string, (message: string, channel: string) => void>()

  constructor(private readonly ctx: PubSubCommandsContext) {}

  /**
   * 取得目前管理的訂閱連線（用於外部清理）。
   */
  getSubscriber(): RedisClient | null {
    return this.subscriber
  }

  /**
   * 取得目前所有的訂閱對映表（用於外部清理）。
   */
  getSubscriptions(): Map<string, (message: string, channel: string) => void> {
    return this.subscriptions
  }

  /**
   * 清除所有訂閱狀態（用於斷線清理）。
   */
  clearSubscriptions(): void {
    this.subscriptions.clear()
    this.subscriber = null
  }

  /**
   * 向指定頻道發布訊息。
   *
   * @param channel - 目標頻道名稱。
   * @param message - 要發布的訊息內容。
   * @returns 接收到訊息的訂閱者數量。
   */
  async publish(channel: string, message: string): Promise<number> {
    try {
      return await this.ctx.getClient().publish(channel, message)
    } catch (error) {
      throw this.ctx.handleException(error, 'PUBLISH')
    }
  }

  /**
   * 訂閱指定頻道，並在收到訊息時執行回調函式。
   *
   * Bun.redis 訂閱後需要專用連線，此方法會自動建立獨立的訂閱連線。
   *
   * @param channel - 要訂閱的頻道名稱。
   * @param callback - 收到訊息時的回調函式，參數為訊息內容與頻道名稱。
   */
  async subscribe(
    channel: string,
    callback: (message: string, channel: string) => void
  ): Promise<void> {
    try {
      if (!this.subscriber) {
        const url = this.ctx.buildConnectionUrl()
        const options = this.ctx.buildClientOptions()
        const RedisClientClass = await this.ctx.getRedisClientClass()
        this.subscriber = new RedisClientClass(url, options) as unknown as RedisClient
        await this.subscriber.connect()
      }

      if (this.subscriber) {
        this.subscriptions.set(channel, callback)
        await this.subscriber.subscribe(channel, (message) => {
          const cb = this.subscriptions.get(channel)
          if (cb) {
            cb(message, channel)
          }
        })
      }
    } catch (error) {
      throw this.ctx.handleException(error, 'SUBSCRIBE')
    }
  }

  /**
   * 取消訂閱指定頻道。
   *
   * @param channel - 要取消訂閱的頻道名稱。
   */
  async unsubscribe(channel: string): Promise<void> {
    try {
      if (this.subscriber) {
        await this.subscriber.unsubscribe(channel)
        this.subscriptions.delete(channel)
      }
    } catch (error) {
      throw this.ctx.handleException(error, 'UNSUBSCRIBE')
    }
  }
}
