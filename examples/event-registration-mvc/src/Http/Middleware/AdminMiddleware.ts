import type { GravitoContext, GravitoNext } from '@gravito/core'
import { UserRole } from '../../Models/User'

export async function AdminMiddleware(ctx: GravitoContext, next: GravitoNext) {
  const userRole = ctx.session.get('user_role')

  if (userRole !== UserRole.ADMIN) {
    return ctx.redirect('/')
  }

  return await next()
}
