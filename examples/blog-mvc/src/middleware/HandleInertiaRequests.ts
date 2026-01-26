import type { GravitoContext, GravitoNext } from '@gravito/core'
import type { InertiaHelper } from '@gravito/ion'
import type { SessionService } from '@gravito/pulsar'
import type { AuthManager } from '@gravito/sentinel'

export async function handleInertiaRequests(ctx: GravitoContext, next: GravitoNext) {
  const inertia = ctx.get('inertia') as InertiaHelper
  const auth = ctx.get('auth') as AuthManager
  const session = ctx.get('session') as SessionService

  // Share common data
  const user = await auth.user()

  // Fetch categories for global navigation/filters
  const { Category } = await import('../models/Category')
  const categories = await Category.all()

  inertia.shareAll({
    auth: {
      user: user
        ? {
            id: user.getAuthIdentifier(),
            name: (user as any).name,
            email: (user as any).email,
          }
        : null,
    },
    flash: {
      message: session.getFlash('message'),
      error: session.getFlash('error'),
    },
    errors: session.getFlash('errors') || {},
    categories,
  })

  await next()
  return undefined
}
