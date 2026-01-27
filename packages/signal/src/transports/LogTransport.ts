import type { Message, Transport } from '../types'

/**
 * Log transport for development and testing.
 *
 * This transport outputs email details directly to the console instead of performing
 * actual delivery. It is essential for local development to avoid sending real emails
 * while still being able to verify the content, recipients, and subject of outgoing mail.
 *
 * @example
 * ```typescript
 * import { LogTransport } from '@gravito/signal';
 *
 * const transport = new LogTransport();
 * await transport.send({
 *   from: { address: 'dev@localhost' },
 *   to: [{ address: 'user@example.com' }],
 *   subject: 'Test Email',
 *   html: '<h1>Hello</h1>'
 * });
 * ```
 *
 * @public
 */
export class LogTransport implements Transport {
  /**
   * Outputs the message details to the system console.
   *
   * Formats the email metadata (From, To, Subject) and content size into a readable
   * block in the console output.
   *
   * @param message - The message to log.
   * @returns A promise that resolves immediately after logging.
   *
   * @example
   * ```typescript
   * const transport = new LogTransport();
   * await transport.send(message);
   * // Console: 📧 [OrbitSignal] Email Sent (Simulated)...
   * ```
   */
  async send(message: Message): Promise<void> {
    console.log('\n📧 [OrbitSignal] Email Sent (Simulated):')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(
      `From:    ${message.from.name ? `${message.from.name} <${message.from.address}>` : message.from.address}`
    )
    console.log(`To:      ${message.to.map((t) => t.address).join(', ')}`)
    console.log(`Subject: ${message.subject}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    // console.log(message.html); // Too verbose usually
    console.log(`[Content Size]: ${message.html.length} chars (HTML)`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  }
}
