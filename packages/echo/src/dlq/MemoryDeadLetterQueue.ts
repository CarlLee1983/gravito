import type { DeadLetterEvent, DeadLetterQueue } from './DeadLetterQueue'

/**
 * An in-memory implementation of {@link DeadLetterQueue}.
 * Suitable for development, testing, or small-scale applications where persistence is not required.
 *
 * @example
 * ```typescript
 * const dlq = new MemoryDeadLetterQueue();
 * await dlq.enqueue(failedEvent);
 * const size = await dlq.size();
 * ```
 */
export class MemoryDeadLetterQueue implements DeadLetterQueue {
  private queue = new Map<string, DeadLetterEvent>()

  /**
   * Stores the event in an internal Map.
   * Generates a UUID if the event does not have an ID.
   */
  async enqueue(event: DeadLetterEvent): Promise<string> {
    const id = event.id ?? crypto.randomUUID()
    this.queue.set(id, { ...event, id })
    return id
  }

  /**
   * Returns events sorted by failure timestamp.
   */
  async peek(limit = 10): Promise<DeadLetterEvent[]> {
    return Array.from(this.queue.values())
      .sort((a, b) => a.failedAt.getTime() - b.failedAt.getTime())
      .slice(0, limit)
  }

  /**
   * Removes the event from the internal Map.
   */
  async dequeue(id: string): Promise<void> {
    this.queue.delete(id)
  }

  /**
   * Returns the number of items in the internal Map.
   */
  async size(): Promise<number> {
    return this.queue.size
  }

  /**
   * Clears the internal Map.
   */
  async clear(): Promise<void> {
    this.queue.clear()
  }
}
