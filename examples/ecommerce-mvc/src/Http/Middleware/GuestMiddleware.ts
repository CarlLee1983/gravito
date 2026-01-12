/**
 * Guest Middleware
 *
 * Only allow unauthenticated users (for login/register pages).
 */

import type { GravitoContext, MiddlewareNext } from '@gravito/core'
import type { AuthManager } from '@gravito/sentinel'

export async function GuestMiddleware(ctx: GravitoContext, next: MiddlewareNext) {
  const auth = ctx.get('auth') as AuthManager

  if (await auth.check()) {
    return ctx.redirect('/')
  }

  return next()
}
