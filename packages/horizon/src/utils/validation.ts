import { HorizonError } from '../errors/HorizonError'
import { HorizonErrorCodes } from '../errors/codes'

/**
 * Parses and validates a 24-hour time string.
 *
 * Ensures the string follows the "HH:mm" format and that values are within
 * valid ranges (00-23 for hours, 00-59 for minutes).
 *
 * @param time - Time string in "HH:mm" format.
 * @returns Object containing validated hour and minute as integers.
 * @throws {HorizonError} If the format is invalid or values are out of bounds.
 *
 * @example
 * ```typescript
 * const { hour, minute } = parseTime('14:30'); // { hour: 14, minute: 30 }
 * ```
 *
 * @internal
 * @since 3.1.0
 */
export function parseTime(time: string): { hour: number; minute: number } {
  const timePattern = /^([0-2]\d):([0-5]\d)$/
  const match = time.match(timePattern)

  if (!match) {
    throw new HorizonError(422, HorizonErrorCodes.INVALID_TIME_FORMAT, {
      message: `Invalid time format: "${time}". Expected HH:mm (24-hour format, 00:00-23:59)`,
    })
  }

  const hour = Number.parseInt(match[1], 10)
  const minute = Number.parseInt(match[2], 10)

  if (hour > 23) {
    throw new HorizonError(422, HorizonErrorCodes.INVALID_TIME_FORMAT, {
      message: `Invalid time format: "${time}". Expected HH:mm (24-hour format, 00:00-23:59)`,
    })
  }

  return { hour, minute }
}

/**
 * Validates that a value is a valid cron minute field.
 *
 * @param minute - Numeric value to validate.
 * @throws {HorizonError} If the minute is not an integer between 0 and 59.
 *
 * @example
 * ```typescript
 * validateMinute(45); // OK
 * validateMinute(60); // throws HorizonError
 * ```
 *
 * @internal
 * @since 3.1.0
 */
export function validateMinute(minute: number): void {
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new HorizonError(422, HorizonErrorCodes.INVALID_MINUTE, {
      message: `Invalid minute: ${minute}. Expected integer 0-59`,
    })
  }
}

/**
 * Validates that a value is a valid cron day-of-week field.
 *
 * @param dayOfWeek - Numeric day index (0-6, where 0 is Sunday).
 * @throws {HorizonError} If the index is not an integer between 0 and 6.
 *
 * @example
 * ```typescript
 * validateDayOfWeek(0); // Sunday (OK)
 * validateDayOfWeek(7); // throws HorizonError
 * ```
 *
 * @internal
 * @since 3.1.0
 */
export function validateDayOfWeek(dayOfWeek: number): void {
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new HorizonError(422, HorizonErrorCodes.INVALID_DAY_OF_WEEK, {
      message: `Invalid day of week: ${dayOfWeek}. Expected 0-6 (Sunday=0, Saturday=6)`,
    })
  }
}

/**
 * Validates that a value is a valid cron day-of-month field.
 *
 * @param dayOfMonth - Numeric day (1-31).
 * @throws {HorizonError} If the day is not an integer between 1 and 31.
 *
 * @example
 * ```typescript
 * validateDayOfMonth(31); // OK
 * validateDayOfMonth(32); // throws HorizonError
 * ```
 *
 * @internal
 * @since 3.1.0
 */
export function validateDayOfMonth(dayOfMonth: number): void {
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
    throw new HorizonError(422, HorizonErrorCodes.INVALID_DAY_OF_MONTH, {
      message: `Invalid day of month: ${dayOfMonth}. Expected 1-31`,
    })
  }
}
