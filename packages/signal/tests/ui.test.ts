import { describe, expect, it } from 'bun:test'
import { getMailboxHtml } from '../src/dev/ui/mailbox'
import { getPreviewHtml } from '../src/dev/ui/preview'
import { layout } from '../src/dev/ui/shared'

describe('Dev UI', () => {
  it('renders mailbox and preview HTML', () => {
    const entry = {
      id: '1',
      envelope: {
        from: { address: 'from@example.com' },
        to: [{ address: 'to@example.com' }],
        subject: 'Hello',
        priority: 'high',
      },
      html: '<p>Hi</p>',
      text: 'Hi',
      sentAt: new Date('2024-01-01T00:00:00Z'),
    }

    const mailbox = getMailboxHtml([entry], '/__mail')
    expect(mailbox).toContain('Gravito Mailbox')
    expect(mailbox).toContain('badge-high')

    const preview = getPreviewHtml(entry, '/__mail')
    expect(preview).toContain('Email Preview')
    expect(preview).toContain('Hello')

    const wrapped = layout('Title', '<div>Content</div>')
    expect(wrapped).toContain('<title>Title')
  })

  it('renders empty mailbox state', () => {
    const html = getMailboxHtml([], '/__mail')
    expect(html).toContain('No emails found')
  })
})
