export class NPlusOneDetector {
  private static queryCounts = new Map<string, { count: number; lastAt: number }>()
  private static timeframe = 1000
  private static threshold = 5
  private static enabled = process.env.NODE_ENV !== 'production'
  private static readonly MAX_ENTRIES = 500

  static track(tableName: string, sql: string, structureKey: string): void {
    if (!this.enabled) {
      return
    }

    const now = Date.now()
    const signature = `${tableName}:${structureKey}`

    if (this.queryCounts.size >= this.MAX_ENTRIES && !this.queryCounts.has(signature)) {
      this.evictStale(now)
    }

    const existing = this.queryCounts.get(signature)

    if (!existing || now - existing.lastAt > this.timeframe) {
      this.queryCounts.set(signature, { count: 1, lastAt: now })
    } else {
      this.queryCounts.set(signature, { count: existing.count + 1, lastAt: now })
    }

    const stats = this.queryCounts.get(signature)!

    if (stats.count === this.threshold) {
      this.warn(tableName, sql, stats.count)
    }
  }

  static reset(): void {
    this.queryCounts.clear()
  }

  static setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  private static evictStale(now: number): void {
    const staleThreshold = now - this.timeframe * 2

    for (const [key, stats] of this.queryCounts) {
      if (stats.lastAt < staleThreshold) {
        this.queryCounts.delete(key)
      }
    }

    if (this.queryCounts.size >= this.MAX_ENTRIES) {
      const evictCount = Math.floor(this.MAX_ENTRIES * 0.25)
      const entries = [...this.queryCounts.entries()].sort((a, b) => a[1].lastAt - b[1].lastAt)

      for (let i = 0; i < evictCount && i < entries.length; i++) {
        this.queryCounts.delete(entries[i][0])
      }
    }
  }

  private static warn(tableName: string, sql: string, count: number): void {
    const message =
      `\n[Atlas] ⚠️ Potential N+1 Query Detected on table "${tableName}"\n` +
      `Executed ${count} similar queries within ${this.timeframe}ms.\n` +
      `Last Query: ${sql}\n` +
      `💡 Suggestion: Use .with() to eager load relationships or .whereIn() for bulk retrieval.\n`

    console.warn(message)
  }
}
