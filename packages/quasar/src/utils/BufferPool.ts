import { ObjectPool } from './pool'

export class BufferPool {
  private static pools = new Map<number, ObjectPool<any>>()

  static getPool(size: number): ObjectPool<Buffer> {
    let pool = this.pools.get(size)
    if (!pool) {
      pool = new ObjectPool(
        () => Buffer.allocUnsafe(size),
        () => {},
        128
      )
      this.pools.set(size, pool)
    }
    return pool as ObjectPool<Buffer>
  }

  static acquire(size: number): Buffer {
    return this.getPool(size).acquire()
  }

  static release(buffer: Buffer): void {
    const pool = this.pools.get(buffer.length)
    if (pool) {
      pool.release(buffer)
    }
  }

  /**
   * Pre-warm multiple buffer pools of different sizes.
   *
   * @param sizes - An array of buffer sizes to pre-warm.
   * @param count - The number of buffers to pre-warm for each size. @default 32
   */
  static prewarm(sizes: number[], count = 32): void {
    for (const size of sizes) {
      this.getPool(size).prewarm(count)
    }
  }

  /**
   * Get internal usage statistics for all active buffer pools.
   *
   * @returns A map of buffer sizes to their respective pool statistics.
   * @since 10.0.0
   */
  static getStats(): Record<number, any> {
    const stats: Record<number, any> = {}
    for (const [size, pool] of this.pools.entries()) {
      stats[size] = pool.getStats()
    }
    return stats
  }
}
