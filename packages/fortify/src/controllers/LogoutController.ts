import type { GravitoContext } from '@gravito/core'
import type { AuthManager } from '@gravito/sentinel'
import type { FortifyConfig } from '../config'
import type { AuthLogger } from '../services/AuthLogger'
import { getClientInfo } from '../utils/request'

export class LogoutController {
  constructor(
    private config: FortifyConfig,
    private authLogger?: AuthLogger
  ) {}

  async destroy(c: GravitoContext): Promise<Response> {
    const auth = c.get('auth') as AuthManager
    const clientInfo = getClientInfo(c)
    let userId: number | undefined
    let email: string | undefined

    if (auth) {
      try {
        const user = await auth.user()
        userId = (user as any)?.id
        email = (user as any)?.email

        await auth.logout()

        await this.authLogger?.log({
          type: 'logout',
          userId,
          email,
          success: true,
          ip: clientInfo.ip,
          userAgent: clientInfo.userAgent,
        })
      } catch (error) {
        console.error('[Fortify] Logout error:', error)

        await this.authLogger?.log({
          type: 'logout',
          userId,
          email,
          success: false,
          ip: clientInfo.ip,
          userAgent: clientInfo.userAgent,
          metadata: { error: String(error) },
        })
      }
    }

    if (this.config.jsonMode) {
      return c.json({
        message: 'Logged out successfully',
        redirect: this.config.redirects.logout ?? '/',
      })
    }

    return c.redirect(this.config.redirects.logout ?? '/')
  }
}
