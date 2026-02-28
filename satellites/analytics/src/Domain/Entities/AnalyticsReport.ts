import { AggregateRoot, type DomainEvent } from '@gravito/enterprise'
import { AnalyticsError } from '../../Application/Errors/AnalyticsError'
import type { MetricName } from '../ValueObjects/MetricName'
import type { TimePeriod } from '../ValueObjects/TimePeriod'
import type { DataPoint } from './DataPoint'

export type AggregationType = 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX'
export type ChartType = 'TIMESERIES' | 'SINGLE_VALUE' | 'PIE' | 'TABLE'

export interface AnalyticsReportProps {
  metricName: MetricName
  period: TimePeriod
  aggregation: AggregationType
  chartType: ChartType
  dataPoints: DataPoint[]
  summary: string | null
  generatedAt: Date
}

export class AnalyticsReportGenerated implements DomainEvent {
  public readonly eventName = 'analytics.report_generated'
  public readonly occurredOn = new Date()
  public readonly eventId = `evt-${Date.now()}-${Math.random()}`

  constructor(
    public readonly reportId: string,
    public readonly metricName: string,
    public readonly aggregatedValue: number,
    public readonly dataPointCount: number
  ) {}
}

export class AnalyticsReport extends AggregateRoot<string> {
  private constructor(
    id: string,
    private props: AnalyticsReportProps
  ) {
    super(id)
  }

  static create(
    id: string,
    metricName: MetricName,
    period: TimePeriod,
    aggregation: AggregationType,
    chartType: ChartType
  ): AnalyticsReport {
    return new AnalyticsReport(id, {
      metricName,
      period,
      aggregation,
      chartType,
      dataPoints: [],
      summary: null,
      generatedAt: new Date(),
    })
  }

  static reconstitute(id: string, props: AnalyticsReportProps): AnalyticsReport {
    return new AnalyticsReport(id, {
      ...props,
      period: props.period,
      dataPoints: [...props.dataPoints],
      generatedAt: new Date(props.generatedAt.getTime()),
    })
  }

  get metricName(): MetricName {
    return this.props.metricName
  }

  get period(): TimePeriod {
    return this.props.period
  }

  get aggregation(): AggregationType {
    return this.props.aggregation
  }

  get chartType(): ChartType {
    return this.props.chartType
  }

  get dataPoints(): DataPoint[] {
    return [...this.props.dataPoints]
  }

  get summary(): string | null {
    return this.props.summary
  }

  get generatedAt(): Date {
    return new Date(this.props.generatedAt.getTime())
  }

  get dataPointCount(): number {
    return this.props.dataPoints.length
  }

  get isEmpty(): boolean {
    return this.props.dataPoints.length === 0
  }

  addDataPoint(dataPoint: DataPoint): void {
    if (!dataPoint.metricName.equals(this.props.metricName)) {
      throw AnalyticsError.invalidMetricName(
        `指標不匹配：${dataPoint.metricName.fullName} vs ${this.props.metricName.fullName}`
      )
    }
    this.props.dataPoints.push(dataPoint)
  }

  setDataPoints(dataPoints: DataPoint[]): void {
    for (const dp of dataPoints) {
      if (!dp.metricName.equals(this.props.metricName)) {
        throw AnalyticsError.invalidMetricName(
          `指標不匹配：${dp.metricName.fullName} vs ${this.props.metricName.fullName}`
        )
      }
    }
    this.props.dataPoints = [...dataPoints]
  }

  computeAggregatedValue(): number {
    if (this.isEmpty) {
      return 0
    }

    const values = this.props.dataPoints.map((dp) => dp.value.value)

    switch (this.props.aggregation) {
      case 'SUM':
        return values.reduce((sum, v) => sum + v, 0)
      case 'AVG':
        return values.reduce((sum, v) => sum + v, 0) / values.length
      case 'COUNT':
        return values.length
      case 'MIN':
        return Math.min(...values)
      case 'MAX':
        return Math.max(...values)
    }
  }

  computeSummary(): void {
    if (this.isEmpty) {
      this.props.summary = '無資料'
      return
    }

    const aggregatedValue = this.computeAggregatedValue()
    const dataPointCount = this.props.dataPoints.length
    const metricName = this.props.metricName.fullName

    this.props.summary =
      `${metricName} 在 ${this.props.period.toString()} 的${this.props.aggregation}值為 ${aggregatedValue.toFixed(2)}` +
      `（共 ${dataPointCount} 個資料點）`
  }

  markAsGenerated(): void {
    const aggregatedValue = this.computeAggregatedValue()
    this.addDomainEvent(
      new AnalyticsReportGenerated(
        this.id,
        this.props.metricName.fullName,
        aggregatedValue,
        this.dataPointCount
      )
    )
  }
}
