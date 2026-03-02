/**
 * Application Bootstrap
 *
 * The entry point for your Gravito E-Commerce application.
 * Uses the ServiceProvider pattern for modular, maintainable initialization.
 *
 * Lifecycle:
 * 1. Configure: Load app config and orbits
 * 2. Boot: Initialize PlanetCore
 * 3. Register Providers: Bind services to container
 * 4. Bootstrap: Boot all providers
 *
 * @module bootstrap
 */

import { defineConfig, GravitoEngineAdapter, PlanetCore } from '@gravito/core'
import { type AppConfig, appConfig } from '../config/app'
import { databaseConfig } from '../config/database'
import { orbits } from '../config/orbits'
import {
  DatabaseProvider,
  EventProvider,
  MiddlewareProvider,
  RouteProvider,
  SeoProvider,
} from './Providers'

export type { AppConfig }

/**
 * Bootstrap the application with service providers.
 *
 * @param options - Application configuration options
 * @returns The booted PlanetCore instance
 *
 * @example
 * ```typescript
 * const core = await bootstrap({ port: 3070 })
 * export default core.liftoff()
 * ```
 */
export async function bootstrap(options: AppConfig = {}) {
  // ─────────────────────────────────────────────────────────────
  // 1. Configure
  // ─────────────────────────────────────────────────────────────
  const config = defineConfig({
    adapter: new GravitoEngineAdapter(),
    config: {
      ...appConfig(options),
      database: databaseConfig,
    },
    orbits,
  })

  // ─────────────────────────────────────────────────────────────
  // 2. Boot Core
  // ─────────────────────────────────────────────────────────────
  const core = await PlanetCore.boot(config)
  core.registerGlobalErrorHandlers()

  // ─────────────────────────────────────────────────────────────
  // 3. Register Providers
  // ─────────────────────────────────────────────────────────────
  core.register(new DatabaseProvider())
  core.register(new EventProvider())
  core.register(new MiddlewareProvider())
  core.register(new RouteProvider())
  core.register(new SeoProvider())

  // ─────────────────────────────────────────────────────────────
  // 4. Bootstrap All Providers
  // ─────────────────────────────────────────────────────────────
  await core.bootstrap()

  return core
}
