import type { Mailable } from './Mailable'
import type { Message } from './types'

/**
 * Mail event types.
 *
 * Defines the available lifecycle hooks for the mail service.
 *
 * @public
 * @since 3.1.0
 */
export type MailEventType =
  | 'beforeSend'
  | 'afterSend'
  | 'sendFailed'
  | 'beforeRender'
  | 'afterRender'
  | 'webhookReceived'

/**
 * Mail lifecycle event.
 *
 * Emitted at key points during email sending lifecycle.
 * Used for logging, analytics, or custom processing.
 *
 * @example
 * ```typescript
 * mail.on('afterSend', async (event) => {
 *   console.log('Email sent to:', event.message?.to)
 * })
 * ```
 *
 * @public
 * @since 3.1.0
 */
export interface MailEvent {
  /** Type of event */
  type: MailEventType
  /** Mailable instance that triggered the event */
  mailable: Mailable
  /** Finalized message (available for send events) */
  message?: Message
  /** Error that occurred (available for sendFailed event) */
  error?: Error
  /** Timestamp when event occurred */
  timestamp: Date
  /** Webhook payload (available for webhookReceived event) */
  webhook?: {
    driver: string
    event: string
    payload: any
  }
}

/**
 * Mail event handler function.
 *
 * Defines the signature for functions that subscribe to mail events.
 *
 * @param event - The mail event object
 *
 * @example
 * ```typescript
 * const handler: MailEventHandler = (event) => {
 *   console.log(`Event ${event.type} triggered`);
 * };
 * ```
 *
 * @public
 * @since 3.1.0
 */
export type MailEventHandler = (event: MailEvent) => void | Promise<void>
