import type { Message } from '../types'

/**
 * Interface for email transport mechanisms.
 *
 * Transports are responsible for the final delivery of an email message to its destination,
 * whether it's a real SMTP server, a cloud service like AWS SES, or a local log for development.
 * This abstraction allows the core mail service to remain agnostic of the delivery method.
 *
 * @example
 * ```typescript
 * class CustomTransport implements Transport {
 *   async send(message: Message): Promise<void> {
 *     // Implementation logic to deliver the message
 *     console.log(`Sending email to ${message.to[0].address}`);
 *   }
 * }
 * ```
 *
 * @public
 */
export interface Transport {
  /**
   * Send the given message using the underlying transport mechanism.
   *
   * This method handles the actual communication with the delivery service.
   * Implementations should handle connection management and protocol-specific logic.
   *
   * @param message - The finalized message object containing recipients, subject, and content.
   * @returns A promise that resolves when the message has been successfully handed off to the transport.
   * @throws {MailTransportError} If the delivery fails after all internal retry attempts.
   *
   * @example
   * ```typescript
   * const transport: Transport = new LogTransport();
   * await transport.send({
   *   from: { address: 'sender@example.com' },
   *   to: [{ address: 'receiver@example.com' }],
   *   subject: 'Hello',
   *   html: '<p>World</p>'
   * });
   * ```
   */
  send(message: Message): Promise<void>
}
