import type { MiddlewareHandler } from '@gravito/photon'
import type { AuthManager } from '../AuthManager'

/**
 * Middleware that allows only unauthenticated guest users.
 *
 * This middleware ensures that only users who are NOT authenticated can access
 * the route. If an authenticated user attempts to access the route, they are
 * redirected to the specified path (defaults to '/').
 *
 * @param guard - Optional name of the guard to check
 * @param redirectTo - Path to redirect authenticated users to
 * @returns A Gravito middleware handler
 *
 * @example
 * ```typescript
 * app.get('/login', guest(), (c) => {
 *   // Only guests can see the login page
 * });
 * ```
 *
 * @public
 */
export const guest = (guard?: string, redirectTo = '/'): MiddlewareHandler => {
  return async (c, next) => {
    const manager = c.get('auth') as AuthManager

    if (guard) {
      manager.shouldUse(guard)
    }

    if (await manager.check()) {
      return c.redirect(redirectTo)
    }

    await next()
    return
  }
}
