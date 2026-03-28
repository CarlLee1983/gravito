import { HorizonError } from './errors/HorizonError'
import { HorizonErrorCodes } from './errors/codes'

/**
 * Lightweight, zero-dependency cron parser for standard expressions.
 *
 * Designed for high-frequency evaluation of standard 5-part cron expressions.
 * Supports wildcards (*), lists (,), ranges (-), and steps (/).
 *
 * Performance considerations:
 * - Optimized for standard syntax to avoid overhead of complex parsers.
 * - Synchronous evaluation for O(1) time complexity per check.
 * - Used as the first tier in the `CronParser` evaluation strategy.
 *
 * @internal
 */
export class SimpleCronParser {
  /**
   * Evaluates if a cron expression matches the specified date and timezone.
   *
   * @param expression - Standard 5-part cron expression.
   * @param timezone - Target timezone for comparison (default: "UTC").
   * @param date - Reference date to check (default: now).
   * @returns True if the expression is due at the given minute.
   * @throws {Error} If the expression is malformed or the timezone is invalid.
   *
   * @example
   * ```typescript
   * const isDue = SimpleCronParser.isDue('0 * * * *', 'Asia/Taipei');
   * ```
   */
  static isDue(expression: string, timezone = 'UTC', date: Date = new Date()): boolean {
    const parts = expression.trim().split(/\s+/)
    if (parts.length !== 5) {
      throw new HorizonError(422, HorizonErrorCodes.CRON_PARSE_ERROR, {
        message: `Invalid cron expression: ${expression}`,
      })
    }

    const targetDate = this.getDateInTimezone(date, timezone)

    const minutes = targetDate.getMinutes()
    const hours = targetDate.getHours()
    const dayOfMonth = targetDate.getDate()
    const month = targetDate.getMonth() + 1
    const dayOfWeek = targetDate.getDay()

    return (
      this.match(parts[0]!, minutes, 0, 59) &&
      this.match(parts[1]!, hours, 0, 23) &&
      this.match(parts[2]!, dayOfMonth, 1, 31) &&
      this.match(parts[3]!, month, 1, 12) &&
      this.match(parts[4]!, dayOfWeek, 0, 6, true)
    )
  }

  /**
   * Internal pattern matching logic for individual cron fields.
   *
   * @param pattern - Cron sub-expression (e.g., "1-5").
   * @param value - Extracted date component value.
   * @param _min - Field minimum boundary.
   * @param _max - Field maximum boundary.
   * @param isDayOfWeek - Special handling for Sunday (0 and 7).
   * @returns Boolean indicating a match.
   *
   * @internal
   */
  private static match(
    pattern: string,
    value: number,
    _min: number,
    _max: number,
    isDayOfWeek = false
  ): boolean {
    if (pattern === '*') {
      return true
    }

    if (pattern.includes(',')) {
      return pattern.split(',').some((p) => this.match(p, value, _min, _max, isDayOfWeek))
    }

    const stepMatch = pattern.match(/^(\*|\d+(-\d+)?)\/(\d+)$/)
    if (stepMatch) {
      const range = stepMatch[1]!
      const step = parseInt(stepMatch[3]!, 10)
      if (range === '*') {
        return value % step === 0
      }
      const [rMin, rMax] = range.split('-').map((n) => parseInt(n!, 10))
      return value >= rMin! && value <= rMax! && (value - rMin!) % step === 0
    }

    if (pattern.includes('-')) {
      const [rMin, rMax] = pattern.split('-').map((n) => parseInt(n!, 10))
      return value >= rMin! && value <= rMax!
    }

    const patternVal = parseInt(pattern, 10)
    if (isDayOfWeek && patternVal === 7 && value === 0) {
      return true
    }
    return patternVal === value
  }

  /**
   * Resolves a Date object to the specified timezone.
   *
   * @param date - Source UTC date.
   * @param timezone - Target timezone string.
   * @returns Localized Date object.
   * @throws {Error} If the timezone is invalid.
   *
   * @internal
   */
  private static getDateInTimezone(date: Date, timezone: string): Date {
    try {
      const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }))
      if (Number.isNaN(tzDate.getTime())) {
        throw new HorizonError(422, HorizonErrorCodes.INVALID_TIMEZONE, {
          message: `Invalid timezone: ${timezone}`,
        })
      }
      return tzDate
    } catch (err) {
      if (err instanceof HorizonError) throw err
      throw new HorizonError(422, HorizonErrorCodes.INVALID_TIMEZONE, {
        message: `Invalid timezone: ${timezone}`,
      })
    }
  }
}
