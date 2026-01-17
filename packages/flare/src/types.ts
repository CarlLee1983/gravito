/**
 * Notification system type definitions.
 */

import type { Notification } from './Notification'

/**
 * Notification channel interface.
 * @public
 */
export interface NotificationChannel {
  /**
   * Send a notification through the specified channel.
   *
   * @param notification - The notification instance containing data.
   * @param notifiable - The recipient of the notification.
   */
  send(notification: Notification, notifiable: Notifiable): Promise<void>
}

/**
 * Interface for recipients that can receive notifications.
 * @public
 */
export interface Notifiable {
  /**
   * Unique identifier for the recipient (e.g., User ID).
   */
  getNotifiableId(): string | number

  /**
   * Optional recipient type (useful for polymorphic notifications).
   */
  getNotifiableType?(): string

  /**
   * Optional list of preferred channels for this specific recipient.
   */
  preferredNotificationChannels?(): string[]
}

/**
 * Payload for email notifications.
 * @public
 */
export interface MailMessage {
  /** Email subject line */
  subject: string
  /** View template path */
  view?: string
  /** Data to pass to the view template */
  data?: Record<string, unknown>
  /** Inline HTML content */
  html?: string
  /** Plain text content */
  text?: string
  /** Sender address */
  from?: string
  /** Target recipient(s) */
  to?: string | string[]
  /** Carbon copy recipient(s) */
  cc?: string | string[]
  /** Blind carbon copy recipient(s) */
  bcc?: string | string[]
}

/**
 * Payload for database-stored notifications.
 * @public
 */
export interface DatabaseNotification {
  /** Type identifier for the notification */
  type: string
  /** JSON-serializable data payload */
  data: Record<string, unknown>
  /** Timestamp when the notification was marked as read */
  readAt?: Date | null
}

/**
 * Payload for real-time broadcast notifications.
 * @public
 */
export interface BroadcastNotification {
  /** Event/Type identifier for the broadcast */
  type: string
  /** Data to be broadcasted to subscribers */
  data: Record<string, unknown>
}

/**
 * Payload for Slack channel notifications.
 * @public
 */
export interface SlackMessage {
  /** Main message text */
  text: string
  /** Target Slack channel */
  channel?: string
  /** Custom bot username */
  username?: string
  /** Icon emoji for the bot */
  iconEmoji?: string
  /** Array of Slack attachments for rich formatting */
  attachments?: Array<{
    color?: string
    title?: string
    text?: string
    fields?: Array<{ title: string; value: string; short?: boolean }>
  }>
}

/**
 * Payload for SMS notifications.
 * @public
 */
export interface SmsMessage {
  /** Recipient phone number */
  to: string
  /** Message content */
  message: string
  /** Sender ID or phone number */
  from?: string
}
