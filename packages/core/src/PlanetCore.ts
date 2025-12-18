import type { Context } from 'hono'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { ConfigManager } from './ConfigManager'
import { HookManager } from './HookManager'
import { fail } from './helpers/response'
import { ConsoleLogger, type Logger } from './Logger'

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
  render(view: string, data?: Record<string, any>, options?: Record<string, any>): string
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

// Hono Variables Type for Context Injection
type Variables = {
  core: PlanetCore
  logger: Logger
  config: ConfigManager
  // Optional orbit-injected variables
  cache?: CacheService
  view?: ViewService
}

export interface GravitoOrbit {
  install(core: PlanetCore): void | Promise<void>
}

export type GravitoConfig = {
  logger?: Logger
  // biome-ignore lint/suspicious/noExplicitAny: allow flexible config object
  config?: Record<string, any>
  orbits?: (new () => GravitoOrbit)[] | GravitoOrbit[]
}

import { Router } from './Router'

export class PlanetCore {
  public app: Hono<{ Variables: Variables }>
  public logger: Logger
  public config: ConfigManager
  public hooks: HookManager
  public router: Router

  constructor(
    options: {
      logger?: Logger
      config?: Record<string, unknown>
    } = {}
  ) {
    this.logger = options.logger ?? new ConsoleLogger()
    this.config = new ConfigManager(options.config ?? {})
    this.hooks = new HookManager()
    this.router = new Router(this)

    this.app = new Hono<{ Variables: Variables }>()

    // Core Middleware for Context Injection
    this.app.use('*', async (c, next) => {
      c.set('core', this)
      c.set('logger', this.logger)
      c.set('config', this.config)
      await next()
    })

    // Standard Error Handling
    this.app.onError(async (err, c) => {
      const isProduction = process.env.NODE_ENV === 'production'
      const codeFromStatus = (status: number): string => {
        switch (status) {
          case 400:
            return 'BAD_REQUEST'
          case 401:
            return 'UNAUTHENTICATED'
          case 403:
            return 'FORBIDDEN'
          case 404:
            return 'NOT_FOUND'
          case 405:
            return 'METHOD_NOT_ALLOWED'
          case 409:
            return 'CONFLICT'
          case 422:
            return 'VALIDATION_ERROR'
          case 429:
            return 'TOO_MANY_REQUESTS'
          default:
            return status >= 500 ? 'INTERNAL_ERROR' : 'HTTP_ERROR'
        }
      }

      // Try rendering HTML if available and requested
      const view = c.get('view') as ViewService | undefined
      const accept = c.req.header('Accept') || ''
      const wantsHtml = Boolean(
        view && accept.includes('text/html') && !accept.includes('application/json')
      )
      let status: ContentfulStatusCode = 500
      let message = 'Internal Server Error'
      let code = 'INTERNAL_ERROR'
      let details: unknown

      if (err instanceof HTTPException) {
        status = err.status as ContentfulStatusCode
        message = err.message || message
        code = codeFromStatus(status)
      } else if (err instanceof Error) {
        message = err.message || message
      } else if (typeof err === 'string') {
        message = err
      }

      if (!isProduction && err instanceof Error) {
        details = { stack: err.stack }
      }

      let handlerContext: ErrorHandlerContext = {
        core: this,
        c,
        error: err,
        isProduction,
        accept,
        wantsHtml,
        status,
        payload: fail(message, code, details),
        ...(wantsHtml
          ? {
              html: {
                templates: status === 500 ? ['errors/500'] : [`errors/${status}`, 'errors/500'],
                data: {
                  status,
                  message,
                  code,
                  error: !isProduction && err instanceof Error ? err.stack : undefined,
                  debug: !isProduction,
                },
              },
            }
          : {}),
      }

      handlerContext = await this.hooks.applyFilters<ErrorHandlerContext>(
        'error:context',
        handlerContext
      )

      const defaultLogLevel = handlerContext.status >= 500 ? 'error' : 'none'
      const logLevel = handlerContext.logLevel ?? defaultLogLevel
      if (logLevel !== 'none') {
        const msg =
          handlerContext.logMessage ??
          (logLevel === 'error'
            ? `Application Error: ${handlerContext.payload.error.message}`
            : `HTTP ${handlerContext.status}: ${handlerContext.payload.error.message}`)

        if (logLevel === 'error') {
          this.logger.error(msg, err)
        } else if (logLevel === 'warn') {
          this.logger.warn(msg)
        } else {
          this.logger.info(msg)
        }
      }

      await this.hooks.doAction('error:report', handlerContext)

      const customResponse = await this.hooks.applyFilters<Response | null>(
        'error:render',
        null,
        handlerContext
      )
      if (customResponse) {
        return customResponse
      }

      if (handlerContext.wantsHtml && view && handlerContext.html) {
        let lastRenderError: unknown
        for (const template of handlerContext.html.templates) {
          try {
            return c.html(view.render(template, handlerContext.html.data), handlerContext.status)
          } catch (renderError) {
            lastRenderError = renderError
          }
        }
        this.logger.error('Failed to render error view', lastRenderError)
      }

      return c.json(handlerContext.payload, handlerContext.status)
    })

    this.app.notFound(async (c) => {
      // Try rendering HTML if available and requested
      const view = c.get('view') as ViewService | undefined
      const accept = c.req.header('Accept') || ''
      const wantsHtml = view && accept.includes('text/html') && !accept.includes('application/json')

      let handlerContext: ErrorHandlerContext = {
        core: this,
        c,
        error: new HTTPException(404, { message: 'Route not found' }),
        isProduction: process.env.NODE_ENV === 'production',
        accept,
        wantsHtml: Boolean(wantsHtml),
        status: 404,
        payload: fail('Route not found', 'NOT_FOUND'),
        ...(wantsHtml
          ? {
              html: {
                templates: ['errors/404', 'errors/500'],
                data: { status: 404, message: 'Route not found', code: 'NOT_FOUND', debug: false },
              },
            }
          : {}),
      }

      handlerContext = await this.hooks.applyFilters<ErrorHandlerContext>(
        'notFound:context',
        handlerContext
      )

      const logLevel = handlerContext.logLevel ?? 'info'
      if (logLevel !== 'none') {
        const msg = handlerContext.logMessage ?? `404 Not Found: ${c.req.url}`
        if (logLevel === 'error') {
          this.logger.error(msg)
        } else if (logLevel === 'warn') {
          this.logger.warn(msg)
        } else {
          this.logger.info(msg)
        }
      }

      await this.hooks.doAction('notFound:report', handlerContext)

      const customResponse = await this.hooks.applyFilters<Response | null>(
        'notFound:render',
        null,
        handlerContext
      )
      if (customResponse) {
        return customResponse
      }

      if (handlerContext.wantsHtml && view && handlerContext.html) {
        let lastRenderError: unknown
        for (const template of handlerContext.html.templates) {
          try {
            return c.html(view.render(template, handlerContext.html.data), handlerContext.status)
          } catch (renderError) {
            lastRenderError = renderError
          }
        }
        this.logger.error('Failed to render 404 view', lastRenderError)
      }

      return c.json(handlerContext.payload, handlerContext.status)
    })
  }

  /**
   * Boot the application with a configuration object (IoC style default entry)
   */
  static async boot(config: GravitoConfig): Promise<PlanetCore> {
    const core = new PlanetCore({
      ...(config.logger && { logger: config.logger }),
      ...(config.config && { config: config.config }),
    })

    if (config.orbits) {
      for (const OrbitClassOrInstance of config.orbits) {
        let orbit: GravitoOrbit
        if (typeof OrbitClassOrInstance === 'function') {
          // It's a constructor
          orbit = new (OrbitClassOrInstance as new () => GravitoOrbit)()
        } else {
          orbit = OrbitClassOrInstance
        }

        await orbit.install(core)
      }
    }

    return core
  }

  /**
   * 掛載軌道 (Orbit)
   * 將外部的 Hono app 掛載到指定路徑
   */
  mountOrbit(path: string, orbitApp: Hono): void {
    this.logger.info(`Mounting orbit at path: ${path}`)
    this.app.route(path, orbitApp)
  }

  /**
   * 啟動核心 (Liftoff)
   * 回傳用於 Bun.serve 的設定物件
   */
  liftoff(port?: number) {
    // 優先使用參數 > 設定檔 > 預設值
    const finalPort = port ?? this.config.get<number>('PORT', 3000)

    // Call hooks before liftoff
    this.hooks.doAction('app:liftoff', { port: finalPort })

    this.logger.info(`Ready to liftoff on port ${finalPort} 🚀`)

    return {
      port: finalPort,
      fetch: this.app.fetch.bind(this.app),
    }
  }
}
