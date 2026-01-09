import type { GravitoContext, PlanetCore } from '@gravito/core'
import type { DevMailbox } from './DevMailbox'
import { getMailboxHtml } from './ui/mailbox'
import { getPreviewHtml } from './ui/preview'

export type DevServerOptions = {
  allowInProduction?: boolean
  gate?: (c: GravitoContext) => boolean | Promise<boolean>
}

export class DevServer {
  constructor(
    private mailbox: DevMailbox,
    private base = '/__mail',
    private options?: DevServerOptions
  ) {}

  private async canAccess(ctx: GravitoContext): Promise<boolean> {
    const isProduction = process.env.NODE_ENV === 'production'
    if (isProduction && !this.options?.allowInProduction && !this.options?.gate) {
      return false
    }
    if (this.options?.gate) {
      return await this.options.gate(ctx)
    }
    return true
  }

  register(core: PlanetCore): void {
    const router = core.router
    const isProduction = process.env.NODE_ENV === 'production'

    if (isProduction && !this.options?.allowInProduction && !this.options?.gate) {
      core.logger.warn(
        '[OrbitSignal] Dev Mailbox disabled in production. Configure a gate to allow access.'
      )
      return
    }

    // Remove trailing slash
    const prefix = this.base.replace(/\/$/, '')

    const wrap = (handler: (ctx: GravitoContext) => Response | Promise<Response>) => {
      return async (ctx: GravitoContext) => {
        const allowed = await this.canAccess(ctx)
        if (!allowed) {
          return ctx.text('Unauthorized', 403)
        }
        return await handler(ctx)
      }
    }

    // 1. Mailbox List
    router.get(
      prefix,
      wrap((ctx) => {
        const entries = this.mailbox.list()
        ctx.header('Content-Type', 'text/html; charset=utf-8')
        return ctx.html(getMailboxHtml(entries, prefix))
      })
    )

    // 2. Single Email Preview
    router.get(
      `${prefix}/:id`,
      wrap((ctx) => {
        const id = ctx.req.param('id')
        if (!id) {
          return ctx.text('Bad Request', 400)
        }

        const entry = this.mailbox.get(id)
        if (!entry) {
          return ctx.text('Email not found', 404)
        }
        ctx.header('Content-Type', 'text/html; charset=utf-8')
        return ctx.html(getPreviewHtml(entry, prefix))
      })
    )

    // 3. Iframe Content: HTML
    router.get(
      `${prefix}/:id/html`,
      wrap((ctx) => {
        const id = ctx.req.param('id')
        if (!id) {
          return ctx.text('Bad Request', 400)
        }

        const entry = this.mailbox.get(id)
        if (!entry) {
          return ctx.text('Not found', 404)
        }
        ctx.header('Content-Type', 'text/html; charset=utf-8')
        return ctx.html(entry.html)
      })
    )

    // 4. Iframe Content: Text
    router.get(
      `${prefix}/:id/text`,
      wrap((ctx) => {
        const id = ctx.req.param('id')
        if (!id) {
          return ctx.text('Bad Request', 400)
        }

        const entry = this.mailbox.get(id)
        if (!entry) {
          return ctx.text('Not found', 404)
        }

        ctx.header('Content-Type', 'text/plain; charset=utf-8')
        return ctx.text(entry.text || 'No text content', 200)
      })
    )

    // 5. Raw JSON
    router.get(
      `${prefix}/:id/raw`,
      wrap((ctx) => {
        const id = ctx.req.param('id')
        if (!id) {
          return ctx.json({ error: 'Bad Request' }, 400)
        }

        const entry = this.mailbox.get(id)
        if (!entry) {
          return ctx.json({ error: 'Not found' }, 404)
        }
        return ctx.json(entry)
      })
    )

    // 6. API: Delete Single
    router.get(
      `${prefix}/:id/delete`,
      wrap((ctx) => {
        return ctx.text('Method not allowed', 405)
      })
    )

    router.delete(
      `${prefix}/:id`,
      wrap((ctx) => {
        const id = ctx.req.param('id')
        if (!id) {
          return ctx.json({ success: false, error: 'Bad Request' }, 400)
        }

        const success = this.mailbox.delete(id)
        return ctx.json({ success })
      })
    )

    // 7. API: Clear All
    router.delete(
      prefix,
      wrap((ctx) => {
        this.mailbox.clear()
        return ctx.json({ success: true })
      })
    )

    core.logger.info(`[OrbitSignal] Dev Mailbox available at ${prefix}`)
  }
}
