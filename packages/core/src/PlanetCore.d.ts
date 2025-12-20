import type { Context } from 'hono'
import { Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { ConfigManager } from './ConfigManager'
import { Container } from './Container'
import { EventManager } from './EventManager'
import { type RegisterGlobalErrorHandlersOptions } from './GlobalErrorHandlers'
import { HookManager } from './HookManager'
import { fail } from './helpers/response'
import { type Logger } from './Logger'
import type { ServiceProvider } from './ServiceProvider'
/**
 * CacheService interface for orbit-injected cache
 * Orbits implementing cache should conform to this interface
 */
export interface CacheService {
  get<T = unknown>(key: string): Promise<T | null>
  set(key: string, value: unknown, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
  remember<T>(key: string, ttl: number, callback: () => Promise<T>): Promise<T>
}
export interface ViewService {
  render(view: string, data?: Record<string, unknown>, options?: Record<string, unknown>): string
}
export type ErrorHandlerContext = {
  core: PlanetCore
  c: Context
  error: unknown
  isProduction: boolean
  accept: string
  wantsHtml: boolean
  status: ContentfulStatusCode
  payload: ReturnType<typeof fail>
  logLevel?: 'error' | 'warn' | 'info' | 'none'
  logMessage?: string
  html?: {
    templates: string[]
    data: Record<string, unknown>
  }
}
type RouteParams = Record<string, string | number>
type RouteQuery = Record<string, string | number | boolean | null | undefined>
type Variables = {
  core: PlanetCore
  logger: Logger
  config: ConfigManager
  cookieJar: CookieJar
  route: (name: string, params?: RouteParams, query?: RouteQuery) => string
  cache?: CacheService
  view?: ViewService
  i18n?: unknown
  session?: unknown
  routeModels?: Record<string, unknown>
}
export interface GravitoOrbit {
  install(core: PlanetCore): void | Promise<void>
}
export type GravitoConfig = {
  logger?: Logger
  config?: Record<string, unknown>
  orbits?: (new () => GravitoOrbit)[] | GravitoOrbit[]
}
import { CookieJar } from './http/CookieJar'
import { Router } from './Router'
import { Encrypter } from './security/Encrypter'
import { BunHasher } from './security/Hasher'
export declare class PlanetCore {
  app: Hono<{
    Variables: Variables
  }>
  logger: Logger
  config: ConfigManager
  hooks: HookManager
  events: EventManager
  router: Router
  container: Container
  /** @deprecated Use core.container instead */
  services: Map<string, unknown>
  encrypter?: Encrypter
  hasher: BunHasher
  private providers
  /**
   * Register a service provider
   */
  register(provider: ServiceProvider): this
  /**
   * Bootstrap the application by registering and booting providers
   */
  bootstrap(): Promise<void>
  constructor(options?: {
    logger?: Logger
    config?: Record<string, unknown>
  })
  registerGlobalErrorHandlers(
    options?: Omit<RegisterGlobalErrorHandlersOptions, 'core'>
  ): () => void
  /**
   * Boot the application with a configuration object (IoC style default entry)
   */
  static boot(config: GravitoConfig): Promise<PlanetCore>
  /**
   * Mount an Orbit (a Hono app) to a path.
   */
  mountOrbit(path: string, orbitApp: Hono): void
  /**
   * Start the core (Liftoff).
   *
   * Returns a config object for `Bun.serve`.
   */
  liftoff(port?: number): {
    port: number
    fetch: (request: Request, server?: unknown) => Response | Promise<Response>
    core: PlanetCore
  }
}
//# sourceMappingURL=PlanetCore.d.ts.map
