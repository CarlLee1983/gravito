export interface AnalyticsQuery {
  metric: string
  period: '24h' | '7d' | '30d' | '90d'
  filters?: Record<string, any>
}

export interface AnalyticsResponse {
  type: 'TIMESERIES' | 'SINGLE_VALUE' | 'PIE' | 'TABLE'
  data: any
  summary?: string
}

export interface IAnalyticsResolver {
  metric: string
  resolve(query: AnalyticsQuery): Promise<AnalyticsResponse>
}
