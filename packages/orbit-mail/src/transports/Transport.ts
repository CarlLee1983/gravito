import type { Message } from '../types'

export interface Transport {
  /**
   * Send the given message
   */
  send(message: Message): Promise<void>
}
