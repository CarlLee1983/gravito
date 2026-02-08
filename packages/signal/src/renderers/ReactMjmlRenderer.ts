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
    let { createElement, renderToStaticMarkup, mjml2html } = this.deps

    if (!createElement || !renderToStaticMarkup) {
      try {
        const react = await import('react')
        const reactDomServer = await import('react-dom/server')
        createElement ??= react.createElement
        renderToStaticMarkup ??= reactDomServer.renderToStaticMarkup
      } catch (_e) {
        throw new Error(
          '[OrbitSignal] The "react" and "react-dom" packages are required for ReactMjmlRenderer. Please install them using "bun add react react-dom".'
        )
      }
    }

    if (!mjml2html) {
      try {
        mjml2html = (await import('mjml')).default
      } catch (_e) {
        throw new Error(
          '[OrbitSignal] The "mjml" package is required for ReactMjmlRenderer. Please install it using "bun add mjml".'
        )
      }
    }

    const mergedProps = { ...this.props, ...data } as P
    const element = createElement?.(this.component, mergedProps)
    const mjml = renderToStaticMarkup?.(element)
    if (!mjml) {
      throw new Error('Failed to render MJML template')
    }

    const result = mjml2html?.(mjml, {
      validationLevel: 'soft',
      ...this.options,
    })
    if (!result) {
      throw new Error('Failed to convert MJML to HTML')
    }
    const { html, errors } = result

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
