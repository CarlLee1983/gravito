import type { DevMailbox } from '../dev/DevMailbox'
import type { Message, Transport } from '../types'

export class MemoryTransport implements Transport {
  constructor(private mailbox: DevMailbox) {}

  async send(message: Message): Promise<void> {
    this.mailbox.add(message)
    // console.log(`[MemoryTransport] Email stored in DevMailbox for: ${message.to.map(t => t.address).join(', ')}`);
  }
}
