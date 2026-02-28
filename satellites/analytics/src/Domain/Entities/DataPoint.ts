import { Entity } from '@gravito/enterprise'
import type { DataPointValue } from '../ValueObjects/DataPointValue'
import type { Dimension } from '../ValueObjects/Dimension'
import type { MetricName } from '../ValueObjects/MetricName'

export interface DataPointProps {
  metricName: MetricName
  value: DataPointValue
  timestamp: Date
  dimensions: Dimension[]
  source: string
  createdAt: Date
}

export class DataPoint extends Entity<string> {
  constructor(
    id: string,
    private props: DataPointProps
  ) {
    super(id)
  }

  static create(
    id: string,
    metricName: MetricName,
    value: DataPointValue,
    timestamp: Date,
    source: string,
    dimensions: Dimension[] = []
  ): DataPoint {
    return new DataPoint(id, {
      metricName,
      value,
      timestamp: new Date(timestamp.getTime()),
      dimensions: [...dimensions],
      source,
      createdAt: new Date(),
    })
  }

  static reconstitute(id: string, props: DataPointProps): DataPoint {
    return new DataPoint(id, {
      ...props,
      timestamp: new Date(props.timestamp.getTime()),
      createdAt: new Date(props.createdAt.getTime()),
      dimensions: [...props.dimensions],
    })
  }

  get metricName(): MetricName {
    return this.props.metricName
  }

  get value(): DataPointValue {
    return this.props.value
  }

  get timestamp(): Date {
    return new Date(this.props.timestamp.getTime())
  }

  get dimensions(): Dimension[] {
    return [...this.props.dimensions]
  }

  get source(): string {
    return this.props.source
  }

  get createdAt(): Date {
    return new Date(this.props.createdAt.getTime())
  }

  hasDimension(key: string): boolean {
    return this.props.dimensions.some((d) => d.key === key)
  }

  getDimensionValue(key: string): string | undefined {
    return this.props.dimensions.find((d) => d.key === key)?.value
  }
}
