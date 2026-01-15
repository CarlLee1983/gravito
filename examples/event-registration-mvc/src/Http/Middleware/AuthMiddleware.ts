import type { GravitoContext, GravitoNext } from '@gravito/core'

export async function AuthMiddleware(ctx: GravitoContext, next: GravitoNext) {
  const userId = ctx.session.get('user_id')

  if (!userId) {
    return ctx.redirect('/login')
  }

  return await next()
}
