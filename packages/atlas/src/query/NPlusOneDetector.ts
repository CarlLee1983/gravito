export class NPlusOneDetector {
  private static queryCounts = new Map<string, { count: number; lastAt: number }>()
  private static timeframe = 1000
  private static threshold = 5
  private static enabled = process.env.NODE_ENV !== 'production'

  static track(tableName: string, sql: string, structureKey: string): void {
    if (!this.enabled) return

    const now = Date.now()
    const signature = `${tableName}:${structureKey}`

    const stats = this.queryCounts.get(signature) || { count: 0, lastAt: now }

    if (now - stats.lastAt > this.timeframe) {
      stats.count = 1
      stats.lastAt = now
    } else {
      stats.count++
      stats.lastAt = now
    }

    this.queryCounts.set(signature, stats)

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

  private static warn(tableName: string, sql: string, count: number): void {
    const message =
      `\n[Atlas] ⚠️ Potential N+1 Query Detected on table "${tableName}"\n` +
      `Executed ${count} similar queries within ${this.timeframe}ms.\n` +
      `Last Query: ${sql}\n` +
      `💡 Suggestion: Use .with() to eager load relationships or .whereIn() for bulk retrieval.\n`

    console.warn(message)
  }
}
