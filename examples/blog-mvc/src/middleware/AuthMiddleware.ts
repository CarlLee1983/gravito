import type { GravitoContext, GravitoNext } from '@gravito/core'
import type { AuthManager } from '@gravito/sentinel'

export async function authMiddleware(ctx: GravitoContext, next: GravitoNext) {
  const auth = ctx.get('auth') as AuthManager

  if (!(await auth.check())) {
    // If it's an Inertia request, we should ideally handle it differently,
    // but a standard redirect works for most cases as Inertia handles 303/302.
    return ctx.redirect('/login')
  }

  await next()
  return undefined
}
