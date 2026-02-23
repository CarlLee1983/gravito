import type { GravitoContext, Middleware } from '@gravito/core'

/**
 * AuthMiddleware - 保護需要認證的路由
 */
export class AuthMiddleware implements Middleware {
  async handle(ctx: GravitoContext) {
    if (!ctx.auth?.user) {
      return ctx.redirect('/login')
    }
  }
}
