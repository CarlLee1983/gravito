import { describe, expect, it } from 'bun:test'
import { ResetPasswordMail } from '../src/mail/ResetPasswordMail'
import { VerifyEmailMail } from '../src/mail/VerifyEmailMail'

describe('Fortify Mails', () => {
  describe('ResetPasswordMail', () => {
    it('should build email with correct subject and html content', async () => {
      const email = 'test@example.com'
      const resetUrl = 'http://localhost/reset-password/token'
      const mail = new ResetPasswordMail({ email, name: 'John Doe' }, resetUrl)

      // Build the mail
      mail.build()

      // Access envelope via any cast since it's protected
      const envelope = (mail as any).envelope
      expect(envelope.subject).toBe('Reset Your Password')
      expect(envelope.to[0].address).toBe(email)

      // Render content
      const { html } = await mail.renderContent()

      expect(html).toContain('Hello John Doe')
      expect(html).toContain(resetUrl)
      expect(html).toContain('Password Reset Request')
    })

    it('should handle missing name in user object', async () => {
      const email = 'test@example.com'
      const resetUrl = 'http://localhost/reset-password/token'
      const mail = new ResetPasswordMail({ email }, resetUrl)

      mail.build()

      const { html } = await mail.renderContent()
      expect(html).toContain('Hello there')
    })
  })

  describe('VerifyEmailMail', () => {
    it('should build email with correct subject and html content', async () => {
      const email = 'test@example.com'
      const verifyUrl = 'http://example.com/verify/123'
      const mail = new VerifyEmailMail({ email }, verifyUrl)

      mail.build()

      // Access envelope via any cast
      const envelope = (mail as any).envelope
      expect(envelope.subject).toBe('Verify Your Email Address')

      // Render content
      const { html } = await mail.renderContent()

      expect(html).toContain('Verify Email Address')
      expect(html).toContain(verifyUrl)
      expect(html).toContain('Verify Email Address') // Button text
    })
  })
})
