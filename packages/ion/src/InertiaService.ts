/**
 * @fileoverview Inertia.js Service for Gravito
 *
 * Provides server-side Inertia.js integration for building modern
 * single-page applications with server-side routing.
 *
 * @module @gravito/ion
 * @since 1.0.0
 */

import type { GravitoContext, GravitoVariables, ViewService } from 'gravito-core'

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

  /**
   * Create a new InertiaService instance
   *
   * @param context - The Gravito request context
   * @param config - Optional configuration
   */
  constructor(
    private context: GravitoContext<GravitoVariables>,
    private config: InertiaConfig = {}
  ) {}

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
  public render(
    component: string,
    props: Record<string, unknown> = {},
    rootVars: Record<string, unknown> = {}
  ): Response {
    // For SSG, use relative URL (pathname only) to avoid cross-origin issues
    let pageUrl: string
    try {
      const reqUrl = new URL(this.context.req.url, 'http://localhost')
      pageUrl = reqUrl.pathname + reqUrl.search
    } catch {
      // Fallback if URL parsing fails
      pageUrl = this.context.req.url
    }

    // Resolve lazy props (functions)
    const resolveProps = (p: Record<string, unknown>) => {
      const resolved: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(p)) {
        resolved[key] = typeof value === 'function' ? value() : value
      }
      return resolved
    }

    const page = {
      component,
      props: resolveProps({ ...this.sharedProps, ...props }),
      url: pageUrl,
      version: this.config.version,
    }

    // 1. If it's an Inertia request, return JSON
    if (this.context.req.header('X-Inertia')) {
      this.context.header('X-Inertia', 'true')
      this.context.header('Vary', 'Accept')
      return this.context.json(page)
    }

    // 2. Otherwise return the root HTML with data-page attribute
    // We assume there is a ViewService that handles the root template
    // The rootView should contain: <div id="app" data-page='{{{ page }}}'></div>
    const view = this.context.get('view') as ViewService | undefined
    const rootView = this.config.rootView ?? 'app'

    if (!view) {
      throw new Error('OrbitPrism is required for the initial page load in OrbitIon')
    }

    // Detect development mode
    const isDev = process.env.NODE_ENV !== 'production'

    return this.context.html(
      view.render(
        rootView,
        {
          ...rootVars,
          page: this.escapeForSingleQuotedHtmlAttribute(JSON.stringify(page)),
          isDev,
        },
        { layout: '' }
      )
    )
  }

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
