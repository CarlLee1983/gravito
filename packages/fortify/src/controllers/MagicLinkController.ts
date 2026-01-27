import type { GravitoContext } from '@gravito/core'
import type { FortifyConfig } from '../config'
import { ErrorCodes } from '../errors/codes'
import { FortifyError } from '../errors/FortifyError'
import type { FortifyEventEmitter } from '../events/EventEmitter'
import type { MagicLinkService } from '../services/MagicLinkService'
import { BaseController } from './BaseController'

export class MagicLinkController extends BaseController {
  constructor(
    config: FortifyConfig,
    private magicLinkService: MagicLinkService,
    events?: FortifyEventEmitter
  ) {
    super(config, events)
  }

  async send(c: GravitoContext): Promise<Response> {
    const { email } = (await c.req.parseBody()) as { email?: string }

    if (!email) {
      return this.validationError(c, { email: ['Email is required'] })
    }

    const UserModel = this.config.userModel() as any
    const user = await UserModel.query().where('email', email).first()

    if (user) {
      const token = await this.magicLinkService.createToken(user)

      if (this.events) {
        await this.events.emit('auth:magic-link-sent', {
          user,
          token,
          ip: c.req.header('x-forwarded-for') || 'unknown',
          userAgent: c.req.header('user-agent') || 'unknown',
          timestamp: new Date(),
        } as any)
      }
    }

    return this.success(c, { message: 'We have emailed you a magic link!' })
  }

  async verify(c: GravitoContext): Promise<Response> {
    const token = c.req.param('token')

    if (!token) {
      return this.error(c, FortifyError.invalidMagicLink())
    }

    const user = await this.magicLinkService.verify(token)

    if (!user) {
      return this.error(c, FortifyError.invalidMagicLink())
    }

    const auth = c.get('auth') as any
    if (auth) {
      await auth.login(user)
    }

    if (this.events) {
      await this.events.emit('auth:magic-link-login', {
        user,
        ip: c.req.header('x-forwarded-for') || 'unknown',
        userAgent: c.req.header('user-agent') || 'unknown',
        timestamp: new Date(),
      } as any)
    }

    return this.success(c, { user }, 'Login successful', this.config.redirects.login)
  }
}
