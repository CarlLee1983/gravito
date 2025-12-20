/**
 * Notification system type definitions.
 */

import type { Notification } from './Notification'

/**
 * Notification channel interface.
 */
export interface NotificationChannel {
  /**
   * Send a notification.
   * @param notification - Notification instance
   * @param notifiable - Recipient
   */
  send(notification: Notification, notifiable: Notifiable): Promise<void>
}

/**
 * Notifiable (notification recipient) interface.
 */
export interface Notifiable {
  /**
   * Recipient identifier (usually an ID).
   */
  getNotifiableId(): string | number

  /**
   * Recipient type (optional, for polymorphic relations).
   */
  getNotifiableType?(): string

  /**
   * Preferred channels (optional).
   */
  preferredNotificationChannels?(): string[]
}

/**
 * Mail message payload.
 */
export interface MailMessage {
  subject: string
  view?: string
  data?: Record<string, unknown>
  html?: string
  text?: string
  from?: string
  to?: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
}

/**
 * Database notification payload.
 */
export interface DatabaseNotification {
  type: string
  data: Record<string, unknown>
  readAt?: Date | null
}

/**
 * Broadcast notification payload.
 */
export interface BroadcastNotification {
  type: string
  data: Record<string, unknown>
}

/**
 * Slack message payload.
 */
export interface SlackMessage {
  text: string
  channel?: string
  username?: string
  iconEmoji?: string
  attachments?: Array<{
    color?: string
    title?: string
    text?: string
    fields?: Array<{ title: string; value: string; short?: boolean }>
  }>
}

/**
 * SMS message payload.
 */
export interface SmsMessage {
  to: string
  message: string
  from?: string
}
