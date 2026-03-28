import { HorizonError } from './errors/HorizonError'
import { HorizonErrorCodes } from './errors/codes'
import { SimpleCronParser } from './SimpleCronParser'

interface CacheEntry {
  result: boolean
  timestamp: number
}

/**
 * High-performance cron expression evaluator with LRU caching and fallback support.
 *
 * Employs a tiered strategy for cron evaluation:
 * 1. Cache: O(1) lookup for high-frequency checks.
 * 2. Simple Parser: Lightweight evaluator for standard expressions.
 * 3. Advanced Parser: Dynamic import of `cron-parser` for complex expressions.
 *
 * @internal
 */
export class CronParser {
  private static cache = new Map<string, CacheEntry>()
  /** Cache duration in milliseconds (1 minute). */
  private static readonly CACHE_TTL = 60000
  /** Maximum number of unique expression/timezone combinations to store. */
  private static readonly MAX_CACHE_SIZE = 500

  /**
   * Calculates the next occurrence of a cron expression.
   *
   * Dynamically loads `cron-parser` to minimize initial bundle size and memory footprint.
   *
   * @param expression - Valid 5-part cron expression.
   * @param timezone - Target timezone for evaluation (default: "UTC").
   * @param currentDate - Reference time to calculate from (default: now).
   * @returns Resolves to the next execution Date object.
   * @throws {Error} If the expression format is invalid.
   *
   * @example
   * ```typescript
   * const next = await CronParser.nextDate('0 0 * * *');
   * ```
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
      throw new HorizonError(422, HorizonErrorCodes.CRON_PARSE_ERROR, {
        message: `Invalid cron expression: ${expression}`,
      })
    }
  }

  /**
   * Determines if a task is due for execution at the specified time.
   *
   * Uses minute-precision caching to optimize repeated evaluations within
   * the same scheduling window. Implements LRU eviction to maintain memory efficiency.
   *
   * @param expression - Cron expression to evaluate.
   * @param timezone - Execution timezone.
   * @param currentDate - Reference time for the check.
   * @returns True if the expression matches the reference time.
   */
  static async isDue(
    expression: string,
    timezone = 'UTC',
    currentDate: Date = new Date()
  ): Promise<boolean> {
    const minuteKey = `${expression}:${timezone}:${Math.floor(currentDate.getTime() / 60000)}`
    const now = Date.now()

    const cached = this.cache.get(minuteKey)
    if (cached) {
      if (now - cached.timestamp < this.CACHE_TTL) {
        // LRU: Refresh position by re-inserting
        this.cache.delete(minuteKey)
        this.cache.set(minuteKey, cached)
        return cached.result
      }
      // Expired entry
      this.cache.delete(minuteKey)
    }

    const result = await this.computeIsDue(expression, timezone, currentDate)

    this.cache.set(minuteKey, {
      result,
      timestamp: now,
    })

    this.cleanupCache()

    return result
  }

  /**
   * Internal logic for tiered cron evaluation.
   *
   * @param expression - Cron expression.
   * @param timezone - Target timezone.
   * @param currentDate - Current time.
   * @returns Boolean indicating if the task is due.
   *
   * @internal
   */
  private static async computeIsDue(
    expression: string,
    timezone: string,
    currentDate: Date
  ): Promise<boolean> {
    try {
      // Tier 1: Optimized simple parser
      return SimpleCronParser.isDue(expression, timezone, currentDate)
    } catch (_e) {
      // Fallback to advanced parser on error
    }

    try {
      // Tier 2: Full feature parser (dynamically loaded)
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

  /**
   * Evicts the oldest entry from the cache when capacity is reached.
   *
   * @internal
   */
  private static cleanupCache(): void {
    if (this.cache.size <= this.MAX_CACHE_SIZE) {
      return
    }

    const iterator = this.cache.keys()
    const oldestKey = iterator.next().value
    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  /**
   * Purges all entries from the internal cache.
   * Useful for testing or when global timezone settings change.
   */
  static clearCache(): void {
    this.cache.clear()
  }

  /**
   * Compares two dates with minute precision.
   *
   * @internal
   */
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
