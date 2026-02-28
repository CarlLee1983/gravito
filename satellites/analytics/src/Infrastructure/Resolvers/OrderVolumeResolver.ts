import type {
  IMetricResolver,
  MetricQuery,
  MetricResult,
} from '../../Domain/Contracts/IAnalyticsResolver'
import { MetricId } from '../../Domain/ValueObjects/MetricId'

/**
 * OrderVolumeResolver - 訂單量指標解析器
 * Infrastructure 層實現：具體的業務邏輯
 */
export class OrderVolumeResolver implements IMetricResolver {
  readonly metric: MetricId = MetricId.of('order_volume')

  async resolve(_query: MetricQuery): Promise<MetricResult> {
    // 模擬數據邏輯
    return {
      type: 'TIMESERIES',
      data: [
        { label: 'Mon', value: 120 },
        { label: 'Tue', value: 150 },
        { label: 'Wed', value: 80 },
        { label: 'Thu', value: 200 },
        { label: 'Fri', value: 170 },
        { label: 'Sat', value: 250 },
        { label: 'Sun', value: 300 },
      ],
      summary: '本週訂單量增長 15%',
    }
  }
}
