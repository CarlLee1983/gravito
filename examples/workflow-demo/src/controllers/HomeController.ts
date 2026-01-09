import type { GravitoContext } from '@gravito/core'

export class HomeController {
  dashboard = (ctx: GravitoContext) =>
    ctx.json({
      message: 'Workflow Demo is online',
      commands: ['bun dev', 'bun gravito doctor', 'bun run test'],
    })

  health = (ctx: GravitoContext) => ctx.json({ status: 'ok', time: new Date().toISOString() })
}
