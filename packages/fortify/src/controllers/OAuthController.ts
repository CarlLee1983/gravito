import type { GravitoContext } from '@gravito/core'
import type { Knex } from 'knex'
import type { FortifyConfig } from '../config'
import { ErrorCodes } from '../errors/codes'
import { FortifyError } from '../errors/FortifyError'
import type { FortifyEventEmitter } from '../events/EventEmitter'
import type { OAuthUser } from '../services/OAuth/types'
import type { OAuthService } from '../services/OAuthService'
import { BaseController } from './BaseController'

export class OAuthController extends BaseController {
  constructor(
    config: FortifyConfig,
    private oauthService: OAuthService,
    private db: () => Knex,
    events?: FortifyEventEmitter
  ) {
    super(config, events)
  }

  async redirect(c: GravitoContext): Promise<Response> {
    const provider = c.req.param('provider') as string

    if (!this.oauthService.hasProvider(provider)) {
      return this.error(c, FortifyError.unknownProvider())
    }

    try {
      const oauthProvider = this.oauthService.getProvider(provider)

      const state = crypto.randomUUID()

      const session = c.get('session') as any
      if (session) {
        await session.set('oauth_state', state)
      }

      const url = oauthProvider.getAuthorizationUrl(state)
      return c.redirect(url)
    } catch {
      return this.error(c, FortifyError.internal())
    }
  }

  async callback(c: GravitoContext): Promise<Response> {
    const provider = c.req.param('provider') as string
    const code = c.req.query('code') as string
    const state = c.req.query('state') as string

    if (!code) {
      return this.error(c, FortifyError.authenticationFailed())
    }

    // Verify state if session exists
    const session = c.get('session') as any
    if (session) {
      const savedState = await session.get('oauth_state')
      if (!savedState || savedState !== state) {
        return this.error(c, FortifyError.invalidState())
      }
      await session.forget('oauth_state')
    }

    try {
      const oauthProvider = this.oauthService.getProvider(provider)
      const oauthUser = await oauthProvider.getUser(code)

      const user = await this.findOrCreateUser(provider, oauthUser)

      const auth = c.get('auth') as any
      if (auth) {
        await auth.login(user)
      }

      if (this.events) {
        await this.events.emit('auth:oauth-login', {
          user,
          provider,
          oauthUser,
          ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '127.0.0.1',
          userAgent: c.req.header('user-agent') || 'unknown',
          timestamp: new Date(),
        })
      }

      return this.success(c, { user }, 'Login successful', this.config.redirects.login)
    } catch (error) {
      console.error('[Fortify] OAuth Error:', error)

      if (this.events) {
        await this.events.emit('auth:oauth-failed', {
          provider,
          error,
          ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '127.0.0.1',
          userAgent: c.req.header('user-agent') || 'unknown',
          timestamp: new Date(),
        })
      }
      return this.error(c, FortifyError.authenticationFailed())
    }
  }

  private async findOrCreateUser(provider: string, oauthUser: OAuthUser): Promise<any> {
    const identity = await this.db()('oauth_identities')
      .where('provider', provider)
      .where('provider_id', oauthUser.id)
      .first()

    const UserModel = this.config.userModel() as any

    if (identity) {
      await this.db()('oauth_identities')
        .where('id', identity.id)
        .update({
          access_token: oauthUser.accessToken,
          refresh_token: oauthUser.refreshToken,
          expires_at: oauthUser.expiresIn
            ? new Date(Date.now() + oauthUser.expiresIn * 1000)
            : null,
          updated_at: new Date(),
        })

      return await UserModel.find(identity.user_id)
    }

    let user = await UserModel.query().where('email', oauthUser.email).first()

    if (!user) {
      user = await UserModel.create({
        name: oauthUser.name,
        email: oauthUser.email,
        email_verified_at: new Date(),
        password: crypto.randomUUID(),
        avatar: oauthUser.avatar,
      })
    }

    await this.db()('oauth_identities').insert({
      user_id: user.id,
      provider,
      provider_id: oauthUser.id,
      access_token: oauthUser.accessToken,
      refresh_token: oauthUser.refreshToken,
      expires_at: oauthUser.expiresIn ? new Date(Date.now() + oauthUser.expiresIn * 1000) : null,
      created_at: new Date(),
      updated_at: new Date(),
    })

    return user
  }
}
