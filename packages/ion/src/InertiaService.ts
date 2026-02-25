/**
 * @fileoverview Inertia.js Service for Gravito.
 *
 * This service implements the Inertia.js server-side protocol, enabling
 * seamless page transitions and data synchronization for monolith SPAs.
 *
 * @module @gravito/ion
 */

import type { GravitoContext, GravitoVariables, ViewService } from '@gravito/core'
import { getEscapeHtml } from '@gravito/core'
import { InertiaConfigError, InertiaDataError, InertiaError } from './errors'
import type { DeferredPropDefinition, InertiaPageObject, MergedPropDefinition } from './types'

/**
 * Configuration options for the InertiaService instance.
 *
 * Defines how the service interacts with the root template, manages asset versioning,
 * and handles Server-Side Rendering (SSR).
 */
export interface InertiaConfig {
  /**
   * The name of the root view template used for the initial page load.
   *
   * This template must contain the `{{{ page }}}` placeholder to inject the
   * Inertia page object.
   *
   * @defaultValue 'app'
   */
  rootView?: string

  /**
   * Asset version string or resolver.
   *
   * Used by Inertia to detect if the client-side assets are out of sync with the server.
   * If the version sent by the client (X-Inertia-Version) doesn't match, the server
   * triggers a full page reload via a 409 Conflict response.
   */
  version?: string | (() => string | Promise<string>)

  /**
   * Minimum logging level for internal operations.
   *
   * @defaultValue 'info'
   */
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent'

  /**
   * Performance monitoring callback triggered after each render.
   *
   * Useful for tracking rendering latency and prop payload sizes in production.
   */
  onRender?: (metrics: RenderMetrics) => void

  /**
   * SSR configuration options.
   *
   * Enables pre-rendering of components on the server to improve SEO and
   * initial load performance.
   */
  ssr?: {
    /** Whether SSR is enabled for the current environment. */
    enabled: boolean
    /**
     * Function to handle SSR rendering.
     *
     * Should interface with your frontend framework's SSR renderer (e.g., React's `renderToString`).
     */
    render?: (page: any) => Promise<{ head: string[]; body: string }>
  }
}

/**
 * Encapsulates performance and status metrics for a single render operation.
 *
 * Provides insights into the rendering lifecycle, including component name,
 * execution time, and payload complexity.
 */
export interface RenderMetrics {
  /** Name of the frontend component rendered. */
  component: string
  /** Time taken in milliseconds for the entire render lifecycle. */
  duration: number
  /** Indicates if the request was an Inertia AJAX request (true) or a full page load (false). */
  isInertiaRequest: boolean
  /** Number of top-level props passed to the component after resolution. */
  propsCount: number
  /** Epoch timestamp of when the operation completed. */
  timestamp: number
  /** Resulting HTTP status code of the response. */
  status?: number
}

/**
 * Server-side adapter for the Inertia.js protocol.
 *
 * The `InertiaService` is responsible for:
 * 1. Resolving component props (including lazy/async props).
 * 2. Handling partial reloads (filtering props based on `X-Inertia-Partial-Data`).
 * 3. Managing asset versioning to ensure client-server synchronization.
 * 4. Orchestrating SSR pre-rendering when enabled.
 * 5. Generating the final HTTP response (JSON for AJAX, HTML for initial load).
 *
 * @example
 * ```typescript
 * const inertia = new InertiaService(ctx, {
 *   version: () => getGitHash(),
 *   rootView: 'main'
 * });
 *
 * // Share global data
 * inertia.share('user', ctx.get('user'));
 *
 * // Render a component
 * return await inertia.render('Dashboard/Index', {
 *   stats: async () => await fetchStats() // Lazy prop
 * });
 * ```
 */
export class InertiaService {
  private sharedProps: Record<string, unknown> = {}
  private errorBags: Record<string, Record<string, string | string[]>> = {}
  private encryptHistoryFlag = false
  private clearHistoryFlag = false
  private readonly logLevel: 'debug' | 'info' | 'warn' | 'error' | 'silent'
  private readonly onRenderCallback?: (metrics: RenderMetrics) => void
  private escapeHtml = getEscapeHtml()

  /**
   * Creates a deferred prop that will be loaded after the initial render.
   *
   * @param factory - Function that resolves to the prop value.
   * @param group - Optional group name for organizing deferred props.
   * @returns A deferred prop definition.
   *
   * @example
   * ```typescript
   * props: {
   *   user: { id: 1 },
   *   stats: InertiaService.defer(() => fetchStats())
   * }
   * ```
   */
  static defer<T = unknown>(
    factory: () => T | Promise<T>,
    group = 'default'
  ): DeferredPropDefinition<T> {
    return {
      _type: 'deferred',
      factory,
      group,
    }
  }

  /**
   * Marks a prop to be merged (shallow) with existing data during partial reloads.
   *
   * @param value - The prop value to merge.
   * @param matchOn - Optional key(s) to match on when merging arrays.
   * @returns A merge prop definition.
   */
  static merge<T = unknown>(value: T, matchOn?: string | string[]): MergedPropDefinition<T> {
    return {
      _type: 'merge',
      value,
      matchOn,
    }
  }

  /**
   * Marks a prop to prepend to an array during partial reloads.
   *
   * @param value - The prop value to prepend.
   * @returns A prepend prop definition.
   */
  static prepend<T = unknown>(value: T): MergedPropDefinition<T> {
    return {
      _type: 'prepend',
      value,
    }
  }

  /**
   * Marks a prop to be deep-merged with existing data during partial reloads.
   *
   * @param value - The prop value to deep merge.
   * @returns A deep merge prop definition.
   */
  static deepMerge<T = unknown>(value: T): MergedPropDefinition<T> {
    return {
      _type: 'deepMerge',
      value,
    }
  }

  /**
   * Initializes a new instance of the Inertia service.
   *
   * @param context - The current Gravito request context.
   * @param config - Instance configuration options.
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
   * Routes logs to the Gravito context logger if available.
   *
   * @param level - Log severity level.
   * @param message - Descriptive message.
   * @param data - Optional metadata for the log.
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
   * via the `data-page` attribute without breaking the HTML structure or
   * introducing XSS vulnerabilities.
   *
   * @param value - Raw JSON or text string.
   * @returns Safely escaped HTML attribute value.
   */
  private escapeForSingleQuotedHtmlAttribute(value: string): string {
    return this.escapeHtml(value).replace(/\\"/g, '\\&quot;')
  }

  /**
   * Renders an Inertia component and returns the appropriate HTTP response.
   *
   * This method handles the entire Inertia lifecycle:
   * - Detects if the request is an Inertia AJAX request.
   * - Validates asset versions.
   * - Resolves props (executes functions, handles partial reloads).
   * - Performs SSR if configured.
   * - Wraps the result in a JSON response or the root HTML template.
   *
   * @param component - Frontend component name (e.g., 'Users/Profile').
   * @param props - Data passed to the component. Can include functions for lazy evaluation.
   * @param rootVars - Variables passed to the root HTML template (only used on initial load).
   * @param status - Optional HTTP status code.
   * @returns A promise that resolves to a Gravito HTTP Response.
   *
   * @throws {@link InertiaError}
   * Thrown if:
   * - The `ViewService` is missing from the context (required for initial load).
   * - Prop serialization fails due to circular references or non-serializable data.
   *
   * @example
   * ```typescript
   * // Standard render
   * return await inertia.render('Welcome', { name: 'Guest' });
   *
   * // Partial reload support (only 'stats' will be resolved if requested)
   * return await inertia.render('Dashboard', {
   *   user: auth.user,
   *   stats: () => db.getStats()
   * });
   * ```
   */
  public async render<T extends Record<string, unknown> = Record<string, unknown>>(
    component: string,
    props?: T,
    rootVars: Record<string, unknown> = {},
    status?: number
  ): Promise<Response> {
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

      const resolveProps = async (p: Record<string, unknown>) => {
        const partialData = this.context.req.header('X-Inertia-Partial-Data')
        const partialExcept = this.context.req.header('X-Inertia-Partial-Except')
        const partialComponent = this.context.req.header('X-Inertia-Partial-Component')
        const resetKeys = this.context.req.header('X-Inertia-Reset')

        const isPartial = partialComponent === component
        const only = partialData && isPartial ? partialData.split(',') : []
        const except = partialExcept && isPartial ? partialExcept.split(',') : []
        const resetKeyList = resetKeys ? resetKeys.split(',') : []

        const resolved: Record<string, unknown> = {}
        const deferredGroups: Record<string, string[]> = {}
        const mergedKeys: Array<{
          keys: string[]
          mode: 'merge' | 'prepend' | 'deepMerge'
        }> = []

        for (const [key, value] of Object.entries(p)) {
          if (only.length > 0 && !only.includes(key)) {
            continue
          }
          if (except.length > 0 && except.includes(key)) {
            continue
          }

          // Handle deferred props (Inertia v2)
          if (
            value &&
            typeof value === 'object' &&
            '_type' in value &&
            (value as any)._type === 'deferred'
          ) {
            const deferred = value as DeferredPropDefinition
            const group = deferred.group ?? 'default'
            if (!deferredGroups[group]) {
              deferredGroups[group] = []
            }
            deferredGroups[group].push(key)
            // Don't include deferred props in initial render
            continue
          }

          // Handle merged props (Inertia v2)
          if (
            value &&
            typeof value === 'object' &&
            '_type' in value &&
            ['merge', 'prepend', 'deepMerge'].includes((value as any)._type)
          ) {
            const merged = value as MergedPropDefinition
            const existing = mergedKeys.find((m) => m.mode === merged._type)
            if (existing) {
              existing.keys.push(key)
            } else {
              mergedKeys.push({
                keys: [key],
                mode: merged._type,
              })
            }
            resolved[key] = merged.value
            continue
          }

          // Reset prop if specified in X-Inertia-Reset header
          if (resetKeyList.includes(key)) {
            resolved[key] = undefined
            continue
          }

          if (typeof value === 'function') {
            const propStart = performance.now()
            try {
              resolved[key] = await value()
              this.log('debug', `[InertiaService] Resolved lazy prop: ${key}`, {
                duration: `${(performance.now() - propStart).toFixed(2)}ms`,
              })
            } catch (err) {
              this.log('error', `[InertiaService] Failed to resolve lazy prop: ${key}`, { err })
              throw new InertiaDataError(`Failed to resolve lazy prop: ${key}`, { cause: err })
            }
          } else {
            resolved[key] = value
          }
        }

        return { resolved, deferredGroups, mergedKeys }
      }

      const resolveVersion = async () => {
        if (typeof this.config.version === 'function') {
          return await this.config.version()
        }
        return this.config.version
      }

      const version = await resolveVersion()

      // P5: Optimized shared props retrieval
      const getMergedProps = () => {
        const propsToMerge = props ?? {}
        if (Object.keys(propsToMerge).length === 0) {
          return this.sharedProps
        }
        return { ...this.sharedProps, ...propsToMerge }
      }

      const {
        resolved: resolvedPropsData,
        deferredGroups,
        mergedKeys,
      } = await resolveProps(getMergedProps())

      const page: InertiaPageObject = {
        component,
        props: resolvedPropsData,
        url: pageUrl,
        version,
      }

      // Add Inertia v2 features if present
      if (Object.keys(deferredGroups).length > 0) {
        page.deferredProps = deferredGroups
      }
      if (mergedKeys.length > 0) {
        page.mergeProps = mergedKeys
      }
      if (this.encryptHistoryFlag) {
        page.encryptHistory = true
      }
      if (this.clearHistoryFlag) {
        page.clearHistory = true
      }
      if (Object.keys(this.errorBags).length > 0) {
        page.errorBags = this.errorBags
      }

      let pageJson: string
      try {
        pageJson = JSON.stringify(page)
      } catch (error) {
        throw new InertiaDataError(
          `Inertia page serialization failed for component: ${component}`,
          {
            cause: error,
          }
        )
      }

      let response: Response

      if (isInertiaRequest) {
        const clientVersion = this.context.req.header('X-Inertia-Version')
        if (version && clientVersion && clientVersion !== version) {
          this.context.header('X-Inertia-Location', pageUrl)
          return new Response('', { status: 409 })
        }

        this.context.header('X-Inertia', 'true')
        this.context.header('Vary', 'Accept')
        response = this.context.json(page, status)
      } else {
        const view = this.context.get('view') as ViewService | undefined
        const rootView = this.config.rootView ?? 'app'

        if (!view) {
          throw new InertiaConfigError(
            'ViewService (OrbitPrism) is required for initial page load but was not found in context.',
            { hint: 'Ensure OrbitPrism is loaded before OrbitIon in your orbit configuration' }
          )
        }

        const isDev = process.env.NODE_ENV !== 'production'

        let ssrData = { head: [] as string[], body: '' }
        if (this.config.ssr?.enabled && this.config.ssr.render) {
          try {
            ssrData = await this.config.ssr.render(page)
          } catch (error) {
            this.log('error', '[InertiaService] SSR rendering failed', { error })
          }
        }

        response = this.context.html(
          view.render(
            rootView,
            {
              ...rootVars,
              page: this.escapeForSingleQuotedHtmlAttribute(pageJson),
              isDev,
              ssrHead: ssrData.head.join('\n'),
              ssrBody: ssrData.body,
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

      // Enhanced error page in development mode
      const isDev = process.env.NODE_ENV !== 'production'
      if (isDev && error instanceof Error) {
        const errorHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>Inertia Render Error</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto; background: #f5f5f5; padding: 20px; }
                .container { max-width: 800px; margin: 40px auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                h1 { color: #d32f2f; margin-bottom: 10px; font-size: 24px; }
                .meta { color: #666; margin-bottom: 20px; font-size: 14px; }
                .component { background: #f5f5f5; padding: 10px 15px; border-left: 3px solid #1976d2; margin-bottom: 20px; font-family: monospace; }
                .error-message { background: #ffebee; border: 1px solid #ef5350; border-radius: 4px; padding: 15px; margin-bottom: 20px; color: #c62828; }
                .stack { background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; padding: 15px; overflow-x: auto; font-family: monospace; font-size: 12px; color: #333; line-height: 1.5; }
                .hint { background: #e8f5e9; border-left: 3px solid #4caf50; padding: 15px; margin-top: 20px; color: #2e7d32; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>🚨 Inertia Render Error</h1>
                <div class="meta">Component: <span class="component">${component}</span></div>
                <div class="error-message">${error.message || 'Unknown error'}</div>
                ${
                  error.stack
                    ? `<div><strong>Stack Trace:</strong><div class="stack">${error.stack
                        .split('\n')
                        .map((line) => line.replace(/</g, '&lt;').replace(/>/g, '&gt;'))
                        .join('\n')}</div></div>`
                    : ''
                }
                <div class="hint">
                  <strong>💡 Dev Mode Tip:</strong> This enhanced error page is only visible in development mode. In production, a generic error message is shown.
                </div>
              </div>
            </body>
          </html>
        `
        return this.context.html(errorHtml, 500)
      }

      return new Response('Inertia Render Error', { status: 500 })
    }
  }

  /**
   * Registers a piece of data to be shared with all Inertia responses for the current request.
   *
   * Shared props are automatically merged with component-specific props during the render phase.
   * This is the primary mechanism for providing global state like authentication details,
   * flash messages, or configuration to the frontend.
   *
   * @param key - Identifier for the shared prop.
   * @param value - Value to share. Must be JSON serializable.
   *
   * @example
   * ```typescript
   * inertia.share('appName', 'Gravito Store');
   * inertia.share('auth', { user: ctx.get('user') });
   * ```
   */
  public share(key: string, value: unknown): void {
    this.sharedProps[key] = value
  }

  /**
   * Shares multiple props in a single operation.
   *
   * Merges the provided object into the existing shared props state. Existing keys
   * with the same name will be overwritten.
   *
   * @param props - Object containing key-value pairs to merge into the shared state.
   *
   * @example
   * ```typescript
   * inertia.shareAll({
   *   version: '1.2.0',
   *   environment: 'production',
   *   features: ['chat', 'search']
   * });
   * ```
   */
  public shareAll(props: Record<string, unknown>): void {
    this.sharedProps = { ...this.sharedProps, ...props }
  }

  /**
   * Returns a shallow copy of the current shared props.
   *
   * Useful for inspecting the shared state or for manual prop merging in advanced scenarios.
   *
   * @returns A dictionary containing all currently registered shared props.
   *
   * @example
   * ```typescript
   * const shared = inertia.getSharedProps();
   * if (!shared.auth) {
   *   console.warn('Authentication data is missing from shared props');
   * }
   * ```
   */
  public getSharedProps(): Record<string, unknown> {
    return { ...this.sharedProps }
  }

  /**
   * Instructs the Inertia client to navigate to a different URL.
   *
   * For Inertia AJAX requests, this returns a 409 Conflict with the `X-Inertia-Location` header.
   * For regular page loads, this returns a 302 Found redirect.
   *
   * This is useful for server-side redirects triggered by authentication or authorization checks.
   *
   * @param url - The URL to redirect to.
   * @returns A redirect response.
   *
   * @example
   * ```typescript
   * if (!ctx.get('user')) {
   *   return inertia.location('/login');
   * }
   * ```
   */
  public location(url: string): Response {
    const isInertiaRequest = Boolean(this.context.req.header('X-Inertia'))

    if (isInertiaRequest) {
      this.context.header('X-Inertia-Location', url)
      return new Response('', { status: 409 })
    }

    // Standard HTTP redirect for regular requests
    this.context.header('Location', url)
    return new Response('', { status: 302 })
  }

  /**
   * Controls whether the Inertia client should encrypt browser history.
   *
   * When enabled, history is not written to the browser's History API,
   * preventing users from using the browser back button to return to previous pages.
   *
   * @param encrypt - Whether to encrypt history (defaults to true).
   * @returns The service instance for method chaining.
   *
   * @example
   * ```typescript
   * return await inertia.encryptHistory(true).render('SecurePage');
   * ```
   */
  public encryptHistory(encrypt = true): this {
    this.encryptHistoryFlag = encrypt
    return this
  }

  /**
   * Clears the browser history after the page load.
   *
   * Useful for sensitive operations or multi-step wizards where you don't want
   * users navigating back to previous states.
   *
   * @returns The service instance for method chaining.
   *
   * @example
   * ```typescript
   * return await inertia.clearHistory().render('SuccessPage');
   * ```
   */
  public clearHistory(): this {
    this.clearHistoryFlag = true
    return this
  }

  /**
   * Registers form validation errors organized into named bags.
   *
   * Error bags allow multiple validation failure scenarios to coexist.
   * For example, you might have 'default' errors and 'import' errors from different forms.
   *
   * @param errors - Validation errors, with field names as keys and error messages as values.
   * @param bag - The error bag name (defaults to 'default').
   * @returns The service instance for method chaining.
   *
   * @example
   * ```typescript
   * inertia.withErrors({
   *   email: 'Email is required',
   *   password: 'Must be 8+ characters'
   * }, 'login');
   *
   * inertia.withErrors({
   *   line_1: 'Invalid CSV format'
   * }, 'import');
   * ```
   */
  public withErrors(errors: Record<string, string | string[]>, bag = 'default'): this {
    this.errorBags[bag] = errors
    return this
  }
}
