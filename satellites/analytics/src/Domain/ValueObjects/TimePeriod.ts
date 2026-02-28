import { AnalyticsError } from '../../Application/Errors/AnalyticsError'

export type PeriodPreset = '1h' | '24h' | '7d' | '30d' | '90d' | '365d'

export interface TimePeriodProps {
  startDate: Date
  endDate: Date
  preset: PeriodPreset | null
}

export class TimePeriod {
  private readonly _startDate: Date
  private readonly _endDate: Date
  private readonly _preset: PeriodPreset | null

  private constructor(startDate: Date, endDate: Date, preset: PeriodPreset | null = null) {
    this._startDate = new Date(startDate.getTime())
    this._endDate = new Date(endDate.getTime())
    this._preset = preset
  }

  static fromPreset(preset: PeriodPreset): TimePeriod {
    const now = new Date()
    const start = new Date(now.getTime())

    const durationMap: Record<PeriodPreset, number> = {
      '1h': 3600000,
      '24h': 86400000,
      '7d': 604800000,
      '30d': 2592000000,
      '90d': 7776000000,
      '365d': 31536000000,
    }

    start.setTime(start.getTime() - durationMap[preset])
    return new TimePeriod(start, now, preset)
  }

  static ofRange(start: Date, end: Date): TimePeriod {
    if (start > end) {
      throw AnalyticsError.invalidDateRange(start, end)
    }
    return new TimePeriod(start, end, null)
  }

  get startDate(): Date {
    return new Date(this._startDate.getTime())
  }

  get endDate(): Date {
    return new Date(this._endDate.getTime())
  }

  get preset(): PeriodPreset | null {
    return this._preset
  }

  get durationMs(): number {
    return this._endDate.getTime() - this._startDate.getTime()
  }

  get durationDays(): number {
    return Math.ceil(this.durationMs / 86400000)
  }

  contains(date: Date): boolean {
    return date.getTime() >= this._startDate.getTime() && date.getTime() <= this._endDate.getTime()
  }

  overlaps(other: TimePeriod): boolean {
    return this._startDate < other._endDate && other._startDate < this._endDate
  }

  equals(other: TimePeriod): boolean {
    return (
      this._startDate.getTime() === other._startDate.getTime() &&
      this._endDate.getTime() === other._endDate.getTime()
    )
  }

  toString(): string {
    if (this._preset) {
      return this._preset
    }
    return `${this._startDate.toISOString()}~${this._endDate.toISOString()}`
  }
}
