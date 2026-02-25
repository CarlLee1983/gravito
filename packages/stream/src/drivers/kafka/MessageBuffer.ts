import type { BufferedMessage } from './types'

/**
 * Kafka 訊息緩衝區。
 *
 * 橋接 Kafka 的 push 模型與 QueueDriver 的 pull（pop）模型。
 * 每個 topic 維護獨立的 FIFO 緩衝區，支援容量限制和超時等待。
 *
 * @public
 */
export class MessageBuffer {
  private readonly buffers = new Map<string, BufferedMessage[]>()
  private readonly waiters = new Map<
    string,
    Array<{
      resolve: (msg: BufferedMessage | null) => void
      timer: ReturnType<typeof setTimeout>
    }>
  >()

  constructor(private readonly maxSize: number = 1000) {}

  /**
   * 推入一條訊息到指定 topic 的緩衝區。
   *
   * @param topic 主題名稱
   * @param message 要推入的訊息
   * @returns 是否成功推入（false 表示緩衝區已滿）
   */
  enqueue(topic: string, message: BufferedMessage): boolean {
    if (!this.buffers.has(topic)) {
      this.buffers.set(topic, [])
    }

    const buffer = this.buffers.get(topic)!
    if (buffer.length >= this.maxSize) {
      return false
    }

    buffer.push(message)

    // 如果有等待者，喚醒第一個
    this.notifyWaiters(topic)

    return true
  }

  /**
   * 從指定 topic 取出一條訊息（FIFO），立即返回或 null。
   *
   * @param topic 主題名稱
   * @returns 取出的訊息或 null
   */
  dequeue(topic: string): BufferedMessage | null {
    const buffer = this.buffers.get(topic)
    if (!buffer || buffer.length === 0) {
      return null
    }

    return buffer.shift() ?? null
  }

  /**
   * 等待直到有訊息或超時。
   *
   * @param topic 主題名稱
   * @param timeoutMs 超時時間（毫秒）
   * @returns 取出的訊息或 null
   */
  dequeueBlocking(topic: string, timeoutMs: number): Promise<BufferedMessage | null> {
    // 先試著立即取出
    const immediate = this.dequeue(topic)
    if (immediate) {
      return Promise.resolve(immediate)
    }

    // 如果沒有，等待
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        // 超時後移除此等待者
        const waitersList = this.waiters.get(topic) ?? []
        const index = waitersList.findIndex((w) => w.timer === timer)
        if (index !== -1) {
          waitersList.splice(index, 1)
          if (waitersList.length === 0) {
            this.waiters.delete(topic)
          }
        }
        resolve(null)
      }, timeoutMs)

      if (!this.waiters.has(topic)) {
        this.waiters.set(topic, [])
      }

      this.waiters.get(topic)?.push({ resolve, timer })
    })
  }

  /**
   * 批次取出。
   *
   * @param topic 主題名稱
   * @param count 最多取出的訊息數
   * @returns 取出的訊息陣列（不足時回傳可用數量）
   */
  dequeueMany(topic: string, count: number): BufferedMessage[] {
    const buffer = this.buffers.get(topic)
    if (!buffer) {
      return []
    }

    const results: BufferedMessage[] = []
    for (let i = 0; i < count && buffer.length > 0; i++) {
      const msg = buffer.shift()
      if (msg) {
        results.push(msg)
      }
    }

    return results
  }

  /**
   * 取得指定 topic 的緩衝數量。
   *
   * @param topic 主題名稱
   * @returns 緩衝區中的訊息數
   */
  size(topic: string): number {
    return this.buffers.get(topic)?.length ?? 0
  }

  /**
   * 清空指定 topic 的緩衝區。
   *
   * @param topic 主題名稱
   */
  clear(topic: string): void {
    this.buffers.delete(topic)
  }

  /**
   * 清空所有緩衝區並取消所有等待者。
   *
   * 用於優雅關閉時調用。
   */
  destroy(): void {
    // 取消所有等待者
    for (const [, waitersList] of this.waiters.entries()) {
      for (const waiter of waitersList) {
        clearTimeout(waiter.timer)
        waiter.resolve(null)
      }
    }

    this.waiters.clear()
    this.buffers.clear()
  }

  /**
   * 喚醒指定 topic 的第一個等待者。
   *
   * @private
   */
  private notifyWaiters(topic: string): void {
    const waitersList = this.waiters.get(topic)
    if (!waitersList || waitersList.length === 0) {
      return
    }

    const waiter = waitersList.shift()
    if (!waiter) {
      return
    }

    clearTimeout(waiter.timer)
    const msg = this.dequeue(topic)
    waiter.resolve(msg)

    if (waitersList.length === 0) {
      this.waiters.delete(topic)
    }
  }
}
