import type { GravitoContext, GravitoMiddleware } from '@gravito/core'
import type { PersonalAccessTokenService } from '../services/PersonalAccessTokenService'

export interface TokenAuthResult {
  user: any
  token: {
    id: number
    name: string
    abilities: string[] | null
  }
}

export function bearerTokenAuth(tokenService: PersonalAccessTokenService): GravitoMiddleware {
  return async (c: GravitoContext, next) => {
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json(
        {
          error: 'Unauthenticated',
          message: 'Missing or invalid authorization header',
        },
        401
      )
    }

    const bearerToken = authHeader.substring(7)

    const result = await tokenService.validateToken(bearerToken)

    if (!result) {
      return c.json(
        {
          error: 'Unauthenticated',
          message: 'Invalid or expired token',
        },
        401
      )
    }

    c.set('auth:user', result.user)
    c.set('auth:token', {
      id: result.token.id,
      name: result.token.name,
      abilities: result.token.abilities,
    })

    return await next()
  }
}

export function getAuthUser(c: GravitoContext): any {
  return c.get('auth:user')
}

export function getAuthToken(c: GravitoContext): TokenAuthResult['token'] | undefined {
  return c.get('auth:token')
}

export function tokenCan(c: GravitoContext, ability: string): boolean {
  const token = getAuthToken(c)
  if (!token || !token.abilities) {
    return false
  }

  if (token.abilities.includes('*')) {
    return true
  }

  return token.abilities.includes(ability)
}
