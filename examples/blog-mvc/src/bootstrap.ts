/**
 * Application Bootstrap
 *
 * The entry point for your Gravito application.
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

import { defineConfig, PlanetCore } from '@gravito/core'
import { type AppConfig, appConfig } from './config/app'
import { orbits } from './config/orbits'
import {
  DatabaseProvider,
  DevEnvironmentProvider,
  MiddlewareProvider,
  RouteProvider,
  StorageProvider,
} from './providers'

export type { AppConfig }

/**
 * Bootstrap the application with service providers.
 *
 * @param options - Application configuration options
 * @returns The booted PlanetCore instance
 *
 * @example
 * ```typescript
 * const core = await bootstrap({ port: 3000 })
 * export default core.liftoff()
 * ```
 */
export async function bootstrap(options: AppConfig = {}) {
  // ─────────────────────────────────────────────────────────────
  // 1. Configure
  // ─────────────────────────────────────────────────────────────
  const config = defineConfig({
    config: appConfig(options),
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
  const isDev = process.env.NODE_ENV !== 'production'

  core.register(new DatabaseProvider())
  core.register(new StorageProvider())
  core.register(new MiddlewareProvider())

  if (isDev) {
    core.register(new DevEnvironmentProvider())
  }

  core.register(new RouteProvider())

  // ─────────────────────────────────────────────────────────────
  // 4. Bootstrap All Providers
  // ─────────────────────────────────────────────────────────────
  await core.bootstrap()

  return core
}
