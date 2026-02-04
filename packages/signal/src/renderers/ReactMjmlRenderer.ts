import { stripHtml } from '../utils/html'
import type { Renderer, RenderResult } from './Renderer'

/**
 * Renderer for React component-based MJML emails.
 *
 * Renders React components to MJML string using SSR, then converts
 * the MJML to responsive HTML.
 *
 * @typeParam P - Props type for the React component.
 * @public
 * @since 1.1.0
 */
export class ReactMjmlRenderer<P extends object = object> implements Renderer {
  /**
   * Creates an instance of ReactMjmlRenderer.
   *
   * @param component - The React component to render.
   * @param props - Initial props for the component.
   * @param options - Optional MJML transformation options.
   * @param deps - Optional dependency injection for testing.
   */
  constructor(
    private component: any,
    private props?: P,
    private options: Record<string, any> = {},
    private deps: {
      createElement?: (...args: any[]) => any
      renderToStaticMarkup?: (element: any) => string
      mjml2html?: (mjml: string, options?: any) => any
    } = {}
  ) {}

  /**
   * Renders the React component to a static HTML string via MJML.
   *
   * @param data - Runtime data to be merged with initial props.
   * @returns A promise resolving to the rendered content.
   * @throws {Error} If MJML rendering fails.
   */
  async render(data: Record<string, unknown>): Promise<RenderResult> {
    const createElement = this.deps.createElement ?? (await import('react')).createElement
    const renderToStaticMarkup =
      this.deps.renderToStaticMarkup ?? (await import('react-dom/server')).renderToStaticMarkup
    const mjml2html = this.deps.mjml2html ?? (await import('mjml')).default

    const mergedProps = { ...this.props, ...data } as P
    const element = createElement(this.component, mergedProps)
    const mjml = renderToStaticMarkup(element)

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
