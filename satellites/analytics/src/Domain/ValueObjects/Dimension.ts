import { AnalyticsError } from '../../Application/Errors/AnalyticsError'

export interface DimensionProps {
  key: string
  value: string
}

export class Dimension {
  private readonly _key: string
  private readonly _value: string

  private constructor(key: string, value: string) {
    this._key = key
    this._value = value
  }

  static of(key: string, value: string): Dimension {
    Dimension.validate(key, value)
    return new Dimension(key, value)
  }

  private static validate(key: string, value: string): void {
    if (!key || typeof key !== 'string') {
      throw AnalyticsError.dimensionNotSupported('key 不能為空')
    }

    if (!value || typeof value !== 'string') {
      throw AnalyticsError.dimensionNotSupported(`key '${key}' 的 value 不能為空`)
    }

    if (!/^[a-z0-9_]+$/.test(key)) {
      throw AnalyticsError.dimensionNotSupported(`key 只允許小寫字母、數字和底線，收到 '${key}'`)
    }
  }

  get key(): string {
    return this._key
  }

  get value(): string {
    return this._value
  }

  matches(other: Dimension): boolean {
    return this._key === other._key
  }

  equals(other: Dimension): boolean {
    return this._key === other._key && this._value === other._value
  }

  toString(): string {
    return `${this._key}=${this._value}`
  }
}
