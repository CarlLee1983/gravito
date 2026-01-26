export interface NotificationMetric {
  notification: string
  channel: string
  success: boolean
  duration: number
  timestamp: Date
  error?: string
  retryCount?: number
}

export interface MetricsSummary {
  totalSent: number
  totalSuccess: number
  totalFailed: number
  avgDuration: number
  byChannel: Record<
    string,
    {
      sent: number
      success: number
      failed: number
      avgDuration: number
    }
  >
  byNotification: Record<
    string,
    {
      sent: number
      success: number
      failed: number
      avgDuration: number
    }
  >
}

export class NotificationMetricsCollector {
  private metrics: NotificationMetric[] = []
  private readonly maxHistory: number

  constructor(maxHistory = 10000) {
    this.maxHistory = maxHistory
  }

  record(metric: NotificationMetric): void {
    this.metrics.push(metric)

    // Keep history within limit
    if (this.metrics.length > this.maxHistory) {
      this.metrics = this.metrics.slice(-this.maxHistory)
    }
  }

  getSummary(since?: Date): MetricsSummary {
    let filtered = this.metrics
    if (since) {
      filtered = this.metrics.filter((m) => m.timestamp >= since)
    }

    const byChannel: MetricsSummary['byChannel'] = {}
    const byNotification: MetricsSummary['byNotification'] = {}

    for (const metric of filtered) {
      // Stats by channel
      if (!byChannel[metric.channel]) {
        byChannel[metric.channel] = { sent: 0, success: 0, failed: 0, avgDuration: 0 }
      }
      byChannel[metric.channel].sent++
      if (metric.success) {
        byChannel[metric.channel].success++
      } else {
        byChannel[metric.channel].failed++
      }

      // Stats by notification
      if (!byNotification[metric.notification]) {
        byNotification[metric.notification] = { sent: 0, success: 0, failed: 0, avgDuration: 0 }
      }
      byNotification[metric.notification].sent++
      if (metric.success) {
        byNotification[metric.notification].success++
      } else {
        byNotification[metric.notification].failed++
      }
    }

    // Calculate averages
    for (const channel of Object.keys(byChannel)) {
      const channelMetrics = filtered.filter((m) => m.channel === channel)
      byChannel[channel].avgDuration =
        channelMetrics.reduce((sum, m) => sum + m.duration, 0) / channelMetrics.length
    }

    for (const notification of Object.keys(byNotification)) {
      const notificationMetrics = filtered.filter((m) => m.notification === notification)
      byNotification[notification].avgDuration =
        notificationMetrics.reduce((sum, m) => sum + m.duration, 0) / notificationMetrics.length
    }

    const successMetrics = filtered.filter((m) => m.success)

    return {
      totalSent: filtered.length,
      totalSuccess: successMetrics.length,
      totalFailed: filtered.length - successMetrics.length,
      avgDuration:
        filtered.length > 0
          ? filtered.reduce((sum, m) => sum + m.duration, 0) / filtered.length
          : 0,
      byChannel,
      byNotification,
    }
  }

  getRecentFailures(limit = 10): NotificationMetric[] {
    return this.metrics.filter((m) => !m.success).slice(-limit)
  }

  getSlowNotifications(threshold: number, limit = 10): NotificationMetric[] {
    return this.metrics.filter((m) => m.duration > threshold).slice(-limit)
  }

  clear(): void {
    this.metrics = []
  }
}
