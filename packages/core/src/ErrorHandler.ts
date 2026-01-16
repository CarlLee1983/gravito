/**
 * @fileoverview ErrorHandler - Centralized Error Handling for Gravito Framework
 *
 * Extracted from PlanetCore to follow Single Responsibility Principle.
 * Handles HTTP errors, validation errors, and error rendering.
 *
 * @module @gravito/core
 * @since 1.3.0
 */

import { GravitoException } from './exceptions/GravitoException'
import { HttpException } from './exceptions/HttpException'
import { ValidationException } from './exceptions/ValidationException'
import type { HookManager } from './HookManager'
import { fail } from './helpers/response'
import type { ContentfulStatusCode, GravitoContext } from './http/types'
import type { Logger } from './Logger'
import type { ErrorHandlerContext, ViewService } from './PlanetCore'

/**
 * HTTP Status Code to Error Code mapping
 */
export function codeFromStatus(status: number): string {
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

/**
 * HTTP Status Code to Message mapping
 */
export function messageFromStatus(status: number): string {
  switch (status) {
    case 400:
      return 'Bad Request'
    case 401:
      return 'Unauthorized'
    case 403:
      return 'Forbidden'
    case 404:
      return 'Not Found'
    case 405:
      return 'Method Not Allowed'
    case 409:
      return 'Conflict'
    case 422:
      return 'Unprocessable Content'
    case 429:
      return 'Too Many Requests'
    case 500:
      return 'Internal Server Error'
    case 502:
      return 'Bad Gateway'
    case 503:
      return 'Service Unavailable'
    case 504:
      return 'Gateway Timeout'
    default:
      return status >= 500 ? 'Internal Server Error' : 'Request Error'
  }
}

/**
 * Dependencies injected into ErrorHandler
 * @public
 */
export interface ErrorHandlerDeps {
  logger: Logger
  hooks: HookManager
  getCore: () => unknown // Lazy reference to avoid circular deps
}

/**
 * ErrorHandler - Centralized error handling logic
 *
 * @example
 * ```typescript
 * const handler = new ErrorHandler({ logger, hooks, getCore: () => core })
 * adapter.onError(handler.handleError.bind(handler))
 * adapter.onNotFound(handler.handleNotFound.bind(handler))
 * ```
 */
export class ErrorHandler {
  constructor(private deps: ErrorHandlerDeps) {}

  /**
   * Handle application errors
   */
  async handleError(err: unknown, c: GravitoContext): Promise<Response> {
    const isProduction = process.env.NODE_ENV === 'production'

    // Try rendering HTML if available and requested
    const view = c.get('view') as ViewService | undefined
    const i18n = c.get('i18n') as { t?: (key: string, params?: unknown) => string } | undefined
    const accept = c.req.header('Accept') || ''
    const wantsHtml = Boolean(
      view && accept.includes('text/html') && !accept.includes('application/json')
    )

    let status: ContentfulStatusCode = 500
    let message = messageFromStatus(500)
    let code = 'INTERNAL_ERROR'
    let details: unknown

    // Parse error type
    if (err instanceof GravitoException) {
      status = err.status as ContentfulStatusCode
      code = err.code

      // Fallback for generic HTTP errors to use status-based codes
      if (code === 'HTTP_ERROR') {
        code = codeFromStatus(status)
      }

      if (i18n?.t && err.i18nKey) {
        message = i18n.t(err.i18nKey, err.i18nParams)
      } else {
        message = err.message || messageFromStatus(status)
      }

      if (err instanceof ValidationException) {
        details = err.errors

        // Handle HTML Redirect for Validation
        if (wantsHtml) {
          const redirectResponse = this.handleValidationRedirect(err, c)
          if (redirectResponse) {
            return redirectResponse
          }
        }
      } else if (err instanceof Error && !isProduction && err.cause) {
        details = { cause: err.cause }
      }
    } else if (err instanceof HttpException) {
      status = err.status
      message = err.message
    } else if (
      err instanceof Error &&
      'status' in err &&
      typeof (err as { status?: unknown }).status === 'number'
    ) {
      // Handle Photon or other framework exceptions via duck typing
      status = (err as { status: number }).status as ContentfulStatusCode
      message = err.message
      code = codeFromStatus(status)
    } else if (err instanceof Error) {
      if (!isProduction) {
        message = err.message || message
      }
    } else if (typeof err === 'string') {
      if (!isProduction) {
        message = err
      }
    }

    // Sanitize message in production for 5xx errors
    if (isProduction && status >= 500) {
      message = messageFromStatus(status)
    }

    // Add stack trace in development
    if (!isProduction && err instanceof Error && !details) {
      details = { stack: err.stack, ...(details as object) }
    }

    // Build handler context
    let handlerContext: ErrorHandlerContext = {
      core: this.deps.getCore() as import('./PlanetCore').PlanetCore,
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
                details,
              },
            },
          }
        : {}),
    }

    // Apply filters for customization
    handlerContext = await this.deps.hooks.applyFilters<ErrorHandlerContext>(
      'error:context',
      handlerContext
    )

    // Logging
    this.logError(handlerContext, err)

    // Report action
    await this.deps.hooks.doAction('error:report', handlerContext)

    // Check for custom render
    const customResponse = await this.deps.hooks.applyFilters<Response | null>(
      'error:render',
      null,
      handlerContext
    )
    if (customResponse) {
      return customResponse
    }

    // Render HTML or JSON
    return this.renderErrorResponse(handlerContext, view, c)
  }

  /**
   * Handle 404 Not Found errors
   */
  async handleNotFound(c: GravitoContext): Promise<Response> {
    const view = c.get('view') as ViewService | undefined
    const accept = c.req.header('Accept') || ''
    const wantsHtml = view && accept.includes('text/html') && !accept.includes('application/json')
    const isProduction = process.env.NODE_ENV === 'production'

    let handlerContext: ErrorHandlerContext = {
      core: this.deps.getCore() as import('./PlanetCore').PlanetCore,
      c,
      error: new HttpException(404, { message: 'Route not found' }),
      isProduction,
      accept,
      wantsHtml: Boolean(wantsHtml),
      status: 404,
      payload: fail('Route not found', 'NOT_FOUND'),
      ...(wantsHtml
        ? {
            html: {
              templates: ['errors/404', 'errors/500'],
              data: {
                status: 404,
                message: 'Route not found',
                code: 'NOT_FOUND',
                debug: !isProduction,
              },
            },
          }
        : {}),
    }

    handlerContext = await this.deps.hooks.applyFilters<ErrorHandlerContext>(
      'notFound:context',
      handlerContext
    )

    // Logging
    const logLevel = handlerContext.logLevel ?? 'info'
    if (logLevel !== 'none') {
      const msg = handlerContext.logMessage ?? `404 Not Found: ${c.req.url}`
      if (logLevel === 'error') {
        this.deps.logger.error(msg)
      } else if (logLevel === 'warn') {
        this.deps.logger.warn(msg)
      } else {
        this.deps.logger.info(msg)
      }
    }

    await this.deps.hooks.doAction('notFound:report', handlerContext)

    const customResponse = await this.deps.hooks.applyFilters<Response | null>(
      'notFound:render',
      null,
      handlerContext
    )
    if (customResponse) {
      return customResponse
    }

    return this.renderErrorResponse(handlerContext, view, c)
  }

  /**
   * Handle validation error redirect for HTML requests
   */
  private handleValidationRedirect(err: ValidationException, c: GravitoContext): Response | null {
    const session = c.get('session') as { flash: (key: string, value: unknown) => void } | undefined

    if (!session) {
      return null
    }

    // Transform details to ErrorBag format: Record<string, string[]>
    const errorBag: Record<string, string[]> = {}
    for (const e of err.errors) {
      if (!errorBag[e.field]) {
        errorBag[e.field] = []
      }
      errorBag[e.field]?.push(e.message)
    }
    session.flash('errors', errorBag)

    if (err.input) {
      session.flash('_old_input', err.input)
    }

    const redirectUrl = err.redirectTo ?? c.req.header('Referer') ?? '/'
    return c.redirect(redirectUrl)
  }

  /**
   * Log error based on context settings
   */
  private logError(handlerContext: ErrorHandlerContext, err: unknown): void {
    const defaultLogLevel = handlerContext.status >= 500 ? 'error' : 'none'
    const logLevel = handlerContext.logLevel ?? defaultLogLevel

    if (logLevel === 'none') {
      return
    }

    const rawErrorMessage =
      handlerContext.error instanceof Error
        ? handlerContext.error.message
        : typeof handlerContext.error === 'string'
          ? handlerContext.error
          : handlerContext.payload.error.message

    const msg =
      handlerContext.logMessage ??
      (logLevel === 'error'
        ? `Application Error: ${rawErrorMessage || handlerContext.payload.error.message}`
        : `HTTP ${handlerContext.status}: ${handlerContext.payload.error.message}`)

    if (logLevel === 'error') {
      this.deps.logger.error(msg, err)
    } else if (logLevel === 'warn') {
      this.deps.logger.warn(msg)
    } else {
      this.deps.logger.info(msg)
    }
  }

  /**
   * Render error response (HTML or JSON)
   */
  private renderErrorResponse(
    handlerContext: ErrorHandlerContext,
    view: ViewService | undefined,
    c: GravitoContext
  ): Response {
    if (handlerContext.wantsHtml && view && handlerContext.html) {
      let lastRenderError: unknown
      for (const template of handlerContext.html.templates) {
        try {
          return c.html(view.render(template, handlerContext.html.data), handlerContext.status)
        } catch (renderError) {
          lastRenderError = renderError
        }
      }
      this.deps.logger.error('Failed to render error view', lastRenderError)
    }

    return c.json(handlerContext.payload, handlerContext.status)
  }
}
