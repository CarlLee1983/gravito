import { describe, expect, it, mock, spyOn } from 'bun:test'
import { Mailable } from '../src/Mailable'
import { OrbitMail } from '../src/OrbitMail'
import { LogTransport } from '../src/transports/LogTransport'
import type { Message, Transport } from '../src/transports/Transport'

// Mock Transport
class MockTransport implements Transport {
  public sentMessages: Message[] = []
  async send(message: Message): Promise<void> {
    this.sentMessages.push(message)
  }
}

// Example Mailable
class WelcomeMail extends Mailable {
  constructor(private name: string) {
    super()
  }

  build() {
    return this.subject('Welcome!').html(`<h1>Welcome, ${this.name}</h1>`)
  }
}

describe('OrbitMail Core', () => {
  it('should send a simple email via transport', async () => {
    const transport = new MockTransport()

    const mailer = OrbitMail.configure({
      from: { name: 'System', address: 'system@example.com' },
      transport: transport,
    })

    const mail = new WelcomeMail('Carl').to('carl@example.com')

    await mailer.send(mail)

    expect(transport.sentMessages.length).toBe(1)
    const msg = transport.sentMessages[0]

    expect(msg.to[0].address).toBe('carl@example.com')
    expect(msg.subject).toBe('Welcome!')
    expect(msg.html).toBe('<h1>Welcome, Carl</h1>')
    expect(msg.from.address).toBe('system@example.com')
  })

  it('should handle fluent API correctly', async () => {
    const mail = new WelcomeMail('Carl')
      .to(['a@b.com', { address: 'c@d.com', name: 'C' }])
      .cc('cc@example.com')
      .priority('high')

    const config = {
      from: { address: 'default@example.com' },
      transport: new LogTransport(),
    }

    const envelope = await mail.buildEnvelope(config)

    expect(envelope.to).toHaveLength(2)
    expect(envelope.cc).toHaveLength(1)
    expect(envelope.priority).toBe('high')
    expect(envelope.from?.address).toBe('default@example.com')
  })

  it('should throw error if renderer is missing', async () => {
    class EmptyMail extends Mailable {
      build() {
        return this
      }
    }

    const mail = new EmptyMail()
    expect(mail.renderContent()).rejects.toThrow('No content renderer')
  })
})
