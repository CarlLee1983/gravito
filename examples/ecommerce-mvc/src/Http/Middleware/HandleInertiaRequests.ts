/**
 * Handle Inertia Requests Middleware
 *
 * Share data with all Inertia responses.
 */

import { DB } from '@gravito/atlas'
import type { GravitoContext, GravitoNext } from '@gravito/core'
import type { I18nService } from '@gravito/cosmos'
import type { InertiaService } from '@gravito/ion'
import type { CsrfService, SessionService } from '@gravito/pulsar'
import type { AuthManager } from '@gravito/sentinel'
import { CartService } from '../../Services'
import { sql, TRUE } from '../../utils/db'

export async function HandleInertiaRequests(ctx: GravitoContext, next: GravitoNext) {
  const inertia = ctx.get('inertia') as InertiaService
  const auth = ctx.get('auth') as AuthManager
  const session = ctx.get('session') as SessionService
  const csrf = ctx.get('csrf') as CsrfService
  const i18n = ctx.get('i18n') as I18nService

  // Ensure CSRF token is generated and session is started
  const csrfToken = csrf.token()

  // Share authentication data
  const isAuthenticated = await auth.check()
  let userData = null
  let cartSummary = { item_count: 0, subtotal: 0 }

  if (isAuthenticated) {
    const user = await auth.user()
    if (user) {
      const userId = user.getAuthIdentifier() as number
      const result = await DB.raw<{ id: number; name: string; email: string; role: string }>(
        sql('SELECT id, name, email, role FROM users WHERE id = ?'),
        [userId]
      )
      userData = result.rows[0] || null
    }
  }

  // Get cart summary
  const cartService = new CartService()
  const userId = userData?.id
  const sessionId = session.id()
  const cart = await cartService.getOrCreateCart(userId, sessionId)
  cartSummary = {
    item_count: cart.getItemCount(),
    subtotal: cart.getSubtotal(),
  }

  // Get categories for navigation
  const categoriesResult = await DB.raw<{ id: number; name: string; slug: string }>(
    sql(`
    SELECT id, name, slug FROM categories
    WHERE is_active = ${TRUE}
    ORDER BY sort_order, name
    LIMIT 10
  `)
  )

  // Share data with Inertia
  inertia.shareAll({
    locale: i18n.getLocale(),
    translations: (i18n as any).manager.translations[i18n.getLocale()] || {},
    auth: {
      isAuthenticated,
      user: userData,
    },
    cart: cartSummary,
    categories: categoriesResult.rows,
    csrfToken: csrfToken,
    flash: {
      success: session.get('_flash.success'),
      error: session.get('_flash.error'),
      errors: session.get('_flash.errors'),
      old: session.get('_flash.old'),
    },
  })

  return next()
}
