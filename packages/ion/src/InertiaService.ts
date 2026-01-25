/**
 * @fileoverview Inertia.js Service for Gravito
 *
 * Provides server-side Inertia.js integration for building modern
 * single-page applications with server-side routing.
 *
 * @module @gravito/ion
 * @since 1.0.0
 */

import type { GravitoContext, GravitoVariables, ViewService } from '@gravito/core'
import { InertiaError } from './errors'

/**
 * Configuration options for InertiaService
 */
export interface InertiaConfig {
  /**
   * The root view template name
   * @default 'app'
   */
  rootView?: string

  /**
   * Asset version for cache busting
   */
  version?: string

  /**
   * Logging level for Inertia operations
   * @default 'info'
   */
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent'

  /**
   * Callback for render metrics (performance monitoring)
   */
  onRender?: (metrics: RenderMetrics) => void
}

/**
 * Metrics collected during render operations
 */
export interface RenderMetrics {
  component: string
  duration: number
  isInertiaRequest: boolean
  propsCount: number
  timestamp: number
  status?: number
}

/**
 * InertiaService - Server-side Inertia.js adapter
 *
 * This service handles the Inertia.js protocol for seamless
 * SPA-like navigation with server-side routing.
 *
 * @example
 * ```typescript
 * // In a controller
 * async index(ctx: GravitoContext) {
 *   const inertia = ctx.get('inertia') as InertiaService
 *   return inertia.render('Home', { users: await User.all() })
 * }
 * ```
 */
export class InertiaService {
  private sharedProps: Record<string, unknown> = {}
  private readonly logLevel: 'debug' | 'info' | 'warn' | 'error' | 'silent'
  private readonly onRenderCallback?: (metrics: RenderMetrics) => void

  /**
   * Create a new InertiaService instance
   *
   * @param context - The Gravito request context
   * @param config - Optional configuration
   */
  constructor(
    private context: GravitoContext<GravitoVariables>,
    private config: InertiaConfig = {}
  ) {
    this.logLevel = config.logLevel ?? 'info'
    this.onRenderCallback = config.onRender
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown): void {
    const levels = ['debug', 'info', 'warn', 'error', 'silent']
    const currentLevelIndex = levels.indexOf(this.logLevel)
    const messageLevelIndex = levels.indexOf(level)

    if (this.logLevel === 'silent' || messageLevelIndex < currentLevelIndex) {
      return
    }

    const logger =
      typeof this.context.get === 'function' ? (this.context.get('logger') as any) : undefined

    if (logger && typeof logger[level] === 'function') {
      logger[level](message, data)
    }
  }

  /**
   * Escape a string for safe use in HTML attributes
   *
   * Strategy: JSON.stringify already escapes special characters including
   * quotes as \". We need to escape these for HTML attributes, but we must
   * be careful not to break JSON escape sequences.
   *
   * The solution: Escape backslash-quote sequences (\" from JSON.stringify)
   * as \\&quot; so they become \\&quot; in HTML, which the browser decodes
   * to \\" (valid JSON), not \&quot; (invalid JSON).
   *
   * @param value - The string to escape.
   * @returns The escaped string.
   */
  private escapeForSingleQuotedHtmlAttribute(value: string): string {
    // First escape ampersands to prevent breaking existing HTML entities
    // Then escape backslash-quote sequences (from JSON.stringify) as \\&quot;
    // This ensures \" becomes \\&quot; which decodes to \\" (valid JSON)
    return value
      .replace(/&/g, '&amp;')
      .replace(/\\"/g, '\\&quot;') // Escape \" as \\&quot; (becomes \\" after decode)
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/'/g, '&#039;')
    // Note: We don't escape standalone " because JSON.stringify already
    // escaped all quotes as \", so any remaining " would be invalid JSON anyway
  }

  /**
   * Render an Inertia component
   *
   * @param component - The component name to render
   * @param props - Props to pass to the component
   * @param rootVars - Additional variables for the root template
   * @returns HTTP Response
   *
   * @example
   * ```typescript
   * return inertia.render('Users/Index', {
   *   users: await User.all(),
   *   filters: { search: ctx.req.query('search') }
   * })
   * ```
   */
  public render<T extends Record<string, unknown> = Record<string, unknown>>(
    component: string,
    props?: T,
    rootVars: Record<string, unknown> = {},
    status?: number
  ): Response {
    const startTime = performance.now()
    const isInertiaRequest = Boolean(this.context.req.header('X-Inertia'))

    try {
      this.log('debug', '[InertiaService] Starting render', {
        component,
        isInertiaRequest,
        propsCount: props ? Object.keys(props).length : 0,
      })

      let pageUrl: string
      try {
        const reqUrl = new URL(this.context.req.url, 'http://localhost')
        pageUrl = reqUrl.pathname + reqUrl.search
      } catch {
        pageUrl = this.context.req.url
      }

      const resolveProps = (p: Record<string, unknown>) => {
        const resolved: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(p)) {
          resolved[key] = typeof value === 'function' ? value() : value
        }
        return resolved
      }

      const page = {
        component,
        props: resolveProps({ ...this.sharedProps, ...(props ?? {}) }),
        url: pageUrl,
        version: this.config.version,
      }

      let pageJson: string
      try {
        pageJson = JSON.stringify(page)
      } catch (error) {
        this.log('error', '[InertiaService] Serialization failed', { component, error })
        throw InertiaError.serializationFailed(component, error)
      }

      let response: Response

      if (isInertiaRequest) {
        this.context.header('X-Inertia', 'true')
        this.context.header('Vary', 'Accept')
        response = this.context.json(page, status)
      } else {
        const view = this.context.get('view') as ViewService | undefined
        const rootView = this.config.rootView ?? 'app'

        if (!view) {
          this.log('error', '[InertiaService] ViewService not found')
          throw InertiaError.viewServiceMissing()
        }

        const isDev = process.env.NODE_ENV !== 'production'

        response = this.context.html(
          view.render(
            rootView,
            {
              ...rootVars,
              page: this.escapeForSingleQuotedHtmlAttribute(pageJson),
              isDev,
            },
            { layout: '' }
          ),
          status
        )
      }

      const duration = performance.now() - startTime

      this.log('info', '[InertiaService] Render complete', {
        component,
        duration: `${duration.toFixed(2)}ms`,
        isInertiaRequest,
        status: status ?? 200,
      })

      if (this.onRenderCallback) {
        this.onRenderCallback({
          component,
          duration,
          isInertiaRequest,
          propsCount: props ? Object.keys(props).length : 0,
          timestamp: Date.now(),
          status,
        })
      }

      return response
    } catch (error) {
      const duration = performance.now() - startTime

      if (error instanceof InertiaError) {
        this.log('error', '[InertiaService] Render failed', {
          component,
          duration: `${duration.toFixed(2)}ms`,
          errorCode: error.code,
          errorDetails: error.details,
        })
        throw error
      }

      this.log('error', '[InertiaService] Unexpected render error', {
        component,
        duration: `${duration.toFixed(2)}ms`,
        error,
      })
      return new Response('Inertia Render Error', { status: 500 })
    }
  }
  // ...

  /**
   * Share data with all Inertia responses
   *
   * Shared props are merged with component-specific props on every render.
   *
   * @param key - The prop key
   * @param value - The prop value
   *
   * @example
   * ```typescript
   * // In middleware
   * inertia.share('auth', { user: ctx.get('auth')?.user() })
   * inertia.share('flash', ctx.get('session')?.getFlash('message'))
   * ```
   */
  public share(key: string, value: unknown): void {
    this.sharedProps[key] = value
  }

  /**
   * Share multiple props at once
   *
   * @param props - Object of props to share
   */
  public shareAll(props: Record<string, unknown>): void {
    Object.assign(this.sharedProps, props)
  }

  /**
   * Get all shared props
   *
   * @returns A shallow copy of the shared props object.
   */
  public getSharedProps(): Record<string, unknown> {
    return { ...this.sharedProps }
  }
}
