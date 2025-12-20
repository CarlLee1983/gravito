import { AuthorizationException } from 'gravito-core'
import type { MiddlewareHandler } from 'hono'
import type { Gate } from '../Gate'

export const can = (ability: string, ...args: unknown[]): MiddlewareHandler => {
  return async (c, next) => {
    const gate = c.get('gate') as Gate

    if (await gate.denies(ability, ...args)) {
      throw new AuthorizationException()
    }

    await next()
  }
}
