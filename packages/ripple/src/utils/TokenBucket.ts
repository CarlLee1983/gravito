/**
 * Simple Token Bucket algorithm for rate limiting.
 *
 * @internal
 */
export class TokenBucket {
  private tokens: number
  private lastRefill: number

  /**
   * Create a new TokenBucket instance.
   *
   * @param capacity - Max tokens in the bucket.
   * @param fillRatePerMs - Rate at which tokens are added (tokens per millisecond).
   */
  constructor(
    private capacity: number,
    private fillRatePerMs: number
  ) {
    this.tokens = capacity
    this.lastRefill = Date.now()
  }

  /**
   * Consume a token from the bucket.
   *
   * @returns true if token was consumed, false if bucket is empty.
   */
  consume(): boolean {
    this.refill()

    if (this.tokens >= 1) {
      this.tokens -= 1
      return true
    }

    return false
  }

  private refill(): void {
    const now = Date.now()
    const elapsed = now - this.lastRefill
    const newTokens = elapsed * this.fillRatePerMs

    if (newTokens > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + newTokens)
      this.lastRefill = now
    }
  }
}
