import type { DevMailbox } from '../dev/DevMailbox'
import type { Message, Transport } from '../types'

/**
 * Memory transport for development mode.
 *
 * Captures emails to an in-memory mailbox instead of sending them.
 * Used automatically when `devMode` is enabled in OrbitSignal.
 *
 * @example
 * ```typescript
 * const mailbox = new DevMailbox()
 * const transport = new MemoryTransport(mailbox)
 * await transport.send(message)
 * ```
 *
 * @since 3.0.0
 * @public
 */
export class MemoryTransport implements Transport {
  constructor(private mailbox: DevMailbox) {}

  async send(message: Message): Promise<void> {
    this.mailbox.add(message)
    // console.log(`[MemoryTransport] Email stored in DevMailbox for: ${message.to.map(t => t.address).join(', ')}`);
  }
}
