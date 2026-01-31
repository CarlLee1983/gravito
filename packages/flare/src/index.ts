/**
 * @gravito/flare
 *
 * Lightweight, high-performance notifications with multiple channels (mail, database, broadcast, Slack, SMS).
 */

export { BroadcastChannel } from './channels/BroadcastChannel'
export { DatabaseChannel } from './channels/DatabaseChannel'
export type { MailChannelConfig } from './channels/MailChannel'
export { MailChannel } from './channels/MailChannel'
export type { SlackChannelConfig } from './channels/SlackChannel'
export { SlackChannel } from './channels/SlackChannel'
export type { SmsChannelConfig } from './channels/SmsChannel'
export { SmsChannel } from './channels/SmsChannel'
export type { TimeoutConfig } from './channels/TimeoutChannel'
export { TimeoutChannel, TimeoutError } from './channels/TimeoutChannel'

// Middleware
export type { ChannelMiddleware } from './types/middleware'
export type {
  ChannelRateLimitConfig,
  RateLimitConfig,
  CacheStore,
} from './middleware/RateLimitMiddleware'
export { RateLimitMiddleware } from './middleware/RateLimitMiddleware'
export { PreferenceMiddleware } from './middleware/PreferenceMiddleware'
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

// Lazy Loading & Serialization Utilities
export { LazyNotification } from './utils/LazyNotification'
export type { SerializationCheckResult } from './utils/serializationGuard'
export { assertSerializable, checkSerializable } from './utils/serializationGuard'
export { deepDeserialize, deepSerialize } from './utils/serialization'
export { TokenBucket } from './utils/TokenBucket'

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
  NotificationPreference,
  NotificationResult,
  RetryConfig,
  SendOptions,
  SendResult,
  ShouldRetry,
  SlackMessage,
  SmsMessage,
} from './types'
