import { AuthorizationException } from '@gravito/core'
import type { Gate } from '../Gate'

/**
 * Middleware that authorizes a user ability.
 * Throws AuthorizationException if the ability is denied.
 * @public
 */
export function can(ability: string, ...args: unknown[]) {
  return async (c: any, next: any) => {
    const gate = c.get('gate') as Gate

    if (await gate.denies(ability, ...args)) {
      throw new AuthorizationException()
    }

    await next()
  }
}

export default can
