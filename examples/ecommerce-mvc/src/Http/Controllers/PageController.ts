/**
 * Page Controller
 *
 * Handles static pages like contact, faq, shipping, returns.
 */

import type { GravitoContext } from '@gravito/core'
import type { InertiaService } from '@gravito/ion'

export class PageController {
  /**
   * FAQ Page
   */
  static async faq(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService
    return inertia.render('Support/FAQ')
  }

  /**
   * Shipping Policy Page
   */
  static async shipping(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService
    return inertia.render('Support/Shipping')
  }

  /**
   * Returns Policy Page
   */
  static async returns(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService
    return inertia.render('Support/Returns')
  }

  /**
   * Contact/Support Page
   */
  static async contact(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService
    return inertia.render('Support/Contact')
  }
}
