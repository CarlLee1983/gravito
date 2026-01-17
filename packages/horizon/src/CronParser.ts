import { SimpleCronParser } from './SimpleCronParser'

/**
 * Advanced cron expression parser with fallback support.
 */
export class CronParser {
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
