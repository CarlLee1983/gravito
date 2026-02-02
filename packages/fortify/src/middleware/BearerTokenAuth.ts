import type { GravitoContext, GravitoMiddleware } from '@gravito/core'
import type { PersonalAccessTokenService } from '../services/PersonalAccessTokenService'

/**
 * Represents the result of a successful token authentication check.
 */
export interface TokenAuthResult {
  user: any
  token: {
    id: number
    name: string
    abilities: string[] | null
  }
}

/**
 * Middleware factory for Bearer Token authentication.
 *
 * @param tokenService - The service used to validate Personal Access Tokens.
 * @returns A Gravito middleware that authenticates the request via the Authorization header.
 */
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

/**
 * Retrieves the currently authenticated user from the request context.
 *
 * @param c - The Gravito execution context.
 * @returns The authenticated user object or undefined if not authenticated.
 */
export function getAuthUser(c: GravitoContext): any {
  return c.get('auth:user')
}

/**
 * Retrieves the authentication token metadata from the request context.
 *
 * @param c - The Gravito execution context.
 * @returns The token metadata or undefined.
 */
export function getAuthToken(c: GravitoContext): TokenAuthResult['token'] | undefined {
  return c.get('auth:token') as TokenAuthResult['token'] | undefined
}

/**
 * Checks if the currently authenticated token has a specific ability.
 *
 * @param c - The Gravito execution context.
 * @param ability - The ability string to check.
 * @returns True if the token grants the specified ability.
 */
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
