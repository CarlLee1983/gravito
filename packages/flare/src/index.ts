/**
 * @gravito/flare
 *
 * Lightweight, high-performance notifications with multiple channels (mail, database, broadcast, Slack, SMS).
 */

export { BroadcastChannel } from './channels/BroadcastChannel'
export { DatabaseChannel } from './channels/DatabaseChannel'
export { MailChannel } from './channels/MailChannel'
export type { SlackChannelConfig } from './channels/SlackChannel'
export { SlackChannel } from './channels/SlackChannel'
export type { SmsChannelConfig } from './channels/SmsChannel'
export { SmsChannel } from './channels/SmsChannel'
export { toPrometheusFormat } from './metrics/exporters/PrometheusExporter'
export type { MetricsSummary, NotificationMetric } from './metrics/NotificationMetrics'
export { NotificationMetricsCollector } from './metrics/NotificationMetrics'

export type { ShouldQueue } from './Notification'
export { Notification } from './Notification'
export { NotificationManager } from './NotificationManager'
export type { OrbitFlareOptions } from './OrbitFlare'
export { OrbitFlare } from './OrbitFlare'
export type { MailTemplate, SlackTemplate, TemplateData } from './templates/NotificationTemplate'
export { TemplatedNotification } from './templates/NotificationTemplate'

export type {
  BatchResult,
  BroadcastNotification,
  ChannelFailurePayload,
  ChannelHookPayload,
  ChannelSuccessPayload,
  DatabaseNotification,
  MailMessage,
  Notifiable,
  NotificationBatchCompletePayload,
  NotificationBatchStartPayload,
  NotificationChannel,
  NotificationCompletePayload,
  NotificationHookPayload,
  NotificationResult,
  RetryConfig,
  SendOptions,
  SendResult,
  ShouldRetry,
  SlackMessage,
  SmsMessage,
} from './types'
