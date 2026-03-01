import { AggregateRoot, type DomainEvent } from '@gravito/enterprise'
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
  aggregatedValue?: number
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

  get aggregatedValue(): number {
    return this.props.aggregatedValue ?? 0
  }

  /**
   * 批量設置資料點（預驗證）
   *
   * 驗證應在 Role 層面執行
   */
  setDataPoints(dataPoints: DataPoint[]): void {
    this.props.dataPoints = [...dataPoints]
  }

  /**
   * 設置摘要文本（由 ReportBuilder 透過聚合計算結果產生）
   */
  setSummary(summary: string): void {
    this.props.summary = summary
  }

  /**
   * 設置聚合值（由 ReportBuilder 計算後設置）
   */
  setAggregatedValue(value: number): void {
    this.props.aggregatedValue = value
  }

  /**
   * 發佈報告生成事件
   *
   * 前置條件：aggregatedValue 應由 ReportBuilder 設置
   */
  markAsGenerated(): void {
    const aggregatedValue = this.props.aggregatedValue ?? 0
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
