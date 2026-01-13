/**
 * Auth Middleware
 *
 * Protect routes that require authentication.
 */

import type { GravitoContext, GravitoNext } from '@gravito/core'
import type { InertiaService } from '@gravito/ion'
import type { AuthManager } from '@gravito/sentinel'

export async function AuthMiddleware(ctx: GravitoContext, next: GravitoNext) {
  const auth = ctx.get('auth') as AuthManager

  if (!(await auth.check())) {
    // Check if Inertia request
    const inertia = ctx.get('inertia') as InertiaService | undefined
    if (inertia && ctx.req.header('X-Inertia')) {
      // Inertia redirect
      return ctx.redirect('/login', 303)
    }

    // API request
    if (ctx.req.header('Accept')?.includes('application/json')) {
      return ctx.json({ error: '請先登入' }, 401)
    }

    return ctx.redirect('/login')
  }

  return next()
}
