import { AuthorizationException, type GravitoContext, type GravitoNext } from '@gravito/core'
import type { AuthManager } from '../AuthManager'

/**
 * Middleware that checks if the authenticated user has a specific role.
 *
 * This middleware assumes that the user model implements the `hasRole` method
 * defined in the `Authenticatable` interface.
 *
 * @param role - The name of the role to check (e.g., 'admin', 'editor')
 * @returns A Gravito middleware handler
 * @throws {AuthorizationException} If the user is not authenticated or lacks the role
 *
 * @example
 * ```typescript
 * app.delete('/users/:id', role('admin'), (c) => { ... });
 * ```
 *
 * @public
 */
export function role(role: string) {
  return async (c: GravitoContext, next: GravitoNext) => {
    const auth = c.get('auth') as AuthManager
    const user = await auth.user()

    if (!user) {
      throw new AuthorizationException('Unauthenticated.')
    }

    if (typeof user.hasRole !== 'function') {
      // If the user model doesn't implement hasRole, we technically deny access
      // or we could throw a specific error warning the developer.
      // For security, denying is safer.
      throw new AuthorizationException(`User model does not implement 'hasRole'.`)
    }

    const hasRole = await user.hasRole(role)

    if (!hasRole) {
      throw new AuthorizationException()
    }

    await next()
  }
}

export default role
