import { ValueObject } from '@gravito/enterprise'

interface AnalyticsFiltersProps {
  filters: Record<string, string>
}

/**
 * AnalyticsFilters ValueObject - 強型別的篩選條件容器
 * 包裝 Record<string, string> 以提供安全的查詢介面
 */
export class AnalyticsFilters extends ValueObject<AnalyticsFiltersProps> {
  private constructor(props: AnalyticsFiltersProps) {
    super(props)
  }

  static of(record?: Record<string, string>): AnalyticsFilters {
    const filters = record ? { ...record } : {}
    return new AnalyticsFilters({ filters })
  }

  get(key: string): string | undefined {
    return this.props.filters[key]
  }

  has(key: string): boolean {
    return key in this.props.filters
  }

  isEmpty(): boolean {
    return Object.keys(this.props.filters).length === 0
  }

  toRecord(): Record<string, string> {
    return { ...this.props.filters }
  }
}
