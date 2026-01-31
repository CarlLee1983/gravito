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
export { AbortError, TimeoutChannel, TimeoutError } from './channels/TimeoutChannel'
export { toPrometheusFormat } from './metrics/exporters/PrometheusExporter'
export type { MetricsSummary, NotificationMetric } from './metrics/NotificationMetrics'
export { NotificationMetricsCollector } from './metrics/NotificationMetrics'
export { PreferenceMiddleware } from './middleware/PreferenceMiddleware'
export type {
  CacheStore,
  ChannelRateLimitConfig,
  RateLimitConfig,
} from './middleware/RateLimitMiddleware'
export { MemoryStore, RateLimitMiddleware } from './middleware/RateLimitMiddleware'
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
  NotificationPreference,
  NotificationResult,
  RetryConfig,
  SendOptions,
  SendResult,
  ShouldRetry,
  SlackMessage,
  SmsMessage,
} from './types'
// Hooks Types
export type { FlareHookEvent, FlareHookPayloads, FlareHooks } from './types/hooks'
// Middleware
export type { ChannelMiddleware, MiddlewarePriorityValue } from './types/middleware'
export { MiddlewarePriority } from './types/middleware'
export { createHookEmitter, type HookEmitter } from './utils/hookEmitter'
// Lazy Loading & Serialization Utilities
export { LazyNotification } from './utils/LazyNotification'
export { deepDeserialize, deepSerialize } from './utils/serialization'
export type { SerializationCheckResult } from './utils/serializationGuard'
export { assertSerializable, checkSerializable } from './utils/serializationGuard'
export { TokenBucket } from './utils/TokenBucket'
