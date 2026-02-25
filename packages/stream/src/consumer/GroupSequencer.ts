import pLimit from 'p-limit'

/**
 * 管理每個 groupId 的 FIFO 序列執行器。
 *
 * 確保相同 groupId 的 job 按照 FIFO 順序依序執行，
 * 不同 groupId 的 job 則可以並行執行。
 *
 * 使用 pLimit(1) 為每個 group 建立容量為 1 的限制器，
 * 確保同一 group 同時只有一個 job 在執行。
 *
 * @example
 * ```typescript
 * const sequencer = new GroupSequencer()
 *
 * // group1 的 job 依序執行
 * sequencer.run('group1', async () => await processJob(jobA))
 * sequencer.run('group1', async () => await processJob(jobB))
 *
 * // group2 與 group1 並行
 * sequencer.run('group2', async () => await processJob(jobC))
 *
 * // 無 group 的 job 直接執行
 * sequencer.run(undefined, async () => await processJob(jobD))
 * ```
 */
export class GroupSequencer {
  /** Group ID 到 pLimit limiter 的映射 */
  private limiters = new Map<string, ReturnType<typeof pLimit>>()
  /** Group ID 到最後使用時間（ms）的映射，用於 TTL 清理 */
  private lastUsed = new Map<string, number>()
  /** 定期清理計時器 */
  private cleanupTimer: ReturnType<typeof setInterval> | null = null
  /** Group limiter 存活時間（毫秒），超過且無任務時清理 */
  private static readonly TTL_MS = 60_000

  constructor() {
    // 啟動定期清理（每 60 秒）
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, GroupSequencer.TTL_MS)

    // 允許 timer 不阻止 process 退出
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref()
    }
  }

  /**
   * 執行一個任務，確保相同 group 內的任務依序執行。
   *
   * @param groupId - 群組 ID，undefined 表示無群組（直接執行）
   * @param fn - 要執行的非同步任務
   * @returns 任務的 Promise
   */
  run<T>(groupId: string | undefined, fn: () => Promise<T>): Promise<T> {
    // 無 groupId，直接執行
    if (!groupId) {
      return fn()
    }

    // 取得或建立此 group 的 limiter
    let limiter = this.limiters.get(groupId)
    if (!limiter) {
      limiter = pLimit(1)
      this.limiters.set(groupId, limiter)
    }

    // 更新最後使用時間
    this.lastUsed.set(groupId, Date.now())

    // 透過 limiter 執行，確保 FIFO 序列
    return limiter(async () => {
      const result = await fn()
      // 更新最後使用時間（任務完成時）
      this.lastUsed.set(groupId, Date.now())
      return result
    })
  }

  /**
   * 清理超過 TTL 且沒有 active/pending 任務的 group limiters。
   *
   * 定期呼叫以避免記憶體洩漏。
   */
  cleanup(): void {
    const now = Date.now()
    const toDelete: string[] = []

    for (const [groupId, lastUsedTime] of this.lastUsed.entries()) {
      const limiter = this.limiters.get(groupId)
      if (!limiter) {
        toDelete.push(groupId)
        continue
      }

      // 超過 TTL 且無 active/pending 任務才清理
      if (
        now - lastUsedTime > GroupSequencer.TTL_MS &&
        limiter.activeCount === 0 &&
        limiter.pendingCount === 0
      ) {
        this.limiters.delete(groupId)
        toDelete.push(groupId)
      }
    }

    for (const groupId of toDelete) {
      this.lastUsed.delete(groupId)
    }
  }

  /**
   * 停止時完全清理所有 limiters 和計時器。
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.limiters.clear()
    this.lastUsed.clear()
  }

  /**
   * 目前管理中的 group 數量（用於診斷）。
   */
  get groupCount(): number {
    return this.limiters.size
  }
}
