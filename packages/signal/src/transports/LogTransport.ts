import type { Message, Transport } from '../types'

/**
 * Log transport for development and testing.
 *
 * Logs email details to the console instead of sending them.
 * Useful for debugging and local development.
 *
 * @example
 * ```typescript
 * const transport = new LogTransport()
 * await transport.send(message)
 * // Outputs email details to console
 * ```
 *
 * @since 3.0.0
 * @public
 */
export class LogTransport implements Transport {
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
