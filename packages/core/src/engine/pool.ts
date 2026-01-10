/**
 * @fileoverview Generic Object Pool Implementation
 *
 * High-performance object pooling to reduce GC pressure.
 * Implements "fixed pool + overflow fallback" strategy.
 *
 * @module @gravito/core/engine
 */

/**
 * Generic object pool with fixed size and overflow handling
 *
 * @typeParam T - Type of objects to pool
 *
 * @example
 * ```typescript
 * const pool = new ObjectPool(
 *   () => new MyObject(),
 *   (obj) => obj.reset(),
 *   256
 * )
 *
 * const obj = pool.acquire()
 * try {
 *   // Use object
 * } finally {
 *   pool.release(obj)
 * }
 * ```
 */
export class ObjectPool<T> {
  private pool: T[] = []
  private readonly factory: () => T
  private readonly reset: (obj: T) => void
  private readonly maxSize: number

  /**
   * Create a new object pool
   *
   * @param factory - Function to create new objects
   * @param reset - Function to reset objects before reuse
   * @param maxSize - Maximum pool size (default: 256)
   */
  constructor(factory: () => T, reset: (obj: T) => void, maxSize = 256) {
    this.factory = factory
    this.reset = reset
    this.maxSize = maxSize
  }

  /**
   * Acquire an object from the pool
   *
   * If the pool is empty, creates a new object (overflow strategy).
   * This ensures the pool never blocks under high load.
   *
   * @returns Object from pool or newly created
   */
  acquire(): T {
    const obj = this.pool.pop()
    if (obj !== undefined) {
      return obj
    }

    // Pool exhausted - create new object (overflow)
    return this.factory()
  }

  /**
   * Release an object back to the pool
   *
   * If the pool is full, the object is discarded (will be GC'd).
   * This prevents unbounded memory growth.
   *
   * @param obj - Object to release
   */
  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.reset(obj)
      this.pool.push(obj)
    }
    // else: pool is full, let object be GC'd
  }

  /**
   * Clear all objects from the pool
   *
   * Useful for testing or when you need to force a clean slate.
   */
  clear(): void {
    this.pool = []
  }

  /**
   * Get current pool size
   */
  get size(): number {
    return this.pool.length
  }

  /**
   * Get maximum pool size
   */
  get capacity(): number {
    return this.maxSize
  }

  /**
   * Pre-warm the pool by creating objects in advance
   *
   * This can reduce latency for the first N requests.
   *
   * @param count - Number of objects to pre-create
   */
  prewarm(count: number): void {
    const targetSize = Math.min(count, this.maxSize)
    while (this.pool.length < targetSize) {
      const obj = this.factory()
      this.reset(obj)
      this.pool.push(obj)
    }
  }
}
