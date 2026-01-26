import { describe, expect, it } from 'bun:test'
import { VerifyEmailMail } from '../../../src/mail/VerifyEmailMail'

describe('VerifyEmailMail', () => {
  it('should build email with correct recipient and subject', async () => {
    const user = { email: 'test@example.com', name: 'John Doe' }
    const verifyUrl = 'http://example.com/verify/123/hash'
    const mail = new VerifyEmailMail(user, verifyUrl)

    mail.build()

    const envelope = (mail as any).envelope
    expect(envelope.to[0].address).toBe('test@example.com')
    expect(envelope.subject).toBe('Verify Your Email Address')
  })

  it('should include user name in email content', async () => {
    const user = { email: 'test@example.com', name: 'Jane Smith' }
    const verifyUrl = 'http://example.com/verify/123/hash'
    const mail = new VerifyEmailMail(user, verifyUrl)

    mail.build()

    const { html } = await mail.renderContent()

    expect(html).toContain('Hello Jane Smith!')
  })

  it('should handle missing name with fallback greeting', async () => {
    const user = { email: 'test@example.com' }
    const verifyUrl = 'http://example.com/verify/123/hash'
    const mail = new VerifyEmailMail(user, verifyUrl)

    mail.build()

    const { html } = await mail.renderContent()

    expect(html).toContain('Hello there!')
  })

  it('should include verification URL in email content', async () => {
    const user = { email: 'test@example.com', name: 'John' }
    const verifyUrl = 'http://example.com/verify/123/abcdef123456'
    const mail = new VerifyEmailMail(user, verifyUrl)

    mail.build()

    const { html } = await mail.renderContent()

    expect(html).toContain(verifyUrl)
    expect(html).toContain('Verify Email Address')
  })

  it('should escape HTML in user name to prevent XSS', async () => {
    const user = {
      email: 'test@example.com',
      name: '<img src=x onerror=alert("xss")>',
    }
    const verifyUrl = 'http://example.com/verify/123/hash'
    const mail = new VerifyEmailMail(user, verifyUrl)

    mail.build()

    const { html } = await mail.renderContent()

    expect(html).not.toContain('<img src=')
    expect(html).toContain('&lt;img')
  })

  it('should escape HTML in verification URL to prevent XSS', async () => {
    const user = { email: 'test@example.com', name: 'John' }
    const verifyUrl = 'http://example.com/verify?token=<script>alert("xss")</script>'
    const mail = new VerifyEmailMail(user, verifyUrl)

    mail.build()

    const { html } = await mail.renderContent()

    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('should include expiration notice in footer', async () => {
    const user = { email: 'test@example.com', name: 'John' }
    const verifyUrl = 'http://example.com/verify/123/hash'
    const mail = new VerifyEmailMail(user, verifyUrl)

    mail.build()

    const { html } = await mail.renderContent()

    expect(html).toContain('24 hours')
    expect(html).toContain('expire')
  })

  it('should include warning about not registering', async () => {
    const user = { email: 'test@example.com', name: 'John' }
    const verifyUrl = 'http://example.com/verify/123/hash'
    const mail = new VerifyEmailMail(user, verifyUrl)

    mail.build()

    const { html } = await mail.renderContent()

    expect(html).toContain('If you did not create an account')
  })

  it('should have proper HTML structure', async () => {
    const user = { email: 'test@example.com', name: 'John' }
    const verifyUrl = 'http://example.com/verify/123/hash'
    const mail = new VerifyEmailMail(user, verifyUrl)

    mail.build()

    const { html } = await mail.renderContent()

    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html lang="en">')
    expect(html).toContain('</html>')
    expect(html).toContain('class="button"')
  })

  it('should provide both button and text link', async () => {
    const user = { email: 'test@example.com', name: 'John' }
    const verifyUrl = 'http://example.com/verify/123/hash'
    const mail = new VerifyEmailMail(user, verifyUrl)

    mail.build()

    const { html } = await mail.renderContent()

    const urlOccurrences = (
      html.match(new RegExp(verifyUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []
    ).length
    expect(urlOccurrences).toBeGreaterThanOrEqual(2)
  })
})
