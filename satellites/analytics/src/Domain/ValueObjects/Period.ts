import { ValueObject } from '@gravito/enterprise'
import { AnalyticsErrorFactory } from '../../Application/Errors/AnalyticsError'

export type PeriodValue = '24h' | '7d' | '30d' | '90d'

interface PeriodProps {
  value: PeriodValue
}

/**
 * Period ValueObject - 代表時間週期
 * 允許值：24h、7d、30d、90d
 */
export class Period extends ValueObject<PeriodProps> {
  private static readonly ALLOWED_PERIODS: PeriodValue[] = ['24h', '7d', '30d', '90d']
  private static readonly PERIOD_TO_MILLISECONDS: Record<PeriodValue, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
  }

  private constructor(props: PeriodProps) {
    super(props)
  }

  static of(value?: string | PeriodValue): Period {
    const period = (value || '7d') as string

    if (!this.ALLOWED_PERIODS.includes(period as PeriodValue)) {
      throw AnalyticsErrorFactory.invalidPeriod(period)
    }

    return new Period({ value: period as PeriodValue })
  }

  get value(): PeriodValue {
    return this.props.value
  }

  toMilliseconds(): number {
    return Period.PERIOD_TO_MILLISECONDS[this.props.value]
  }
}
