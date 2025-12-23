import type { PlanetCore } from 'gravito-core'
import type { DevMailbox } from './DevMailbox'
import { getMailboxHtml } from './ui/mailbox'
import { getPreviewHtml } from './ui/preview'

export class DevServer {
  constructor(
    private mailbox: DevMailbox,
    private base = '/__mail'
  ) {}

  register(core: PlanetCore): void {
    const router = core.router

    // Remove trailing slash
    const prefix = this.base.replace(/\/$/, '')

    // 1. Mailbox List
    router.get(prefix, (ctx) => {
      const entries = this.mailbox.list()
      return ctx.html(getMailboxHtml(entries, prefix))
    })

    // 2. Single Email Preview
    router.get(`${prefix}/:id`, (ctx) => {
      const id = ctx.req.param('id')
      if (!id) return ctx.text('Bad Request', 400)

      const entry = this.mailbox.get(id)
      if (!entry) {
        return ctx.text('Email not found', 404)
      }
      return ctx.html(getPreviewHtml(entry, prefix))
    })

    // 3. Iframe Content: HTML
    router.get(`${prefix}/:id/html`, (ctx) => {
      const id = ctx.req.param('id')
      if (!id) return ctx.text('Bad Request', 400)

      const entry = this.mailbox.get(id)
      if (!entry) {
        return ctx.text('Not found', 404)
      }
      return ctx.html(entry.html)
    })

    // 4. Iframe Content: Text
    router.get(`${prefix}/:id/text`, (ctx) => {
      const id = ctx.req.param('id')
      if (!id) return ctx.text('Bad Request', 400)

      const entry = this.mailbox.get(id)
      if (!entry) {
        return ctx.text('Not found', 404)
      }

      ctx.header('Content-Type', 'text/plain; charset=utf-8')
      return ctx.text(entry.text || 'No text content', 200)
    })

    // 5. Raw JSON
    router.get(`${prefix}/:id/raw`, (ctx) => {
      const id = ctx.req.param('id')
      if (!id) return ctx.json({ error: 'Bad Request' }, 400)

      const entry = this.mailbox.get(id)
      if (!entry) {
        return ctx.json({ error: 'Not found' }, 404)
      }
      return ctx.json(entry)
    })

    // 6. API: Delete Single
    router.get(`${prefix}/:id/delete`, (ctx) => {
      return ctx.text('Method not allowed', 405)
    })

    router.delete(`${prefix}/:id`, (ctx) => {
      const id = ctx.req.param('id')
      if (!id) return ctx.json({ success: false, error: 'Bad Request' }, 400)

      const success = this.mailbox.delete(id)
      return ctx.json({ success })
    })

    // 7. API: Clear All
    router.delete(prefix, (ctx) => {
      this.mailbox.clear()
      return ctx.json({ success: true })
    })

    core.logger.info(`[OrbitSignal] Dev Mailbox available at ${prefix}`)
  }
}
