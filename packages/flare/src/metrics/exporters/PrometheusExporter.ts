import type { MetricsSummary } from '../NotificationMetrics'

export function toPrometheusFormat(summary: MetricsSummary): string {
  const lines: string[] = []

  // Total metrics
  lines.push(`# HELP notification_total Total notifications sent`)
  lines.push(`# TYPE notification_total counter`)
  lines.push(`notification_total ${summary.totalSent}`)

  lines.push(`# HELP notification_success_total Successful notifications`)
  lines.push(`# TYPE notification_success_total counter`)
  lines.push(`notification_success_total ${summary.totalSuccess}`)

  lines.push(`# HELP notification_failed_total Failed notifications`)
  lines.push(`# TYPE notification_failed_total counter`)
  lines.push(`notification_failed_total ${summary.totalFailed}`)

  // By channel
  lines.push(`# HELP notification_channel_total Notifications by channel`)
  lines.push(`# TYPE notification_channel_total counter`)
  for (const [channel, stats] of Object.entries(summary.byChannel)) {
    lines.push(`notification_channel_total{channel="${channel}",status="success"} ${stats.success}`)
    lines.push(`notification_channel_total{channel="${channel}",status="failed"} ${stats.failed}`)
  }

  // Average duration
  lines.push(`# HELP notification_duration_avg Average notification duration in ms`)
  lines.push(`# TYPE notification_duration_avg gauge`)
  lines.push(`notification_duration_avg ${summary.avgDuration.toFixed(2)}`)

  return lines.join('\n')
}
