import type { Context } from 'hono'

export interface InertiaConfig {
  rootView?: string
  version?: string
}

export class InertiaService {
  constructor(
    private context: Context,
    private config: InertiaConfig = {}
  ) {}

  private sharedProps: Record<string, unknown> = {}

  private escapeForSingleQuotedHtmlAttribute(value: string): string {
    return (
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // Also escape double quotes so templates can safely use either:
        // data-page='{{{ page }}}' or data-page="{{{ page }}}"
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
    )
  }

  /**
   * Render an Inertia component
   */
  public render(
    component: string,
    props: Record<string, unknown> = {},
    rootVars: Record<string, unknown> = {}
  ) {
    // For SSG, use relative URL (pathname only) to avoid cross-origin issues
    let pageUrl: string
    try {
      const reqUrl = new URL(this.context.req.url, 'http://localhost')
      pageUrl = reqUrl.pathname + reqUrl.search
    } catch {
      // Fallback if URL parsing fails
      pageUrl = this.context.req.url
    }
    const page = {
      component,
      props: { ...this.sharedProps, ...props },
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
    const view = this.context.get('view')
    const rootView = this.config.rootView ?? 'app'

    if (!view) {
      throw new Error('OrbitView is required for the initial page load in OrbitInertia')
    }

    // 檢測是否為開發模式
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
   * Share data with all responses
   */
  public share(key: string, value: unknown) {
    this.sharedProps[key] = value
  }
}
