import type { PlanetCore } from '@gravito/core'

export function registerHooks(core: PlanetCore): void {
  core.hooks.addAction('app:liftoff', (args: Record<string, unknown>) => {
    const { port } = args as { port: number }
    core.logger.info(`🌌 ${core.config.get('APP_NAME')} is ready at http://localhost:${port}`)
  })
}
