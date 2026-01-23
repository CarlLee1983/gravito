import { SimpleCronParser } from './SimpleCronParser'

interface CacheEntry {
  result: boolean
  timestamp: number
}

/**
 * Advanced cron expression parser with fallback support and LRU caching.
 */
export class CronParser {
  private static cache = new Map<string, CacheEntry>()
  private static readonly CACHE_TTL = 60000
  private static readonly MAX_CACHE_SIZE = 500

  /**
   * Get the next execution date based on a cron expression.
   */
  static async nextDate(
    expression: string,
    timezone = 'UTC',
    currentDate: Date = new Date()
  ): Promise<Date> {
    try {
      const parser = await import('cron-parser')
      const interval = parser.default.parseExpression(expression, {
        currentDate,
        tz: timezone,
      })
      return interval.next().toDate()
    } catch (_err) {
      throw new Error(`Invalid cron expression: ${expression}`)
    }
  }

  /**
   * Check if the cron expression is due to run at the current time (minute precision).
   */
  static async isDue(
    expression: string,
    timezone = 'UTC',
    currentDate: Date = new Date()
  ): Promise<boolean> {
    const minuteKey = `${expression}:${timezone}:${Math.floor(currentDate.getTime() / 60000)}`

    const cached = this.cache.get(minuteKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result
    }

    const result = await this.computeIsDue(expression, timezone, currentDate)

    this.cache.set(minuteKey, {
      result,
      timestamp: Date.now(),
    })

    this.cleanupCache()

    return result
  }

  private static async computeIsDue(
    expression: string,
    timezone: string,
    currentDate: Date
  ): Promise<boolean> {
    try {
      return SimpleCronParser.isDue(expression, timezone, currentDate)
    } catch (_e) {
      // ignore
    }

    try {
      const previousMinute = new Date(currentDate.getTime() - 60000)
      const parser = await import('cron-parser')
      const interval = parser.default.parseExpression(expression, {
        currentDate: previousMinute,
        tz: timezone,
      })

      const nextRun = interval.next().toDate()
      return this.minuteMatches(nextRun, currentDate)
    } catch (_err) {
      return false
    }
  }

  private static cleanupCache(): void {
    const now = Date.now()

    for (const [key, value] of this.cache) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.cache.delete(key)
      }
    }

    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const entries = [...this.cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)
      const toDelete = entries.slice(0, this.cache.size - this.MAX_CACHE_SIZE)
      for (const [key] of toDelete) {
        this.cache.delete(key)
      }
    }
  }

  static clearCache(): void {
    this.cache.clear()
  }

  private static minuteMatches(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate() &&
      date1.getHours() === date2.getHours() &&
      date1.getMinutes() === date2.getMinutes()
    )
  }
}
