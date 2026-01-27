/**
 * @fileoverview Inertia.js Service for Gravito.
 *
 * This service implements the Inertia.js server-side protocol, enabling
 * seamless page transitions and data synchronization for monolith SPAs.
 *
 * @module @gravito/ion
 */

import type { GravitoContext, GravitoVariables, ViewService } from '@gravito/core'
import { InertiaError } from './errors'

/**
 * Configuration options for the InertiaService instance.
 */
export interface InertiaConfig {
  /**
   * The name of the root view template used for the initial page load.
   * @default 'app'
   */
  rootView?: string

  /**
   * Asset version string. Used by Inertia to trigger a full page reload if the version changes.
   */
  version?: string

  /**
   * Minimum logging level for internal operations.
   * @default 'info'
   */
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent'

  /**
   * Performance monitoring callback triggered after each render.
   */
  onRender?: (metrics: RenderMetrics) => void
}

/**
 * Encapsulates performance and status metrics for a single render operation.
 */
export interface RenderMetrics {
  /** Name of the frontend component rendered. */
  component: string
  /** Time taken in milliseconds. */
  duration: number
  /** Whether the request was a partial Inertia AJAX request. */
  isInertiaRequest: boolean
  /** Number of top-level props passed to the component. */
  propsCount: number
  /** Epoch timestamp of the operation. */
  timestamp: number
  /** Resulting HTTP status code. */
  status?: number
}

/**
 * InertiaService - Server-side adapter for the Inertia.js protocol.
 *
 * This service handles component resolution, prop merging (including lazy props),
 * asset versioning, and initial HTML generation using the Gravito ViewService.
 *
 * @example
 * ```typescript
 * const service = new InertiaService(ctx, { version: '1.0' });
 * return service.render('Welcome', { user: 'Carl' });
 * ```
 */
export class InertiaService {
  private sharedProps: Record<string, unknown> = {}
  private readonly logLevel: 'debug' | 'info' | 'warn' | 'error' | 'silent'
  private readonly onRenderCallback?: (metrics: RenderMetrics) => void

  /**
   * Initializes a new instance of the Inertia service.
   *
   * @param context - The current Gravito request context
   * @param config - Instance configuration options
   */
  constructor(
    private context: GravitoContext<GravitoVariables>,
    private config: InertiaConfig = {}
  ) {
    this.logLevel = config.logLevel ?? 'info'
    this.onRenderCallback = config.onRender
  }

  /**
   * Internal logging helper that respects the configured log level.
   *
   * @param level - Log severity level
   * @param message - Descriptive message
   * @param data - Optional metadata for the log
   */
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
   * Escapes a string for safe embedding into a single-quoted HTML attribute.
   *
   * This ensures that JSON strings can be safely passed to the frontend
   * via the `data-page` attribute without breaking the HTML structure.
   *
   * @param value - Raw JSON or text string
   * @returns Safely escaped HTML attribute value
   */
  private escapeForSingleQuotedHtmlAttribute(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/\\"/g, '\\&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/'/g, '&#039;')
  }

  /**
   * Renders an Inertia component by either returning a JSON response (for AJAX)
   * or a full HTML document (for initial load).
   *
   * @param component - Frontend component name
   * @param props - Data passed to the component
   * @param rootVars - Variables for the root template
   * @param status - HTTP status code
   * @returns Gravito HTTP Response
   * @throws {InertiaError} If serialization fails or the ViewService is missing
   *
   * @example
   * ```typescript
   * return inertia.render('Dashboard', { stats: getStats() });
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

      /**
       * Resolves lazy props by executing any functional prop values.
       */
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

  /**
   * Registers a piece of data to be shared with all Inertia responses.
   *
   * Shared props are automatically merged with component props during render.
   * This is useful for global data like authenticated user info or flash messages.
   *
   * @param key - Identifier for the shared prop
   * @param value - Value to share (must be JSON serializable)
   *
   * @example
   * ```typescript
   * inertia.share('auth', { user: 'Carl' });
   * ```
   */
  public share(key: string, value: unknown): void {
    this.sharedProps[key] = value
  }

  /**
   * Shares multiple props in a single operation.
   *
   * Merges the provided object into the existing shared props state.
   *
   * @param props - Object containing props to merge into the shared state
   *
   * @example
   * ```typescript
   * inertia.shareAll({
   *   appName: 'Gravito Store',
   *   version: '1.0.0'
   * });
   * ```
   */
  public shareAll(props: Record<string, unknown>): void {
    Object.assign(this.sharedProps, props)
  }

  /**
   * Returns a copy of the current shared props.
   *
   * Useful for debugging or inspecting the state before rendering.
   *
   * @returns Current shared props dictionary
   *
   * @example
   * ```typescript
   * const currentShared = inertia.getSharedProps();
   * console.log(currentShared.auth);
   * ```
   */
  public getSharedProps(): Record<string, unknown> {
    return { ...this.sharedProps }
  }
}
