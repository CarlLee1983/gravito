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

  it('should respect the default maximum entries (50)', async () => {
    const mailbox = new DevMailbox()

    // Add 60 messages
    for (let i = 0; i < 60; i++) {
      await mailbox.add({ ...mockMessage, subject: `Test ${i}` })
    }

    const list = await mailbox.list()
    expect(list.length).toBe(50)
    // Should keep the newest (Test 59)
    expect(list[0].envelope.subject).toBe('Test 59')
    // Should have removed Test 0-9, list[49] should be Test 10
    expect(list[49].envelope.subject).toBe('Test 10')
  })

  it('should respect custom maximum entries via constructor', async () => {
    const mailbox = new DevMailbox(10)

    for (let i = 0; i < 15; i++) {
      await mailbox.add(mockMessage)
    }

    const list = await mailbox.list()
    expect(list.length).toBe(10)
  })

  it('should respect setMaxEntries and trim existing entries', async () => {
    const mailbox = new DevMailbox(20)

    for (let i = 0; i < 20; i++) {
      await mailbox.add({ ...mockMessage, subject: `Test ${i}` })
    }

    expect((await mailbox.list()).length).toBe(20)

    await mailbox.setMaxEntries(5)
    const list = await mailbox.list()
    expect(list.length).toBe(5)
    expect(list[0].envelope.subject).toBe('Test 19')
  })
})
