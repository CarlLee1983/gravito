import { app } from '@gravito/core'
import { Mailable } from '@gravito/signal'

export class MemberLevelChangedMail extends Mailable {
  constructor(
    private email: string,
    private oldLevel: string,
    private newLevel: string
  ) {
    super()
  }

  build(): this {
    const branding = {
      name: 'Gravito App',
      color: '#f59e0b',
    }

    try {
      const core = app()
      if (core) {
        branding.name = core.config.get('membership.branding.name', branding.name)
        branding.color = core.config.get('membership.branding.primary_color', branding.color)
      }
    } catch (_e) {}

    return this.to(this.email)
      .subject(this.t('membership.emails.level_changed_subject'))
      .view('emails/level_changed', {
        oldLevel: this.oldLevel,
        newLevel: this.newLevel,
        branding,
        currentYear: new Date().getFullYear(),
        lang: {
          badge_text: this.t('membership.emails.level_changed_badge'),
          title: this.t('membership.emails.level_changed_title'),
          body: this.t('membership.emails.level_changed_body'),
        },
      })
  }
}
