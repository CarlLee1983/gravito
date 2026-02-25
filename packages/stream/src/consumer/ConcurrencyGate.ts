/**
 * Promise-based Semaphore，用於控制並發執行數量。
 *
 * 完全取代原始 Consumer 中的 `stats.active` + `setTimeout(50)` busy-wait 模式。
 * 使用 Promise 等待機制，當並發數達到上限時，後續的 acquire() 會被掛起，
 * 直到有其他任務 release() 後才會被喚醒，不會浪費 CPU 資源。
 *
 * @example
 * ```typescript
 * const gate = new ConcurrencyGate(5)
 *
 * await gate.acquire()
 * try {
 *   await doWork()
 * } finally {
 *   gate.release()
 * }
 * ```
 */
export class ConcurrencyGate {
  private active = 0
  /** 等待中的 resolve 函數佇列（FIFO） */
  private waiters: Array<() => void> = []

  constructor(private readonly limit: number) {
    if (limit < 0) {
      throw new Error(`ConcurrencyGate limit must be >= 0, got ${limit}`)
    }
  }

  /**
   * 取得並發許可。
   *
   * 若目前 active < limit，立即遞增 active 並回傳。
   * 否則等待直到有 release() 釋放許可後再獲取。
   */
  async acquire(): Promise<void> {
    if (this.active < this.limit) {
      this.active++
      return
    }

    // 等待 release() 喚醒
    await new Promise<void>((resolve) => {
      this.waiters.push(resolve)
    })
    // 被喚醒時 active 已由 release() 遞增
  }

  /**
   * 釋放並發許可。
   *
   * 遞減 active 計數，並喚醒下一個等待者（FIFO 順序）。
   */
  release(): void {
    if (this.active === 0) {
      // 防禦性檢查，不應發生但仍保護
      return
    }

    const next = this.waiters.shift()
    if (next) {
      // 有等待者：active 不變（從 limit 傳給下一個），直接喚醒
      next()
    } else {
      // 沒有等待者：直接遞減
      this.active--
    }
  }

  /**
   * 目前可立即取得的許可數量。
   */
  get available(): number {
    return Math.max(0, this.limit - this.active)
  }

  /**
   * 目前正在執行的任務數量。
   */
  get activeCount(): number {
    return this.active
  }

  /**
   * 目前等待中的任務數量。
   */
  get waitingCount(): number {
    return this.waiters.length
  }

  /**
   * 最大並發數量上限。
   */
  get concurrencyLimit(): number {
    return this.limit
  }
}
