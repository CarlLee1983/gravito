import { app } from '@gravito/core'
import { Mailable } from '@gravito/signal'

export class WelcomeMail extends Mailable {
  constructor(
    private email: string,
    private token: string
  ) {
    super()
  }

  build(): this {
    // 品牌配置抽象化 (提供安全回退值)
    const branding = {
      name: 'Gravito App',
      color: '#6366f1',
    }
    let baseUrl = 'http://localhost:3000'

    try {
      // 嘗試從全域獲取 (僅在 PlanetCore 運行時有效)
      const core = app()
      if (core) {
        branding.name = core.config.get('membership.branding.name', branding.name)
        branding.color = core.config.get('membership.branding.primary_color', branding.color)
        baseUrl = core.config.get('app.url', baseUrl)
      }
    } catch (_e) {
      // 忽略錯誤，使用預設值
    }

    return this.to(this.email)
      .subject(this.t('membership.emails.welcome_subject'))
      .view('emails/welcome', {
        verificationUrl: `${baseUrl}/verify?token=${this.token}`,
        branding,
        currentYear: new Date().getFullYear(),
        lang: {
          welcome_title: this.t('membership.emails.welcome_title'),
          welcome_body: this.t('membership.emails.welcome_body'),
          verify_button: this.t('membership.emails.verify_button'),
        },
      })
  }
}
