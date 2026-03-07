/**
 * Kafka Offset 追蹤器。
 *
 * 追蹤每個 topic-partition 的已處理 offset，
 * 支援手動 commit 和 at-least-once 語意。
 *
 * 使用「連續確認」演算法：
 * - 只有當 offset 0, 1, 2 都已 resolve 時才 commit offset 3
 * - 確保未來 consumer 重啟時不會跳過未處理的訊息
 *
 * @public
 */
export class OffsetTracker {
  /** topic -> partition -> 最高已確認 offset */
  private readonly committed = new Map<string, Map<number, string>>()

  /** topic -> partition -> 待確認 offset 集合 */
  private readonly pending = new Map<string, Map<number, Set<string>>>()

  /** topic -> partition -> 統計資訊 */
  private readonly stats = new Map<string, Map<number, { tracked: number; resolved: number }>>()

  /**
   * 標記一個 offset 為待處理。
   *
   * @param topic 主題名稱
   * @param partition 分區編號
   * @param offset Offset 值
   */
  track(topic: string, partition: number, offset: string): void {
    // 更新 Pending
    if (!this.pending.has(topic)) {
      this.pending.set(topic, new Map())
    }

    const topicPending = this.pending.get(topic)!
    if (!topicPending.has(partition)) {
      topicPending.set(partition, new Set())
    }

    topicPending.get(partition)?.add(offset)

    // 更新 Stats
    if (!this.stats.has(topic)) {
      this.stats.set(topic, new Map())
    }

    const topicStats = this.stats.get(topic)!
    if (!topicStats.has(partition)) {
      topicStats.set(partition, { tracked: 0, resolved: 0 })
    }

    const partitionStat = topicStats.get(partition)!
    partitionStat.tracked++
  }

  /**
   * 標記一個 offset 為已完成。
   *
   * @param topic 主題名稱
   * @param partition 分區編號
   * @param offset Offset 值
   */
  resolve(topic: string, partition: number, offset: string): void {
    const topicPending = this.pending.get(topic)
    if (!topicPending) {
      return
    }

    const partitionPending = topicPending.get(partition)
    if (!partitionPending) {
      return
    }

    if (partitionPending.has(offset)) {
      partitionPending.delete(offset)

      // 更新 Stats
      const topicStats = this.stats.get(topic)
      const partitionStat = topicStats?.get(partition)
      if (partitionStat) {
        partitionStat.resolved++
      }

      // 更新已確認的最高值（使用 BigInt 比較）
      if (!this.committed.has(topic)) {
        this.committed.set(topic, new Map())
      }

      const topicCommitted = this.committed.get(topic)!
      const currentMax = topicCommitted.get(partition)

      if (!currentMax || BigInt(offset) > BigInt(currentMax)) {
        topicCommitted.set(partition, offset)
      }
    }
  }

  /**
   * 取得可安全 commit 的 offset（連續已完成的最高值）。
   *
   * 使用連續確認演算法：
   * 只回傳連續完成的 offset（即從 0 開始的連續序列）。
   *
   * @returns 可提交的 offset 陣列
   */
  getCommittableOffsets(): Array<{
    topic: string
    partition: number
    offset: string
  }> {
    const result: Array<{
      topic: string
      partition: number
      offset: string
    }> = []

    for (const [topic, partitions] of this.committed.entries()) {
      for (const [partition, offset] of partitions.entries()) {
        // 只有當此分區沒有待處理的 offset 時，才可提交最高已完成值
        const topicPending = this.pending.get(topic)
        const partitionPending = topicPending?.get(partition)

        if (!partitionPending || partitionPending.size === 0) {
          result.push({
            topic,
            partition,
            offset,
          })
        }
      }
    }

    return result
  }

  /**
   * 清除指定 topic 的追蹤資料。
   *
   * @param topic 主題名稱
   */
  clear(topic: string): void {
    this.committed.delete(topic)
    this.pending.delete(topic)
    this.stats.delete(topic)
  }

  /**
   * 取得統計資訊。
   *
   * @returns 統計物件
   */
  getStats(): {
    tracked: number
    committed: number
    pending: number
  } {
    let tracked = 0
    let committed = 0
    let pending = 0

    for (const topicStats of this.stats.values()) {
      for (const partitionStat of topicStats.values()) {
        tracked += partitionStat.tracked
        committed += partitionStat.resolved
      }
    }

    pending = tracked - committed

    return {
      tracked,
      committed,
      pending,
    }
  }
}
