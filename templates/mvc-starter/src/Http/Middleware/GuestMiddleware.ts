import type { GravitoContext, Middleware } from '@gravito/core'

/**
 * GuestMiddleware - 確保用戶未登入的路由
 */
export class GuestMiddleware implements Middleware {
  async handle(ctx: GravitoContext) {
    if (ctx.auth?.user) {
      return ctx.redirect('/dashboard')
    }
  }
}
