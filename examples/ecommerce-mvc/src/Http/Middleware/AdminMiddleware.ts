/**
 * Admin Middleware
 *
 * Protect routes that require admin role.
 */

import type { GravitoContext, GravitoNext } from '@gravito/core'
import type { AuthManager } from '@gravito/sentinel'

export async function AdminMiddleware(ctx: GravitoContext, next: GravitoNext) {
  const auth = ctx.get('auth') as AuthManager

  if (!(await auth.check())) {
    return ctx.redirect('/login')
  }

  const user = await auth.user()
  if (!user) {
    return ctx.redirect('/login')
  }

  // Check admin role
  const userData = user as any
  if (userData.role !== 'admin') {
    // Forbidden
    if (ctx.req.header('Accept')?.includes('application/json')) {
      return ctx.json({ error: '無權限存取' }, 403)
    }
    return ctx.redirect('/')
  }

  return next()
}
