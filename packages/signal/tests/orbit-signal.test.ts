import { describe, expect, it } from 'bun:test'
import { DevMailbox } from '../src/dev/DevMailbox'
import { Mailable } from '../src/Mailable'
import { OrbitSignal } from '../src/OrbitSignal'
import { MemoryTransport } from '../src/transports/MemoryTransport'

class EmptyMail extends Mailable {
  build() {
    return this.html('<p>Hi</p>')
  }
}

describe('OrbitSignal', () => {
  it('sends messages via transport and validates fields', async () => {
    const mailboxTransport = new MemoryTransport(new DevMailbox())
    const orbit = new OrbitSignal({ transport: mailboxTransport })

    // No from address
    await expect(orbit.send(new EmptyMail())).rejects.toThrow('Message is missing "from"')

    class ValidMail extends Mailable {
      build() {
        return this.from('from@example.com').to('to@example.com').html('<p>Hi</p>')
      }
    }

    await expect(orbit.send(new ValidMail())).resolves.toBeUndefined()
  })

  it('queues immediately when no queue service is present', async () => {
    const transport = new MemoryTransport(new DevMailbox())
    const orbit = new OrbitSignal({ transport })

    class ValidMail extends Mailable {
      build() {
        return this.from('from@example.com').to('to@example.com').html('<p>Hi</p>')
      }
    }

    // Should resolve without crashing (internally falls back to send)
    await expect(orbit.queue(new ValidMail())).resolves.toBeUndefined()
  })
})
