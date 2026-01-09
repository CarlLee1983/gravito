import { app } from '@gravito/core'
import { Mailable } from '@gravito/signal'

export class ForgotPasswordMail extends Mailable {
  constructor(
    private email: string,
    private token: string
  ) {
    super()
  }

  build(): this {
    const branding = {
      name: 'Gravito App',
      color: '#f43f5e',
    }
    let baseUrl = 'http://localhost:3000'

    try {
      const core = app()
      if (core) {
        branding.name = core.config.get('membership.branding.name', branding.name)
        branding.color = core.config.get('membership.branding.primary_color', branding.color)
        baseUrl = core.config.get('app.url', baseUrl)
      }
    } catch (_e) {}

    return this.to(this.email)
      .subject(this.t('membership.emails.reset_password_subject'))
      .view('emails/reset_password', {
        resetUrl: `${baseUrl}/reset-password?token=${this.token}`,
        branding,
        currentYear: new Date().getFullYear(),
        lang: {
          reset_password_title: this.t('membership.emails.reset_password_title'),
          reset_password_body: this.t('membership.emails.reset_password_body'),
          reset_password_button: this.t('membership.emails.reset_password_button'),
          reset_password_warning: this.t('membership.emails.reset_password_warning'),
        },
      })
  }
}
