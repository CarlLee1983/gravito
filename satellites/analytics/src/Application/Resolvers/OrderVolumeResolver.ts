import type {
  AnalyticsQuery,
  AnalyticsResponse,
  IAnalyticsResolver,
} from '../../Domain/Contracts/IAnalyticsResolver'

export class OrderVolumeResolver implements IAnalyticsResolver {
  metric = 'order_volume'

  async resolve(_query: AnalyticsQuery): Promise<AnalyticsResponse> {
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
