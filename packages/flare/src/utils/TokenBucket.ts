/**
 * Simple Token Bucket algorithm for rate limiting.
 *
 * Token Bucket 是一種常用的限流演算法，用於控制請求頻率。
 * 它透過一個固定容量的桶來存儲 tokens，並以固定速率補充。
 * 每個請求需要消耗一個或多個 tokens，當桶內 tokens 不足時請求被拒絕。
 *
 * @example
 * ```typescript
 * // 創建一個容量為 10，每秒補充 5 個 tokens 的桶
 * const bucket = new TokenBucket(10, 5)
 *
 * // 嘗試消耗 1 個 token
 * if (bucket.tryConsume()) {
 *   // 請求被允許
 * } else {
 *   // 請求被限流
 * }
 * ```
 *
 * @public
 */
export class TokenBucket {
  /**
   * 當前可用的 tokens 數量
   */
  private tokens: number

  /**
   * 上次補充 tokens 的時間戳（毫秒）
   */
  private lastRefill: number

  /**
   * 創建一個新的 TokenBucket 實例
   *
   * @param capacity - 桶的最大容量（tokens 上限）
   * @param refillRate - 每秒補充的 tokens 數量
   *
   * @example
   * ```typescript
   * // 每秒最多 100 個請求
   * const bucket = new TokenBucket(100, 100)
   * ```
   */
  constructor(
    private capacity: number,
    private refillRate: number
  ) {
    this.tokens = capacity
    this.lastRefill = Date.now()
  }

  /**
   * 嘗試從桶中消耗指定數量的 tokens
   *
   * 此方法會先執行 token 補充，然後檢查是否有足夠的 tokens。
   * 如果有足夠的 tokens，則消耗並返回 true；否則返回 false 且不消耗。
   *
   * @param tokens - 要消耗的 tokens 數量（預設為 1）
   * @returns 如果成功消耗則返回 true，否則返回 false
   *
   * @example
   * ```typescript
   * const bucket = new TokenBucket(10, 1)
   *
   * // 嘗試消耗 1 個 token
   * if (bucket.tryConsume()) {
   *   console.log('請求被允許')
   * }
   *
   * // 嘗試消耗 3 個 tokens
   * if (bucket.tryConsume(3)) {
   *   console.log('批次請求被允許')
   * }
   * ```
   */
  tryConsume(tokens = 1): boolean {
    // 處理負數或零的情況
    if (tokens <= 0) {
      return true
    }

    // 先補充 tokens
    this.refill()

    // 檢查是否有足夠的 tokens
    if (this.tokens >= tokens) {
      this.tokens -= tokens
      return true
    }

    return false
  }

  /**
   * 獲取當前可用的 tokens 數量
   *
   * 此方法會先執行補充操作，然後返回當前的 tokens 數量。
   *
   * @returns 當前可用的 tokens 數量
   *
   * @example
   * ```typescript
   * const bucket = new TokenBucket(10, 1)
   * console.log(`剩餘 ${bucket.getTokens()} 個 tokens`)
   * ```
   */
  getTokens(): number {
    this.refill()
    return this.tokens
  }

  /**
   * 根據經過的時間補充 tokens
   *
   * 此方法計算自上次補充以來經過的時間，並根據 refillRate 補充相應數量的 tokens。
   * tokens 數量不會超過容量上限。
   *
   * @private
   */
  private refill(): void {
    const now = Date.now()
    const elapsed = now - this.lastRefill

    // 如果時間沒有經過，或者 refillRate 為 0，則不補充
    if (elapsed <= 0 || this.refillRate <= 0) {
      return
    }

    // 計算應該補充的 tokens 數量
    // refillRate 是每秒的速率，elapsed 是毫秒，所以需要除以 1000
    const tokensToAdd = (elapsed / 1000) * this.refillRate

    if (tokensToAdd > 0) {
      // 補充 tokens，但不超過容量上限
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd)
      this.lastRefill = now
    }
  }
}
