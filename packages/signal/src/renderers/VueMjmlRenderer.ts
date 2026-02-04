import { stripHtml } from '../utils/html'
import type { Renderer, RenderResult } from './Renderer'

/**
 * Renderer for Vue component-based MJML emails.
 *
 * Renders Vue 3 components to MJML string using SSR, then converts
 * the MJML to responsive HTML.
 *
 * @public
 * @since 1.1.0
 */
export class VueMjmlRenderer<P extends object = object> implements Renderer {
  constructor(
    private component: any,
    private props?: P,
    private options: Record<string, any> = {},
    private deps: {
      createSSRApp?: (...args: any[]) => any
      h?: (...args: any[]) => any
      renderToString?: (app: any) => Promise<string>
      mjml2html?: (mjml: string, options?: any) => any
    } = {}
  ) {}

  async render(data: Record<string, unknown>): Promise<RenderResult> {
    const createSSRApp = this.deps.createSSRApp ?? (await import('vue')).createSSRApp
    const h = this.deps.h ?? (await import('vue')).h
    const renderToString =
      this.deps.renderToString ?? (await import('@vue/server-renderer')).renderToString
    const mjml2html = this.deps.mjml2html ?? (await import('mjml')).default

    const mergedProps = { ...this.props, ...data }
    const app = createSSRApp({
      render: () => h(this.component, mergedProps),
    })

    const mjml = await renderToString(app)

    const { html, errors } = mjml2html(mjml, {
      validationLevel: 'soft',
      ...this.options,
    })

    if (errors && errors.length > 0 && this.options.validationLevel === 'strict') {
      throw new Error(
        `MJML rendering failed: ${errors.map((e: any) => e.formattedMessage).join(', ')}`
      )
    }

    return {
      html,
      text: stripHtml(html),
    }
  }
}
