import { AnalyticsError } from '../../Application/Errors/AnalyticsError'

export interface MetricNameProps {
  namespace: string
  name: string
}

export class MetricName {
  private readonly _namespace: string
  private readonly _name: string

  private constructor(namespace: string, name: string) {
    this._namespace = namespace
    this._name = name
  }

  static of(fullName: string): MetricName {
    const parts = fullName.split('.')
    if (parts.length !== 2) {
      throw AnalyticsError.invalidMetricName('格式必須為 namespace.metric_name')
    }
    return MetricName.ofParts(parts[0]!, parts[1]!)
  }

  static ofParts(namespace: string, name: string): MetricName {
    MetricName.validate(namespace, 'namespace')
    MetricName.validate(name, 'name')
    return new MetricName(namespace, name)
  }

  private static validate(value: string, field: string): void {
    if (!value || typeof value !== 'string') {
      throw AnalyticsError.invalidMetricName(`${field} 不能為空`)
    }

    if (!/^[a-z0-9_]+$/.test(value)) {
      throw AnalyticsError.invalidMetricName(`${field} 只允許小寫字母、數字和底線`)
    }

    if (value.startsWith('_') || value.endsWith('_')) {
      throw AnalyticsError.invalidMetricName(`${field} 不能以底線開頭或結尾`)
    }

    if (value.length < 2 || value.length > 50) {
      throw AnalyticsError.invalidMetricName(`${field} 長度必須在 2-50 個字元`)
    }
  }

  get namespace(): string {
    return this._namespace
  }

  get name(): string {
    return this._name
  }

  get fullName(): string {
    return `${this._namespace}.${this._name}`
  }

  equals(other: MetricName): boolean {
    return this._namespace === other._namespace && this._name === other._name
  }

  toString(): string {
    return this.fullName
  }
}
