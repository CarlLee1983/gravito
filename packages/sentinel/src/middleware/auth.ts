import { AuthenticationException, type GravitoContext, type GravitoNext } from '@gravito/core'
import type { AuthManager } from '../AuthManager'

/**
 * Middleware that ensures the request is authenticated.
 *
 * This middleware checks the authentication status using the specified guard
 * (or the default guard if none provided). If the user is not authenticated,
 * it throws an AuthenticationException, which typically results in a 401 response.
 *
 * @param guard - Optional name of the guard to use for authentication
 * @returns A Gravito middleware handler
 * @throws {AuthenticationException} If the request is not authenticated
 *
 * @example
 * ```typescript
 * app.get('/profile', auth(), (c) => {
 *   return c.json(c.get('auth').user());
 * });
 * ```
 *
 * @public
 */
export function auth(guard?: string) {
  return async (c: GravitoContext, next: GravitoNext) => {
    const manager = c.get('auth') as AuthManager

    if (guard) {
      manager.shouldUse(guard)
    }

    if (!(await manager.check())) {
      throw new AuthenticationException()
    }

    return await next()
  }
}

export default auth
