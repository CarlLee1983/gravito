import type { Message } from '../types'

/**
 * Interface for email transport mechanisms (SMTP, SES, etc.).
 *
 * @public
 * @since 3.0.0
 */
export interface Transport {
  /**
   * Send the given message using the underlying transport.
   *
   * @param message - The finalized message to send.
   */
  send(message: Message): Promise<void>
}
