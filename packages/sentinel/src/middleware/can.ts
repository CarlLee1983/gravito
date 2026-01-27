import { AuthorizationException, type GravitoContext, type GravitoNext } from '@gravito/core'
import type { Gate } from '../Gate'

/**
 * Middleware that authorizes a user against a specific ability.
 *
 * This middleware checks if the currently authenticated user has the
 * required ability using the Authorization Gate. If the ability is denied,
 * it throws an AuthorizationException, typically resulting in a 403 response.
 *
 * @param ability - The name of the ability to check
 * @param args - Additional arguments to pass to the gate callback
 * @returns A Gravito middleware handler
 * @throws {AuthorizationException} If the user is not authorized
 *
 * @example
 * ```typescript
 * app.put('/posts/:id', can('update-post'), (c) => {
 *   // Only users who can update-post can reach here
 * });
 * ```
 *
 * @public
 */
export function can(ability: string, ...args: unknown[]) {
  return async (c: GravitoContext, next: GravitoNext) => {
    const gate = c.get('gate') as Gate

    if (await gate.denies(ability, ...args)) {
      throw new AuthorizationException()
    }

    await next()
  }
}

export default can
