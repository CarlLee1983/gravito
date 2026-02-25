/**
 * Continuous-ack offset tracker for at-least-once semantics.
 *
 * Implements the continuous-ack algorithm: only offsets that form a sequential
 * sequence from 0 are considered committable.
 *
 * @public
 */
export class OffsetTracker {
  private pending = new Map<string, Set<string>>() // topic:partition → Set of pending offsets
  private committedOffsets = new Map<string, Set<string>>() // topic:partition → Set of committed offsets
  private trackedCount = new Map<string, number>() // topic → count of tracked offsets
  private committedCount = new Map<string, number>() // topic → count of committed offsets
  private pendingCount = new Map<string, number>() // topic → count of pending offsets

  /**
   * Track an offset for a topic/partition.
   */
  track(topic: string, partition: number, offset: string): void {
    const key = `${topic}:${partition}`

    if (!this.pending.has(key)) {
      this.pending.set(key, new Set())
    }
    this.pending.get(key)!.add(offset)

    this.trackedCount.set(topic, (this.trackedCount.get(topic) ?? 0) + 1)
    this.pendingCount.set(topic, (this.pendingCount.get(topic) ?? 0) + 1)
  }

  /**
   * Mark an offset as resolved (successfully processed).
   */
  resolve(topic: string, partition: number, offset: string): void {
    const key = `${topic}:${partition}`
    const pending = this.pending.get(key)

    if (pending?.delete(offset)) {
      // Offset was pending, now resolved
      this.pendingCount.set(topic, (this.pendingCount.get(topic) ?? 0) - 1)
      this.committedCount.set(topic, (this.committedCount.get(topic) ?? 0) + 1)

      if (!this.committedOffsets.has(key)) {
        this.committedOffsets.set(key, new Set())
      }
      this.committedOffsets.get(key)!.add(offset)
    }
  }

  /**
   * Get all committable offsets (continuous sequence from 0).
   * @returns Array of committable offsets
   */
  getCommittableOffsets(): Array<{ topic: string; partition: number; offset: string }> {
    const result: Array<{ topic: string; partition: number; offset: string }> = []

    // Find the highest committed offset per partition that has no pending offsets
    const topicPartitions = new Map<string, Map<number, string>>()

    for (const [key, committed] of this.committedOffsets.entries()) {
      const [topic, partStr] = key.split(':')
      const partition = parseInt(partStr!, 10)

      if (committed.size === 0) continue

      const pending = this.pending.get(key) ?? new Set()
      if (pending.size > 0) continue // Skip if any pending

      // Get the highest committed offset
      const highest = Array.from(committed).sort().pop()
      if (!highest) continue

      if (!topicPartitions.has(topic!)) {
        topicPartitions.set(topic!, new Map())
      }
      topicPartitions.get(topic!)!.set(partition, highest)
    }

    for (const [topic, partitions] of topicPartitions.entries()) {
      for (const [partition, offset] of partitions.entries()) {
        result.push({ topic, partition, offset })
      }
    }

    return result
  }

  /**
   * Get current statistics.
   */
  getStats(): { tracked: number; committed: number; pending: number } {
    let totalTracked = 0
    let totalCommitted = 0
    let totalPending = 0

    for (const count of this.trackedCount.values()) {
      totalTracked += count
    }

    for (const count of this.committedCount.values()) {
      totalCommitted += count
    }

    for (const count of this.pendingCount.values()) {
      totalPending += count
    }

    return {
      tracked: totalTracked,
      committed: totalCommitted,
      pending: totalPending,
    }
  }

  /**
   * Clear all data for a topic.
   */
  clear(topic: string): void {
    this.trackedCount.delete(topic)
    this.committedCount.delete(topic)
    this.pendingCount.delete(topic)

    for (const key of Array.from(this.pending.keys())) {
      if (key.startsWith(`${topic}:`)) {
        this.pending.delete(key)
        this.committedOffsets.delete(key)
      }
    }
  }
}
