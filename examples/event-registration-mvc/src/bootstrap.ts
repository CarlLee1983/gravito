import { defineConfig, GravitoEngineAdapter, PlanetCore } from '@gravito/core'
import appConfig from '../config/app'
import databaseConfig from '../config/database'
import mailConfig from '../config/mail'
import { orbits } from '../config/orbits'
import {
  AppServiceProvider,
  DatabaseProvider,
  HandleInertiaRequests,
  RouteProvider,
} from './Providers'

export async function bootstrap(): Promise<PlanetCore> {
  // Configure
  const config = defineConfig({
    adapter: new GravitoEngineAdapter(),
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
  core.register(new HandleInertiaRequests())
  core.register(new RouteProvider())

  // Compatibility Middleware for Gravito 2.0+
  core.adapter.use('*', async (ctx, next) => {
    // Polyfill missing properties for old example code
    const anyCtx = ctx as any
    anyCtx.inertia = ctx.get('inertia')
    anyCtx.session = ctx.get('session')
    anyCtx.auth = ctx.get('auth')
    anyCtx.i18n = ctx.get('i18n')

    // Handle data compatibility
    if (ctx.req.method !== 'GET' && ctx.req.method !== 'HEAD') {
      try {
        const contentType = ctx.req.header('Content-Type') || ''
        let body = {}
        if (contentType.includes('application/json')) {
          body = await ctx.req.json()
        } else {
          body = await ctx.req.parseBody()
        }
        anyCtx.data = body
      } catch (_e) {
        anyCtx.data = {}
      }
    } else {
      anyCtx.data = {}
    }

    return await next()
  })

  // Bootstrap All Providers
  await core.bootstrap()

  return core
}
