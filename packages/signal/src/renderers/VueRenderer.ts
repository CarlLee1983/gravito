import type { Renderer, RenderResult } from './Renderer'

/**
 * Renderer for Vue component-based emails.
 *
 * Renders Vue 3 components to static HTML for email delivery
 * using server-side rendering. Supports optional dependency
 * injection for testing.
 *
 * @example
 * ```typescript
 * import { WelcomeEmail } from './emails/WelcomeEmail.vue'
 *
 * const renderer = new VueRenderer(WelcomeEmail, { name: 'John' })
 * const { html, text } = await renderer.render({ date: new Date() })
 * ```
 *
 * @typeParam P - Props type for the Vue component
 *
 * @since 3.0.0
 * @public
 */
export class VueRenderer<P extends object = object> implements Renderer {
  constructor(
    private component: any, // Use any to avoid hard Vue dependency in types
    private props?: P,
    private deps: {
      createSSRApp?: (...args: any[]) => any
      h?: (...args: any[]) => any
      renderToString?: (app: any) => Promise<string>
    } = {}
  ) {}

  async render(data: Record<string, unknown>): Promise<RenderResult> {
    // Dynamic imports to avoid hard dependencies on vue/@vue/server-renderer
    const createSSRApp = this.deps.createSSRApp ?? (await import('vue')).createSSRApp
    const h = this.deps.h ?? (await import('vue')).h
    const renderToString =
      this.deps.renderToString ?? (await import('@vue/server-renderer')).renderToString

    const mergedProps = { ...this.props, ...data }

    const app = createSSRApp({
      render: () => h(this.component, mergedProps),
    })

    const html = await renderToString(app)

    const fullHtml = html.startsWith('<!DOCTYPE') ? html : `<!DOCTYPE html>${html}`

    return {
      html: fullHtml,
      text: this.stripHtml(html),
    }
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<style(?:\s[^>]*)?>[\s\S]*?<\/style>/gi, '')
      .replace(/<script(?:\s[^>]*)?>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
}
