import type { DeadLetterEvent, DeadLetterQueue } from './DeadLetterQueue'

/**
 * 記憶體 DLQ 實作
 */
export class MemoryDeadLetterQueue implements DeadLetterQueue {
  private queue = new Map<string, DeadLetterEvent>()

  async enqueue(event: DeadLetterEvent): Promise<string> {
    const id = event.id ?? crypto.randomUUID()
    this.queue.set(id, { ...event, id })
    return id
  }

  async peek(limit = 10): Promise<DeadLetterEvent[]> {
    return Array.from(this.queue.values())
      .sort((a, b) => a.failedAt.getTime() - b.failedAt.getTime())
      .slice(0, limit)
  }

  async dequeue(id: string): Promise<void> {
    this.queue.delete(id)
  }

  async size(): Promise<number> {
    return this.queue.size
  }

  async clear(): Promise<void> {
    this.queue.clear()
  }
}
