import type { GravitoContext } from '@gravito/core'
import type { FortifyConfig } from '../config'
import { ErrorCodes } from '../errors/codes'
import { FortifyError } from '../errors/FortifyError'
import type { FortifyEventEmitter } from '../events/EventEmitter'
import { getAuthUser } from '../middleware/BearerTokenAuth'
import type { PersonalAccessTokenService } from '../services/PersonalAccessTokenService'
import { BaseController } from './BaseController'

export class TokenController extends BaseController {
  constructor(
    config: FortifyConfig,
    private tokenService: PersonalAccessTokenService,
    events?: FortifyEventEmitter
  ) {
    super(config, events)
  }

  async index(c: GravitoContext): Promise<Response> {
    const user = getAuthUser(c)

    if (!user) {
      return this.error(c, FortifyError.unauthenticated())
    }

    const tokens = await this.tokenService.listTokens(user.id)

    const sanitizedTokens = tokens.map((token) => ({
      id: token.id,
      name: token.name,
      abilities: token.abilities,
      last_used_at: token.last_used_at,
      expires_at: token.expires_at,
      created_at: token.created_at,
    }))

    return c.json({
      success: true,
      data: { tokens: sanitizedTokens },
    })
  }

  async store(c: GravitoContext): Promise<Response> {
    const user = getAuthUser(c)

    if (!user) {
      return this.error(c, FortifyError.unauthenticated())
    }

    const body = await c.req.parseBody()
    const { name, abilities, expires_in_minutes } = body as {
      name?: string
      abilities?: string | string[]
      expires_in_minutes?: string | number
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return this.validationError(c, {
        name: ['Token name is required'],
      })
    }

    const parsedAbilities = this.parseAbilities(abilities)
    const expiresInMinutes = expires_in_minutes
      ? Number.parseInt(expires_in_minutes.toString(), 10)
      : undefined

    if (expires_in_minutes && Number.isNaN(expiresInMinutes)) {
      return this.validationError(c, {
        expires_in_minutes: ['Must be a valid number'],
      })
    }

    try {
      const { plainTextToken, accessToken } = await this.tokenService.createToken(user.id, {
        name: name.trim(),
        abilities: parsedAbilities,
        expiresInMinutes,
      })

      if (this.events) {
        await this.events.emit('auth:token-created', {
          user,
          token: {
            id: accessToken.id,
            name: accessToken.name,
          },
          ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '127.0.0.1',
          userAgent: c.req.header('user-agent') || 'unknown',
          timestamp: new Date(),
        })
      }

      return c.json(
        {
          success: true,
          data: {
            plain_text_token: plainTextToken,
            token: {
              id: accessToken.id,
              name: accessToken.name,
              abilities: accessToken.abilities,
              expires_at: accessToken.expires_at,
              created_at: accessToken.created_at,
            },
          },
          message:
            'Token created successfully. Please copy it now, you will not be able to see it again.',
        },
        201
      )
    } catch (error) {
      console.error('[Fortify] Token creation error:', error)
      return this.error(c, FortifyError.internal(error as Error))
    }
  }

  async destroy(c: GravitoContext): Promise<Response> {
    const user = getAuthUser(c)

    if (!user) {
      return this.error(c, FortifyError.unauthenticated())
    }

    const tokenId = c.req.param('id')
    if (!tokenId) {
      return c.json(
        {
          success: false,
          error: { message: 'Token ID is required' },
        },
        400
      )
    }

    const id = Number.parseInt(tokenId, 10)
    if (Number.isNaN(id)) {
      return c.json(
        {
          success: false,
          error: { message: 'Invalid token ID' },
        },
        400
      )
    }

    const token = await this.tokenService.findById(id)
    if (!token) {
      return c.json(
        {
          success: false,
          error: { message: 'Token not found' },
        },
        404
      )
    }

    if (token.tokenable_id !== user.id) {
      return c.json(
        {
          success: false,
          error: { message: 'Forbidden' },
        },
        403
      )
    }

    const revoked = await this.tokenService.revokeToken(id)

    if (!revoked) {
      return c.json(
        {
          success: false,
          error: { message: 'Failed to revoke token' },
        },
        500
      )
    }

    if (this.events) {
      await this.events.emit('auth:token-revoked', {
        user,
        token: {
          id: token.id,
          name: token.name,
        },
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '127.0.0.1',
        userAgent: c.req.header('user-agent') || 'unknown',
        timestamp: new Date(),
      })
    }

    return c.json({
      success: true,
      message: 'Token revoked successfully',
    })
  }

  async destroyAll(c: GravitoContext): Promise<Response> {
    const user = getAuthUser(c)

    if (!user) {
      return this.error(c, FortifyError.unauthenticated())
    }

    const count = await this.tokenService.revokeAllTokens(user.id)

    if (this.events) {
      await this.events.emit('auth:all-tokens-revoked', {
        user,
        count,
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '127.0.0.1',
        userAgent: c.req.header('user-agent') || 'unknown',
        timestamp: new Date(),
      })
    }

    return c.json({
      success: true,
      message: `${count} token(s) revoked successfully`,
      data: { count },
    })
  }

  private parseAbilities(abilities?: string | string[]): string[] | undefined {
    if (!abilities) return undefined

    if (typeof abilities === 'string') {
      try {
        const parsed = JSON.parse(abilities)
        return Array.isArray(parsed) ? parsed : [abilities]
      } catch {
        return [abilities]
      }
    }

    return Array.isArray(abilities) ? abilities : undefined
  }
}
