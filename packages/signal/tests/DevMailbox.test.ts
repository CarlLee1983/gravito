import { describe, expect, it } from 'bun:test'
import { DevMailbox } from '../src/dev/DevMailbox'
import type { Message } from '../src/types'

describe('DevMailbox', () => {
  const mockMessage: Message = {
    from: { address: 'from@example.com' },
    to: [{ address: 'to@example.com' }],
    subject: 'Test Subject',
    html: '<h1>Hello</h1>',
  }

  it('should respect the default maximum entries (50)', () => {
    const mailbox = new DevMailbox()

    // Add 60 messages
    for (let i = 0; i < 60; i++) {
      mailbox.add({ ...mockMessage, subject: `Test ${i}` })
    }

    const list = mailbox.list()
    expect(list.length).toBe(50)
    // Should keep the newest (Test 59)
    expect(list[0].envelope.subject).toBe('Test 59')
    // Should have removed Test 0-9, list[49] should be Test 10
    expect(list[49].envelope.subject).toBe('Test 10')
  })

  it('should respect custom maximum entries via constructor', () => {
    const mailbox = new DevMailbox(10)

    for (let i = 0; i < 15; i++) {
      mailbox.add(mockMessage)
    }

    expect(mailbox.list().length).toBe(10)
  })

  it('should respect setMaxEntries and trim existing entries', () => {
    const mailbox = new DevMailbox(20)

    for (let i = 0; i < 20; i++) {
      mailbox.add({ ...mockMessage, subject: `Test ${i}` })
    }

    expect(mailbox.list().length).toBe(20)

    mailbox.setMaxEntries(5)
    expect(mailbox.list().length).toBe(5)
    expect(mailbox.list()[0].envelope.subject).toBe('Test 19')
  })
})
