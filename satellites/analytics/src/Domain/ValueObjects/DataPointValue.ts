import { AnalyticsError } from '../../Application/Errors/AnalyticsError'

export interface DataPointValueProps {
  value: number
  unit: string | null
}

export class DataPointValue {
  private readonly _value: number
  private readonly _unit: string | null

  private constructor(value: number, unit: string | null = null) {
    this._value = value
    this._unit = unit
  }

  static of(value: number, unit?: string): DataPointValue {
    if (!Number.isFinite(value)) {
      throw AnalyticsError.invalidDataPointValue(`數值必須是有限數字，收到 ${value}`)
    }
    return new DataPointValue(value, unit ?? null)
  }

  static zero(unit?: string): DataPointValue {
    return new DataPointValue(0, unit ?? null)
  }

  get value(): number {
    return this._value
  }

  get unit(): string | null {
    return this._unit
  }

  add(other: DataPointValue): DataPointValue {
    if (this._unit !== other._unit) {
      throw AnalyticsError.invalidDataPointValue(
        `無法相加不同單位的值：${this._unit} 和 ${other._unit}`
      )
    }
    return new DataPointValue(this._value + other._value, this._unit)
  }

  subtract(other: DataPointValue): DataPointValue {
    if (this._unit !== other._unit) {
      throw AnalyticsError.invalidDataPointValue(
        `無法相減不同單位的值：${this._unit} 和 ${other._unit}`
      )
    }
    return new DataPointValue(this._value - other._value, this._unit)
  }

  multiply(factor: number): DataPointValue {
    if (!Number.isFinite(factor)) {
      throw AnalyticsError.invalidDataPointValue(`乘數必須是有限數字，收到 ${factor}`)
    }
    return new DataPointValue(this._value * factor, this._unit)
  }

  get isZero(): boolean {
    return this._value === 0
  }

  equals(other: DataPointValue): boolean {
    return this._value === other._value && this._unit === other._unit
  }

  toString(): string {
    return this._unit ? `${this._value} ${this._unit}` : `${this._value}`
  }
}
