import { describe, expect, it } from 'bun:test'
import { ResetPasswordMail } from '../../../src/mail/ResetPasswordMail'

describe('ResetPasswordMail', () => {
  it('should build email with correct recipient and subject', async () => {
    const user = { email: 'test@example.com', name: 'John Doe' }
    const resetUrl = 'http://localhost/reset-password/token123'
    const mail = new ResetPasswordMail(user, resetUrl)

    mail.build()

    const envelope = (mail as any).envelope
    expect(envelope.to[0].address).toBe('test@example.com')
    expect(envelope.subject).toBe('Reset Your Password')
  })

  it('should include user name in email content', async () => {
    const user = { email: 'test@example.com', name: 'John Doe' }
    const resetUrl = 'http://localhost/reset-password/token123'
    const mail = new ResetPasswordMail(user, resetUrl)

    mail.build()

    const { html } = await mail.renderContent()

    expect(html).toContain('Hello John Doe,')
  })

  it('should handle missing name with fallback greeting', async () => {
    const user = { email: 'test@example.com' }
    const resetUrl = 'http://localhost/reset-password/token123'
    const mail = new ResetPasswordMail(user, resetUrl)

    mail.build()

    const { html } = await mail.renderContent()

    expect(html).toContain('Hello there,')
  })

  it('should include reset URL in email content', async () => {
    const user = { email: 'test@example.com', name: 'John Doe' }
    const resetUrl = 'http://localhost/reset-password/token123'
    const mail = new ResetPasswordMail(user, resetUrl)

    mail.build()

    const { html } = await mail.renderContent()

    expect(html).toContain(resetUrl)
    expect(html).toContain('Reset Password')
  })

  it('should escape HTML in user name to prevent XSS', async () => {
    const user = {
      email: 'test@example.com',
      name: '<script>alert("xss")</script>',
    }
    const resetUrl = 'http://localhost/reset-password/token'
    const mail = new ResetPasswordMail(user, resetUrl)

    mail.build()

    const { html } = await mail.renderContent()

    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('should escape HTML in reset URL to prevent XSS', async () => {
    const user = { email: 'test@example.com', name: 'John' }
    const resetUrl = 'http://localhost/reset?token=<script>alert("xss")</script>'
    const mail = new ResetPasswordMail(user, resetUrl)

    mail.build()

    const { html } = await mail.renderContent()

    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('should include expiration information when specified', async () => {
    const user = { email: 'test@example.com', name: 'John Doe' }
    const resetUrl = 'http://localhost/reset-password/token'
    const mail = new ResetPasswordMail(user, resetUrl, 30)

    mail.build()

    const { html } = await mail.renderContent()

    expect(html).toContain('30 minutes')
  })

  it('should default to 60 minutes expiration', async () => {
    const user = { email: 'test@example.com', name: 'John Doe' }
    const resetUrl = 'http://localhost/reset-password/token'
    const mail = new ResetPasswordMail(user, resetUrl)

    mail.build()

    const { html } = await mail.renderContent()

    expect(html).toContain('60 minutes')
  })

  it('should have proper HTML structure', async () => {
    const user = { email: 'test@example.com', name: 'John Doe' }
    const resetUrl = 'http://localhost/reset-password/token'
    const mail = new ResetPasswordMail(user, resetUrl)

    mail.build()

    const { html } = await mail.renderContent()

    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html lang="en">')
    expect(html).toContain('</html>')
    expect(html).toContain('class="button"')
  })
})
