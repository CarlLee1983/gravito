export class ObjectPool<T> {
  private pool: T[] = []
  private readonly factory: () => T
  private readonly reset: (obj: T) => void
  private readonly maxSize: number
  private totalCreated = 0

  constructor(factory: () => T, reset: (obj: T) => void, maxSize = 256) {
    this.factory = factory
    this.reset = reset
    this.maxSize = maxSize
  }

  acquire(): T {
    const obj = this.pool.pop()
    if (obj !== undefined) {
      return obj
    }
    this.totalCreated++
    return this.factory()
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.reset(obj)
      this.pool.push(obj)
    }
  }

  /**
   * Pre-fill the pool with a specified number of objects.
   *
   * @param count - The number of objects to pre-fill.
   */
  prewarm(count: number): void {
    const targetSize = Math.min(count, this.maxSize)
    while (this.pool.length < targetSize) {
      const obj = this.factory()
      this.totalCreated++
      this.reset(obj)
      this.pool.push(obj)
    }
  }

  /**
   * Get internal usage statistics for the object pool.
   *
   * @returns An object containing total objects created, available objects, and used objects.
   * @since 10.0.0
   */
  getStats() {
    return {
      total: this.totalCreated,
      available: this.pool.length,
      used: this.totalCreated - this.pool.length,
      maxSize: this.maxSize,
    }
  }
}
