import type { DevMailbox } from '../dev/DevMailbox'
import type { Message, Transport } from '../types'

/**
 * Memory transport for development mode.
 *
 * This transport captures outgoing emails and stores them in an in-memory mailbox.
 * It is primarily used by the Gravito Dev UI to provide a live preview of emails
 * during development without requiring an external mail server.
 *
 * @example
 * ```typescript
 * import { DevMailbox, MemoryTransport } from '@gravito/signal';
 *
 * const mailbox = new DevMailbox();
 * const transport = new MemoryTransport(mailbox);
 * await transport.send(message);
 *
 * console.log(mailbox.getAll().length); // 1
 * ```
 *
 * @public
 */
export class MemoryTransport implements Transport {
  /**
   * Creates a new MemoryTransport instance.
   *
   * @param mailbox - The in-memory storage where messages will be collected.
   */
  constructor(private mailbox: DevMailbox) {}

  /**
   * Stores the message in the associated mailbox.
   *
   * The message is added to the internal list of the `DevMailbox` instance,
   * making it available for retrieval by the Dev UI or test assertions.
   *
   * @param message - The message to store.
   * @returns A promise that resolves once the message is added to the mailbox.
   *
   * @example
   * ```typescript
   * await transport.send({
   *   from: { address: 'dev@localhost' },
   *   to: [{ address: 'test@example.com' }],
   *   subject: 'Memory Test',
   *   html: '<p>Stored in memory</p>'
   * });
   * ```
   */
  async send(message: Message): Promise<void> {
    this.mailbox.add(message)
    // console.log(`[MemoryTransport] Email stored in DevMailbox for: ${message.to.map(t => t.address).join(', ')}`);
  }
}
