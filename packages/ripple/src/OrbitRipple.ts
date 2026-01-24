import type { GravitoContext, GravitoNext, GravitoOrbit, PlanetCore } from '@gravito/core'
import { setRippleServer } from './events/Broadcaster'
import { BroadcastManager } from './events/BroadcastManager'
import { RippleServer } from './RippleServer'
import type { RippleConfig } from './types'

export class OrbitRipple implements GravitoOrbit {
  private server: RippleServer
  private config: RippleConfig

  constructor(config: RippleConfig = {}) {
    this.config = config
    this.server = new RippleServer(config)
  }

  install(core: PlanetCore): void {
    core.logger.info('🌊 Orbit Ripple installed')

    setRippleServer(this.server)

    core.container.instance('ripple', this.server)

    const broadcastManager = new BroadcastManager(this.server)
    core.container.instance('broadcast', broadcastManager)

    core.adapter.use('*', async (ctx: GravitoContext, next: GravitoNext) => {
      ctx.set('ripple', this.server)
      ctx.set('broadcast', broadcastManager)
      return await next()
    })

    this.server.init().then(() => {
      core.logger.info(`🌊 Ripple WebSocket ready at ${this.config.path || '/ws'}`)
    })

    core.hooks.doAction('core:shutdown', async () => {
      await this.server.shutdown()
    })
  }

  getServer(): RippleServer {
    return this.server
  }

  getHandler() {
    return this.server.getHandler()
  }
}

declare module '@gravito/core' {
  interface GravitoVariables {
    ripple?: RippleServer
    broadcast?: BroadcastManager
  }
}
