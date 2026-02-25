import { RingBuffer } from './RingBuffer'
import type { BufferedMessage } from './types'

/**
 * FIFO message buffer per topic for bridging Kafka push to QueueDriver pull model.
 *
 * 內部使用 RingBuffer 實現 O(1) enqueue/dequeue，
 * 取代原本 Array.shift() 的 O(n) 操作。
 *
 * @public
 */
export class MessageBuffer {
  private buffers = new Map<string, RingBuffer<BufferedMessage>>()
  private waiters = new Map<string, Array<() => void>>()
  private destroyed = false

  constructor(private readonly maxSize: number) {}

  /**
   * Enqueue a message to a topic buffer.
   * @returns true if successfully queued, false if buffer is full
   */
  enqueue(topic: string, message: BufferedMessage): boolean {
    if (this.destroyed) {
      return false
    }

    if (!this.buffers.has(topic)) {
      this.buffers.set(topic, new RingBuffer<BufferedMessage>(this.maxSize))
    }

    const buffer = this.buffers.get(topic)!
    const result = buffer.push(message)
    if (result) {
      this.notifyWaiters(topic)
    }
    return result
  }

  /**
   * Dequeue a message from a topic buffer (non-blocking).
   * @returns message if available, null if empty
   */
  dequeue(topic: string): BufferedMessage | null {
    const buffer = this.buffers.get(topic)
    if (!buffer || buffer.isEmpty) {
      return null
    }
    return buffer.shift() ?? null
  }

  /**
   * Blocking dequeue with timeout.
   * @param timeout milliseconds to wait
   * @returns message if available within timeout, null if timeout
   */
  dequeueBlocking(topic: string, timeout: number): Promise<BufferedMessage | null> {
    return new Promise((resolve) => {
      const buffer = this.buffers.get(topic)
      if (buffer && !buffer.isEmpty) {
        resolve(buffer.shift() ?? null)
        return
      }

      if (this.destroyed) {
        resolve(null)
        return
      }

      const startTime = Date.now()
      let timerId: ReturnType<typeof setTimeout> | null = null
      let cleaned = false

      const cleanup = () => {
        if (cleaned) {
          return
        }
        cleaned = true
        if (timerId) {
          clearTimeout(timerId)
        }
        const waiters = this.waiters.get(topic) ?? []
        const idx = waiters.indexOf(checkMessage)
        if (idx >= 0) {
          waiters.splice(idx, 1)
        }
      }

      const checkMessage = () => {
        if (cleaned || this.destroyed) {
          cleanup()
          resolve(null)
          return
        }

        const buf = this.buffers.get(topic)
        if (buf && !buf.isEmpty) {
          cleanup()
          resolve(buf.shift() ?? null)
          return
        }

        const elapsed = Date.now() - startTime
        if (elapsed >= timeout) {
          cleanup()
          resolve(null)
          return
        }

        timerId = setTimeout(checkMessage, 50)
      }

      if (!this.waiters.has(topic)) {
        this.waiters.set(topic, [])
      }
      this.waiters.get(topic)?.push(checkMessage)

      timerId = setTimeout(checkMessage, 0)
    })
  }

  /**
   * Dequeue multiple messages from a topic buffer.
   */
  dequeueMany(topic: string, count: number): BufferedMessage[] {
    const buffer = this.buffers.get(topic)
    if (!buffer || buffer.isEmpty) {
      return []
    }
    return buffer.shiftMany(count)
  }

  /**
   * Get current size of a topic buffer.
   */
  size(topic: string): number {
    return this.buffers.get(topic)?.length ?? 0
  }

  /**
   * Clear all messages from a topic buffer.
   */
  clear(topic: string): void {
    this.buffers.delete(topic)
    this.waiters.delete(topic)
  }

  /**
   * Destroy all buffers and cancel all pending waiters.
   */
  destroy(): void {
    this.destroyed = true

    for (const waiters of this.waiters.values()) {
      waiters.splice(0)
    }

    this.buffers.clear()
    this.waiters.clear()
  }

  private notifyWaiters(topic: string): void {
    const waiters = this.waiters.get(topic)
    if (!waiters) {
      return
    }

    for (const waiter of waiters.splice(0, 1)) {
      waiter()
    }
  }
}
