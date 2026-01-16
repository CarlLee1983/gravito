import { AuthenticationException } from '@gravito/core'
import type { AuthManager } from '../AuthManager'

/**
 * Middleware that requires a user to be authenticated.
 * Throws AuthenticationException if not authenticated.
 * @public
 */
export function auth(guard?: string) {
  return async (c: any, next: any) => {
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
