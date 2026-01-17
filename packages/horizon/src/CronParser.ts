import { SimpleCronParser } from './SimpleCronParser'

/**
 * Advanced cron expression parser with fallback support.
 *
 * Uses SimpleCronParser for standard expressions and falls back
 * to the full cron-parser library for complex patterns.
 *
 * @example
 * ```typescript
 * // Check if task is due
 * const isDue = await CronParser.isDue('0 9 * * 1-5', 'UTC')
 *
 * // Get next execution time
 * const next = await CronParser.nextDate('*/15 * * * *', 'America/New_York')
 * console.log('Next run:', next)
 * ```
 *
 * @since 3.0.0
 * @public
 */
export class CronParser {
  /**
   * Get the next execution date based on a cron expression.
   *
   * @param expression - Cron expression
   * @param timezone - Timezone identifier
   * @param currentDate - Reference date
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
      throw new Error(`Invalid cron expression: ${ expression } `)
    }
  }

  /**
   * Check if the cron expression is due to run at the current time (minute precision).
   *
   * @param expression - Cron expression
   * @param timezone - Timezone identifier
   * @param currentDate - Reference date
   */
  static async isDue(
    expression: string,
    timezone = 'UTC',
    currentDate: Date = new Date()
  ): Promise<boolean> {
    // Try SimpleCronParser first (Synchronous and fast)
    try {
      return SimpleCronParser.isDue(expression, timezone, currentDate)
    } catch (_e) {
      // Fallback to heavy cron-parser if expression is complex/unsupported
      // or if calculation fails
    }

    try {
      // Check from 1 minute ago to see if the next scheduled time is "now"
      // This assumes the scheduler runs every minute
      const previousMinute = new Date(currentDate.getTime() - 60000)

      const parser = await import('cron-parser')
      const interval = parser.default.parseExpression(expression, {
        currentDate: previousMinute,
        tz: timezone,
      })

      const nextRun = interval.next().toDate()

      // Compare down to the minute
      return this.minuteMatches(nextRun, currentDate)
    } catch (_err) {
      return false
    }
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
