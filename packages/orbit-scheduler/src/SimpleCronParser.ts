export class SimpleCronParser {
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
  static isDue(expression: string, timezone: string, date: Date): boolean {
    const fields = expression.trim().split(/\s+/)

    if (fields.length !== 5) {
      throw new Error('SimpleCronParser only supports 5-field cron expressions')
    }

    // Adjust date to target timezone
    let targetDate = date
    if (timezone && timezone !== 'UTC') {
      try {
        // Create a date object in the target timezone
        // This is a bit tricky in JS without libraries.
        // We utilize Intl.DateTimeFormat to get parts in the target timezone
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

        // Reconstruct date from parts (treating it as local time for field comparison)
        // Note: Months in Intl are 1-12, Date() expects 0-11
        targetDate = new Date(
          parseInt(partMap.year!, 10),
          parseInt(partMap.month!, 10) - 1,
          parseInt(partMap.day!, 10),
          parseInt(partMap.hour!, 10) === 24 ? 0 : parseInt(partMap.hour!, 10), // Intl can return 24? usually 0-23
          parseInt(partMap.minute!, 10),
          0
        )
      } catch (_e) {
        // Fallback or error if timezone invalid
        // For simple usage, we might assume UTC if conversion fails or throw
        throw new Error(`Invalid timezone: ${timezone}`)
      }
    } else if (timezone === 'UTC') {
      // Use UTC methods of the date object
      // We can create a "local" date that represents the UTC time components
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

    const matchMinute = this.matchField(minute, targetDate.getMinutes(), 0, 59)
    const matchHour = this.matchField(hour, targetDate.getHours(), 0, 23)
    const matchDayOfMonth = this.matchField(dayOfMonth, targetDate.getDate(), 1, 31)
    const matchMonth = this.matchField(month, targetDate.getMonth() + 1, 1, 12) // Cron uses 1-12 for month
    const matchDayOfWeek = this.matchField(dayOfWeek, targetDate.getDay(), 0, 7) // Cron 0-7 (0/7 is Sun)

    return matchMinute && matchHour && matchDayOfMonth && matchMonth && matchDayOfWeek
  }

  private static matchField(pattern: string, value: number, min: number, max: number): boolean {
    // 1. Wildcard
    if (pattern === '*') {
      return true
    }

    // 2. Step (*\/5, 1-10/2)
    if (pattern.includes('/')) {
      const [range, stepStr] = pattern.split('/')
      if (range === undefined || stepStr === undefined) return false
      const step = parseInt(stepStr, 10)

      if (range === '*') {
        return (value - min) % step === 0
      }

      // Range with step (e.g., 10-20/2)
      if (range.includes('-')) {
        const [startStr, endStr] = range.split('-')
        if (startStr === undefined || endStr === undefined) return false
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
      return parts.some((part) => this.matchField(part, value, min, max))
    }

    // 4. Range (1-5)
    if (pattern.includes('-')) {
      const [startStr, endStr] = pattern.split('-')
      if (startStr === undefined || endStr === undefined) return false
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
}
