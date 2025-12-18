import { describe, expect, it } from 'bun:test'
import { DevMailbox } from '../src/dev/DevMailbox'
import { MemoryTransport } from '../src/transports/MemoryTransport'
import type { Message } from '../src/types'

describe('Transports', () => {
  describe('MemoryTransport & DevMailbox', () => {
    it('should store sent emails in mailbox', async () => {
      const mailbox = new DevMailbox()
      const transport = new MemoryTransport(mailbox)

      const message: Message = {
        from: { address: 'from@example.com' },
        to: [{ address: 'to@example.com' }],
        subject: 'Test Subject',
        html: '<p>Content</p>',
        priority: 'normal',
      }

      await transport.send(message)

      const entries = mailbox.list()
      expect(entries).toHaveLength(1)

      const entry = entries[0]
      expect(entry.envelope.subject).toBe('Test Subject')
      expect(entry.html).toBe('<p>Content</p>')
      expect(entry.sentAt).toBeInstanceOf(Date)
    })

    it('should limit mailbox size', async () => {
      const mailbox = new DevMailbox()
      // Hack: set max entries lower for test if possible, or just add 51 entries
      // Since maxEntries is private, we just add 51
      const transport = new MemoryTransport(mailbox)

      for (let i = 0; i < 60; i++) {
        await transport.send({
          from: { address: 'a@b.com' },
          to: [{ address: 'b@c.com' }],
          subject: `Msg ${i}`,
          html: 'content',
          priority: 'normal',
        })
      }

      expect(mailbox.list().length).toBeLessThanOrEqual(50)
      // Should be the latest ones (last one added is index 0)
      expect(mailbox.list()[0].envelope.subject).toBe('Msg 59')
    })
  })
})
