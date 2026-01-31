import type { ConnectionContract } from '@gravito/atlas'
import type { GravitoContext } from '@gravito/core'
import type { FortifyConfig } from '../config'
import { FortifyError } from '../errors/FortifyError'
import type { FortifyEventEmitter } from '../events/EventEmitter'
import type { TwoFactorService } from '../services/TwoFactorService'
import { BaseController } from './BaseController'

export class TwoFactorController extends BaseController {
  constructor(
    config: FortifyConfig,
    private twoFactorService: TwoFactorService,
    private db: () => ConnectionContract,
    events?: FortifyEventEmitter
  ) {
    super(config, events)
  }

  async setup(c: GravitoContext): Promise<Response> {
    const user = await this.getAuthUser(c)
    if (!user) {
      return this.error(c, FortifyError.unauthenticated())
    }

    const secret = this.twoFactorService.generateSecret()

    const session = c.get('session') as any
    if (session) {
      await session.set('two_factor_secret', secret)
    }

    const qrCodeUrl = await this.twoFactorService.generateQrCodeUrl(user.email, secret)

    if (this.config.jsonMode) {
      return this.success(c, {
        secret,
        qr_code_url: qrCodeUrl,
      })
    }

    return this.render(c, 'two-factor/setup', {
      secret,
      qrCodeUrl,
    })
  }

  async confirm(c: GravitoContext): Promise<Response> {
    const user = await this.getAuthUser(c)
    if (!user) {
      return this.error(c, FortifyError.unauthenticated())
    }

    const { code } = (await c.req.parseBody()) as { code?: string }

    const session = c.get('session') as any
    const secret = session ? await session.get('two_factor_secret') : null

    if (!secret) {
      return this.error(c, FortifyError.sessionExpiredTfa())
    }

    if (!code || !(await this.twoFactorService.verify(code, secret))) {
      return this.error(c, FortifyError.invalidCode())
    }

    const recoveryCodes = this.twoFactorService.generateRecoveryCodes()

    await this.db()
      .table('users')
      .where('id', user.id)
      .update({
        two_factor_secret: secret,
        two_factor_recovery_codes: JSON.stringify(recoveryCodes),
        two_factor_confirmed_at: new Date(),
      })

    if (session) {
      await session.forget('two_factor_secret')
    }

    if (this.events) {
      await this.events.emit('auth:two-factor-enabled', {
        user,
        ip: c.req.header('x-forwarded-for') || 'unknown',
        userAgent: c.req.header('user-agent') || 'unknown',
        timestamp: new Date(),
      } as any)
    }

    if (this.config.jsonMode) {
      return this.success(c, { recovery_codes: recoveryCodes })
    }

    return this.render(c, 'two-factor/recovery-codes', { recoveryCodes })
  }

  async disable(c: GravitoContext): Promise<Response> {
    const user = await this.getAuthUser(c)
    if (!user) {
      return this.error(c, FortifyError.unauthenticated())
    }

    await this.db().table('users').where('id', user.id).update({
      two_factor_secret: null,
      two_factor_recovery_codes: null,
      two_factor_confirmed_at: null,
    })

    if (this.events) {
      await this.events.emit('auth:two-factor-disabled', {
        user,
        ip: c.req.header('x-forwarded-for') || 'unknown',
        userAgent: c.req.header('user-agent') || 'unknown',
        timestamp: new Date(),
      } as any)
    }

    return this.success(c, null, '/settings')
  }

  async showChallenge(c: GravitoContext): Promise<Response> {
    const session = c.get('session') as any
    const userId = session ? await session.get('two_factor_user_id') : null

    if (!userId) {
      return this.error(c, FortifyError.sessionExpiredTfa())
    }

    if (this.config.jsonMode) {
      return this.success(c, { view: 'two-factor-challenge' })
    }

    return this.render(c, 'two-factor/challenge')
  }

  async challenge(c: GravitoContext): Promise<Response> {
    const session = c.get('session') as any
    const userId = session ? await session.get('two_factor_user_id') : null

    if (!userId) {
      return this.error(c, FortifyError.sessionExpiredTfa())
    }

    const { code, recovery_code } = (await c.req.parseBody()) as {
      code?: string
      recovery_code?: string
    }
    const user = await this.db().table('users').where('id', userId).first()

    if (!user) {
      return this.error(c, FortifyError.unauthenticated())
    }

    let valid = false

    if (recovery_code) {
      const recoveryCodes = JSON.parse((user as any).two_factor_recovery_codes || '[]')
      const index = recoveryCodes.indexOf(recovery_code)

      if (index !== -1) {
        valid = true
        recoveryCodes.splice(index, 1)
        await this.db()
          .table('users')
          .where('id', userId)
          .update({
            two_factor_recovery_codes: JSON.stringify(recoveryCodes),
          })
      } else {
        return this.error(c, FortifyError.invalidRecoveryCode())
      }
    } else if (code) {
      valid = await this.twoFactorService.verify(code, (user as any).two_factor_secret)
      if (!valid) {
        return this.error(c, FortifyError.invalidCode())
      }
    } else {
      return this.error(c, FortifyError.invalidCode())
    }

    await session.forget('two_factor_user_id')
    const remember = await session.get('two_factor_remember')
    await session.forget('two_factor_remember')

    const auth = c.get('auth') as any
    if (auth) {
      await auth.loginById(userId, remember)
    }

    if (this.events) {
      await this.events.emit('auth:two-factor-verified', {
        user,
        ip: c.req.header('x-forwarded-for') || 'unknown',
        userAgent: c.req.header('user-agent') || 'unknown',
        timestamp: new Date(),
      } as any)
    }

    return this.success(c, { user }, 'Login successful', this.config.redirects.login)
  }

  private async getAuthUser(c: GravitoContext): Promise<any> {
    const auth = c.get('auth') as any
    return auth ? await auth.user() : null
  }
}
