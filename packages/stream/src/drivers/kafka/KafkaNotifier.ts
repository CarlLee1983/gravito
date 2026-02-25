import { EventEmitter } from 'node:events'

/**
 * Kafka 通知橋接器。
 *
 * 將 Kafka Consumer 的訊息到達事件轉換為
 * QueueDriver.onNotify() 需要的通知回呼。
 * 用於整合 ReactiveStrategy。
 *
 * @public
 */
export class KafkaNotifier extends EventEmitter {
  private readonly callbacks = new Map<string, Array<(queue: string) => Promise<void>>>()
  private enabled = false

  /**
   * 啟用通知。
   *
   * 允許 notify() 呼叫觸發已註冊的回呼。
   */
  enable(): void {
    this.enabled = true
  }

  /**
   * 停用通知。
   *
   * 呼叫 notify() 時將不觸發任何回呼。
   */
  disable(): void {
    this.enabled = false
  }

  /**
   * 是否已啟用。
   *
   * @returns 是否已啟用
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * 註冊通知回呼。
   *
   * @param queues 佇列名稱陣列
   * @param callback 當訊息到達時呼叫的回呼函式
   */
  registerCallback(queues: string[], callback: (queue: string) => Promise<void>): void {
    for (const queue of queues) {
      if (!this.callbacks.has(queue)) {
        this.callbacks.set(queue, [])
      }

      this.callbacks.get(queue)!.push(callback)
    }
  }

  /**
   * 觸發通知（由 Consumer 的 eachMessage 呼叫）。
   *
   * 執行已註冊的所有回呼，並發出 'notify' 事件。
   * 如果回呼拋出錯誤，不會中斷其他回呼的執行。
   *
   * @param queue 佇列名稱
   */
  notify(queue: string): void {
    if (!this.enabled) {
      return
    }

    this.emit('notify', queue)

    const queueCallbacks = this.callbacks.get(queue)
    if (!queueCallbacks) {
      return
    }

    // 非同步執行回呼，不等待
    for (const callback of queueCallbacks) {
      callback(queue).catch((_err) => {
        // 回呼錯誤不應中斷通知流程
        // 可在此記錄錯誤，但暫不拋出
      })
    }
  }

  /**
   * 清除所有已註冊的回呼。
   *
   * 用於優雅關閉時調用。
   */
  clearCallbacks(): void {
    this.callbacks.clear()
    this.removeAllListeners()
  }
}
