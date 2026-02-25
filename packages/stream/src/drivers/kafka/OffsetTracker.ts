/**
 * Continuous-ack offset tracker for at-least-once semantics.
 *
 * Optimized with BigInt offset comparison to eliminate O(n log n) string sorting.
 * Tracks the highest contiguously-resolved offset per partition for efficient commit.
 *
 * Performance improvements over original:
 * - getCommittableOffsets(): O(partitions) instead of O(offsets * log(offsets))
 * - resolve(): O(1) BigInt comparison instead of Set iteration
 * - clear(): O(partitions-in-topic) with topic-keyed index
 *
 * @public
 */
export class OffsetTracker {
  // topic:partition → Set of pending offset strings
  private pending = new Map<string, Set<string>>()

  // topic:partition → highest resolved offset as bigint
  private highestResolved = new Map<string, bigint>()

  // topic → Set of partition keys (for fast clear)
  private topicKeys = new Map<string, Set<string>>()

  // Aggregate counters
  private trackedCount = new Map<string, number>()
  private committedCount = new Map<string, number>()
  private pendingCount = new Map<string, number>()

  /**
   * Track an offset for a topic/partition.
   */
  track(topic: string, partition: number, offset: string): void {
    const key = `${topic}:${partition}`

    if (!this.pending.has(key)) {
      this.pending.set(key, new Set())
    }
    this.pending.get(key)?.add(offset)

    // 維護 topic → keys 索引
    if (!this.topicKeys.has(topic)) {
      this.topicKeys.set(topic, new Set())
    }
    this.topicKeys.get(topic)?.add(key)

    this.trackedCount.set(topic, (this.trackedCount.get(topic) ?? 0) + 1)
    this.pendingCount.set(topic, (this.pendingCount.get(topic) ?? 0) + 1)
  }

  /**
   * Mark an offset as resolved (successfully processed).
   * Uses BigInt comparison to track highest resolved offset in O(1).
   */
  resolve(topic: string, partition: number, offset: string): void {
    const key = `${topic}:${partition}`
    const pending = this.pending.get(key)

    if (pending?.delete(offset)) {
      this.pendingCount.set(topic, (this.pendingCount.get(topic) ?? 0) - 1)
      this.committedCount.set(topic, (this.committedCount.get(topic) ?? 0) + 1)

      // 用 BigInt 追蹤最高已解析 offset（取代 Set + sort）
      const offsetBig = BigInt(offset)
      const current = this.highestResolved.get(key)
      if (current === undefined || offsetBig > current) {
        this.highestResolved.set(key, offsetBig)
      }
    }
  }

  /**
   * Get all committable offsets.
   * O(partitions) - only returns partitions with no pending offsets.
   */
  getCommittableOffsets(): Array<{ topic: string; partition: number; offset: string }> {
    const result: Array<{ topic: string; partition: number; offset: string }> = []

    for (const [key, highest] of this.highestResolved.entries()) {
      const pending = this.pending.get(key)
      if (pending && pending.size > 0) {
        continue
      }

      const colonIdx = key.lastIndexOf(':')
      const topic = key.slice(0, colonIdx)
      const partition = parseInt(key.slice(colonIdx + 1), 10)

      result.push({ topic, partition, offset: String(highest) })
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
   * O(partitions-in-topic) using topic-keyed index.
   */
  clear(topic: string): void {
    this.trackedCount.delete(topic)
    this.committedCount.delete(topic)
    this.pendingCount.delete(topic)

    const keys = this.topicKeys.get(topic)
    if (keys) {
      for (const key of keys) {
        this.pending.delete(key)
        this.highestResolved.delete(key)
      }
      this.topicKeys.delete(topic)
    }
  }
}
