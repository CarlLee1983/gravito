import { defineConfig, PhotonAdapter, PlanetCore } from '@gravito/core'
import appConfig from '../config/app'
import databaseConfig from '../config/database'
import mailConfig from '../config/mail'
import { orbits } from '../config/orbits'
import {
  AppServiceProvider,
  DatabaseProvider,
  InertiaServiceProvider,
  RouteProvider,
} from './Providers'

export async function bootstrap(): Promise<PlanetCore> {
  // Configure
  const config = defineConfig({
    adapter: new PhotonAdapter(),
    config: {
      ...appConfig,
      database: databaseConfig,
      mail: mailConfig,
      VIEW_DIR: 'resources/views',
    },
    orbits: orbits as any[],
  })

  // Boot Core
  const core = await PlanetCore.boot(config)
  core.registerGlobalErrorHandlers()

  // Register Providers
  core.register(new DatabaseProvider())
  core.register(new AppServiceProvider())
  core.register(new InertiaServiceProvider())
  core.register(new RouteProvider())

  // Compatibility Middleware for Gravito 2.0+
  core.adapter.use('*', async (ctx, next) => {
    // Polyfill missing properties for old example code
    const anyCtx = ctx as any
    anyCtx.inertia = ctx.get('inertia')
    anyCtx.session = ctx.get('session')
    anyCtx.auth = ctx.get('auth')
    anyCtx.params = ctx.req.params()
    anyCtx.query = ctx.req.queries()

    // Handle ctx.body compatibility
    // In 2.0, ctx.body is a method. We'll attach the parsed body to ctx.requestBody
    // and tell the user to use that or we can try to proxy it if we're brave.
    // Actually, many controllers use ctx.body.title etc.
    if (ctx.req.method !== 'GET' && ctx.req.method !== 'HEAD') {
      try {
        anyCtx.body = await ctx.req.parseBody()
      } catch (e) {
        anyCtx.body = {}
      }
    } else {
      anyCtx.body = {}
    }

    return await next()
  })

  // Bootstrap All Providers
  await core.bootstrap()

  return core
}
