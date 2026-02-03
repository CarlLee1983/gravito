import { AuthorizationException, type GravitoContext, type GravitoNext } from '@gravito/core'
import type { AuthManager } from '../AuthManager'

/**
 * Middleware that checks if the authenticated user has a specific permission.
 *
 * This middleware assumes that the user model implements the `hasPermission` method
 * defined in the `Authenticatable` interface.
 *
 * @param permission - The name of the permission to check
 * @returns A Gravito middleware handler
 * @throws {AuthorizationException} If the user is not authenticated or lacks the permission
 *
 * @example
 * ```typescript
 * app.post('/posts', permission('create-post'), (c) => { ... });
 * ```
 *
 * @public
 */
export function permission(permission: string) {
  return async (c: GravitoContext, next: GravitoNext) => {
    const auth = c.get('auth') as AuthManager
    const user = await auth.user()

    if (!user) {
      throw new AuthorizationException('Unauthenticated.')
    }

    if (typeof user.hasPermission !== 'function') {
      throw new AuthorizationException(`User model does not implement 'hasPermission'.`)
    }

    const hasPermission = await user.hasPermission(permission)

    if (!hasPermission) {
      throw new AuthorizationException()
    }

    await next()
  }
}

export default permission
