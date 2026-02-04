import { stripHtml } from '../utils/html'
import type { Renderer, RenderResult } from './Renderer'

/**
 * Renderer for Vue component-based MJML emails.
 *
 * Renders Vue 3 components to MJML string using SSR, then converts
 * the MJML to responsive HTML.
 *
 * @typeParam P - Props type for the Vue component.
 * @public
 * @since 1.1.0
 */
export class VueMjmlRenderer<P extends object = object> implements Renderer {
  /**
   * Creates an instance of VueMjmlRenderer.
   *
   * @param component - The Vue component to render.
   * @param props - Initial props for the component.
   * @param options - Optional MJML transformation options.
   * @param deps - Optional dependency injection for testing.
   */
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

  /**
   * Renders the Vue component to a static HTML string via MJML.
   *
   * @param data - Runtime data to be merged with initial props.
   * @returns A promise resolving to the rendered content.
   * @throws {Error} If MJML rendering fails.
   */
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
