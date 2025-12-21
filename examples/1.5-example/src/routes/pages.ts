import type { InertiaService } from '@gravito/orbit-inertia'
import type { OrbitMail } from '@gravito/orbit-mail'
import { Mailable } from '@gravito/orbit-mail'
import { Schema, validate } from '@gravito/mass'
import type { PlanetCore } from 'gravito-core'
import type { Context } from 'hono'
import { Hono } from 'hono'
import { User } from '../models/User'

/**
 * Concrete Mailable implementation for the welcome email.
 */
class WelcomeMail extends Mailable {
  build() {
    return this
  }
}

/**
 * Pages route module.
 *
 * Important: use Hono's `.route()` to compose modules. This is required to preserve full
 * TypeScript type inference.
 */
export function createPagesRoute(core: PlanetCore) {
  const pagesRoute = new Hono()

  /**
   * Home page
   * GET /
   */
  pagesRoute.get('/', async (c: Context) => {
    const inertia = c.get('inertia') as InertiaService

    return inertia.render('Home', {
      msg: 'Hello from Gravito Backend!',
      version: core.config.get('APP_VERSION'),
    })
  })

  /**
   * Contact page
   * GET /contact
   */
  pagesRoute.get('/contact', async (c) => {
    const inertia = c.get('inertia') as InertiaService
    return inertia.render('Contact')
  })

  /**
   * Handle contact form
   * POST /contact
   */
  pagesRoute.post(
    '/contact',
    validate(
      'json',
      Schema.Object({
        name: Schema.String({ minLength: 2 }),
        email: Schema.String({ format: 'email' }),
        message: Schema.String({ minLength: 5 }),
      })
    ),
    async (c) => {
      const data = c.req.valid('json')
      const mail = c.get('mail') as OrbitMail
      const inertia = c.get('inertia') as InertiaService

      // 1. Save to DB
      // Register core if not already done (Bypass strict this typing if it errors)
      // @ts-expect-error
      await User.create({
        name: data.name,
        email: data.email,
      })

      const welcomeMail = new WelcomeMail()
        .to(data.email as string)
        .subject('Welcome to Gravito!')
        .html(`<h1>Hi ${data.name}!</h1><p>Thanks for connecting with us!</p>`)

      await mail.queue(welcomeMail)

      // 3. Redirect to Home with success message
      return inertia.render('Home', {
        msg: `Thanks ${data.name}! We've received your message.`,
      })
    }
  )

  return pagesRoute
}
