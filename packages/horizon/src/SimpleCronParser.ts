/**
 * Simple, high-performance cron parser for standard expressions.
 */
export class SimpleCronParser {
  /**
   * Check if a cron expression is due at the given date/time
   */
  static isDue(expression: string, timezone = 'UTC', date: Date = new Date()): boolean {
    const parts = expression.trim().split(/\s+/)
    if (parts.length !== 5) {
      throw new Error(`Invalid cron expression: ${expression}`)
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

  private static getDateInTimezone(date: Date, timezone: string): Date {
    try {
      const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }))
      if (Number.isNaN(tzDate.getTime())) {
        throw new Error()
      }
      return tzDate
    } catch {
      throw new Error(`Invalid timezone: ${timezone}`)
    }
  }
}
