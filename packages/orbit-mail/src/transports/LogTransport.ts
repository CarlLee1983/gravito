import type { Message, Transport } from '../types'

export class LogTransport implements Transport {
  async send(message: Message): Promise<void> {
    console.log('\n📧 [OrbitMail] Email Sent (Simulated):')
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
