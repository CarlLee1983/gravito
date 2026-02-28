import { ValueObject } from '@gravito/enterprise'
import { AnalyticsErrorFactory } from '../../Application/Errors/AnalyticsError'

interface MetricIdProps {
  value: string
}

/**
 * MetricId ValueObject - 代表指標的唯一識別符
 * 格式：^[a-z][a-z0-9_]*$（小寫字母開頭，包含小寫字母、數字和底線）
 */
export class MetricId extends ValueObject<MetricIdProps> {
  private static readonly METRIC_ID_PATTERN = /^[a-z][a-z0-9_]*$/

  private constructor(props: MetricIdProps) {
    super(props)
  }

  static of(value: string): MetricId {
    const trimmed = value.trim().toLowerCase()

    if (!this.METRIC_ID_PATTERN.test(trimmed)) {
      throw AnalyticsErrorFactory.invalidMetricId(value)
    }

    return new MetricId({ value: trimmed })
  }

  get value(): string {
    return this.props.value
  }
}
