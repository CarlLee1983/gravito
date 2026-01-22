import type { GravitoContext, PlanetCore } from '@gravito/core'

export class ApiController {
  constructor(private core: PlanetCore) {}

  health = async (ctx: GravitoContext) => {
    return ctx.json({
      status: 'healthy',
      service: this.core.config.get('APP_NAME'),
    })
  }
}
