/**
 * Simple cron expression parser for task scheduling.
 *
 * Supports standard 5-field cron expressions with timezone awareness.
 * Fields: minute hour day-of-month month day-of-week
 *
 * Supported patterns:
 * - `*` - Any value
 * - `5` - Specific value
 * - `1-5` - Range
 * - `1,2,3` - List
 * - `*/5` - Step values
 * - `1 - 10 / 2` - Range with step
 *
 * @example
 * ```typescript
  * // Every 5 minutes
 * SimpleCronParser.isDue('*/5 * * * *', 'UTC', new Date())
  *
 * // Every day at 9:30 AM in New York
 * SimpleCronParser.isDue('30 9 * * *', 'America/New_York', new Date())
  *
 * // Every Monday at midnight
 * SimpleCronParser.isDue('0 0 * * 1', 'UTC', new Date())
  * ```
 *
 * @public
 */
export const SimpleCronParser = {
  /**
   * Check if a cron expression matches the given date.
   * Only supports standard 5-field cron expressions.
   *
   * Fields: minute hour day-of-month month day-of-week
   * Values:
   *  - * (any)
   *  - numbers (0-59, 1-31, 0-11, 0-7)
   *  - ranges (1-5)
   *  - lists (1,2,3)
   *  - steps (*\/5, 1-10/2)
   */
  isDue(expression: string, timezone: string, date: Date): boolean {
    const fields = expression.trim().split(/\s+/)

    if (fields.length !== 5) {
      throw new Error('SimpleCronParser only supports 5-field cron expressions')
    }

    // Adjust date to target timezone
    let targetDate = date
    if (timezone && timezone !== 'UTC') {
      try {
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
          hour12: false,
        }).formatToParts(date)

        const partMap: Record<string, string> = {}
        parts.forEach((p) => {
          partMap[p.type] = p.value
        })

        targetDate = new Date(
          parseInt(partMap.year ?? '0', 10),
          parseInt(partMap.month ?? '1', 10) - 1,
          parseInt(partMap.day ?? '1', 10),
          parseInt(partMap.hour ?? '0', 10) === 24 ? 0 : parseInt(partMap.hour ?? '0', 10),
          parseInt(partMap.minute ?? '0', 10),
          0
        )
      } catch (_e) {
        throw new Error(`Invalid timezone: ${ timezone } `)
      }
    } else if (timezone === 'UTC') {
      targetDate = new Date(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
        0
      )
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = fields
    if (
      minute === undefined ||
      hour === undefined ||
      dayOfMonth === undefined ||
      month === undefined ||
      dayOfWeek === undefined
    ) {
      throw new Error('Invalid cron expression')
    }

    const matchMinute = matchField(minute, targetDate.getMinutes(), 0, 59)
    const matchHour = matchField(hour, targetDate.getHours(), 0, 23)
    const matchDayOfMonth = matchField(dayOfMonth, targetDate.getDate(), 1, 31)
    const matchMonth = matchField(month, targetDate.getMonth() + 1, 1, 12)
    const matchDayOfWeek = matchField(dayOfWeek, targetDate.getDay(), 0, 7)

    return matchMinute && matchHour && matchDayOfMonth && matchMonth && matchDayOfWeek
  },
}

function matchField(pattern: string, value: number, min: number, max: number): boolean {
  // 1. Wildcard
  if (pattern === '*') {
    return true
  }

  // 2. Step (*/5, 1-10/2)
  if (pattern.includes('/')) {
    const [range, stepStr] = pattern.split('/')
    if (range === undefined || stepStr === undefined) {
      return false
    }
    const step = parseInt(stepStr, 10)

    if (range === '*') {
      return (value - min) % step === 0
    }

    // Range with step (e.g., 10-20/2)
    if (range.includes('-')) {
      const [startStr, endStr] = range.split('-')
      if (startStr === undefined || endStr === undefined) {
        return false
      }
      const start = parseInt(startStr, 10)
      const end = parseInt(endStr, 10)

      if (value >= start && value <= end) {
        return (value - start) % step === 0
      }
      return false
    }
  }

  // 3. List (1,2,3)
  if (pattern.includes(',')) {
    const parts = pattern.split(',')
    return parts.some((part) => matchField(part, value, min, max))
  }

  // 4. Range (1-5)
  if (pattern.includes('-')) {
    const [startStr, endStr] = pattern.split('-')
    if (startStr === undefined || endStr === undefined) {
      return false
    }
    const start = parseInt(startStr, 10)
    const end = parseInt(endStr, 10)
    return value >= start && value <= end
  }

  // 5. Exact value
  const expected = parseInt(pattern, 10)

  // Special case for DayOfWeek: 7 is also Sunday (0)
  if (max === 7 && expected === 7 && value === 0) {
    return true
  }

  return value === expected
}
