/**
 * Parse and validate time string in HH:mm format.
 *
 * @param time - Time string in "HH:mm" format (24-hour)
 * @returns Object containing validated hour and minute values
 * @throws Error if the time format is invalid
 *
 * @example
 * ```typescript
 * const { hour, minute } = parseTime('14:30')  // { hour: 14, minute: 30 }
 * parseTime('25:00')  // throws Error
 * parseTime('invalid')  // throws Error
 * ```
 *
 * @internal
 * @since 3.1.0
 */
export function parseTime(time: string): { hour: number; minute: number } {
  const timePattern = /^([0-2]\d):([0-5]\d)$/
  const match = time.match(timePattern)

  if (!match) {
    throw new Error(`Invalid time format: "${time}". Expected HH:mm (24-hour format, 00:00-23:59)`)
  }

  const hour = Number.parseInt(match[1], 10)
  const minute = Number.parseInt(match[2], 10)

  if (hour > 23) {
    throw new Error(`Invalid time format: "${time}". Expected HH:mm (24-hour format, 00:00-23:59)`)
  }

  return { hour, minute }
}

/**
 * Validate minute value for hourly schedules.
 *
 * @param minute - Minute value to validate (should be 0-59)
 * @throws Error if the minute is not a valid integer between 0 and 59
 *
 * @example
 * ```typescript
 * validateMinute(30)  // OK
 * validateMinute(60)  // throws Error
 * validateMinute(-1)  // throws Error
 * validateMinute(1.5)  // throws Error
 * ```
 *
 * @internal
 * @since 3.1.0
 */
export function validateMinute(minute: number): void {
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new Error(`Invalid minute: ${minute}. Expected integer 0-59`)
  }
}

/**
 * Validate day of week value for weekly schedules.
 *
 * @param dayOfWeek - Day of week (0-6, where 0 = Sunday, 6 = Saturday)
 * @throws Error if the day of week is not a valid integer between 0 and 6
 *
 * @example
 * ```typescript
 * validateDayOfWeek(0)  // OK (Sunday)
 * validateDayOfWeek(6)  // OK (Saturday)
 * validateDayOfWeek(7)  // throws Error
 * validateDayOfWeek(-1)  // throws Error
 * ```
 *
 * @internal
 * @since 3.1.0
 */
export function validateDayOfWeek(dayOfWeek: number): void {
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error(`Invalid day of week: ${dayOfWeek}. Expected 0-6 (Sunday=0, Saturday=6)`)
  }
}

/**
 * Validate day of month value for monthly schedules.
 *
 * @param dayOfMonth - Day of month (1-31)
 * @throws Error if the day of month is not a valid integer between 1 and 31
 *
 * @example
 * ```typescript
 * validateDayOfMonth(1)  // OK
 * validateDayOfMonth(31)  // OK
 * validateDayOfMonth(0)  // throws Error
 * validateDayOfMonth(32)  // throws Error
 * ```
 *
 * @internal
 * @since 3.1.0
 */
export function validateDayOfMonth(dayOfMonth: number): void {
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
    throw new Error(`Invalid day of month: ${dayOfMonth}. Expected 1-31`)
  }
}
